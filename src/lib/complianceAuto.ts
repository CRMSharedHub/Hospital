/**
 * Auto-detect compliance checklist progress from runtime config (Phase D automation).
 */

import { isSupabaseConfigured } from './supabase'
import { isEncryptionConfigured } from './encryption'
import { isRealSsoAvailable } from './sso'
import { describeKmsStatus } from './kms'
import type { ComplianceStatus } from '../types'

export interface ComplianceAutoHint {
  key: string
  suggestedStatus: ComplianceStatus
  reason: string
}

export function detectComplianceHints(): ComplianceAutoHint[] {
  const hints: ComplianceAutoHint[] = []
  const kms = describeKmsStatus()

  hints.push({
    key: 'encryption_in_transit',
    suggestedStatus: 'done',
    reason: 'App assumes HTTPS in production hosting',
  })

  hints.push({
    key: 'access_control',
    suggestedStatus: 'done',
    reason: 'RBAC + MFA paths exist in app',
  })

  hints.push({
    key: 'audit_logging',
    suggestedStatus: 'done',
    reason: 'audit_log table + UI present',
  })

  hints.push({
    key: 'dlp_exports',
    suggestedStatus: 'done',
    reason: 'exportCSV/JSON redact by default + audit on export',
  })

  if (isSupabaseConfigured) {
    hints.push({
      key: 'encryption_at_rest',
      suggestedStatus: kms.configured || isEncryptionConfigured() ? 'done' : 'in_progress',
      reason: 'Supabase configured; set ENCRYPTION_KEY / kms-unwrap for done',
    })
    hints.push({
      key: 'retention_policy',
      suggestedStatus: 'in_progress',
      reason: 'Apply phase-a-cron.sql (pg_cron) or Edge cron — then mark done',
    })
  } else {
    hints.push({
      key: 'encryption_at_rest',
      suggestedStatus: 'pending',
      reason: 'Supabase not configured',
    })
  }

  if (isRealSsoAvailable()) {
    hints.push({
      key: 'sso_scim',
      suggestedStatus: 'in_progress',
      reason: 'VITE_SSO_PROVIDER set — complete SCIM token + IdP mapping',
    })
  } else {
    hints.push({
      key: 'sso_scim',
      suggestedStatus: 'pending',
      reason: 'Set VITE_SSO_PROVIDER and enable Supabase Auth provider',
    })
  }

  hints.push({
    key: 'baa_signed',
    suggestedStatus: 'pending',
    reason: 'Legal — docs/compliance/BAA_CHECKLIST.md (cannot auto-complete)',
  })
  hints.push({
    key: 'breach_plan',
    suggestedStatus: 'in_progress',
    reason: 'Template ready: docs/compliance/BREACH_PLAYBOOK.md — drill then mark done',
  })
  hints.push({
    key: 'workforce_training',
    suggestedStatus: 'in_progress',
    reason: 'Template ready: docs/compliance/WORKFORCE_TRAINING.md',
  })

  return hints
}
