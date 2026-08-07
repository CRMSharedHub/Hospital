# Breach / incident response playbook (template)

Fill blanks before go-live. Keep a printed copy offline.

## Severity

| Level | Example | Response time |
|-------|---------|---------------|
| Sev-1 | Confirmed PHI exfiltration | Immediate |
| Sev-2 | Suspected unauthorized access | < 4 hours |
| Sev-3 | Misdirected email / device loss | < 24 hours |

## Immediate actions (first hour)

1. [ ] Contain: revoke keys, disable user, rotate `ENCRYPTION_KEY` / anon if leaked  
2. [ ] Preserve logs: Supabase Auth, Edge, `audit_log`, hosting access logs  
3. [ ] Notify incident lead: __________  
4. [ ] Do **not** wipe evidence before imaging  

## Investigation

1. [ ] Timeline of access (who / what / when)  
2. [ ] Affected patient IDs (count, not full dump in email)  
3. [ ] Root cause + fix  

## Notification

- [ ] Legal counsel: __________  
- [ ] Regulator (if required by jurisdiction) within: __________ hours  
- [ ] Affected individuals (template letter): __________  
- [ ] Vendors under BAA notified  

## Recovery

1. [ ] Patch / rotate credentials  
2. [ ] Restore from PITR if integrity lost  
3. [ ] Post-incident review within 14 days  
4. [ ] Update `/compliance` → `breach_plan` = **done** after first drill  

## Drill

Schedule tabletop exercise: date __________ / facilitator __________  
