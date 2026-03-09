-- ==============================================
-- FFP — Membros do grupo familiar
-- ==============================================

CREATE TYPE public.family_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.family_role NOT NULL DEFAULT 'editor',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_group_id, user_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Membros veem colegas do grupo
CREATE POLICY "family_members_select" ON public.family_members
  FOR SELECT USING (
    family_group_id IN (SELECT family_group_id FROM public.family_members WHERE user_id = auth.uid())
  );

-- Admins podem adicionar membros; usuário pode se adicionar ao criar grupo
CREATE POLICY "family_members_insert" ON public.family_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR family_group_id IN (
      SELECT family_group_id FROM public.family_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
