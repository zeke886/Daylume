import { ArrowLeftOutlined, BulbOutlined, CoffeeOutlined, FileTextOutlined, ReadOutlined, CheckOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import type { CaptureDraft } from '../../lib/workspace'
import { dayLabel, isValidDate, localDateFromInstant } from '../../lib/datetime'
import type { EntryType } from '../../types/entry'

const types: { type: EntryType; label: string; icon: typeof FileTextOutlined }[] = [
  { type: 'NOTE', label: '日常', icon: FileTextOutlined },
  { type: 'ACTIVITY', label: '活动', icon: ReadOutlined },
  { type: 'MEAL', label: '饮食', icon: CoffeeOutlined },
  { type: 'IDEA', label: '灵感', icon: BulbOutlined },
]

export function QuickEntry({ draft, onChange, onSave, onBack, saving, storageStatus }: {
  draft: CaptureDraft; onChange: (value: CaptureDraft) => void;
  onSave: () => Promise<void>; onBack: () => void; saving: boolean; storageStatus: string;
}) {
  const [error, setError] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)
  const today = localDateFromInstant()
  useEffect(() => { input.current?.focus() }, [])
  const change = (value: Partial<CaptureDraft>) => { setError(''); onChange({ ...draft, ...value }) }
  async function save() {
    if (!draft.content.trim()) { setError('写下一句话就好，不用很完整。'); input.current?.focus(); return }
    if (!isValidDate(draft.date) || draft.date > today) { setError('请选择今天或过去的日期。'); return }
    if (draft.type === 'ACTIVITY' && draft.duration && (!Number.isInteger(Number(draft.duration)) || Number(draft.duration) < 1 || Number(draft.duration) > 1440)) {
      setError('时长可以留空，填写时请输入 1–1440 分钟。'); return
    }
    const tags = draft.tags.split(/[,，\s]+/).filter(Boolean)
    if (tags.length > 10 || tags.some(t => t.length > 50)) { setError('最多添加 10 个标签，每个不超过 50 字。'); return }
    try { await onSave() } catch (e) { setError(e instanceof Error ? e.message : '没有保存成功，正文仍保留。') }
  }
  return <div className="capture-page">
    <header className="capture-header"><button className="icon-button" aria-label="返回并保留草稿" onClick={onBack} disabled={saving}><ArrowLeftOutlined /></button>
      <span>{draft.entryId ? '编辑这一刻' : draft.date < today ? '补记这一天' : '记下这一刻'}</span>
      <button className="button button--primary button--small" onClick={() => void save()} disabled={saving}><CheckOutlined />{saving ? '保存中…' : '保存'}</button>
    </header>
    <main className="capture-body">
      <p className="eyebrow">{dayLabel(draft.date, { weekday: 'long' })}</p>
      <h1>一点小事，也值得留下。</h1>
      <div className="capture-types" aria-label="记录类型">{types.map(({ type, label, icon: Icon }) => <button key={type}
        className={'type-choice' + (draft.type === type ? ' selected' : '')} aria-pressed={draft.type === type} disabled={saving} onClick={() => change({ type })}><Icon />{label}</button>)}</div>
      <label className="sr-only" htmlFor="record-content">记录正文</label>
      <textarea id="record-content" ref={input} className="capture-textarea" value={draft.content} disabled={saving}
        placeholder={draft.type === 'MEAL' ? '今天吃了什么？不记份量和热量也没关系。' : draft.type === 'IDEA' ? '那个一闪而过的想法，是什么？' : '今天发生了什么？或者，此刻在想什么…'}
        maxLength={5000} onChange={e => change({ content: e.target.value })} />
      <div className="editor-footnote"><span role="status">{storageStatus}</span><span>{draft.content.length} / 5000</span></div>
      <div className="capture-options">
        <label><span>发生日期</span><input type="date" value={draft.date} max={today} disabled={saving}
          onInput={e => { if (e.currentTarget.value) change({ date: e.currentTarget.value, timePrecision: 'DATE' }) }}
          onChange={e => { if (e.target.value) change({ date: e.target.value, timePrecision: 'DATE' }) }} /></label>
        {draft.type === 'ACTIVITY' && <label><span>投入时长 <small>选填</small></span><span className="input-suffix"><input aria-label="投入时长（分钟）" type="number" min="1" max="1440" step="1" value={draft.duration} placeholder="不填也可以" disabled={saving} onChange={e => change({ duration: e.target.value })} /><span>分钟</span></span></label>}
        <label><span>小标签 <small>选填</small></span><input aria-label="标签，使用逗号分隔" value={draft.tags} placeholder="散步，阅读，生活" disabled={saving} onChange={e => change({ tags: e.target.value })} /></label>
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <aside className="capture-note"><span>先记录，不必急着整理。</span><p>内容仅保存在当前浏览器，不会发送给 AI。云端同步与智能整理将在后续接入。</p></aside>
    </main>
  </div>
}
