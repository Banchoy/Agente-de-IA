
-- Enable RLS on tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy function to get current org id from app settings (set by middleware/Rep)
-- Note: In a real Supabase setup used directly from client, you utilize auth.uid(). 
-- But here we route everything through Next.js server actions / API routes.
-- We will set a custom configuration parameter for the transaction.

-- However, for Supabase + Drizzle + Next.js Server Actions, we often just enforce tenant_id in the query itself using the ORM.
-- BUT, requirement Says: "Implement Row Level Security (RLS) no Supabase" and "Utilizar current_setting('app.current_org_id')".

-- 1. Create a function to get the current organization ID safely
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS uuid AS $$
BEGIN
  RETURN (current_setting('app.current_org_id', true)::uuid);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Organizations Policies
-- Users can view their own organization
CREATE POLICY "Users can view their own organization"
ON organizations
FOR SELECT
USING (id = current_org_id());

-- 3. Users Policies
-- Users can view other users in the same organization
CREATE POLICY "Users can view members of their organization"
ON users
FOR SELECT
USING (organization_id = current_org_id());

-- 4. Audit Logs Policies
-- Only view logs for the current organization
CREATE POLICY "View audit logs for organization"
ON audit_logs
FOR SELECT
USING (organization_id = current_org_id());

CREATE POLICY "Insert audit logs for organization"
ON audit_logs
FOR INSERT
WITH CHECK (organization_id = current_org_id());

-- NOTE: When using Drizzle in Next.js, you must ensure you set `app.current_org_id` 
-- at the beginning of your transaction or session if you rely on RLS. 
-- Alternatively, RLS is a safety net, and your application logic also filters by org_id.
