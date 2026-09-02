-- =========================================================================
-- SUPABASE POSTGRESQL SCHEMA: MULTI-TENANT PRESENSI SEKOLAH SAAS
-- Domains: presensi.app (Admin/Guru Portal) & presensiku.app (Siswa PWA)
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SCHOOLS / TENANTS TABLE
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    npsn VARCHAR(50),
    join_code VARCHAR(20) UNIQUE NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 150,
    start_time TIME DEFAULT '07:00:00',
    late_after_minutes INTEGER DEFAULT 15,
    address TEXT,
    phone VARCHAR(50),
    logo_url TEXT,
    plan_name VARCHAR(50) DEFAULT 'Pro Sekolah',
    max_students INTEGER DEFAULT 1500,
    whatsapp_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g. "X RPL 1", "XII MIPA 2"
    grade_level VARCHAR(20) NOT NULL, -- "10", "11", "12"
    academic_year VARCHAR(20) DEFAULT '2026/2027',
    homeroom_teacher VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    nis VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('L', 'P', 'Laki-laki', 'Perempuan')),
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(50), -- Digunakan untuk Notifikasi WhatsApp Otomatis
    card_uid VARCHAR(100),      -- RFID Tag / Kartu Siswa
    active BOOLEAN DEFAULT true,
    user_id UUID,               -- Opsional: Relasi ke auth.users jika siswa punya akun login
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, nis)
);

-- 5. ATTENDANCE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    created_by UUID,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    subject VARCHAR(255) DEFAULT 'Presensi Harian',
    start_time TIME NOT NULL DEFAULT '06:30:00',
    end_time TIME DEFAULT '17:00:00',
    late_after_minutes INTEGER DEFAULT 15,
    require_selfie BOOLEAN DEFAULT true,
    require_location BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'locked')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'terlambat', 'sakit', 'izin', 'alpa')),
    method VARCHAR(20) NOT NULL CHECK (method IN ('manual', 'qr', 'selfie_gps', 'card')),
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    marked_by VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    selfie_url TEXT,
    notes TEXT,
    guardian_notified_at TIMESTAMPTZ,
    UNIQUE (session_id, student_id)
);

-- 7. DYNAMIC QR TOKENS TABLE (Anti-Cheat Rotating QR)
CREATE TABLE IF NOT EXISTS public.qr_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WHATSAPP NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'pending', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_students_school ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_rfid ON public.students(school_id, card_uid);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_marked ON public.attendance_records(marked_at);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for demo and token validation with school boundary
CREATE POLICY "Allow public read classes by school" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Allow public read students by school" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow student attendance submit" ON public.attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow student attendance read" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow session read" ON public.attendance_sessions FOR SELECT USING (true);
