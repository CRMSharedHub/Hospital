#!/usr/bin/env node
/**
 * Print / optionally deploy Phase A–D ops artifacts.
 * Usage:
 *   node scripts/ops-automate.mjs print
 *   node scripts/ops-automate.mjs deploy-functions   # requires: supabase link
 *   node scripts/ops-automate.mjs verify-env
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Ordered SQL files for a greenfield → enterprise project */
export const SQL_ORDER = [
  'supabase/schema.sql',
  'supabase/security-hardening.sql',
  'supabase/phase-a-compliance.sql',
  'supabase/phase-c-payments.sql',
  'supabase/phase-c2-interop.sql',
  'supabase/phase-c3-remaining.sql',
  'supabase/phase-b1-adt.sql',
  'supabase/phase-b2-clinical.sql',
  'supabase/phase-b3-cpoe.sql',
  'supabase/phase-b4-emar.sql',
  'supabase/phase-d-enterprise.sql',
  'supabase/phase-d2-facility-rls.sql',
  'supabase/phase-d3-facility-clinical-rls.sql',
  'supabase/phase-a-cron.sql',
]

export const EDGE_FUNCTIONS = [
  { name: 'medical-files', noVerifyJwt: false },
  { name: 'retention-purge', noVerifyJwt: true },
  { name: 'payments', noVerifyJwt: true },
  { name: 'fhir-r4', noVerifyJwt: false },
  { name: 'mllp-ingest', noVerifyJwt: false },
  { name: 'nphies', noVerifyJwt: false },
  { name: 'scim', noVerifyJwt: true },
  { name: 'kms-unwrap', noVerifyJwt: false },
]

const cmd = process.argv[2] || 'print'

function printSqlOrder() {
  console.log('# SQL apply order (Dashboard → SQL Editor)\n')
  SQL_ORDER.forEach((f, i) => {
    const ok = existsSync(join(root, f))
    console.log(`${i + 1}. ${f}${ok ? '' : '  ⚠ MISSING'}`)
  })
  console.log('\n# Edge functions\n')
  EDGE_FUNCTIONS.forEach((f) => {
    console.log(`- ${f.name}${f.noVerifyJwt ? ' (--no-verify-jwt)' : ''}`)
  })
  console.log('\n# Secrets to set\n')
  console.log('supabase secrets set ENCRYPTION_KEY="<min-32-chars>"')
  console.log('supabase secrets set RETENTION_CRON_SECRET="<random>"')
  console.log('supabase secrets set SCIM_TOKEN="<random>"')
  console.log('# optional: PAYMENT_PROVIDER, STRIPE_*, APP_ORIGIN')
}

function verifyEnv() {
  const candidates = ['.env.local', '.env', '.env.e2e']
  let found = null
  for (const c of candidates) {
    if (existsSync(join(root, c))) {
      found = c
      break
    }
  }
  console.log(`Env file: ${found ?? '(none — copy .env.example)'}`)
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  const optional = [
    'VITE_SSO_PROVIDER',
    'VITE_ENCRYPTION_KEY',
    'VITE_ERROR_ENDPOINT',
    'VITE_VITALS_ENDPOINT',
    'VITE_PAYMENT_PROVIDER',
  ]
  if (!found) {
    console.log('Status: demo mode likely (no env file)')
    return
  }
  const text = readFileSync(join(root, found), 'utf8')
  for (const k of required) {
    const set = new RegExp(`^${k}=.+`, 'm').test(text) && !text.includes(`${k}=your-`)
    console.log(`${k}: ${set ? 'ok' : 'missing/placeholder'}`)
  }
  for (const k of optional) {
    const set = new RegExp(`^${k}=.+`, 'm').test(text)
    console.log(`${k}: ${set ? 'set' : 'unset (optional)'}`)
  }
}

function deployFunctions() {
  if (!existsSync(join(root, 'supabase', 'config.toml'))) {
    console.error('supabase/config.toml missing')
    process.exit(1)
  }
  for (const f of EDGE_FUNCTIONS) {
    const args = ['functions', 'deploy', f.name]
    if (f.noVerifyJwt) args.push('--no-verify-jwt')
    console.log(`\n→ supabase ${args.join(' ')}`)
    const r = spawnSync('supabase', args, { cwd: root, stdio: 'inherit', shell: true })
    if (r.status !== 0) {
      console.error(`Failed deploying ${f.name} (is CLI installed and project linked?)`)
      process.exit(r.status ?? 1)
    }
  }
  console.log('\nAll listed Edge functions deployed (or already up to date).')
}

if (cmd === 'print' || cmd === 'sql') printSqlOrder()
else if (cmd === 'verify-env') verifyEnv()
else if (cmd === 'deploy-functions') deployFunctions()
else {
  console.log(`Unknown command: ${cmd}`)
  console.log('Use: print | verify-env | deploy-functions')
  process.exit(1)
}
