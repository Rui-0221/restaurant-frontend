import { describe, expect, it } from 'vitest'
import {
  normalizeTableId,
  tableAiOrderPath,
  tableCartPath,
  tableLandingPath,
  tableMenuPath,
} from './tableRoutes'

describe('table route helpers', () => {
  it.each([
    [1, '1'],
    ['1', '1'],
    ['001', '1'],
  ])('normalizes valid table id %p to %p', (value, expected) => {
    expect(normalizeTableId(value)).toBe(expected)
  })

  it.each([0, -1, '1.5', 'abc', '', null, undefined])('rejects invalid table id %p', (value) => {
    expect(normalizeTableId(value)).toBeNull()
  })

  it('builds scoped customer paths from normalized ids', () => {
    expect(tableLandingPath('001')).toBe('/table/1')
    expect(tableMenuPath(1)).toBe('/table/1/menu')
    expect(tableCartPath('1')).toBe('/table/1/cart')
    expect(tableAiOrderPath('001')).toBe('/table/1/ai-order')
  })
})
