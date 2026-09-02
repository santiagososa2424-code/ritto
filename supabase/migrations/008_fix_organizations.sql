-- Create organization_members table (used by all org API routes)
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  invite_token uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add org_id to profiles (the column the APIs write to)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- RLS for organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; all API routes use service role key so no extra policies needed.
-- Allow users to read their own membership rows (for join page info)
CREATE POLICY "members_read_own" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

-- Migrate any existing owner rows from organizations.owner_id into organization_members
INSERT INTO organization_members (org_id, user_id, email, role, status)
SELECT
  o.id,
  o.owner_id,
  COALESCE(p.email, ''),
  'owner',
  'active'
FROM organizations o
LEFT JOIN auth.users p ON p.id = o.owner_id
WHERE o.owner_id IS NOT NULL
ON CONFLICT DO NOTHING;
