/**
 * Phase B5 — clinical document HTML for browser print (no PDF lib dependency).
 */

export interface RxDocInput {
  hospitalName?: string
  patientName: string
  patientId: number
  age?: number
  allergies?: string[]
  prescribedBy?: string
  date?: string
  lines: { medicineName: string; dose: string; quantity?: number; notes?: string }[]
}

export interface DischargeDocInput {
  hospitalName?: string
  patientName: string
  patientId: number
  age?: number
  admitReason?: string
  admittedAt?: string
  dischargedAt?: string
  problems?: { display: string; code?: string; status: string }[]
  medications?: { name: string; dosage: string }[]
  vitalsSummary?: string
  instructions?: string
  signedBy?: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildRxHtml(doc: RxDocInput): string {
  const hospital = esc(doc.hospitalName ?? 'Dynex360 Hospital')
  const date = esc(doc.date ?? new Date().toISOString().slice(0, 10))
  const allergies = doc.allergies?.length ? esc(doc.allergies.join(', ')) : 'NKDA'
  const rows = doc.lines
    .map(
      (l, i) =>
        `<tr><td>${i + 1}</td><td>${esc(l.medicineName)}</td><td>${esc(l.dose)}</td><td>${l.quantity ?? '—'}</td><td>${esc(l.notes ?? '')}</td></tr>`,
    )
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Prescription</title>
<style>
  body{font-family:Georgia,serif;padding:32px;color:#111;max-width:720px;margin:0 auto}
  h1{font-size:22px;margin:0} .meta{color:#555;font-size:13px;margin:8px 0 24px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
  th,td{border:1px solid #ccc;padding:8px;text-align:start}
  th{background:#f5f5f5}
  .sign{margin-top:48px;font-size:14px}
  @media print{button{display:none}}
</style></head><body>
  <h1>${hospital}</h1>
  <div class="meta">Prescription (Rx) · ${date}</div>
  <p><strong>Patient:</strong> ${esc(doc.patientName)} (#${doc.patientId})
  ${doc.age != null ? ` · Age ${doc.age}` : ''}<br/>
  <strong>Allergies:</strong> ${allergies}</p>
  <table><thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Qty</th><th>Notes</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="sign">Prescribed by: ${esc(doc.prescribedBy ?? '—')}<br/><br/>Signature: __________________</div>
  <script>window.onload=()=>window.print()</script>
</body></html>`
}

export function buildDischargeHtml(doc: DischargeDocInput): string {
  const hospital = esc(doc.hospitalName ?? 'Dynex360 Hospital')
  const problems = (doc.problems ?? [])
    .map((p) => `<li>${esc(p.display)}${p.code ? ` (${esc(p.code)})` : ''} — ${esc(p.status)}</li>`)
    .join('')
  const meds = (doc.medications ?? [])
    .map((m) => `<li>${esc(m.name)} — ${esc(m.dosage)}</li>`)
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Discharge Summary</title>
<style>
  body{font-family:Georgia,serif;padding:32px;color:#111;max-width:720px;margin:0 auto}
  h1{font-size:22px;margin:0} h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .meta{color:#555;font-size:13px;margin:8px 0 24px}
  ul{margin:0;padding-inline-start:20px;font-size:14px}
  .sign{margin-top:48px;font-size:14px}
  @media print{button{display:none}}
</style></head><body>
  <h1>${hospital}</h1>
  <div class="meta">Discharge Summary</div>
  <p><strong>Patient:</strong> ${esc(doc.patientName)} (#${doc.patientId})
  ${doc.age != null ? ` · Age ${doc.age}` : ''}</p>
  <p><strong>Admission:</strong> ${esc(doc.admittedAt ?? '—')}
  ${doc.admitReason ? ` · ${esc(doc.admitReason)}` : ''}<br/>
  <strong>Discharge:</strong> ${esc(doc.dischargedAt ?? new Date().toISOString().slice(0, 10))}</p>
  <h2>Problems</h2>
  <ul>${problems || '<li>None recorded</li>'}</ul>
  <h2>Discharge medications</h2>
  <ul>${meds || '<li>None recorded</li>'}</ul>
  ${doc.vitalsSummary ? `<h2>Last vitals</h2><p>${esc(doc.vitalsSummary)}</p>` : ''}
  <h2>Instructions</h2>
  <p>${esc(doc.instructions ?? 'Follow up with primary physician as advised.')}</p>
  <div class="sign">Signed by: ${esc(doc.signedBy ?? '—')}<br/><br/>Signature: __________________</div>
  <script>window.onload=()=>window.print()</script>
</body></html>`
}

export function printClinicalHtml(html: string): void {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900')
  if (!w) throw new Error('Pop-up blocked — allow pop-ups to print clinical documents')
  w.document.open()
  w.document.write(html)
  w.document.close()
}
