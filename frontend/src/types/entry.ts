export type EntryType = 'ACTIVITY' | 'MEAL' | 'IDEA' | 'NOTE'

export interface Entry {
  id: string
  type: EntryType
  title: string
  rawText?: string
  content?: string
  occurredAt: string
  localDate: string
  source: 'MANUAL' | 'AI_DRAFT' | 'IMPORT'
  aiAllowed: boolean
  createdAt: string
  updatedAt: string
  version: number
  timePrecision?: 'INSTANT' | 'DATE'
  durationMinutes?: number
  tags?: string[]
  isExample?: boolean
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface CreateEntryRequest {
  title: string
  rawText?: string
  content?: string
  occurredAt: string
  type: EntryType
  aiAllowed: boolean
}
