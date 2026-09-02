-- ============================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR PRESENSI SEKOLAH / SMK MULTI-ROMBEL
-- Version: 2.0 (High Performance, Multi-Tenant, 72+ Classes Ready)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing schema (Safe drop if recreating)
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;

-- ============================================================================
-- 1. PROFIL SEKOLAH (TENANT) & MULTI-LOKASI GPS GEOFENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    npsn VARCHAR(20) UNIQUE,
    subdomain VARCHAR(50) UNIQUE,
    join_code VARCHAR(20) UNIQUE NOT NULL,
    latitude DOUBLE PRECISION DEFAULT -6.200000,
    longitude DOUBLE PRECISION DEFAULT 106.816666,
    radius_meters INTEGER DEFAULT 150,
    start_time TIME WITHOUT TIME ZONE DEFAULT '07:00:00',
    late_after_minutes INTEGER DEFAULT 15,
    address TEXT,
    phone VARCHAR(30),
    logo_url TEXT,
    principal_name VARCHAR(150),
    principal_nip VARCHAR(50),
    plan_name VARCHAR(50) DEFAULT 'Pro Sekolah',
    max_students INTEGER DEFAULT 3000,
    max_classes INTEGER DEFAULT 100,
    whatsapp_enabled BOOLEAN DEFAULT true,
    rfid_enabled BOOLEAN DEFAULT true,
    gps_enabled BOOLEAN DEFAULT true,
    auto_session_enabled BOOLEAN DEFAULT true,
    check_in_start TIME WITHOUT TIME ZONE DEFAULT '06:00:00',
    check_in_end TIME WITHOUT TIME ZONE DEFAULT '07:15:00',
    check_out_start TIME WITHOUT TIME ZONE DEFAULT '14:00:00',
    check_out_end TIME WITHOUT TIME ZONE DEFAULT '18:00:00',
    fonnte_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- e.g. "Gedung Utama", "Bengkel Otomotif", "Lab RPL"
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER DEFAULT 100,
    address TEXT,
    is_main BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. TAHUN AJARAN & KALENDER AKADEMIK
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g. "2026/2027"
    semester VARCHAR(10) NOT NULL CHECK (semester IN ('ganjil', 'genap')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    curriculum VARCHAR(100) DEFAULT 'Kurikulum Merdeka',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('libur_nasional', 'kegiatan_sekolah', 'ujian', 'rapat', 'cuti_bersama')),
    color VARCHAR(30) DEFAULT '#3B82F6',
    description TEXT,
    target_audience VARCHAR(30) DEFAULT 'all',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. KELAS / ROMBEL (HINGGA 72 ROMBEL SMK) & SISWA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g. "X RPL 1", "XI TKR 2"
    grade_level VARCHAR(20) NOT NULL, -- "10", "11", "12"
    academic_year VARCHAR(50) NOT NULL,
    homeroom_teacher VARCHAR(150),
    homeroom_nip VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name, academic_year)
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    nis VARCHAR(50) NOT NULL,
    nisn VARCHAR(50),
    full_name VARCHAR(150) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('L', 'P', 'Laki-laki', 'Perempuan')),
    guardian_name VARCHAR(150),
    guardian_phone VARCHAR(50),
    card_uid VARCHAR(100),
    active BOOLEAN DEFAULT true,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, nis)
);

-- ============================================================================
-- 4. JADWAL MINGGUAN SMK (TEORI 1, TEORI 2, PRAKTIK BLOK LAB)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    day VARCHAR(15) NOT NULL CHECK (day IN ('senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu')),
    period INTEGER NOT NULL, -- Jam ke-1, 2, dst.
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    subject VARCHAR(150) NOT NULL,
    teacher_name VARCHAR(150) NOT NULL,
    teacher_nip VARCHAR(50),
    room VARCHAR(100),
    learning_group VARCHAR(30) DEFAULT 'teori_1' CHECK (learning_group IN ('teori_1', 'teori_2', 'praktik_lab', 'umum')),
    block_duration INTEGER DEFAULT 2,
    is_block_practical BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. PRESENSI HARIAN (GERBANG / KIOS QR / GPS SELFIE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    created_by UUID,
    date DATE NOT NULL,
    subject VARCHAR(150) DEFAULT 'Presensi Harian',
    start_time TIME WITHOUT TIME ZONE DEFAULT '06:00:00',
    end_time TIME WITHOUT TIME ZONE DEFAULT '18:00:00',
    late_after_minutes INTEGER DEFAULT 15,
    require_selfie BOOLEAN DEFAULT false,
    require_location BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'locked')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'terlambat', 'sakit', 'izin', 'alpa')),
    method VARCHAR(30) DEFAULT 'qr' CHECK (method IN ('manual', 'qr', 'selfie_gps', 'card', 'rfid')),
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    check_out_method VARCHAR(30),
    check_out_selfie_url TEXT,
    check_out_latitude DOUBLE PRECISION,
    check_out_longitude DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    selfie_url TEXT,
    notes TEXT,
    guardian_notified_at TIMESTAMPTZ,
    guardian_checkout_notified_at TIMESTAMPTZ,
    UNIQUE(session_id, student_id)
);

-- ============================================================================
-- 6. PRESENSI MATA PELAJARAN / JURNAL MENGAJAR GURU (KBM SMK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lesson_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.weekly_schedules(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    subject VARCHAR(150) NOT NULL,
    teacher_name VARCHAR(150) NOT NULL,
    teacher_nip VARCHAR(50),
    room VARCHAR(100),
    learning_group VARCHAR(30) DEFAULT 'teori_1',
    topic_material TEXT NOT NULL, -- Materi Pokok / Modul Pembelajaran
    learning_objective TEXT, -- Capaian Pembelajaran (CP) / TP
    obstacles_notes TEXT, -- Kejadian Khusus / Kendala
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lesson_student_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_attendance_id UUID NOT NULL REFERENCES public.lesson_attendances(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'terlambat', 'sakit', 'izin', 'alpa')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_attendance_id, student_id)
);

-- ============================================================================
-- 7. BUKU BK SISWA (EARLY WARNING SYSTEM & POIN PELANGGARAN)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bk_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'terlambat_berulang',
        'alpa_berulang',
        'bolos_kbm',
        'seragam_atribut',
        'kedisiplinan',
        'prestasi_positif'
    )),
    points INTEGER DEFAULT 5,
    description TEXT NOT NULL,
    action_taken VARCHAR(50) NOT NULL CHECK (action_taken IN (
        'teguran_lisan',
        'surat_peringatan_1',
        'surat_peringatan_2',
        'panggilan_ortu',
        'konseling_bk',
        'apresiasi'
    )),
    followup_notes TEXT,
    parent_notified BOOLEAN DEFAULT false,
    parent_notified_at TIMESTAMPTZ,
    recorded_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. PENGAJUAN IZIN / SAKIT SISWA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('izin', 'sakit', 'dispensasi')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    attachment_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by VARCHAR(150),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. GURU & TENAGA KEPENDIDIKAN (GTK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gtk_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    nip_or_nik VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    gtk_role VARCHAR(50) NOT NULL,
    subject_specialty VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    gender VARCHAR(10) CHECK (gender IN ('L', 'P')),
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'cuti', 'mutasi')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, nip_or_nik)
);

CREATE TABLE IF NOT EXISTS public.gtk_attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    gtk_id UUID NOT NULL REFERENCES public.gtk_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIME WITHOUT TIME ZONE,
    check_out_time TIME WITHOUT TIME ZONE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'terlambat', 'izin', 'sakit', 'dinas_luar', 'cuti', 'alpa')),
    late_minutes INTEGER DEFAULT 0,
    location_verified BOOLEAN DEFAULT true,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    selfie_url TEXT,
    method VARCHAR(30) DEFAULT 'selfie_gps',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(gtk_id, date)
);

-- ============================================================================
-- 10. WHATSAPP LOGS / NOTIFIKASI
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_name VARCHAR(150),
    recipient_phone VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(150),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('sent', 'pending', 'failed')),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. INDEXES UNTUK PERFORMA TINGGI (QUERY 72 KELAS / 2.500 SISWA CEPAT)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_students_school_class ON public.students(school_id, class_id);
CREATE INDEX IF NOT EXISTS idx_students_card_uid ON public.students(card_uid);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_date ON public.attendance_records(student_id, marked_at);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(school_id, date);
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_class_day ON public.weekly_schedules(class_id, day);
CREATE INDEX IF NOT EXISTS idx_lesson_attendances_class_date ON public.lesson_attendances(class_id, date);
CREATE INDEX IF NOT EXISTS idx_bk_violations_student ON public.bk_violations(student_id, date);
CREATE INDEX IF NOT EXISTS idx_gtk_attendance_date ON public.gtk_attendance_records(school_id, date);

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_student_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtk_attendance_records ENABLE ROW LEVEL SECURITY;

-- Allow public / anon read and write for rapid integration with API keys
CREATE POLICY "Allow public read-write for application client" ON public.schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for sessions" ON public.attendance_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for records" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for schedules" ON public.weekly_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for lesson attendances" ON public.lesson_attendances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for lesson student att" ON public.lesson_student_attendances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for bk" ON public.bk_violations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for leaves" ON public.student_leave_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for gtk" ON public.gtk_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for gtk records" ON public.gtk_attendance_records FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 13. VIEWS LAPORAN STANDAR DINAS & EARLY WARNING SYSTEM
-- ============================================================================

CREATE OR REPLACE VIEW public.v_early_warning_bk AS
SELECT 
    s.id AS student_id,
    s.nis,
    s.full_name,
    c.name AS class_name,
    COUNT(CASE WHEN ar.status = 'alpa' THEN 1 END) AS total_alpa,
    COUNT(CASE WHEN ar.status = 'terlambat' THEN 1 END) AS total_terlambat,
    COUNT(CASE WHEN ar.status = 'sakit' THEN 1 END) AS total_sakit,
    COUNT(CASE WHEN ar.status = 'izin' THEN 1 END) AS total_izin,
    COALESCE(SUM(bv.points), 0) AS total_poin_pelanggaran
FROM public.students s
JOIN public.classes c ON s.class_id = c.id
LEFT JOIN public.attendance_records ar ON s.id = ar.student_id
LEFT JOIN public.bk_violations bv ON s.id = bv.student_id
GROUP BY s.id, s.nis, s.full_name, c.name;
