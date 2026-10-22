import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CloseOutlined } from '@ant-design/icons'

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog className="modal" ref={ref} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose() }}
    onClick={e => { if (e.target === ref.current) onClose() }}>
    <div className="modal-header"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="关闭弹窗" onClick={onClose}><CloseOutlined /></button></div>
    {children}
  </dialog>
}

export function HabitForm({ onSubmit, onClose }: { onSubmit: (name: string, target: number) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  return <Modal title="给生活加个小习惯" onClose={() => { if (!saving) onClose() }}>
    <form onSubmit={async e => {
      e.preventDefault()
      if (!name.trim()) { setError('给这个小习惯起个名字吧。'); return }
      setSaving(true)
      try { await onSubmit(name.trim(), target); onClose() }
      catch (err) { setError(err instanceof Error ? err.message : '保存失败'); setSaving(false) }
    }}>
      <label className="field-label" htmlFor="habit-name">想慢慢养成的习惯</label>
      <input id="habit-name" className="form-input" autoFocus value={name} maxLength={100} placeholder="例如：读几页书、出门走走" onChange={e => setName(e.target.value)} disabled={saving} />
      <label className="field-label" htmlFor="habit-target">每周想做几次？</label>
      <select id="habit-target" className="form-input" value={target} onChange={e => setTarget(Number(e.target.value))} disabled={saving}>
        {[1, 2, 3, 4, 5, 6, 7].map(n => <option value={n} key={n}>每周 {n} 次</option>)}
      </select>
      <p className="muted small">从轻松的一小步开始。偶尔中断也没关系。</p>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <button className="button button--primary full-width" disabled={saving}>{saving ? '保存中…' : '开始这个小习惯'}</button>
    </form>
  </Modal>
}
