-- ============================================================
-- Phase C2 — remittances (ERA stub) + claim paid linkage
-- Safe to re-run. Apply after phase-c-payments.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.remittances (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  payer_name TEXT NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  amount_adjusted NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'posted'
    CHECK (status IN ('posted', 'denied', 'partial')),
  remittance_ref TEXT,
  notes TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remittances_claim ON public.remittances(claim_id);

ALTER TABLE public.remittances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Remittances admin all" ON public.remittances;
CREATE POLICY "Remittances admin all" ON public.remittances
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');
