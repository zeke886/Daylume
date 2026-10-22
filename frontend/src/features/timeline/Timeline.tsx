import type { Entry } from '../../types/entry'
import { EntryCard } from '../../components/EntryCard'
import { dayLabel } from '../../lib/datetime'

export function Timeline({ entries, loading, onEdit }: { entries: Entry[]; loading?: boolean; onEdit?: (entry: Entry) => void }) {
  if (loading) return <p className="muted" role="status">正在取回你的记录…</p>
  const grouped = [...entries].sort((a, b) => b.localDate.localeCompare(a.localDate) || b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
    .reduce<Record<string, Entry[]>>((result, entry) => {
      const items = result[entry.localDate] ?? []
      items.push(entry)
      result[entry.localDate] = items
      return result
    }, {})
  return <div className="timeline-list">{Object.entries(grouped).map(([date, items]) => <section key={date} className="timeline-day">
    <h3 className="day-heading">{dayLabel(date, { weekday: 'long' })}</h3>
    {items.map(entry => <EntryCard entry={entry} onEdit={onEdit} key={entry.id} />)}
  </section>)}</div>
}
