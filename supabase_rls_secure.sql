-- ============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES - SECURE PRODUCTION CONFIG
-- ============================================================================
-- Ganti policy yang terbuka (USING true) dengan policy berbasis auth.uid() 
-- dan school_id untuk melindungi data multi-tenant.
--
-- CATATAN: Script ini menghapus policy yang tidak aman dan membuat policy baru.
-- Jalankan setelah tabel sudah dibuat dengan supabase_schema.sql
-- ============================================================================

-- ============================================================================
-- 1. SCHOOLS TABLE - Admin hanya bisa lihat sekolah mereka sendiri
-- ============================================================================

-- Tambahkan relasi GTK ke akun Supabase Auth pada project yang sudah terlanjur dibuat.
ALTER TABLE public.gtk_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;

-- Role aplikasi dibaca dari JWT Auth, bukan dari kolom tabel yang tidak tersedia.
-- Isi role di user_metadata atau app_metadata dengan: admin, teacher, atau student.
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role');
$$;

-- Hapus policy lama yang tidak aman
DROP POLICY IF EXISTS "Allow public read-write for application client" ON public.schools;

-- Policy baru: User hanya bisa akses sekolah mereka
CREATE POLICY "schools_select_own" ON public.schools
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Admin bisa lihat sekolah mereka
      id IN (
        SELECT school_id FROM public.gtk_profiles 
        WHERE user_id = auth.uid()
      )
      OR
      -- Siswa bisa lihat sekolah tempat mereka terdaftar
      id IN (
        SELECT school_id FROM public.students 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Admin hanya bisa update sekolah mereka
CREATE POLICY "schools_update_own" ON public.schools
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    AND id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    AND id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. CLASSES TABLE - Guru/Admin hanya bisa akses kelas di sekolah mereka
-- ============================================================================

DROP POLICY IF EXISTS "Allow public read-write for classes" ON public.classes;

CREATE POLICY "classes_select" ON public.classes
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
      UNION
      SELECT school_id FROM public.students 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "classes_insert_update_delete" ON public.classes
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. STUDENTS TABLE - Siswa hanya bisa lihat profil diri sendiri
-- ============================================================================

DROP POLICY IF EXISTS "Allow public read-write for students" ON public.students;

CREATE POLICY "students_select" ON public.students
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Siswa lihat profil sendiri
      user_id = auth.uid()
      OR
      -- Guru/Admin lihat siswa di sekolah mereka
      school_id IN (
        SELECT school_id FROM public.gtk_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "students_update_own_profile" ON public.students
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "students_insert_update_by_admin" ON public.students
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() = 'admin'
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() = 'admin'
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. ATTENDANCE_SESSIONS TABLE - Presensi hanya untuk sekolah terkait
-- ============================================================================

DROP POLICY IF EXISTS "Allow public read-write for sessions" ON public.attendance_sessions;

CREATE POLICY "sessions_select" ON public.attendance_sessions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
      UNION
      SELECT school_id FROM public.students 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sessions_insert_update" ON public.attendance_sessions
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. ATTENDANCE_RECORDS TABLE - Siswa bisa submit presensi sendiri
-- ============================================================================

DROP POLICY IF EXISTS "Allow public read-write for records" ON public.attendance_records;

CREATE POLICY "records_select" ON public.attendance_records
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Siswa lihat presensi diri sendiri
      student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
      )
      OR
      -- Guru/Admin lihat presensi siswa di sekolah mereka
      student_id IN (
        SELECT id FROM public.students 
        WHERE school_id IN (
          SELECT school_id FROM public.gtk_profiles 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "records_insert_by_student" ON public.attendance_records
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "records_update_by_teacher" ON public.attendance_records
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND student_id IN (
      SELECT id FROM public.students 
      WHERE school_id IN (
        SELECT school_id FROM public.gtk_profiles 
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND student_id IN (
      SELECT id FROM public.students 
      WHERE school_id IN (
        SELECT school_id FROM public.gtk_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 6. WEEKLY_SCHEDULES, LESSON_ATTENDANCES, BK_VIOLATIONS, dll
-- ============================================================================

DROP POLICY IF EXISTS "Allow public read-write for schedules" ON public.weekly_schedules;
DROP POLICY IF EXISTS "Allow public read-write for lesson attendances" ON public.lesson_attendances;
DROP POLICY IF EXISTS "Allow public read-write for lesson student att" ON public.lesson_student_attendances;
DROP POLICY IF EXISTS "Allow public read-write for bk" ON public.bk_violations;
DROP POLICY IF EXISTS "Allow public read-write for leaves" ON public.student_leave_requests;
DROP POLICY IF EXISTS "Allow public read-write for gtk" ON public.gtk_profiles;
DROP POLICY IF EXISTS "Allow public read-write for gtk records" ON public.gtk_attendance_records;

-- Pattern yang sama untuk semua tabel: filter berdasarkan school_id
-- dan role user. Contoh untuk schedules:

CREATE POLICY "schedules_select" ON public.weekly_schedules
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
      UNION
      SELECT school_id FROM public.students 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "schedules_modify" ON public.weekly_schedules
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Lesson attendances (guru bisa buat/update, siswa bisa lihat diri sendiri)
CREATE POLICY "lesson_attendances_select" ON public.lesson_attendances
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
      UNION
      SELECT school_id FROM public.students 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "lesson_attendances_modify" ON public.lesson_attendances
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- BK Violations (guru BK dan admin)
CREATE POLICY "bk_violations_select" ON public.bk_violations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bk_violations_modify" ON public.bk_violations
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Student leave requests (siswa buat sendiri, guru lihat/approve)
CREATE POLICY "leave_requests_select" ON public.student_leave_requests
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
      OR
      school_id IN (
        SELECT school_id FROM public.gtk_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "leave_requests_insert_by_student" ON public.student_leave_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "leave_requests_update_by_teacher" ON public.student_leave_requests
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- GTK Profiles (admin dan guru lihat, admin buat/update)
CREATE POLICY "gtk_profiles_select" ON public.gtk_profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "gtk_profiles_insert_update_by_admin" ON public.gtk_profiles
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() = 'admin'
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() = 'admin'
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- GTK Attendance Records
CREATE POLICY "gtk_records_select" ON public.gtk_attendance_records
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "gtk_records_modify" ON public.gtk_attendance_records
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Lesson Student Attendances
CREATE POLICY "lesson_student_attendances_select" ON public.lesson_student_attendances
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.lesson_attendances la
      WHERE la.id = lesson_attendance_id
      AND la.school_id IN (
        SELECT school_id FROM public.gtk_profiles 
        WHERE user_id = auth.uid()
        UNION
        SELECT school_id FROM public.students 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "lesson_student_attendances_modify" ON public.lesson_student_attendances
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND EXISTS (
      SELECT 1 FROM public.lesson_attendances la
      WHERE la.id = lesson_attendance_id
      AND la.school_id IN (
        SELECT school_id FROM public.gtk_profiles 
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND EXISTS (
      SELECT 1 FROM public.lesson_attendances la
      WHERE la.id = lesson_attendance_id
      AND la.school_id IN (
        SELECT school_id FROM public.gtk_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- WhatsApp Notifications (log hanya untuk admin)
DROP POLICY IF EXISTS "Allow public read-write" ON public.whatsapp_notifications;

CREATE POLICY "wa_notifications_select" ON public.whatsapp_notifications
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.current_app_role() = 'admin'
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "wa_notifications_insert" ON public.whatsapp_notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'teacher')
    AND school_id IN (
      SELECT school_id FROM public.gtk_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- DONE
-- ============================================================================
-- Setelah menjalankan script ini, verifikasi:
-- 1. Tidak ada policy lama yang terbuka (USING true)
-- 2. Semua table yang penting memiliki policy SELECT dan MODIFY
-- 3. Test login dengan berbagai role: superadmin, admin, teacher, student
-- 4. Verifikasi bahwa siswa tidak bisa lihat data siswa lain
-- 5. Verifikasi bahwa guru dari sekolah A tidak bisa lihat data sekolah B
-- ============================================================================
