-- ============================================================
-- Phase C1 — payments, claims, invoice currency
-- Safe to re-run. Apply after schema + security-hardening.
-- ============================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

-- ── Payments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id BIGSERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'mock')),
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_ref
  ON public.payments(provider, provider_ref)
  WHERE provider_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON public.payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

DROP TRIGGER IF EXISTS set_updated_at_payments ON public.payments;
CREATE TRIGGER set_updated_at_payments
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payments admin read" ON public.payments;
DROP POLICY IF EXISTS "Payments patient read" ON public.payments;
DROP POLICY IF EXISTS "Payments admin write" ON public.payments;

CREATE POLICY "Payments admin read" ON public.payments
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "Payments patient read" ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'patient'
    AND patient_id = public.current_user_patient_id()
  );

CREATE POLICY "Payments admin write" ON public.payments
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Inserts from Edge (service role) bypass RLS; patients never insert directly.

-- ── Claims (simplified international stub) ────────────────
CREATE TABLE IF NOT EXISTS public.claims (
  id BIGSERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  payer_name TEXT NOT NULL DEFAULT 'Self-Pay',
  icd10_codes TEXT[] NOT NULL DEFAULT '{}',
  cpt_codes TEXT[] NOT NULL DEFAULT '{}',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected', 'paid')),
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_invoice ON public.claims(invoice_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON public.claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);

DROP TRIGGER IF EXISTS set_updated_at_claims ON public.claims;
CREATE TRIGGER set_updated_at_claims
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Claims admin all" ON public.claims;
CREATE POLICY "Claims admin all" ON public.claims
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');
