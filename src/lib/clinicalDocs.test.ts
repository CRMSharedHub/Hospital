import { describe, expect, it } from 'vitest'
import { buildRxHtml, buildDischargeHtml } from './clinicalDocs'

describe('clinicalDocs', () => {
  it('builds Rx HTML with patient and lines', () => {
    const html = buildRxHtml({
      patientName: 'Test Patient',
      patientId: 101,
      allergies: ['Penicillin'],
      lines: [{ medicineName: 'Metformin', dose: '500mg', quantity: 30 }],
    })
    expect(html).toContain('Prescription')
    expect(html).toContain('Test Patient')
    expect(html).toContain('Metformin')
    expect(html).toContain('Penicillin')
  })

  it('escapes HTML in discharge', () => {
    const html = buildDischargeHtml({
      patientName: 'A <b>B</b>',
      patientId: 1,
      problems: [{ display: 'HTN', status: 'active' }],
    })
    expect(html).toContain('A &lt;b&gt;B&lt;/b&gt;')
    expect(html).toContain('Discharge Summary')
  })
})
