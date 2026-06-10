-- ============================================================
-- Supabase Row Level Security policies
-- Run in the Supabase SQL editor after running Prisma migrations
-- ============================================================

ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE levy_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE motions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sinking_fund_forecasts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_scheme_member(p_scheme_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM scheme_roles
    WHERE scheme_id = p_scheme_id
      AND user_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
      AND term_end IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION is_committee_member(p_scheme_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM scheme_roles
    WHERE scheme_id = p_scheme_id
      AND user_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
      AND role IN ('CHAIRPERSON', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER')
      AND term_end IS NULL
  );
$$;

CREATE POLICY "scheme_members_select" ON schemes FOR SELECT USING (is_scheme_member(id));
CREATE POLICY "scheme_committee_insert" ON schemes FOR INSERT WITH CHECK (true);
CREATE POLICY "scheme_committee_update" ON schemes FOR UPDATE USING (is_committee_member(id));

CREATE POLICY "lots_members_select" ON lots FOR SELECT USING (is_scheme_member(scheme_id));
CREATE POLICY "lots_committee_insert" ON lots FOR INSERT WITH CHECK (is_committee_member(scheme_id));
CREATE POLICY "lots_committee_update" ON lots FOR UPDATE USING (is_committee_member(scheme_id));

CREATE POLICY "levy_owner_select" ON levy_notices FOR SELECT USING (
  is_committee_member((SELECT scheme_id FROM lots WHERE id = lot_id))
  OR EXISTS (
    SELECT 1 FROM lot_owners
    WHERE lot_id = levy_notices.lot_id
      AND user_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
      AND ownership_to IS NULL
  )
);
CREATE POLICY "levy_committee_insert" ON levy_notices FOR INSERT WITH CHECK (is_committee_member((SELECT scheme_id FROM lots WHERE id = lot_id)));
CREATE POLICY "levy_committee_update" ON levy_notices FOR UPDATE USING (is_committee_member((SELECT scheme_id FROM lots WHERE id = lot_id)));

CREATE POLICY "meetings_members_select" ON meetings FOR SELECT USING (is_scheme_member(scheme_id));
CREATE POLICY "meetings_committee_insert" ON meetings FOR INSERT WITH CHECK (is_committee_member(scheme_id));

CREATE POLICY "docs_members_select" ON documents FOR SELECT USING (is_scheme_member(scheme_id));
CREATE POLICY "docs_members_insert" ON documents FOR INSERT WITH CHECK (is_scheme_member(scheme_id));

CREATE POLICY "maint_members_select" ON maintenance_requests FOR SELECT USING (is_scheme_member(scheme_id));
CREATE POLICY "maint_members_insert" ON maintenance_requests FOR INSERT WITH CHECK (is_scheme_member(scheme_id));
CREATE POLICY "maint_committee_update" ON maintenance_requests FOR UPDATE USING (is_committee_member(scheme_id));

CREATE POLICY "breach_committee_all" ON breach_notices FOR ALL USING (is_committee_member(scheme_id));

CREATE POLICY "announce_members_select" ON announcements FOR SELECT USING (is_scheme_member(scheme_id));
CREATE POLICY "announce_committee_insert" ON announcements FOR INSERT WITH CHECK (is_committee_member(scheme_id));

CREATE POLICY "users_self_select" ON users FOR SELECT USING (email = auth.jwt()->>'email');
CREATE POLICY "users_self_update" ON users FOR UPDATE USING (email = auth.jwt()->>'email');
