import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/datetime.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } })
const dates = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'))

test('Shanghai date crosses UTC midnight at the business boundary', () => {
  assert.equal(dates.localDateFromInstant('2026-10-20T16:01:00Z'), '2026-10-21')
  assert.equal(dates.localDateFromInstant('2026-10-20T15:59:00Z'), '2026-10-20')
})

test('date-only arithmetic crosses leap days and year boundaries', () => {
  assert.equal(dates.shiftDate('2024-02-28', 1), '2024-02-29')
  assert.equal(dates.shiftDate('2026-12-31', 1), '2027-01-01')
  assert.equal(dates.shiftDate('2026-01-01', -1), '2025-12-31')
})

test('month changes always target day one, even from the 31st', () => {
  assert.equal(dates.shiftMonth('2026-01-31', 1), '2026-02-01')
  assert.equal(dates.shiftMonth('2026-01-31', -1), '2025-12-01')
})

test('Monday week start handles Sundays and year boundaries', () => {
  assert.equal(dates.weekStart('2026-10-25'), '2026-10-19')
  assert.equal(dates.weekStart('2026-10-19'), '2026-10-19')
  assert.equal(dates.weekStart('2027-01-01'), '2026-12-28')
})

test('impossible dates and malformed links are rejected', () => {
  assert.equal(dates.isValidDate('2026-02-29'), false)
  assert.equal(dates.isValidDate('2026-02-31'), false)
  assert.equal(dates.isValidDate('2024-02-29'), true)
  assert.equal(dates.isValidDate('2026-13-01'), false)
  assert.equal(dates.isValidDate('2026-1-01'), false)
  assert.equal(dates.isValidDate('not-a-date'), false)
})

test('date-only labels do not move when the host is in another time zone', () => {
  assert.match(dates.dayLabel('2026-10-21'), /10月21日/)
})
