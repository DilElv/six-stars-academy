import pool from './db.js'

const tables = [
  `CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coach', 'parent')),
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(500) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS age_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(50) NOT NULL,
    min_age INT NOT NULL,
    max_age INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(100) NOT NULL,
    singkatan VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    birth_place VARCHAR(255) DEFAULT '',
    address TEXT DEFAULT '',
    parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    parent_name VARCHAR(255) DEFAULT '',
    parent_phone VARCHAR(50) DEFAULT '',
    age_group_id UUID REFERENCES age_groups(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    avatar VARCHAR(500) DEFAULT '',
    blood_type VARCHAR(5) DEFAULT '',
    height VARCHAR(20) DEFAULT '',
    weight VARCHAR(20) DEFAULT '',
    preferred_foot VARCHAR(20) DEFAULT '',
    school VARCHAR(255) DEFAULT '',
    medical_history TEXT DEFAULT '',
    joined_date VARCHAR(100) DEFAULT '',
    emergency_contact VARCHAR(255) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM-DD'),
    report_type VARCHAR(20) NOT NULL DEFAULT 'session' CHECK (report_type IN ('session', 'monthly')),
    passing INT DEFAULT 50,
    dribbling INT DEFAULT 50,
    stamina INT DEFAULT 50,
    shooting INT DEFAULT 50,
    tactics INT DEFAULT 50,
    coach_note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, period, report_type)
  )`,

  `CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day VARCHAR(20) NOT NULL,
    time VARCHAR(50) NOT NULL,
    venue VARCHAR(255) DEFAULT '',
    focus TEXT DEFAULT '',
    coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
    age_group_id UUID REFERENCES age_groups(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    venue VARCHAR(255) DEFAULT '',
    coach_check_in BOOLEAN DEFAULT FALSE,
    coach_check_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'izin', 'alfa')),
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, session_id)
  )`,

  `CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    month VARCHAR(20) NOT NULL,
    year INT NOT NULL,
    amount INT NOT NULL DEFAULT 350000,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'oversession')),
    proof_url VARCHAR(500) DEFAULT '',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS site_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section VARCHAR(50) NOT NULL UNIQUE,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
]

const alter = [
  `ALTER TABLE metrics ADD COLUMN IF NOT EXISTS report_type VARCHAR(20) NOT NULL DEFAULT 'session' CHECK (report_type IN ('session', 'monthly'))`,
  `ALTER TABLE metrics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`,
  `ALTER TABLE metrics ALTER COLUMN period SET DEFAULT to_char(CURRENT_DATE, 'YYYY-MM-DD')`,
  `ALTER TABLE metrics DROP CONSTRAINT IF EXISTS metrics_student_id_period_report_type_key`,
  `ALTER TABLE metrics ADD CONSTRAINT metrics_student_id_period_report_type_key UNIQUE(student_id, period, report_type)`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS package_type VARCHAR(50) DEFAULT ''`,
  `ALTER TABLE metrics ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE metrics ADD COLUMN IF NOT EXISTS metrics_data JSONB DEFAULT '{}'`,
]

async function migrate() {
  console.log('Running migrations...')
  for (const sql of tables) {
    try {
      await pool.query(sql)
      console.log('  ✓', sql.split('\n')[0].substring(0, 60) + '...')
    } catch (err) {
      console.error('  ✗ Migration failed:', err.message)
      throw err
    }
  }
  for (const sql of alter) {
    try {
      await pool.query(sql)
      console.log('  ✓', sql.substring(0, 70) + '...')
    } catch (err) {
      console.error('  ✗ Alter failed:', err.message)
    }
  }
  console.log('All migrations complete.')
  await pool.end()
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
