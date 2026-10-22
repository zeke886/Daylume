import { BulbOutlined, CoffeeOutlined, EditOutlined, ReadOutlined, FileTextOutlined } from '@ant-design/icons'
import type { Entry } from '../types/entry'
import { formatLocalTime } from '../lib/datetime'

export const typeMeta = {
  ACTIVITY: { label: '活动', icon: ReadOutlined, className: 'activity' },
  MEAL: { label: '饮食', icon: CoffeeOutlined, className: 'meal' },
  IDEA: { label: '灵感', icon: BulbOutlined, className: 'idea' },
  NOTE: { label: '日常', icon: FileTextOutlined, className: 'note' },
} as const

export function EntryCard({ entry, onEdit }: { entry: Entry; onEdit?: (entry: Entry) => void }) {
  const meta = typeMeta[entry.type]
  const Icon = meta.icon
  return <article className={'entry-card entry-card--' + meta.className}>
    <div className="entry-meta"><span className="entry-type"><Icon />{meta.label}</span>
      <span>{entry.timePrecision === 'DATE' ? '补记' : formatLocalTime(entry.occurredAt)}</span>
      {entry.isExample && <span className="example-tag">示例</span>}
      {onEdit && <button className="icon-button entry-edit" aria-label={'查看记录：' + entry.title} onClick={() => onEdit(entry)}><EditOutlined /></button>}
    </div>
    <p className="entry-content">{entry.content || entry.rawText || entry.title}</p>
    {(entry.durationMinutes || entry.tags?.length) ? <div className="entry-tags">
      {entry.durationMinutes && <span>{entry.durationMinutes} 分钟的投入</span>}
      {entry.tags?.map(tag => <span key={tag}>#{tag}</span>)}
    </div> : null}
  </article>
}
