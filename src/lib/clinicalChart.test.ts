import { describe, expect, it } from 'vitest'
import {
  vitalWarnings,
  hasAnyVitalMeasurement,
  formatBp,
  activeProblems,
  canResolveProblem,
} from './clinicalChart'
import type { Problem, VitalSign } from '../types'

describe('clinicalChart', () => {
  it('requires at least one measurement', () => {
    expect(hasAnyVitalMeasurement({})).toBe(false)
    expect(hasAnyVitalMeasurement({ heartRate: 80 })).toBe(true)
  })

  it('warns on out-of-range vitals', () => {
    expect(vitalWarnings({ temperatureC: 42 }).length).toBeGreaterThan(0)
    expect(vitalWarnings({ heartRate: 72, temperatureC: 37 })).toEqual([])
  })

  it('formats BP', () => {
    expect(formatBp({ systolicBp: 120, diastolicBp: 80 })).toBe('120/80')
    expect(formatBp({} as VitalSign)).toBe('—')
  })

  it('filters active problems and resolve guard', () => {
    const problems: Problem[] = [
      { id: 1, patientId: 1, display: 'A', status: 'active' },
      { id: 2, patientId: 1, display: 'B', status: 'resolved', resolvedDate: '2026-01-01' },
    ]
    expect(activeProblems(problems)).toHaveLength(1)
    expect(canResolveProblem(problems[0])).toBeNull()
    expect(canResolveProblem(problems[1])).toBe('Problem already resolved')
  })
})
