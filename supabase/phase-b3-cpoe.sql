-- ============================================================
-- Phase B3 — CPOE (clinical orders)
-- Safe to re-run. Apply after phase-b2-clinical.sql (recommended).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clinical_orders (
  id BIGSERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  order_type TEXT NOT NULL
    CHECK (order_type IN ('lab', 'pharmacy', 'imaging', 'nursing', 'other')),
  status TEXT NOT NULL DEFAULT 'ordered'
    CHECK (status IN ('draft', 'ordered', 'in-progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'routine'
    CHECK (priority IN ('routine', 'urgent', 'stat')),
  description TEXT NOT NULL,
  code TEXT,
  medicine_id INTEGER REFERENCES public.medicines(id) ON DELETE SET NULL,
  quantity INTEGER,
  ordered_by TEXT,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  allergy_alert TEXT,
  linked_lab_test_id INTEGER REFERENCES public.lab_tests(id) ON DELETE SET NULL,
  linked_pharmacy_order_id INTEGER REFERENCES public.pharmacy_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_orders_patient ON public.clinical_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_orders_status ON public.clinical_orders(status);
CREATE INDEX IF NOT EXISTS idx_clinical_orders_type ON public.clinical_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_clinical_orders_ordered ON public.clinical_orders(ordered_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_clinical_orders ON public.clinical_orders;
CREATE TRIGGER set_updated_at_clinical_orders
  BEFORE UPDATE ON public.clinical_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clinical_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orders staff read" ON public.clinical_orders;
DROP POLICY IF EXISTS "Orders patient read" ON public.clinical_orders;
DROP POLICY IF EXISTS "Orders staff write" ON public.clinical_orders;
CREATE POLICY "Orders staff read" ON public.clinical_orders
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Orders patient read" ON public.clinical_orders
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'patient'
    AND patient_id = public.current_user_patient_id()
  );
CREATE POLICY "Orders staff write" ON public.clinical_orders
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'))
  WITH CHECK (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

-- Demo seed
INSERT INTO public.clinical_orders (
  patient_id, patient_name, order_type, status, priority, description, code, ordered_by, ordered_at
)
SELECT 103, 'Khalid Al-Rashid', 'lab', 'ordered', 'routine', 'HbA1c', '4548-4', 'Dr Demo', now() - interval '1 day'
WHERE EXISTS (SELECT 1 FROM public.patients WHERE id = 103)
  AND NOT EXISTS (
    SELECT 1 FROM public.clinical_orders WHERE patient_id = 103 AND description = 'HbA1c' AND order_type = 'lab'
  );
