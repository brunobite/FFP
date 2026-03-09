-- ==============================================
-- FFP — Grupos familiares
-- ==============================================

CREATE TABLE public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- Membros podem ver seu grupo
CREATE POLICY "family_groups_select" ON public.family_groups
  FOR SELECT USING (
    id IN (SELECT family_group_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Usuário autenticado pode criar grupos
CREATE POLICY "family_groups_insert" ON public.family_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());
