-- ============================================================
-- Phase B3b — CDS rules (drug–drug + allergy) + order columns
-- Safe to re-run. Apply after phase-b3-cpoe.sql.
-- Seed mirrors src/lib/cdsSeed.ts (18 DDI + 6 allergy rows).
-- ============================================================

-- ── Drug–drug interaction rules ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.cds_drug_interactions (
  id BIGSERIAL PRIMARY KEY,
  drug_a TEXT NOT NULL,
  drug_b TEXT NOT NULL,
  severity TEXT NOT NULL
    CHECK (severity IN ('major', 'moderate')),
  category TEXT NOT NULL,
  message_en TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  action_en TEXT NOT NULL,
  action_ar TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cds_ddi_pair_unique
  ON public.cds_drug_interactions (lower(drug_a), lower(drug_b));

CREATE INDEX IF NOT EXISTS idx_cds_ddi_active ON public.cds_drug_interactions(active);

DROP TRIGGER IF EXISTS set_updated_at_cds_drug_interactions ON public.cds_drug_interactions;
CREATE TRIGGER set_updated_at_cds_drug_interactions
  BEFORE UPDATE ON public.cds_drug_interactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cds_drug_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CDS DDI clinical read" ON public.cds_drug_interactions;
DROP POLICY IF EXISTS "CDS DDI admin write" ON public.cds_drug_interactions;
CREATE POLICY "CDS DDI clinical read" ON public.cds_drug_interactions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'doctor', 'nurse')
    AND (active = true OR public.current_user_role() = 'admin')
  );
CREATE POLICY "CDS DDI admin write" ON public.cds_drug_interactions
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ── Allergy cross-reactivity rules ──────────────────────────
CREATE TABLE IF NOT EXISTS public.cds_allergy_rules (
  id BIGSERIAL PRIMARY KEY,
  allergy_key TEXT NOT NULL,
  drug_matchers TEXT[] NOT NULL,
  severity TEXT NOT NULL
    CHECK (severity IN ('major', 'moderate')),
  category TEXT NOT NULL,
  message_en TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  action_en TEXT NOT NULL,
  action_ar TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cds_allergy_key_unique
  ON public.cds_allergy_rules (lower(allergy_key));

CREATE INDEX IF NOT EXISTS idx_cds_allergy_active ON public.cds_allergy_rules(active);

DROP TRIGGER IF EXISTS set_updated_at_cds_allergy_rules ON public.cds_allergy_rules;
CREATE TRIGGER set_updated_at_cds_allergy_rules
  BEFORE UPDATE ON public.cds_allergy_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cds_allergy_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CDS allergy clinical read" ON public.cds_allergy_rules;
DROP POLICY IF EXISTS "CDS allergy admin write" ON public.cds_allergy_rules;
CREATE POLICY "CDS allergy clinical read" ON public.cds_allergy_rules
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'doctor', 'nurse')
    AND (active = true OR public.current_user_role() = 'admin')
  );
CREATE POLICY "CDS allergy admin write" ON public.cds_allergy_rules
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ── clinical_orders CDS persistence columns ─────────────────
ALTER TABLE public.clinical_orders
  ADD COLUMN IF NOT EXISTS cds_alerts_json JSONB,
  ADD COLUMN IF NOT EXISTS cds_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS cds_acknowledged_by TEXT,
  ADD COLUMN IF NOT EXISTS cds_acknowledged_at TIMESTAMPTZ;

-- ── Seed: drug–drug interactions (idempotent) ───────────────
INSERT INTO public.cds_drug_interactions (
  drug_a, drug_b, severity, category, message_en, message_ar, action_en, action_ar, active
)
SELECT v.drug_a, v.drug_b, v.severity, v.category, v.message_en, v.message_ar, v.action_en, v.action_ar, true
FROM (VALUES
  ('warfarin', 'aspirin', 'major', 'bleeding',
    'Increased bleeding risk (warfarin + aspirin)',
    'خطر نزيف متزايد (وارفارين + أسبرين)',
    'Avoid combination or monitor INR and signs of bleeding closely',
    'تجنب الجمع أو راقب INR وعلامات النزيف عن كثب'),
  ('warfarin', 'ibuprofen', 'major', 'bleeding',
    'Increased bleeding risk (warfarin + NSAID)',
    'خطر نزيف متزايد (وارفارين + مضاد التهاب غير ستيروئيدي)',
    'Avoid NSAIDs with warfarin; consider acetaminophen if analgesia needed',
    'تجنب مضادات الالتهاب غير الستيروئيدية مع الوارفارين؛ فكّر في الباراسيتامول إذا لزم'),
  ('metformin', 'contrast', 'moderate', 'other',
    'Hold metformin around iodinated contrast when applicable',
    'أوقف الميتفورمين حول صبغة اليود عندما ينطبق',
    'Hold metformin 48h before and after contrast; recheck renal function',
    'أوقف الميتفورمين 48 ساعة قبل وبعد الصبغة؛ أعد فحص وظائف الكلى'),
  ('simvastatin', 'clarithromycin', 'major', 'myopathy',
    'Statin + clarithromycin — myopathy risk',
    'ستاتين + كلاريثروميسين — خطر اعتلال عضلي',
    'Avoid combination or temporarily hold statin during macrolide course',
    'تجنب الجمع أو أوقف الستاتين مؤقتًا أثناء دورة الماكروليد'),
  ('ssri', 'tramadol', 'major', 'serotonin',
    'Serotonin syndrome risk (SSRI + tramadol)',
    'خطر متلازمة السيروتونين (SSRI + ترامادول)',
    'Avoid combination; monitor for agitation, hyperthermia, clonus',
    'تجنب الجمع؛ راقب الاضطراب والحمى والارتعاش'),
  ('fluoxetine', 'tramadol', 'major', 'serotonin',
    'Serotonin syndrome risk (fluoxetine + tramadol)',
    'خطر متلازمة السيروتونين (فلوكسيتين + ترامادول)',
    'Avoid combination; consider alternative analgesic',
    'تجنب الجمع؛ فكّر في مسكن بديل'),
  ('ace inhibitor', 'potassium', 'moderate', 'hyperkalemia',
    'Hyperkalemia risk (ACEI + potassium)',
    'خطر فرط بوتاسيوم الدم (مثبط ACE + بوتاسيوم)',
    'Monitor serum potassium; avoid routine potassium supplementation',
    'راقب البوتاسيوم في الدم؛ تجنب مكملات البوتاسيوم الروتينية'),
  ('digoxin', 'amiodarone', 'major', 'toxicity',
    'Digoxin level may rise with amiodarone — monitor',
    'قد يرتفع مستوى الديجوكسين مع الأميودارون — راقب',
    'Reduce digoxin dose by ~50% and monitor levels',
    'قلل جرعة الديجوكسين بنحو 50% وراقب المستويات'),
  ('methotrexate', 'nsaid', 'major', 'toxicity',
    'Methotrexate + NSAID — toxicity risk',
    'الميثوتريكسات + مضاد التهاب غير ستيروئيدي — خطر سمية',
    'Avoid NSAIDs with methotrexate; monitor CBC and renal function',
    'تجنب مضادات الالتهاب غير الستيروئيدية مع الميثوتريكسات؛ راقب صورة الدم والكلى'),
  ('methotrexate', 'ibuprofen', 'major', 'toxicity',
    'Methotrexate + ibuprofen — toxicity risk',
    'الميثوتريكسات + إيبوبروفن — خطر سمية',
    'Avoid ibuprofen with methotrexate; use acetaminophen if needed',
    'تجنب الإيبوبروفن مع الميثوتريكسات؛ استخدم الباراسيتامول إذا لزم'),
  ('warfarin', 'naproxen', 'major', 'bleeding',
    'Increased bleeding risk (warfarin + naproxen)',
    'خطر نزيف متزايد (وارفارين + نابروكسين)',
    'Avoid naproxen with warfarin; monitor INR if unavoidable',
    'تجنب نابروكسين مع الوارفارين؛ راقب INR إذا لم يُتجنّب'),
  ('lithium', 'ace inhibitor', 'major', 'toxicity',
    'Lithium toxicity risk with ACE inhibitor',
    'خطر سمية الليثيوم مع مثبط ACE',
    'Monitor lithium levels closely; consider dose reduction',
    'راقب مستويات الليثيوم عن كثب؛ فكّر في تقليل الجرعة'),
  ('lithium', 'lisinopril', 'major', 'toxicity',
    'Lithium toxicity risk with lisinopril',
    'خطر سمية الليثيوم مع ليسينوبريل',
    'Monitor lithium levels; adjust dose as needed',
    'راقب مستويات الليثيوم؛ عدّل الجرعة حسب الحاجة'),
  ('carbamazepine', 'erythromycin', 'major', 'toxicity',
    'Carbamazepine level may rise with erythromycin',
    'قد يرتفع مستوى الكاربامازيبين مع الإريثروميسين',
    'Monitor carbamazepine levels and signs of toxicity',
    'راقب مستويات الكاربامازيبين وعلامات السمية'),
  ('phenytoin', 'fluconazole', 'major', 'toxicity',
    'Phenytoin toxicity risk with fluconazole',
    'خطر سمية الفينيتوئين مع الفلوكونازول',
    'Monitor phenytoin levels; consider dose adjustment',
    'راقب مستويات الفينيتوئين؛ فكّر في تعديل الجرعة'),
  ('sertraline', 'linezolid', 'major', 'serotonin',
    'Serotonin syndrome risk (sertraline + linezolid)',
    'خطر متلازمة السيروتونين (سرترالين + لينيزوليد)',
    'Avoid combination; linezolid has MAOI activity',
    'تجنب الجمع؛ لينيزوليد له نشاط MAOI'),
  ('atorvastatin', 'gemfibrozil', 'major', 'myopathy',
    'Statin + gemfibrozil — myopathy and rhabdomyolysis risk',
    'ستاتين + جمفيبروزيل — خطر اعتلال عضلي وانحلال عضلي شديد',
    'Avoid combination or use lowest statin dose with monitoring',
    'تجنب الجمع أو استخدم أقل جرعة ستاتين مع المراقبة'),
  ('spironolactone', 'potassium', 'moderate', 'hyperkalemia',
    'Hyperkalemia risk (spironolactone + potassium)',
    'خطر فرط بوتاسيوم الدم (سبيرونولاكتون + بوتاسيوم)',
    'Monitor serum potassium; avoid potassium supplements',
    'راقب البوتاسيوم في الدم؛ تجنب مكملات البوتاسيوم')
) AS v(drug_a, drug_b, severity, category, message_en, message_ar, action_en, action_ar)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cds_drug_interactions d
  WHERE lower(d.drug_a) = lower(v.drug_a) AND lower(d.drug_b) = lower(v.drug_b)
);

-- ── Seed: allergy rules (idempotent) ──────────────────────────
INSERT INTO public.cds_allergy_rules (
  allergy_key, drug_matchers, severity, category, message_en, message_ar, action_en, action_ar, active
)
SELECT v.allergy_key, v.drug_matchers, v.severity, v.category, v.message_en, v.message_ar, v.action_en, v.action_ar, true
FROM (VALUES
  ('penicillin', ARRAY['amoxicillin', 'ampicillin', 'penicillin', 'augmentin']::TEXT[], 'major', 'allergy_cross_reactivity',
    'Penicillin allergy — possible cross-reactivity with beta-lactam antibiotic',
    'حساسية البنسلين — احتمال تفاعل متقاطع مع مضاد حيوي بيتا-لاكتام',
    'Do not order without override reason; consider alternative antibiotic class',
    'لا تُصدر الطلب بدون سبب تجاوز؛ فكّر في فئة مضاد حيوي بديلة'),
  ('sulfa', ARRAY['sulfamethoxazole', 'sulfadiazine', 'bactrim', 'co-trimoxazole']::TEXT[], 'major', 'allergy_cross_reactivity',
    'Sulfa allergy — possible cross-reactivity with sulfonamide antibiotic',
    'حساسية السلفا — احتمال تفاعل متقاطع مع مضاد حيوي السلفوناميد',
    'Avoid sulfonamides; document override reason if clinically necessary',
    'تجنب مركبات السلفوناميد؛ وثّق سبب التجاوز إذا كان ضروريًا سريريًا'),
  ('aspirin', ARRAY['aspirin', 'acetylsalicylic']::TEXT[], 'major', 'allergy_cross_reactivity',
    'Aspirin allergy — salicylate exposure risk',
    'حساسية الأسبرين — خطر التعرض لمركبات الساليسيلات',
    'Avoid aspirin and related salicylates unless override documented',
    'تجنب الأسبرين ومركبات الساليسيلات المرتبطة ما لم يُوثّق التجاوز'),
  ('cephalosporin', ARRAY['cefazolin', 'ceftriaxone', 'cephalexin', 'cefuroxime']::TEXT[], 'major', 'allergy_cross_reactivity',
    'Cephalosporin allergy — avoid cephalosporin class agents',
    'حساسية السيفالوسبورين — تجنب عوامل فئة السيفالوسبورين',
    'Use alternative antibiotic; override reason required if ordering',
    'استخدم مضادًا حيويًا بديلًا؛ سبب التجاوز مطلوب عند الطلب'),
  ('codeine', ARRAY['codeine', 'hydrocodone', 'tramadol']::TEXT[], 'major', 'allergy_cross_reactivity',
    'Codeine/opioid allergy — possible cross-sensitivity',
    'حساسية الكوديين/الأفيون — احتمال حساسية متقاطعة',
    'Avoid related opioids; select non-cross-reactive analgesic',
    'تجنب الأفيونات المرتبطة؛ اختر مسكنًا غير متفاعل'),
  ('latex', ARRAY['latex']::TEXT[], 'moderate', 'allergy_cross_reactivity',
    'Latex allergy — verify medication packaging and excipients',
    'حساسية اللاتكس — تحقق من تغليف الدواء والمواد المضافة',
    'Confirm latex-free formulation before administration',
    'أكد تركيبة خالية من اللاتكس قبل الإعطاء')
) AS v(allergy_key, drug_matchers, severity, category, message_en, message_ar, action_en, action_ar)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cds_allergy_rules a
  WHERE lower(a.allergy_key) = lower(v.allergy_key)
);
