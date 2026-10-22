import type { CreateEntryRequest, Entry, PageResult } from '../types/entry'

interface ApiResponse<T> {
  code: string
  message: string
  data: T
  traceId: string
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
    ...init,
  })

  if (!response.ok) {
    throw new Error(`请求失败（${response.status}）`)
  }

  const body = (await response.json()) as ApiResponse<T>
  if (body.code !== 'OK') {
    throw new Error(body.message || '请求失败')
  }
  return body.data
}

export const entryApi = {
  list: () => request<PageResult<Entry>>('/entries?page=1&pageSize=50'),
  create: (payload: CreateEntryRequest) => request<Entry>('/entries', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
}
