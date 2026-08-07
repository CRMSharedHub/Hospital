# Business Associate Agreement (BAA) checklist

Use this when claiming HIPAA readiness with US-covered entities. For KSA/GCC-only clinics, adapt to local privacy law and still track vendors that process PHI.

## Vendors that may need a BAA / DPA

- [ ] Supabase (or self-hosted Postgres + auth)
- [ ] Object storage / CDN if separate from Supabase
- [ ] Email / SMS provider (appointment reminders)
- [ ] Error monitoring (Sentry / etc.) if PHI may appear in logs
- [ ] Payment processor (Stripe) if invoice metadata includes PHI
- [ ] Analytics (prefer none for PHI surfaces)

## Per-vendor checklist

For each vendor:

1. [ ] Confirm data residency / subprocessors list  
2. [ ] Execute BAA or equivalent DPA  
3. [ ] Restrict to minimum PHI  
4. [ ] Document retention & deletion  
5. [ ] Store signed PDF in secure drive (not this git repo)  
6. [ ] Mark `/compliance` → `baa_signed` = **done** with vendor names in notes  

## Notes

Date: __________  
Owner: __________  
Next review: __________  
