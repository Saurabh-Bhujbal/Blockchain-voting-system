-- ============================================================
--  SecureVote — First Admin Seed Script
--  Database: voter_db
--  Table   : voters
--
--  INSTRUCTIONS:
--  1. Run generate_password_hash.py to get a bcrypt hash.
--  2. Paste the hash output into the INSERT below where
--     indicated (replace PASTE_HASH_HERE).
--  3. Execute this file against your MySQL instance:
--        mysql -u root -p voter_db < seed_admin.sql
--  4. Verify the SELECT at the bottom shows the new admin.
-- ============================================================

USE voter_db;

-- ── Step 1: Insert the first admin account ──────────────────
INSERT INTO voters_base (voter_id, name, password, role, face_encoding)
VALUES (
    UUID(),                   -- auto-generate a unique voter_id
    'System Administrator',   -- change to preferred display name
    'PASTE_HASH_HERE',        -- paste bcrypt hash from generate_password_hash.py
    'admin',
    NULL                      -- face_encoding added on first admin login
);

-- ── Step 2: Verify the insertion ────────────────────────────
SELECT
    voter_id,
    name,
    LEFT(password, 20) AS password_preview,   -- shows first 20 chars of hash only
    role,
    CASE WHEN face_encoding IS NULL THEN 'Not registered' ELSE 'Registered' END AS face_status
FROM voters_base
WHERE role = 'admin';
