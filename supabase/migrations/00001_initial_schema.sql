-- Landlord Compliance Tracker - Initial Schema
-- Based on TRD Section 5.3

-- =========================================================
-- ORGANISATIONS & USERS
-- =========================================================

CREATE TABLE organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
        CHECK (plan IN ('free', 'pro')),
    plan_started_at TIMESTAMPTZ,
    stripe_customer_id TEXT,
    max_properties INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organisations(id),
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'owner',
        CHECK (role IN ('owner', 'manager', 'viewer')),
    notification_prefs JSONB NOT NULL DEFAULT '{
        "email_enabled": true,
        "sms_enabled": false,
        "digest_frequency": "realtime",
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "07:00"
    }'::jsonb,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
);

-- =========================================================
-- PROPERTIES
-- =========================================================

CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    postcode TEXT NOT NULL,
    property_type TEXT NOT NULL DEFAULT 'single_let'
        CHECK (property_type IN ('single_let', 'hmo', 'flat')),
    num_bedrooms SMALLINT,
    council_area TEXT,
    epc_auto_imported BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_org ON properties (org_id);
CREATE INDEX idx_properties_postcode ON properties (postcode);

-- =========================================================
-- COMPLIANCE ITEMS
-- =========================================================

CREATE TABLE compliance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'gas_safety', 'eicr', 'epc', 'smoke_alarms', 'co_alarms', 'deposit_protection', 'prescribed_info', 'how_to_rent', 'right_to_rent', 'fire_risk_assessment', 'custom'
    )),
    custom_label TEXT,
    status TEXT NOT NULL DEFAULT 'unknown'
        CHECK (status IN ('valid', 'expiring', 'expired', 'not_applicable', 'unknown')),
    issue_date DATE,
    expiry_date DATE,
    validity_months INTEGER,
    certificate_number TEXT,
    contractor_name TEXT,
    contractor_phone TEXT,
    notes TEXT,
    is_recurring BOOLEAN NOT NULL DEFAULT true,
    previous_expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_property ON compliance_items (property_id);
CREATE INDEX idx_compliance_expiry ON compliance_items (expiry_date)
    WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_compliance_status ON compliance_items (status)
    WHERE status IN ('expiring', 'expired');

-- =========================================================
-- DOCUMENTS
-- =========================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_item_id UUID NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL
        CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
    version INTEGER NOT NULL DEFAULT 1,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_compliance ON documents (compliance_item_id);

-- =========================================================
-- TENANTS (PII encrypted at application layer)
-- =========================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    org_id UUID NOT NULL REFERENCES organisations(id)
    name_encrypted TEXT NOT NULL,
    email_encrypted TEXT,
    phone_encrypted TEXT,
    tenancy_start DATE NOT NULL,
    tenancy_end DATE,
    deposit_amount_pence INTEGER,
    deposit_scheme TEXT
        CHECK (deposit_scheme IN ('dps', 'tds_custodial', 'tds_insured', 'mydeposits')),
    deposit_protected_date DATE,
    prescribed_info_served BOOLEAN NOT NULL DEFAULT false,
    prescribed_info_date DATE,
    how_to_rent_served BOOLEAN NOT NULL DEFAULT false,
    how_to_rent_date DATE,
    right_to_rent_checked BOOLEAN NOT NULL DEFAULT false,
    right_to_rent_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_property ON tenants(property_id);
CREATE INDEX idx_tenants_org ON tenants(org_id);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================

CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id),
    user_id UUID REFERENCES users(id),
    compliance_item_id UUID REFERENCES compliance_items(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    template TEXT NOT NULL,
    recipient TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent'
        CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB
);

CREATE INDEX idx_notifications_compliance ON notification_log(compliance_item_id);
CREATE INDEX idx_notifications_sent ON notification_log(sent_at);

CREATE TABLE notification_snoozes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_item_id UUID NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
    snoozed_by UUID NOT NULL REFERENCES users(id),
    snoozed_until DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- AUDIT LOG
-- =========================================================

CREATE TABLE audit_log(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_org ON audit_log(org_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_snoozes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Organisations: users can only see their own org
CREATE POLICY "users_see_own_org" ON organisations
    FOR SELECT USING (id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "owners_update_org" ON organisations
    FOR UPDATE USING (
        id = (SELECT org_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
    );

-- Users: see members of same org
CREATE POLICY "users_see_org_members" ON users
    FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "users_update_self" ON users
    FOR UPDATE USING (id = auth.uid());

-- Properties: org isolation
CREATE POLICY "org_isolation_select" ON properties
    FOR SELECT USING (
        org_id = (SELECT org_id FROM users WHERE id = auth.uid()) 
    );

CREATE POLICY "org_isolation_insert" ON properties
    FOR INSERT WITH CHECK (
        org_id = (SELECT org_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
    );

CREATE POLICY "org_isolation_update" ON properties
    FOR UPDATE USING (
        org_id = (SELECT org_id FROM users WHERE id = auth.uid()) 
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
    );

CREATE POLICY "org_isolation_delete" ON properties
    FOR DELETE USING (
        org_id = (SELECT org_id FROM users WHERE id = auth.uid()) 
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
    );

-- Compliance items: via property org
CREATE POLICY "org_isolation_select" ON compliance_items
    FOR SELECT USING (property_id IN 
        (SELECT id FROM properties WHERE org_id = (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "org_isolation_insert" ON compliance_items
    FOR INSERT WITH CHECK (property_id IN 
        (SELECT id FROM properties WHERE org_id = (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    ) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager'));

CREATE POLICY "org_isolation_update" ON compliance_items
    FOR UPDATE USING (property_id IN 
        (SELECT id FROM properties WHERE org_id = (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    ) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager'));

CREATE POLICY "org_isolation_delete" ON compliance_items
    FOR DELETE USING (property_id IN 
        (SELECT id FROM properties WHERE org_id = (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    ) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager'));

-- Documents: via compliance item -> property -> org
CREATE POLICY "org_isolation_select" ON documents
    FOR SELECT USING (compliance_item_id IN (
        SELECT ci.id FROM compliance_items ci
        JOIN properties p ON ci.property_id = p.id
        WHERE p.org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "org_isolation_insert" ON documents
    FOR INSERT WITH CHECK (compliance_item_id IN (
        SELECT ci.id FROM compliance_items ci
        JOIN properties p ON ci.property_id = p.id
        WHERE p.org_id = (SELECT org_id FROM users WHERE id = auth.uid())
        ) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager'));

CREATE POLICY "org_isolation_delete" ON documents
    FOR DELETE USING (compliance_item_id IN (
        SELECT ci.id FROM compliance_items ci
        JOIN properties p ON ci.property_id = p.id
        WHERE p.org_id = (SELECT org_id FROM users WHERE id = auth.uid())
        ) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager'));

-- Tenants: org isolation
CREATE POLICY "org_isolation_select" ON tenants
    FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation_insert" ON tenants
    FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
    );

CREATE POLICY "org_isolation_update" ON tenants
    FOR UPDATE USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
    );

CREATE POLICY "org_isolation_delete" ON tenants
    FOR DELETE USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
    );

-- Notification log: org isolation (read-only for non-service roles)
CREATE POLICY "org_isolation_select" ON notification_log
    FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Notification snoozes: via compliance item
CREATE POLICY "org_isolation_select" ON notification_snoozes
    FOR SELECT USING (compliance_item_id IN (
        SELECT ci.id FROM compliance_items ci
        JOIN properties p ON ci.property_id = p.id
        WHERE p.org_id = (SELECT org_id FROM users WHERE id = auth.uid()) 
    ));

CREATE POLICY "org_isolation_insert" ON notification_snoozes
    FOR INSERT WITH CHECK (compliance_item_id IN (
        SELECT ci.id FROM compliance_items ci
        JOIN properties p ON ci.property_id = p.id
        WHERE p.org_id = (SELECT org_id FROM users WHERE id = auth.uid()) 
    ));

-- Audit log: org isolation (read-only)
CREATE POLICY "org_isolation_select" ON audit_log
    FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- =========================================================
-- SCHEDULED JOBS (pg_cron)
-- Daily status update at 06:00 UTC
-- =========================================================

SELECT cron.schedule('update-compliance-status', '0 6 * * *', $$
    UPDATE compliance_items
    SET status = CASE
        WHEN expiry_date IS NULL THEN status
        WHEN expiry_date < CURRENT_DATE THEN 'expired'
        WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
        'expiring'
        ELSE 'valid'
    END,
    updated_at = now()
    WHERE status != 'not_applicable'
        AND expiry_date IS NOT NULL;
$$);

-- =========================================================
-- STORAGE BUCKET
-- =========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('compliance-documents', 'compliance-documents', false);

-- Storage policies: org members can upload/read their own docs
CREATE POLICY "org_members_upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'compliance-documents'
        AND (storage.foldername(name))[1] = (SELECT org_id::text FROM users
        WHERE id = auth.uid())
    );

CREATE POLICY "org_members_read" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'compliance-documents'
        AND (storage.foldername(name))[1] = (SELECT org_id::text FROM users
        WHERE id = auth.uid())
    );

CREATE POLICY "org_members_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'compliance-documents'
        AND (storage.foldername(name))[1] = (SELECT org_id::text FROM users
        WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
    );