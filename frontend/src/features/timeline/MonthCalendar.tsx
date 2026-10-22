import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { Entry } from '../../types/entry'
import { dayLabel, localDateFromInstant, shiftDate, shiftMonth } from '../../lib/datetime'

export function MonthCalendar({ entries, selectedDate, month, onMonthChange, onSelectDate, checkins }: {
  entries: Entry[]; selectedDate: string; month: string;
  checkins?: string[];
  onMonthChange: (month: string) => void; onSelectDate: (date: string) => void;
}) {
  const today = localDateFromInstant()
  const start = month.slice(0, 7) + '-01'
  const weekday = (new Date(start + 'T12:00:00Z').getUTCDay() + 6) % 7
  const days = (Date.parse(shiftMonth(start, 1) + 'T12:00:00Z') - Date.parse(start + 'T12:00:00Z')) / 86400000
  const length = Math.ceil((weekday + days) / 7) * 7
  const counts = checkins ? Object.fromEntries(checkins.map(d => [d, 1])) : entries.reduce<Record<string, number>>((acc, e) => { acc[e.localDate] = (acc[e.localDate] ?? 0) + 1; return acc }, {})
  return <section className="month-calendar" aria-label={checkins ? '习惯打卡日历' : '记录日历'}>
    <div className="calendar-toolbar"><h2>{dayLabel(start, { year: 'numeric', month: 'long', day: undefined })}</h2>
      <div><button className="icon-button" aria-label="上个月" onClick={() => onMonthChange(shiftMonth(start, -1))}><LeftOutlined /></button>
        <button className="text-button" onClick={() => onSelectDate(today)}>今天</button>
        <button className="icon-button" aria-label="下个月" onClick={() => onMonthChange(shiftMonth(start, 1))}><RightOutlined /></button></div>
    </div>
    <div className="calendar-grid">
      {['一', '二', '三', '四', '五', '六', '日'].map(d => <span className="calendar-weekday" key={d}>{d}</span>)}
      {Array.from({ length }, (_, i) => {
        const date = shiftDate(start, i - weekday)
        const outside = date.slice(0, 7) !== start.slice(0, 7)
        return <button key={date} className={'calendar-day' + (outside ? ' outside' : '') + (date === today ? ' is-today' : '') + (date === selectedDate ? ' is-selected' : '')}
          aria-label={dayLabel(date) + '，' + (checkins ? (counts[date] ? '已打卡' : '未打卡') : (counts[date] ?? 0) + ' 条记录') + (date === today ? '，今天' : '')}
          aria-pressed={date === selectedDate}
          onClick={() => onSelectDate(date)}>
          <span>{Number(date.slice(-2))}</span><span className={'calendar-dot' + (counts[date] ? ' has-record' : '')} />
        </button>
      })}
    </div>
    <div className="calendar-legend"><span className="legend-dot" /> {checkins ? '已完成的日子' : '有记录的日子'} <span>空白也可以慢慢补上</span></div>
  </section>
}
