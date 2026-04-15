-- 1. Organizations table first (no dependency on profiles.organization_id yet)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'pro',
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_users INTEGER NOT NULL DEFAULT 1, -- pro:1, pyme:5, empresa:20
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns to profiles (organization_id FK now valid since organizations exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner'; -- 'owner' | 'member'

-- 3. Enable RLS and create policies (profiles.organization_id now exists)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their org" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owner can update their org" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- 4. Backfill: create an org for every existing profile that doesn't have one
INSERT INTO organizations (name, plan, subscription_status, trial_ends_at, owner_id, max_users)
SELECT
  COALESCE(p.empresa, ''),
  COALESCE(p.plan, 'pro'),
  COALESCE(p.subscription_status, 'trial'),
  p.trial_ends_at,
  p.id,
  CASE COALESCE(p.plan, 'pro')
    WHEN 'pyme' THEN 5
    WHEN 'empresa' THEN 20
    ELSE 1
  END
FROM profiles p
WHERE p.organization_id IS NULL;

-- Link each profile to its new org
UPDATE profiles p
SET organization_id = o.id
FROM organizations o
WHERE o.owner_id = p.id AND p.organization_id IS NULL;

-- Invites table: owner sends email invite, recipient joins org
CREATE TABLE IF NOT EXISTS org_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage invites" ON org_invites
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );
