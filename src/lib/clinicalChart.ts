import type { VitalSign, Problem } from '../types'

/** Soft clinical range checks — returns warning strings, not hard errors */
export function vitalWarnings(v: Partial<VitalSign>): string[] {
  const w: string[] = []
  if (v.temperatureC != null && (v.temperatureC < 35 || v.temperatureC > 41)) {
    w.push('Temperature outside typical range (35–41°C)')
  }
  if (v.heartRate != null && (v.heartRate < 40 || v.heartRate > 180)) {
    w.push('Heart rate outside typical range (40–180 bpm)')
  }
  if (v.respiratoryRate != null && (v.respiratoryRate < 8 || v.respiratoryRate > 40)) {
    w.push('Respiratory rate outside typical range (8–40)')
  }
  if (v.systolicBp != null && (v.systolicBp < 70 || v.systolicBp > 220)) {
    w.push('Systolic BP outside typical range (70–220)')
  }
  if (v.diastolicBp != null && (v.diastolicBp < 40 || v.diastolicBp > 130)) {
    w.push('Diastolic BP outside typical range (40–130)')
  }
  if (v.spo2 != null && (v.spo2 < 70 || v.spo2 > 100)) {
    w.push('SpO₂ outside typical range (70–100%)')
  }
  return w
}

export function hasAnyVitalMeasurement(v: Partial<VitalSign>): boolean {
  return [
    v.temperatureC,
    v.heartRate,
    v.respiratoryRate,
    v.systolicBp,
    v.diastolicBp,
    v.spo2,
    v.weightKg,
    v.heightCm,
  ].some((x) => x != null && !Number.isNaN(Number(x)))
}

export function formatBp(v: Pick<VitalSign, 'systolicBp' | 'diastolicBp'>): string {
  if (v.systolicBp == null && v.diastolicBp == null) return '—'
  return `${v.systolicBp ?? '—'}/${v.diastolicBp ?? '—'}`
}

export function activeProblems(problems: Problem[]): Problem[] {
  return problems.filter((p) => p.status === 'active')
}

export function canResolveProblem(p: Problem | undefined): string | null {
  if (!p) return 'Problem not found'
  if (p.status === 'resolved') return 'Problem already resolved'
  return null
}
