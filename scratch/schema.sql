-- ============================================================
-- Helping Hands Database Schema v2.0
--
-- Database        : PostgreSQL
-- Backend          : FastAPI
-- Authentication   : Supabase Auth
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SECTION 1 — CORE USER & PROFILE TABLES
-- ============================================================

-- ------------------------------------------------------------
-- USERS
-- Stores common information for every authenticated user.
-- Authentication credentials are managed by Supabase Auth.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role            VARCHAR(20) NOT NULL
                        CHECK (role IN ('volunteer', 'ngo', 'corporate')),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(254) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    city            VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS
    'Stores common profile information for every authenticated user. Authentication is handled by Supabase Auth.';
COMMENT ON COLUMN users.role IS
    'Application role: volunteer, ngo or corporate.';

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ------------------------------------------------------------
-- VOLUNTEER PROFILES
-- Stores volunteer specific information.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS volunteer_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL UNIQUE,
    skill_tags              TEXT[] NOT NULL DEFAULT '{}',
    total_hours             NUMERIC(8,2) NOT NULL DEFAULT 0,
    credit_points           INTEGER NOT NULL DEFAULT 0,
    trust_score             INTEGER NOT NULL DEFAULT 50
                                CHECK (trust_score BETWEEN 0 AND 100),
    corporate_profile_id    UUID,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_volunteer_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE volunteer_profiles IS
    'Volunteer specific profile information.';

CREATE INDEX idx_volunteer_user      ON volunteer_profiles(user_id);
CREATE INDEX idx_volunteer_corporate ON volunteer_profiles(corporate_profile_id);

-- ------------------------------------------------------------
-- NGO PROFILES
-- Stores NGO information.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ngo_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL UNIQUE,
    organization_name       VARCHAR(200) NOT NULL,
    registration_number     VARCHAR(100) NOT NULL,
    pan_number              VARCHAR(20),
    darpan_id               VARCHAR(100),
    focus_areas             TEXT[] NOT NULL DEFAULT '{}',
    verification_status     VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ngo_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE ngo_profiles IS
    'Stores NGO organization details and verification status.';

CREATE INDEX idx_ngo_user         ON ngo_profiles(user_id);
CREATE INDEX idx_ngo_verification ON ngo_profiles(verification_status);

-- ------------------------------------------------------------
-- CORPORATE PROFILES
-- Stores Corporate Organization information.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS corporate_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL UNIQUE,
    company_name            VARCHAR(200) NOT NULL,
    registration_number     VARCHAR(100) NOT NULL,
    cin_number              VARCHAR(50),
    pan_number              VARCHAR(20),
    csr_focus_areas         TEXT[] NOT NULL DEFAULT '{}',
    verification_status     VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended')),
    join_code               VARCHAR(12) UNIQUE,
    join_code_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_corporate_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE   
);

COMMENT ON TABLE corporate_profiles IS
    'Stores corporate organization information including CSR details and employee join code.';

CREATE INDEX idx_corporate_user         ON corporate_profiles(user_id);
CREATE INDEX idx_corporate_verification ON corporate_profiles(verification_status);
CREATE UNIQUE INDEX idx_corporate_join_code ON corporate_profiles(join_code);

-- ------------------------------------------------------------
-- Cross-table foreign key (added after both tables exist)
-- ------------------------------------------------------------

ALTER TABLE volunteer_profiles
    ADD CONSTRAINT fk_volunteer_corporate
    FOREIGN KEY (corporate_profile_id)
    REFERENCES corporate_profiles(id)
    ON DELETE SET NULL;


-- ============================================================
-- SECTION 2 — VOLUNTEER MANAGEMENT
-- ============================================================

-- ------------------------------------------------------------
-- REQUIREMENTS
-- Volunteering opportunities created by verified NGOs.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS requirements (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ngo_profile_id       UUID NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    category            VARCHAR(100),
    skill_tags          TEXT[] NOT NULL DEFAULT '{}',
    seats_total         INTEGER NOT NULL
                            CHECK (seats_total > 0),
    seats_filled        INTEGER NOT NULL DEFAULT 0
                            CHECK (seats_filled >= 0 AND seats_filled <= seats_total),
    event_date          DATE NOT NULL,
    location_name       VARCHAR(255) NOT NULL,
    event_latitude      NUMERIC(10,7) NOT NULL,
    event_longitude     NUMERIC(10,7) NOT NULL,
    attendance_radius   NUMERIC(8,2) NOT NULL DEFAULT 50
                            CHECK (attendance_radius > 0),
    is_urgent           BOOLEAN NOT NULL DEFAULT FALSE,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'open', 'completed', 'cancelled')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_requirement_ngo
        FOREIGN KEY (ngo_profile_id)
        REFERENCES ngo_profiles(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE requirements IS
    'Stores volunteering opportunities created by NGOs.';

CREATE INDEX idx_requirement_ngo        ON requirements(ngo_profile_id);
CREATE INDEX idx_requirement_status     ON requirements(status);
CREATE INDEX idx_requirement_event_date ON requirements(event_date);

-- ------------------------------------------------------------
-- APPLICATIONS
-- Volunteer applications for opportunities.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS applications (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id          UUID NOT NULL,
    volunteer_profile_id    UUID NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    applied_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at              TIMESTAMPTZ,

    CONSTRAINT fk_application_requirement
        FOREIGN KEY (requirement_id)
        REFERENCES requirements(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_application_volunteer
        FOREIGN KEY (volunteer_profile_id)
        REFERENCES volunteer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_application
        UNIQUE (requirement_id, volunteer_profile_id)
);

COMMENT ON TABLE applications IS
    'Volunteer applications for volunteering opportunities.';

CREATE INDEX idx_application_requirement ON applications(requirement_id);
CREATE INDEX idx_application_volunteer   ON applications(volunteer_profile_id);
CREATE INDEX idx_application_status      ON applications(status);

-- ------------------------------------------------------------
-- ATTENDANCE
-- GPS verified attendance with complete audit trail.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS attendance (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id              UUID NOT NULL,
    volunteer_profile_id        UUID NOT NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'checked_in', 'verified', 'rejected')),
    checkin_time                TIMESTAMPTZ,
    checkin_latitude            NUMERIC(10,7),
    checkin_longitude           NUMERIC(10,7),
    checkin_distance_meters     NUMERIC(10,2),
    checkout_time               TIMESTAMPTZ,
    checkout_latitude           NUMERIC(10,7),
    checkout_longitude          NUMERIC(10,7),
    checkout_distance_meters    NUMERIC(10,2),
    worked_hours                NUMERIC(6,2) DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_attendance_requirement
        FOREIGN KEY (requirement_id)
        REFERENCES requirements(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attendance_volunteer
        FOREIGN KEY (volunteer_profile_id)
        REFERENCES volunteer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_attendance
        UNIQUE (requirement_id, volunteer_profile_id),

    CONSTRAINT chk_checkout_after_checkin
        CHECK (
            checkout_time IS NULL
            OR checkin_time IS NULL
            OR checkout_time > checkin_time
        )
);

COMMENT ON TABLE attendance IS
    'Stores GPS verified attendance records including check-in and check-out information.';

CREATE INDEX idx_attendance_requirement ON attendance(requirement_id);
CREATE INDEX idx_attendance_volunteer   ON attendance(volunteer_profile_id);
CREATE INDEX idx_attendance_status      ON attendance(status);

-- ------------------------------------------------------------
-- CREDITS LOG
-- Immutable audit trail of volunteer credits.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS credits_log (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_profile_id    UUID NOT NULL,
    requirement_id          UUID,
    points_change           INTEGER NOT NULL DEFAULT 0,
    hours_change            NUMERIC(6,2) NOT NULL DEFAULT 0,
    reason                  VARCHAR(20) NOT NULL
                                CHECK (reason IN ('attendance', 'bonus', 'adjustment', 'penalty')),
    remarks                 TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_credit_volunteer
        FOREIGN KEY (volunteer_profile_id)
        REFERENCES volunteer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_credit_requirement
        FOREIGN KEY (requirement_id)
        REFERENCES requirements(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE credits_log IS
    'Immutable audit trail of volunteer hours and credit point changes.';

CREATE INDEX idx_credit_volunteer   ON credits_log(volunteer_profile_id);
CREATE INDEX idx_credit_requirement ON credits_log(requirement_id);

-- ------------------------------------------------------------
-- CERTIFICATES
-- Stores certificate metadata.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS certificates (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_profile_id    UUID NOT NULL,
    requirement_id          UUID NOT NULL,
    certificate_number      VARCHAR(30) NOT NULL UNIQUE,
    worked_hours            NUMERIC(6,2) NOT NULL,
    issue_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'generated'
                                CHECK (status IN ('generated', 'revoked')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_certificate_volunteer
        FOREIGN KEY (volunteer_profile_id)
        REFERENCES volunteer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_certificate_requirement
        FOREIGN KEY (requirement_id)
        REFERENCES requirements(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_certificate
        UNIQUE (volunteer_profile_id, requirement_id)
);

COMMENT ON TABLE certificates IS
    'Stores metadata of participation certificates.';

CREATE INDEX idx_certificate_volunteer  ON certificates(volunteer_profile_id);
CREATE INDEX idx_certificate_requirement ON certificates(requirement_id);


-- ============================================================
-- SECTION 3 — CSR, REVIEWS & REPORTING
-- ============================================================

-- ------------------------------------------------------------
-- NGO REVIEWS
-- Volunteers can review NGOs only after verified participation.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ngo_reviews (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_profile_id    UUID NOT NULL,
    ngo_profile_id          UUID NOT NULL,
    requirement_id          UUID NOT NULL,
    rating                  INTEGER NOT NULL
                                CHECK (rating BETWEEN 1 AND 5),
    review_comment          TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_review_volunteer
        FOREIGN KEY (volunteer_profile_id)
        REFERENCES volunteer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_ngo
        FOREIGN KEY (ngo_profile_id)
        REFERENCES ngo_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_requirement
        FOREIGN KEY (requirement_id)
        REFERENCES requirements(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_review
        UNIQUE (volunteer_profile_id, requirement_id)
);

COMMENT ON TABLE ngo_reviews IS
    'Ratings and reviews submitted by volunteers after verified participation.';

CREATE INDEX idx_review_ngo       ON ngo_reviews(ngo_profile_id);
CREATE INDEX idx_review_volunteer ON ngo_reviews(volunteer_profile_id);

-- ------------------------------------------------------------
-- CSR PLEDGES
-- Supports both:
--   1. General NGO Funding
--   2. Opportunity Sponsorship
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS csr_pledges (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporate_profile_id    UUID NOT NULL,
    ngo_profile_id          UUID NOT NULL,
    requirement_id          UUID,
    pledged_amount          NUMERIC(14,2) NOT NULL DEFAULT 0
                                CHECK (pledged_amount >= 0),
    pledged_hours           NUMERIC(8,2) NOT NULL DEFAULT 0
                                CHECK (pledged_hours >= 0),
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_csr_corporate
        FOREIGN KEY (corporate_profile_id)
        REFERENCES corporate_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_csr_ngo
        FOREIGN KEY (ngo_profile_id)
        REFERENCES ngo_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_csr_requirement
        FOREIGN KEY (requirement_id)
        REFERENCES requirements(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE csr_pledges IS
    'Stores CSR funding records. Requirement is optional for general NGO funding.';

CREATE INDEX idx_csr_corporate  ON csr_pledges(corporate_profile_id);
CREATE INDEX idx_csr_ngo        ON csr_pledges(ngo_profile_id);
CREATE INDEX idx_csr_requirement ON csr_pledges(requirement_id);

-- ------------------------------------------------------------
-- CSR EMPLOYEE PARTICIPATION
-- Historical employee volunteering records.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS csr_employee_participation (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporate_profile_id    UUID NOT NULL,
    volunteer_profile_id    UUID NOT NULL,
    attendance_id           UUID NOT NULL,
    credited_hours          NUMERIC(8,2) NOT NULL DEFAULT 0,
    recorded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_employee_corporate
        FOREIGN KEY (corporate_profile_id)
        REFERENCES corporate_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_employee_volunteer
        FOREIGN KEY (volunteer_profile_id)
        REFERENCES volunteer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_employee_attendance
        FOREIGN KEY (attendance_id)
        REFERENCES attendance(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_employee_participation
        UNIQUE (attendance_id)
);

COMMENT ON TABLE csr_employee_participation IS
    'Historical employee volunteering records for CSR reporting.';

CREATE INDEX idx_employee_corporate ON csr_employee_participation(corporate_profile_id);
CREATE INDEX idx_employee_volunteer ON csr_employee_participation(volunteer_profile_id);

-- ------------------------------------------------------------
-- CSR REPORTS
-- Snapshot reports generated by corporates.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS csr_reports (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporate_profile_id    UUID NOT NULL,
    report_year             INTEGER NOT NULL
                                CHECK (report_year >= 2025),
    total_funds             NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_employee_hours    NUMERIC(10,2) NOT NULL DEFAULT 0,
    generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_report_corporate
        FOREIGN KEY (corporate_profile_id)
        REFERENCES corporate_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_report
        UNIQUE (corporate_profile_id, report_year)
);

COMMENT ON TABLE csr_reports IS
    'Stores yearly CSR report snapshots.';

CREATE INDEX idx_report_corporate ON csr_reports(corporate_profile_id);


-- ============================================================
-- SECTION 4 — OPTIONAL PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX idx_requirement_location ON requirements(location_name);
CREATE INDEX idx_requirement_category ON requirements(category);
CREATE INDEX idx_requirement_urgent   ON requirements(is_urgent);

CREATE INDEX idx_certificate_issue_date ON certificates(issue_date);
CREATE INDEX idx_credit_created         ON credits_log(created_at);
CREATE INDEX idx_attendance_checkin     ON attendance(checkin_time);
CREATE INDEX idx_csr_status             ON csr_pledges(status);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
