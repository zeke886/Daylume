import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeftOutlined, ArrowRightOutlined, CalendarOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, HomeOutlined, LeftOutlined, LockOutlined, PlusOutlined, ReadOutlined, RightOutlined, SearchOutlined, SettingOutlined, SunOutlined, UserOutlined } from '@ant-design/icons'
import { QuickEntry } from './features/dashboard/QuickEntry'
import { MonthCalendar } from './features/timeline/MonthCalendar'
import { Timeline } from './features/timeline/Timeline'
import { EntryCard, typeMeta } from './components/EntryCard'
import { HabitForm, Modal } from './components/Modal'
import { dayLabel, isValidDate, localDateFromInstant, monthStart, shiftDate, shiftMonth, weekStart } from './lib/datetime'
import { commitWorkspace, emptyWorkspace, readLocal, writeLocal, type CaptureDraft, type Habit, type Workspace } from './lib/workspace'
import { exampleEntries } from './lib/mockData'
import type { Entry, EntryType } from './types/entry'
import './styles.css'

const tabs = [
  { path: '/today', label: '今天', icon: HomeOutlined },
  { path: '/calendar', label: '日历', icon: CalendarOutlined },
  { path: '/review', label: '回顾', icon: ReadOutlined },
  { path: '/me', label: '我的', icon: UserOutlined },
]

function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><span className="empty-symbol"><EditOutlined /></span><h3>{title}</h3><p>{description}</p>
    {action && <button className="button button--quiet" onClick={onAction}>{action}<ArrowRightOutlined /></button>}</div>
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [today, setToday] = useState(localDateFromInstant())
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace)
  const [draft, setDraft] = useState<CaptureDraft>()
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [storageStatus, setStorageStatus] = useState('仅保存在这台设备')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<'habit' | 'storage' | 'ai' | 'examples' | 'delete' | 'removeExamples' | null>(null)
  const [expandedHabits, setExpandedHabits] = useState(false)
  const draftWrites = useRef<Promise<void>>(Promise.resolve())
  const draftWriteVersion = useRef(0)
  const lastSavedDate = useRef<string | undefined>(undefined)
  const scrollPositions = useRef<Record<string, number>>({})
  const validSelected = params.get('date') ?? today
  const selectedDate = isValidDate(validSelected) ? validSelected : today
  const monthParam = params.get('month')
  const calendarMonth = monthParam && isValidDate(monthParam + '-01') ? monthParam + '-01' : monthStart(selectedDate)
  const filter = (['NOTE', 'ACTIVITY', 'MEAL', 'IDEA'].includes(params.get('type') ?? '') ? params.get('type') : '') as EntryType | ''
  const keyword = params.get('q') ?? ''
  const routeKey = location.pathname + location.search

  useEffect(() => {
    let cancelled = false
    Promise.all([readLocal<Workspace>('personal'), readLocal<CaptureDraft>('capture')]).then(([saved, savedDraft]) => {
      if (cancelled) return
      setWorkspace(saved ?? emptyWorkspace)
      setDraft(savedDraft)
      setLoaded(true)
    }).catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : '本机内容读取失败') })
    return () => { cancelled = true }
  }, [])
  useEffect(() => { const timer = window.setInterval(() => setToday(localDateFromInstant()), 60000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3600); return () => window.clearTimeout(timer) }, [toast])
  useLayoutEffect(() => {
    window.scrollTo(0, scrollPositions.current[routeKey] ?? 0)
    return () => { scrollPositions.current[routeKey] = window.scrollY }
  }, [routeKey])

  const entries = [...workspace.entries].sort((a, b) => b.localDate.localeCompare(a.localDate) || b.occurredAt.localeCompare(a.occurredAt))
  const todayEntries = entries.filter(e => e.localDate === today)
  const filtered = entries.filter(e => (!filter || e.type === filter) && (!keyword || [e.title, e.content, e.rawText, ...(e.tags ?? [])].join(' ').toLowerCase().includes(keyword.toLowerCase())))
  const selectedEntries = filtered.filter(e => e.localDate === selectedDate)
  const currentEntry = location.pathname.startsWith('/entries/') ? entries.find(e => encodeURIComponent(e.id) === location.pathname.slice(9)) : undefined
  const currentHabit = location.pathname.startsWith('/habits/') ? workspace.habits.find(h => h.id === location.pathname.slice(8)) : undefined
  const origin = (location.state as { from?: string } | null)?.from
  const back = () => navigate(origin && origin.startsWith('/') && !origin.startsWith('//') ? origin : '/today', { replace: true })
  const notifyError = (e: unknown) => setToast(e instanceof Error ? e.message : '没有保存成功，请重试。')

  function setCalendar(next: Record<string, string>) {
    const updated = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) value ? updated.set(key, value) : updated.delete(key)
    setParams(updated, { replace: true })
  }

  function updateDraft(value: CaptureDraft) {
    setDraft(value)
    setStorageStatus('正在保存本机草稿…')
    const version = ++draftWriteVersion.current
    const task = draftWrites.current.catch(() => {}).then(() => writeLocal('capture', value))
    draftWrites.current = task
    void task.then(() => { if (version === draftWriteVersion.current) setStorageStatus('本机草稿已保存') })
      .catch(() => { if (version === draftWriteVersion.current) setStorageStatus('草稿保存失败，请复制正文留存') })
  }

  async function updateWorkspace(transform: (current: Workspace) => Workspace) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const next = transform(workspace)
      const saved = await commitWorkspace(next, workspace.revision ?? 0)
      setWorkspace(saved)
    } finally { busyRef.current = false; setBusy(false) }
  }

  function openCapture(date = today, type: EntryType = 'NOTE', entry?: Entry) {
    if (busyRef.current) return
    if (draft?.content.trim()) {
      if (!entry || draft.entryId !== entry.id) setToast('上次还有一段草稿，先把它写完吧。')
      navigate('/capture', { state: { from: routeKey } })
      return
    }
    const next: CaptureDraft = entry ? {
      id: crypto.randomUUID(), entryId: entry.id, content: entry.content || entry.rawText || entry.title, type: entry.type,
      date: entry.localDate, duration: String(entry.durationMinutes ?? ''), tags: (entry.tags ?? []).join('，'),
      occurredAt: entry.occurredAt, timePrecision: entry.timePrecision ?? 'INSTANT',
    } : { id: crypto.randomUUID(), content: '', type, date, duration: '', tags: '', timePrecision: date === today ? 'INSTANT' : 'DATE' }
    updateDraft(next)
    navigate('/capture', { state: { from: routeKey } })
  }

  async function saveCapture() {
    if (!draft || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await draftWrites.current.catch(() => {})
      const previous = draft.entryId ? workspace.entries.find(e => e.id === draft.entryId) : undefined
      if (draft.entryId && !previous) throw new Error('这条记录已经不存在，正文仍保留在草稿中。')
      const now = new Date().toISOString()
      const occurredAt = draft.timePrecision === 'DATE' ? draft.date + 'T12:00:00+08:00' : draft.occurredAt ?? now
      const content = draft.content.trim()
      const entry: Entry = {
        ...previous, id: previous?.id ?? draft.id, type: draft.type, title: content.slice(0, 40),
        content, rawText: previous?.rawText ?? content, localDate: draft.date, occurredAt,
        source: previous?.source ?? 'MANUAL', aiAllowed: false,
        createdAt: previous?.createdAt ?? now, updatedAt: now, version: (previous?.version ?? -1) + 1,
        timePrecision: draft.timePrecision,
        durationMinutes: draft.type === 'ACTIVITY' && draft.duration ? Number(draft.duration) : undefined,
        tags: [...new Set(draft.tags.split(/[,，\s]+/).filter(Boolean))],
      }
      const next = { ...workspace, entries: [entry, ...workspace.entries.filter(e => e.id !== entry.id)] }
      const saved = await commitWorkspace(next, workspace.revision ?? 0, true)
      lastSavedDate.current = draft.date
      setWorkspace(saved)
      setDraft(undefined)
      setStorageStatus('仅保存在这台设备')
      setToast(previous ? '修改已保存在本机' : '这一刻，已留在本机')
      navigate('/calendar?date=' + draft.date, { replace: true })
    } finally { busyRef.current = false; setBusy(false) }
  }

  async function toggleHabit(habit: Habit) {
    await updateWorkspace(current => ({ ...current, habits: current.habits.map(h => h.id === habit.id ? {
      ...h, checkins: h.checkins.includes(today) ? h.checkins.filter(d => d !== today) : [...h.checkins, today],
    } : h) }))
  }

  function habitRows(all = false) {
    const active = workspace.habits.filter(h => !h.paused)
    return <>{(all || expandedHabits ? active : active.slice(0, 3)).map(habit => {
      const checked = habit.checkins.includes(today)
      const count = habit.checkins.filter(d => d >= weekStart(today) && d <= today).length
      return <div className="habit-row" key={habit.id}>
        <button className={'habit-check' + (checked ? ' checked' : '')} aria-label={(checked ? '撤销' : '完成') + habit.name} aria-pressed={checked} disabled={busy}
          onClick={() => void toggleHabit(habit).catch(notifyError)}>{checked && <CheckOutlined />}</button>
        <div><Link to={'/habits/' + habit.id}>{habit.name}</Link><small>这周 {count} / {habit.targetPerWeek} 次{checked ? ' · 今天已完成' : ''}</small></div>
        {all && <button className="text-button muted" disabled={busy} onClick={() => void updateWorkspace(w => ({ ...w, habits: w.habits.map(h => h.id === habit.id ? { ...h, paused: true } : h) })).catch(notifyError)}>暂停</button>}
      </div>
    })}
      {!all && active.length > 3 && <button className="text-button full-width" onClick={() => setExpandedHabits(v => !v)}>{expandedHabits ? '收起' : '查看全部 ' + active.length + ' 个小习惯'}</button>}
    </>
  }

  const period = params.get('period') === 'month' ? 'month' : 'week'
  const periodStartParam = params.get('start')
  const periodAnchor = periodStartParam && isValidDate(periodStartParam) ? periodStartParam : today
  const reviewStart = period === 'week' ? weekStart(periodAnchor) : monthStart(periodAnchor)
  const reviewEnd = period === 'week' ? shiftDate(reviewStart, 7) : shiftMonth(reviewStart, 1)
  const reviewEntries = entries.filter(e => e.localDate >= reviewStart && e.localDate < reviewEnd)
  const reviewDays = new Set(reviewEntries.map(e => e.localDate)).size
  const reviewMinutes = reviewEntries.reduce((sum, e) => sum + (e.type === 'ACTIVITY' ? e.durationMinutes ?? 0 : 0), 0)
  const totalDays = Math.round((Date.parse(reviewEnd) - Date.parse(reviewStart)) / 86400000)
  const reviewDayCounts = reviewEntries.reduce<Record<string, number>>((acc, e) => { acc[e.localDate] = (acc[e.localDate] ?? 0) + 1; return acc }, {})
  const viewEntry = (entry: Entry) => navigate('/entries/' + encodeURIComponent(entry.id), { state: { from: routeKey } })
  const navigateCalendar = (date: string) => navigate('/calendar?date=' + date)
  const activeTab = location.pathname.startsWith('/habits') || location.pathname === '/settings' ? '/me' : location.pathname

  function exportData() {
    const file = new Blob([JSON.stringify({ format: 'daylume-local-v1', exportedAt: new Date().toISOString(), timeZone: 'Asia/Shanghai', workspace, draft }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'daylume-' + today + '.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setToast('已生成本机内容导出文件')
  }

  const toastElement = toast && <div className="toast" role="status">{toast}</div>
  if (loadError) return <main className="startup-state"><h1>先把你的内容妥善留住。</h1><p role="alert">{loadError}</p><button className="button button--primary" onClick={() => window.location.reload()}>重新读取</button></main>
  if (!loaded) return <main className="startup-state" role="status"><span className="wordmark">Daylume<span className="brand-period">.</span></span><p>正在打开属于你的日子…</p></main>

  if (location.pathname === '/') return <Navigate to="/today" replace />
  if (['/timeline', '/analytics', '/ideas', '/activities', '/nutrition'].includes(location.pathname)) return <Navigate replace to={location.pathname === '/analytics' ? '/review' : '/calendar' + (location.pathname === '/ideas' ? '?type=IDEA' : location.pathname === '/nutrition' ? '?type=MEAL' : location.pathname === '/activities' ? '?type=ACTIVITY' : '')} />
  if (location.pathname === '/capture') {
    if (!draft) return <Navigate to={lastSavedDate.current ? '/calendar?date=' + lastSavedDate.current : '/today'} replace />
    return <><QuickEntry draft={draft} onChange={updateDraft} onSave={saveCapture} onBack={back} saving={busy} storageStatus={storageStatus} />{toastElement}</>
  }

  return <div className="app-shell">
    <header className="site-header"><Link to="/today" className="wordmark" aria-label="Daylume 首页">Daylume<span className="brand-period">.</span></Link>
      <nav className="desktop-nav" aria-label="主导航">{tabs.map(tab => <Link key={tab.path} to={tab.path} aria-current={activeTab === tab.path ? 'page' : undefined}>{tab.label}</Link>)}</nav>
      <button className="device-badge" onClick={() => setModal('storage')}><span className="status-dot" /> 仅本机</button>
    </header>
    <main className={'app-content' + (location.pathname === '/calendar' ? ' app-content--calendar' : '')} id="main-content">
      {location.pathname === '/today' && <>
        <div className="page-intro"><p className="eyebrow">{dayLabel(today, { weekday: 'long' })}</p><h1>把日子，<br />过成自己的样子<span className="title-dot">。</span></h1><p className="intro-copy">一点小事，一个念头。<br className="mobile-break" /> 都是生活留下的微光。</p></div>
        <section className="capture-invite">
          <div className="invite-top"><span className="tiny-label">此时 · 此刻</span><SunOutlined /></div>
          <button className="invite-prompt" onClick={() => openCapture()}>今天想留下些什么？<span>不用很完整，一句话也很好。</span></button>
          <div className="invite-bottom"><div className="capture-shortcuts">{(['ACTIVITY', 'MEAL', 'IDEA'] as EntryType[]).map(type => {
            const Icon = typeMeta[type].icon
            return <button key={type} onClick={() => openCapture(today, type)}><Icon />{typeMeta[type].label}</button>
          })}</div><button className="button button--primary" onClick={() => openCapture()}>记一笔 <ArrowRightOutlined /></button></div>
        </section>
        {draft?.content.trim() && <button className="draft-reminder" onClick={() => navigate('/capture', { state: { from: routeKey } })}><EditOutlined /><span><strong>还有一段没写完的话</strong><small>继续上次的本机草稿</small></span><ArrowRightOutlined /></button>}
        {workspace.habits.some(h => !h.paused) && <section className="section-block">
          <div className="section-heading"><h2>留一点时间给自己</h2><Link to="/habits">小习惯 <ArrowRightOutlined /></Link></div><div className="habit-card">{habitRows()}</div>
        </section>}
        <section className="section-block"><div className="section-heading"><h2>今天的片段<span className="count-label">{todayEntries.length ? String(todayEntries.length).padStart(2, '0') : ''}</span></h2>
          <Link to={'/calendar?date=' + today}>去日历 <ArrowRightOutlined /></Link></div>
          {todayEntries.length ? <div className="entry-list">{todayEntries.slice(0, 5).map(e => <EntryCard key={e.id} entry={e} onEdit={viewEntry} />)}</div>
            : <EmptyState title="今天的故事，等你写下第一句" description="好吃的一餐，走过的一段路，或是突然冒出的想法。" action="记录一件小事" onAction={() => openCapture()} />}
        </section>
        {!entries.length && <div className="first-day-footer"><span>不知道从哪里开始？</span><button className="text-button" onClick={() => setModal('examples')}>看看示例日记 <ArrowRightOutlined /></button></div>}
        <p className="page-signoff">不必每天精彩，平常也值得记住。</p>
      </>}

      {location.pathname === '/calendar' && <>
        <div className="page-intro page-intro--compact"><p className="eyebrow">DAYS, WELL KEPT</p><h1>翻一翻，走过的日子。</h1><p className="intro-copy">总有一些片段，值得再遇见一次。</p></div>
        <div className="calendar-layout"><div><MonthCalendar entries={filtered} selectedDate={selectedDate} month={calendarMonth} onMonthChange={month => setCalendar({ month: month.slice(0, 7) })} onSelectDate={date => setCalendar({ date, month: date.slice(0, 7) })} />
          <div className="calendar-filter"><label className="search-field"><SearchOutlined /><input aria-label="搜索记录" placeholder="找一句话、一个念头…" value={keyword} onChange={e => setCalendar({ q: e.target.value })} />{keyword && <button className="icon-button" aria-label="清除搜索" onClick={() => setCalendar({ q: '' })}><CloseOutlined /></button>}</label>
            <div className="filter-chips">{(['', 'NOTE', 'ACTIVITY', 'MEAL', 'IDEA'] as const).map(type => <button key={type} aria-pressed={filter === type} className={filter === type ? 'selected' : ''} onClick={() => setCalendar({ type })}>{type ? typeMeta[type].label : '全部'}</button>)}</div>
          </div></div>
          <section className="calendar-records"><div className="section-heading"><h2>{dayLabel(selectedDate)}<span className="count-label">{selectedEntries.length} 条</span></h2>{selectedDate <= today && <button className="text-button" onClick={() => openCapture(selectedDate)}><PlusOutlined />{selectedDate === today ? '记一笔' : '补记'}</button>}</div>
            {selectedEntries.length ? selectedEntries.map(e => <EntryCard key={e.id} entry={e} onEdit={viewEntry} />)
              : <EmptyState title={keyword || filter ? '这一天没有匹配的片段' : selectedDate > today ? '未来的故事，还在路上' : '这一天，还留着一页空白'}
                description={keyword || filter ? '试着换个词，或清除筛选再看看。' : selectedDate > today ? '慢慢来，等它发生时再记下。' : '想起来的时候，再把它补上就好。'}
                action={keyword || filter ? '清除筛选' : selectedDate <= today ? '补记这一天' : undefined}
                onAction={() => keyword || filter ? setCalendar({ q: '', type: '' }) : openCapture(selectedDate)} />}
          </section>
        </div>
        {keyword && <section className="section-block"><div className="section-heading"><h2>其他日子里的相遇</h2><span className="muted small">{filtered.filter(e => e.localDate !== selectedDate).length} 条</span></div>
          <Timeline entries={filtered.filter(e => e.localDate !== selectedDate)} onEdit={viewEntry} /></section>}
      </>}

      {location.pathname === '/review' && <>
        <div className="page-intro page-intro--compact"><p className="eyebrow">A LITTLE LOOK BACK</p><h1>原来，已经走了这么远。</h1><p className="intro-copy">把忙碌放一放，看看自己的生活。</p></div>
        <div className="review-controls"><div className="segmented">{(['week', 'month'] as const).map(value => <button key={value} aria-pressed={period === value} className={period === value ? 'selected' : ''} onClick={() => setParams({ period: value, start: periodAnchor }, { replace: true })}>{value === 'week' ? '一周' : '一月'}</button>)}</div>
          <div className="period-picker"><button className="icon-button" aria-label="上一个周期" onClick={() => setParams({ period, start: period === 'week' ? shiftDate(reviewStart, -7) : shiftMonth(reviewStart, -1) }, { replace: true })}><LeftOutlined /></button><span>{dayLabel(reviewStart)} — {dayLabel(shiftDate(reviewEnd, -1))}</span><button className="icon-button" aria-label="下一个周期" disabled={reviewEnd > today} onClick={() => setParams({ period, start: reviewEnd }, { replace: true })}><RightOutlined /></button></div>
        </div>
        <section className="review-story"><span className="tiny-label">属于你的{period === 'week' ? '这一周' : '这个月'}</span>
          <h2>{reviewDays ? <>有 <em>{reviewDays}</em> 天，<br />你为生活留下了注脚。</> : <>每一个平常的日子，<br />都可以成为故事。</>}</h2>
          <p>{reviewEntries.length ? '共留下 ' + reviewEntries.length + ' 个片段' + (reviewMinutes ? '，其中有 ' + reviewMinutes + ' 分钟的专注投入。' : '。不多不少，都是你的生活。') : '记下第一件小事，再回来看看它们如何连成线。'}</p>
          <div className={'rhythm-grid' + (period === 'month' ? ' rhythm-grid--month' : '')} aria-label="本周期记录节奏">
            {Array.from({ length: totalDays }, (_, i) => { const date = shiftDate(reviewStart, i); const count = reviewDayCounts[date] ?? 0
              return <button key={date} className={(count ? 'has-record ' : '') + (date === today ? 'is-today' : '')} aria-label={dayLabel(date) + '，' + count + ' 条记录'} onClick={() => navigateCalendar(date)}><span>{period === 'week' ? ['一', '二', '三', '四', '五', '六', '日'][i] : Number(date.slice(-2))}</span><span className="rhythm-mark">{count ? <CheckOutlined /> : '·'}</span></button>
            })}
          </div><small>点一个日子，回到当时。空白不是缺席，只是还没记下。</small>
        </section>
        <section className="section-block"><div className="section-heading"><h2>值得再读一次</h2><span className="muted small">来自你的原始记录</span></div>
          {reviewEntries.length ? reviewEntries.slice(0, 4).map(e => <EntryCard entry={e} onEdit={viewEntry} key={e.id} />) : <EmptyState title="回顾，从一条记录开始" description="这里会留下你写过的话，不需要 AI 也能慢慢翻看。" action="记下此刻" onAction={() => openCapture()} />}
        </section>
        <button className="ai-preview" onClick={() => setModal('ai')}><span className="ai-preview-icon"><ReadOutlined /></span><span><strong>再多看懂自己一点</strong><small>了解 AI 周回顾 · 尚未接入</small></span><ArrowRightOutlined /></button>
      </>}

      {(location.pathname === '/me' || location.pathname === '/settings') && <>
        <div className="page-intro page-intro--compact"><p className="eyebrow">YOUR OWN LITTLE CORNER</p><h1>这里，只属于你。</h1><p className="intro-copy">内容由你留下，也由你掌握。</p></div>
        <section className="profile-card"><span className="profile-avatar"><UserOutlined /></span><div><h2>生活的记录者</h2><p>已留下 {entries.filter(e => !e.isExample).length} 个自己的片段</p></div><LockOutlined /></section>
        <div className="settings-group">
          <button className="settings-row" onClick={() => draft ? navigate('/capture', { state: { from: routeKey } }) : openCapture()}><EditOutlined /><span>本机草稿<small>{draft?.content.trim() ? draft.content.slice(0, 28) : '想到什么，随时接着写'}</small></span><RightOutlined /></button>
          <Link className="settings-row" to="/habits"><CheckOutlined /><span>我的小习惯<small>{workspace.habits.filter(h => !h.paused).length} 个正在慢慢养成</small></span><RightOutlined /></Link>
          <button className="settings-row" onClick={exportData}><DownloadOutlined /><span>导出我的内容<small>记录、习惯和当前草稿 · JSON</small></span><RightOutlined /></button>
        </div>
        <div className="settings-group">
          <button className="settings-row" onClick={() => setModal('storage')}><LockOutlined /><span>存储与隐私<small>仅当前浏览器 · 未上传云端</small></span><RightOutlined /></button>
          <button className="settings-row" onClick={() => setModal('ai')}><ReadOutlined /><span>AI 与我的内容<small>尚未连接 · 不会发送内容</small></span><RightOutlined /></button>
          <div className="settings-row"><SettingOutlined /><span>记录时区<small>Asia/Shanghai · 中国标准时间</small></span><span className="muted small">UTC+8</span></div>
        </div>
        <div className="settings-group">
          <button className="settings-row" disabled={busy} onClick={() => setModal('examples')}><ReadOutlined /><span>看看示例日记<small>示例会单独标注，不是你的真实记录</small></span><RightOutlined /></button>
          {entries.some(e => e.isExample) && <button className="settings-row" disabled={busy} onClick={() => setModal('removeExamples')}><DeleteOutlined /><span>移除示例记录<small>保留你自己写下的全部内容</small></span><RightOutlined /></button>}
        </div>
        <p className="profile-footer"><span className="wordmark">Daylume<span className="brand-period">.</span></span><br />让每一天，留下一点微光。<small>手机优先体验版 · 本机保存</small></p>
      </>}

      {location.pathname === '/habits' && <>
        <button className="text-button back-link" onClick={() => navigate('/me')}><ArrowLeftOutlined />我的</button>
        <div className="page-intro page-intro--compact"><p className="eyebrow">ONE SMALL STEP</p><h1>慢慢来，也会长大。</h1><p className="intro-copy">不急着变成谁，先照顾好自己。</p></div>
        <div className="section-heading"><h2>今天的小习惯</h2><button className="text-button" onClick={() => setModal('habit')}><PlusOutlined />添加</button></div>
        {workspace.habits.some(h => !h.paused) ? <div className="habit-card">{habitRows(true)}</div>
          : <EmptyState title="从一件轻松的小事开始" description="读几页书、出门走走，给自己一点温柔的期待。" action="添加小习惯" onAction={() => setModal('habit')} />}
        {workspace.habits.some(h => h.paused) && <section className="section-block"><h2>暂时歇一歇</h2><div className="habit-card">{workspace.habits.filter(h => h.paused).map(h => <div className="habit-row" key={h.id}><span className="muted">{h.name}</span><button className="text-button" disabled={busy} onClick={() => void updateWorkspace(w => ({ ...w, habits: w.habits.map(item => item.id === h.id ? { ...item, paused: false } : item) })).catch(notifyError)}>继续养成</button></div>)}</div></section>}
      </>}

      {location.pathname.startsWith('/habits/') && (currentHabit ? <>
        <button className="text-button back-link" onClick={() => navigate('/habits')}><ArrowLeftOutlined />小习惯</button>
        <div className="page-intro page-intro--compact"><p className="eyebrow">ONE DAY AT A TIME</p><h1>{currentHabit.name}</h1><p className="intro-copy">每周 {currentHabit.targetPerWeek} 次的小约定 · 已留下 {currentHabit.checkins.length} 次行动</p></div>
        <MonthCalendar entries={[]} checkins={currentHabit.checkins} selectedDate={selectedDate} month={calendarMonth} onMonthChange={month => setCalendar({ month: month.slice(0, 7) })} onSelectDate={date => setCalendar({ date, month: date.slice(0, 7) })} />
        <section className="habit-date-action"><h2>{dayLabel(selectedDate)}</h2>
          {selectedDate > today ? <p className="muted small">等这一天到来时，再留下行动吧。</p> : selectedDate < currentHabit.startDate ? <p className="muted small">这个习惯开始于 {dayLabel(currentHabit.startDate)}，之前的日子不需要补上。</p> : currentHabit.paused ? <p className="muted small">这个习惯正在休息，恢复后再继续打卡。</p> : <button className="button button--primary" disabled={busy} onClick={() => void updateWorkspace(w => ({ ...w, habits: w.habits.map(h => h.id === currentHabit.id ? { ...h, checkins: h.checkins.includes(selectedDate) ? h.checkins.filter(d => d !== selectedDate) : [...h.checkins, selectedDate] } : h) })).catch(notifyError)}>{currentHabit.checkins.includes(selectedDate) ? '撤销这天的打卡' : selectedDate === today ? '今天已完成' : '补上这天的打卡'}</button>}
        </section>
      </> : <EmptyState title="这个小习惯已经不在这里" description="回去看看其他正在养成的小习惯吧。" action="返回习惯列表" onAction={() => navigate('/habits')} />)}

      {location.pathname.startsWith('/entries/') && (currentEntry ? <>
        <button className="text-button back-link" onClick={back}><ArrowLeftOutlined />返回</button>
        <div className="page-intro page-intro--compact"><p className="eyebrow">{dayLabel(currentEntry.localDate, { weekday: 'long' })}</p><h1>留住的这一刻。</h1></div>
        <EntryCard entry={currentEntry} /><p className="detail-note"><LockOutlined /> 仅保存在当前浏览器{currentEntry.isExample ? ' · 这是一条示例记录' : ''}</p>
        <div className="detail-actions"><button className="button button--primary" onClick={() => openCapture(currentEntry.localDate, currentEntry.type, currentEntry)}><EditOutlined />编辑记录</button><button className="button button--danger" onClick={() => setModal('delete')}><DeleteOutlined />删除</button></div>
      </> : <EmptyState title="这条记录已经不在这里了" description="你可以回到日历，继续翻看其他日子。" action="返回日历" onAction={() => navigate('/calendar')} />)}
      {!['/today', '/calendar', '/review', '/me', '/settings', '/habits'].includes(location.pathname) && !location.pathname.startsWith('/entries/') && !location.pathname.startsWith('/habits/') && <EmptyState title="这条小路还没有走过" description="回到今天，继续留下新的片段吧。" action="回到今天" onAction={() => navigate('/today')} />}
    </main>
    {!location.pathname.startsWith('/entries/') && <button className="floating-capture" aria-label="记一笔" onClick={() => openCapture(location.pathname === '/calendar' && selectedDate <= today ? selectedDate : today)}><PlusOutlined /><span>记一笔</span></button>}
    <nav className="bottom-nav" aria-label="主导航">{tabs.map(({ path, label, icon: Icon }) => <Link to={path} key={path} aria-current={activeTab === path ? 'page' : undefined}><Icon /><span>{label}</span></Link>)}</nav>
    {toastElement}
    {modal === 'habit' && <HabitForm onClose={() => setModal(null)} onSubmit={async (name, target) => {
      await updateWorkspace(w => ({ ...w, habits: [...w.habits, { id: crypto.randomUUID(), name, targetPerWeek: target, startDate: today, paused: false, checkins: [] }] }))
      setToast('给生活加了一点小期待')
    }} />}
    {modal === 'storage' && <Modal title="内容留在你的设备上" onClose={() => setModal(null)}><div className="modal-copy"><LockOutlined /><p>记录、习惯和草稿保存在当前浏览器的本机数据库，刷新或关闭页面后仍可继续查看。</p><p>当前版本尚未接入账号和云同步。清除浏览器数据、使用无痕模式或更换设备可能使内容无法找回，请定期导出。</p><p>所有内容都不会发送给 AI。</p></div><button className="button button--primary full-width" onClick={() => setModal(null)}>知道了</button></Modal>}
    {modal === 'ai' && <Modal title="AI 回顾，会在你愿意时出现" onClose={() => setModal(null)}><div className="modal-copy"><ReadOutlined /><p>目前可以阅读原文和查看本机计算的周期摘要。Python AI 服务尚未接入，这里不会生成模拟的 AI 分析。</p><p>接入后，只有在你明确同意并选择内容时，才会发送给模型。现在，先把值得记住的日子留下来。</p></div><button className="button button--primary full-width" onClick={() => setModal(null)}>继续记录生活</button></Modal>}
    {(modal === 'examples' || modal === 'removeExamples' || modal === 'delete') && <Modal title={modal === 'delete' ? '删除这一刻的记录？' : modal === 'examples' ? '先看看，日子可以怎样被记下' : '移除示例记录？'} onClose={() => { if (!busy) setModal(null) }}>
      <p className="modal-description">{modal === 'delete' ? '删除后无法从本机恢复。日历与回顾中的对应内容也会移除。' : modal === 'examples' ? '将添加 6 条明确标注的示例记录，方便你体验日历与回顾。你自己的内容会保留，示例也可以单独移除。' : '只移除标为“示例”的记录，你自己写下的内容和习惯都会保留。'}</p>
      <div className="modal-actions"><button className="button button--quiet" disabled={busy} onClick={() => setModal(null)}>先不</button><button className={'button ' + (modal === 'delete' ? 'button--danger' : 'button--primary')} disabled={busy} onClick={() => {
        const action = modal
        void updateWorkspace(w => ({ ...w, entries: action === 'delete' ? w.entries.filter(e => e.id !== currentEntry?.id) : action === 'removeExamples' ? w.entries.filter(e => !e.isExample) : [...w.entries.filter(e => !e.isExample), ...exampleEntries()] }))
          .then(() => { setModal(null); setToast(action === 'delete' ? '记录已从本机删除' : action === 'examples' ? '示例已添加，每条都有标注' : '示例已移除'); if (action === 'delete') back() }).catch(notifyError)
      }}>{busy ? '处理中…' : modal === 'delete' ? '确认删除' : modal === 'examples' ? '添加示例' : '移除示例'}</button></div>
    </Modal>}
  </div>
}
