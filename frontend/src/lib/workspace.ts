import type { Entry, EntryType } from '../types/entry'

export interface Habit {
  id: string
  name: string
  targetPerWeek: number
  startDate: string
  paused: boolean
  checkins: string[]
}
export interface Workspace {
  entries: Entry[]
  habits: Habit[]
  aiOptIn: boolean
  revision?: number
}
export interface CaptureDraft {
  id: string
  entryId?: string
  content: string
  type: EntryType
  date: string
  duration: string
  tags: string
  occurredAt?: string
  timePrecision: 'INSTANT' | 'DATE'
}
export const emptyWorkspace: Workspace = { entries: [], habits: [], aiOptIn: false }
let connection: Promise<IDBDatabase> | undefined
function database() {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('daylume-device', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('workspace')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('无法打开本机存储，请检查浏览器的存储权限。'))
    request.onblocked = () => reject(new Error('存储正在更新，请关闭其他 Daylume 标签后重试。'))
  })
  return connection
}
export async function readLocal<T>(key: string): Promise<T | undefined> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspace', 'readonly')
    const request = transaction.objectStore('workspace').get(key)
    transaction.oncomplete = () => resolve(request.result as T | undefined)
    transaction.onerror = () => reject(new Error('本机内容读取失败，请重试。'))
    transaction.onabort = () => reject(new Error('本机内容读取中断，请重试。'))
  })
}
export async function writeLocal(key: string, value: unknown): Promise<void> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspace', 'readwrite')
    const store = transaction.objectStore('workspace')
    if (value === undefined) store.delete(key)
    else store.put(value, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('保存失败，可能是本机空间不足。请保留正文后重试。'))
    transaction.onabort = () => reject(new Error('保存中断，请保留正文后重试。'))
  })
}
// Publish the record and consume its draft in one durable commit.
export async function commitWorkspace(workspace: Workspace, expectedRevision: number, consumeDraft = false): Promise<Workspace> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspace', 'readwrite')
    const store = transaction.objectStore('workspace')
    const saved = { ...workspace, revision: expectedRevision + 1 }
    let conflict = false
    const current = store.get('personal')
    current.onsuccess = () => {
      if (((current.result as Workspace | undefined)?.revision ?? 0) !== expectedRevision) {
        conflict = true
        transaction.abort()
        return
      }
      store.put(saved, 'personal')
      if (consumeDraft) store.delete('capture')
    }
    transaction.oncomplete = () => resolve(saved)
    transaction.onerror = () => reject(new Error('内容未保存成功，草稿仍保留。请重试。'))
    transaction.onabort = () => reject(new Error(conflict ? '内容已在另一个页面更新，请刷新后再保存。当前草稿仍保留。' : '保存被中断，草稿仍保留。请重试。'))
  })
}
