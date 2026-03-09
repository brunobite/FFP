-- ==============================================
-- FFP — Convites pendentes
-- ==============================================

CREATE TABLE public.family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

-- Admin do grupo pode criar convites
CREATE POLICY "family_invites_insert" ON public.family_invites
  FOR INSERT WITH CHECK (
    family_group_id IN (
      SELECT family_group_id FROM public.family_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Quem convidou pode ver; convidado também
CREATE POLICY "family_invites_select" ON public.family_invites
  FOR SELECT USING (
    invited_by = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
