-- HelpingHands Database Schema
-- Run this file against your PostgreSQL database to create all required tables.
-- Usage: psql -h localhost -p 5433 -U postgres -d antigravity -f schema.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE (core identity for all roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role        VARCHAR(20) NOT NULL CHECK (role IN ('volunteer', 'ngo', 'corporate', 'admin')),
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(254) NOT NULL UNIQUE,
    phone       VARCHAR(20),
    city        VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. VOLUNTEER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS volunteer_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    skill_tags      TEXT[] DEFAULT '{}',
    total_hours     NUMERIC(10,2) NOT NULL DEFAULT 0,
    credit_points   INTEGER NOT NULL DEFAULT 0,
    trust_score     INTEGER NOT NULL DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. NGO PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS ngo_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    org_name        VARCHAR(200),
    registration_no VARCHAR(100),
    darpan_id       VARCHAR(100),
    pan_number      VARCHAR(20),
    focus_areas     TEXT[] DEFAULT '{}',
    verified        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. CORPORATE PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS corporate_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name    VARCHAR(200),
    cin_number      VARCHAR(50),
    csr_focus_areas TEXT[] DEFAULT '{}',
    verified        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. REQUIREMENTS (Volunteer needs posted by NGOs)
-- ============================================================
CREATE TABLE IF NOT EXISTS requirements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ngo_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(50),
    skill_tags      TEXT[] DEFAULT '{}',
    seats_total     INTEGER NOT NULL CHECK (seats_total > 0),
    seats_filled    INTEGER NOT NULL DEFAULT 0,
    event_date      DATE NOT NULL,
    location_name   VARCHAR(200),
    latitude        NUMERIC(10,7),
    longitude       NUMERIC(10,7),
    is_urgent       BOOLEAN NOT NULL DEFAULT false,
    status          VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. APPLICATIONS (Volunteers apply to requirements)
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id  UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    volunteer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at      TIMESTAMPTZ,
    UNIQUE(requirement_id, volunteer_id)
);

-- ============================================================
-- 7. ATTENDANCE (Geo-verified check-ins)
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id      UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    volunteer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    present             BOOLEAN NOT NULL DEFAULT false,
    checkin_latitude    NUMERIC(10,7),
    checkin_longitude   NUMERIC(10,7),
    distance_meters     NUMERIC(10,2),
    checked_in_at       TIMESTAMPTZ,
    marked_by           UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(requirement_id, volunteer_id)
);

-- ============================================================
-- 8. CREDITS LOG (Audit trail for points/hours)
-- ============================================================
CREATE TABLE IF NOT EXISTS credits_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requirement_id  UUID REFERENCES requirements(id) ON DELETE SET NULL,
    points_change   INTEGER NOT NULL DEFAULT 0,
    hours_change    NUMERIC(10,2) NOT NULL DEFAULT 0,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. CSR PLEDGES (Corporate pledges to NGOs)
-- ============================================================
CREATE TABLE IF NOT EXISTS csr_pledges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporate_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ngo_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pledged_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    pledged_hours   NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. CSR REPORTS (Generated compliance reports)
-- ============================================================
CREATE TABLE IF NOT EXISTS csr_reports (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporate_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_year         INTEGER NOT NULL,
    total_funds_spent   NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_hours_logged  NUMERIC(10,2) NOT NULL DEFAULT 0,
    verified_by_auditor BOOLEAN NOT NULL DEFAULT false,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_requirements_ngo_id ON requirements(ngo_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_applications_requirement ON applications(requirement_id);
CREATE INDEX IF NOT EXISTS idx_applications_volunteer ON applications(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_attendance_requirement ON attendance(requirement_id);
CREATE INDEX IF NOT EXISTS idx_attendance_volunteer ON attendance(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_credits_log_volunteer ON credits_log(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_csr_pledges_corporate ON csr_pledges(corporate_id);
CREATE INDEX IF NOT EXISTS idx_csr_reports_corporate ON csr_reports(corporate_id);
