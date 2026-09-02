import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  School,
  SchoolClass,
  Student,
  AttendanceRecord,
  AttendanceSession,
  WeeklyScheduleItem,
  GtkProfile,
  GtkAttendanceRecord,
  LessonAttendanceRecord,
  BkViolationRecord,
  StudentLeaveRequest,
} from "@/types";

const LOCAL_URL_KEY = "supabase_custom_url";
const LOCAL_KEY_KEY = "supabase_custom_anon_key";

export function getSupabaseCredentials() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

  let storedUrl = "";
  let storedKey = "";
  if (typeof window !== "undefined") {
    storedUrl = (localStorage.getItem(LOCAL_URL_KEY) || "").trim();
    storedKey = (localStorage.getItem(LOCAL_KEY_KEY) || "").trim();
  }

  const url = storedUrl || envUrl;
  const anonKey = storedKey || envKey;

  return {
    url,
    anonKey,
    isCustom: Boolean(storedUrl || storedKey),
    isEnv: Boolean(envUrl && envKey),
  };
}

export function saveCustomSupabaseCredentials(url: string, key: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_URL_KEY, url.trim());
    localStorage.setItem(LOCAL_KEY_KEY, key.trim());
  }
}

export function clearCustomSupabaseCredentials() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_URL_KEY);
    localStorage.removeItem(LOCAL_KEY_KEY);
  }
}

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url &&
    anonKey &&
    url.startsWith("http") &&
    anonKey.length > 20
  );
};

let cachedClient: SupabaseClient | null = null;
let cachedCredentials = { url: "", anonKey: "" };

export function getSupabaseClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!isSupabaseConfigured()) return null;

  if (
    cachedClient &&
    cachedCredentials.url === creds.url &&
    cachedCredentials.anonKey === creds.anonKey
  ) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(creds.url, creds.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    cachedCredentials = { url: creds.url, anonKey: creds.anonKey };
    return cachedClient;
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
    return null;
  }
}

export const supabase = getSupabaseClient();

/**
 * Test Supabase database connection and measure latency
 */
export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const url = customUrl || getSupabaseCredentials().url;
  const key = customKey || getSupabaseCredentials().anonKey;

  if (!url || !key) {
    return {
      success: false,
      message: "URL Supabase dan Anon Key belum diisi.",
    };
  }

  if (!url.startsWith("http")) {
    return {
      success: false,
      message: "Format URL Supabase tidak valid (harus dimulai dengan https://).",
    };
  }

  const start = performance.now();
  try {
    const testClient = createClient(url, key);
    // Ping public table or fetch 1 record from schools or classes
    const { data, error } = await testClient
      .from("schools")
      .select("id")
      .limit(1);

    const latency = Math.round(performance.now() - start);

    if (error) {
      // Table might not exist yet if schema wasn't run
      if (error.code === "42P01") {
        return {
          success: true,
          message: `Terhubung ke Supabase! (${latency}ms). Catatan: Tabel database belum dibuat. Silakan jalankan script supabase_schema.sql di SQL Editor Supabase.`,
          latencyMs: latency,
        };
      }
      return {
        success: false,
        message: `Koneksi gagal: ${error.message} (Code: ${error.code})`,
        latencyMs: latency,
      };
    }

    return {
      success: true,
      message: `Koneksi Supabase aktif & stabil (${latency}ms). Tabel schools terdeteksi.`,
      latencyMs: latency,
    };
  } catch (e: any) {
    return {
      success: false,
      message: `Gagal menghubungkan: ${e.message || "Network error"}`,
    };
  }
}

/**
 * Sync single attendance record to Supabase
 */
export async function syncRecordToSupabase(record: AttendanceRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from("attendance_records").upsert({
      id: record.id,
      session_id: record.session_id,
      school_id: record.school_id,
      student_id: record.student_id,
      status: record.status,
      method: record.method,
      marked_at: record.marked_at,
      check_out_time: record.check_out_time,
      check_out_method: record.check_out_method,
      check_out_selfie_url: record.check_out_selfie_url,
      check_out_latitude: record.check_out_latitude,
      check_out_longitude: record.check_out_longitude,
      marked_by: record.marked_by,
      latitude: record.latitude,
      longitude: record.longitude,
      selfie_url: record.selfie_url,
      notes: record.notes,
      guardian_notified_at: record.guardian_notified_at,
    });
    return !error;
  } catch (e) {
    console.warn("Supabase record sync error:", e);
    return false;
  }
}

/**
 * Push all local data into Supabase tables
 */
export async function pushAllToSupabase(data: {
  school: School | null;
  classes: SchoolClass[];
  students: Student[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  weeklySchedules: WeeklyScheduleItem[];
  gtkProfiles: GtkProfile[];
  gtkRecords: GtkAttendanceRecord[];
  lessonAttendances: LessonAttendanceRecord[];
  bkViolations: BkViolationRecord[];
}): Promise<{ success: boolean; syncedCounts: Record<string, number>; errors: string[] }> {
  const client = getSupabaseClient();
  const errors: string[] = [];
  const syncedCounts: Record<string, number> = {
    schools: 0,
    classes: 0,
    students: 0,
    sessions: 0,
    records: 0,
    schedules: 0,
    gtk: 0,
    gtkRecords: 0,
    lessonAttendances: 0,
    bkViolations: 0,
  };

  if (!client) {
    return { success: false, syncedCounts, errors: ["Supabase belum terkonfigurasi."] };
  }

  // 1. Sync School
  if (data.school) {
    try {
      const { error } = await client.from("schools").upsert({
        id: data.school.id,
        name: data.school.name,
        npsn: data.school.npsn,
        join_code: data.school.join_code,
        latitude: data.school.latitude,
        longitude: data.school.longitude,
        radius_meters: data.school.radius_meters,
        start_time: data.school.start_time,
        address: data.school.address,
        phone: data.school.phone,
        principal_name: data.school.principal_name,
        principal_nip: data.school.principal_nip,
      });
      if (error) errors.push(`Sekolah: ${error.message}`);
      else syncedCounts.schools = 1;
    } catch (e: any) {
      errors.push(`Sekolah: ${e.message}`);
    }
  }

  // 2. Sync Classes
  if (data.classes.length > 0) {
    try {
      const payload = data.classes.map((c) => ({
        id: c.id,
        school_id: c.school_id,
        name: c.name,
        grade_level: c.grade_level,
        academic_year: c.academic_year,
        homeroom_teacher: c.homeroom_teacher,
      }));
      const { error } = await client.from("classes").upsert(payload);
      if (error) errors.push(`Kelas: ${error.message}`);
      else syncedCounts.classes = data.classes.length;
    } catch (e: any) {
      errors.push(`Kelas: ${e.message}`);
    }
  }

  // 3. Sync Students
  if (data.students.length > 0) {
    try {
      const payload = data.students.map((s) => ({
        id: s.id,
        school_id: s.school_id,
        class_id: s.class_id,
        nis: s.nis,
        full_name: s.full_name,
        gender: s.gender,
        guardian_name: s.guardian_name,
        guardian_phone: s.guardian_phone,
        card_uid: s.card_uid,
        active: s.active,
      }));
      const { error } = await client.from("students").upsert(payload);
      if (error) errors.push(`Siswa: ${error.message}`);
      else syncedCounts.students = data.students.length;
    } catch (e: any) {
      errors.push(`Siswa: ${e.message}`);
    }
  }

  // 4. Sync Sessions
  if (data.sessions.length > 0) {
    try {
      const payload = data.sessions.map((ses) => ({
        id: ses.id,
        school_id: ses.school_id,
        class_id: ses.class_id,
        date: ses.date,
        subject: ses.subject,
        start_time: ses.start_time,
        end_time: ses.end_time,
        status: ses.status,
      }));
      const { error } = await client.from("attendance_sessions").upsert(payload);
      if (error) errors.push(`Sesi: ${error.message}`);
      else syncedCounts.sessions = data.sessions.length;
    } catch (e: any) {
      errors.push(`Sesi: ${e.message}`);
    }
  }

  // 5. Sync Records
  if (data.records.length > 0) {
    try {
      const payload = data.records.map((r) => ({
        id: r.id,
        session_id: r.session_id,
        school_id: r.school_id,
        student_id: r.student_id,
        status: r.status,
        method: r.method,
        marked_at: r.marked_at,
        check_out_time: r.check_out_time,
        check_out_method: r.check_out_method,
        latitude: r.latitude,
        longitude: r.longitude,
        notes: r.notes,
      }));
      const { error } = await client.from("attendance_records").upsert(payload);
      if (error) errors.push(`Presensi: ${error.message}`);
      else syncedCounts.records = data.records.length;
    } catch (e: any) {
      errors.push(`Presensi: ${e.message}`);
    }
  }

  // 6. Sync Weekly Schedules
  if (data.weeklySchedules && data.weeklySchedules.length > 0) {
    try {
      const payload = data.weeklySchedules.map((sch) => ({
        id: sch.id,
        school_id: sch.school_id,
        class_id: sch.class_id,
        day: sch.day,
        period: sch.period,
        start_time: sch.start_time,
        end_time: sch.end_time,
        subject: sch.subject,
        teacher_name: sch.teacher_name,
        teacher_nip: sch.teacher_nip,
        room: sch.room,
        learning_group: sch.learning_group,
        block_duration: sch.block_duration,
        is_block_practical: sch.is_block_practical,
      }));
      const { error } = await client.from("weekly_schedules").upsert(payload);
      if (error) errors.push(`Jadwal: ${error.message}`);
      else syncedCounts.schedules = data.weeklySchedules.length;
    } catch (e: any) {
      errors.push(`Jadwal: ${e.message}`);
    }
  }

  // 7. Sync GTK Profiles
  if (data.gtkProfiles && data.gtkProfiles.length > 0) {
    try {
      const payload = data.gtkProfiles.map((g) => ({
        id: g.id,
        school_id: g.school_id,
        nip_or_nik: g.nip_or_nik,
        full_name: g.full_name,
        gtk_role: g.gtk_role,
        subject_specialty: g.subject_specialty,
        phone: g.phone,
        email: g.email,
        gender: g.gender,
        status: g.status,
      }));
      const { error } = await client.from("gtk_profiles").upsert(payload);
      if (error) errors.push(`GTK: ${error.message}`);
      else syncedCounts.gtk = data.gtkProfiles.length;
    } catch (e: any) {
      errors.push(`GTK: ${e.message}`);
    }
  }

  // 8. Sync GTK Attendance Records
  if (data.gtkRecords && data.gtkRecords.length > 0) {
    try {
      const payload = data.gtkRecords.map((gr) => ({
        id: gr.id,
        school_id: gr.school_id,
        gtk_id: gr.gtk_id,
        gtk_name: gr.gtk_name,
        gtk_role: gr.gtk_role,
        date: gr.date,
        status: gr.status,
        check_in_time: gr.check_in_time,
        check_out_time: gr.check_out_time,
        late_minutes: gr.late_minutes,
        location_verified: gr.location_verified,
        latitude: gr.latitude,
        longitude: gr.longitude,
        method: gr.method,
      }));
      const { error } = await client.from("gtk_attendance_records").upsert(payload);
      if (error) errors.push(`Presensi GTK: ${error.message}`);
      else syncedCounts.gtkRecords = data.gtkRecords.length;
    } catch (e: any) {
      errors.push(`Presensi GTK: ${e.message}`);
    }
  }

  // 9. Sync Lesson Attendances (Priority 2)
  if (data.lessonAttendances && data.lessonAttendances.length > 0) {
    try {
      const payload = data.lessonAttendances.map((l) => ({
        id: l.id,
        school_id: l.school_id,
        schedule_id: l.schedule_id,
        class_id: l.class_id,
        class_name: l.class_name,
        date: l.date,
        period_start: l.period_start,
        period_end: l.period_end,
        subject: l.subject,
        teacher_name: l.teacher_name,
        teacher_nip: l.teacher_nip,
        room: l.room,
        learning_group: l.learning_group,
        topic_material: l.topic_material,
        learning_objective: l.learning_objective,
        obstacles_notes: l.obstacles_notes,
        student_statuses: l.student_statuses,
        created_at: l.created_at,
      }));
      const { error } = await client.from("lesson_attendances").upsert(payload);
      if (error) errors.push(`Presensi Mapel: ${error.message}`);
      else syncedCounts.lessonAttendances = data.lessonAttendances.length;
    } catch (e: any) {
      errors.push(`Presensi Mapel: ${e.message}`);
    }
  }

  // 10. Sync BK Violations (Priority 3)
  if (data.bkViolations && data.bkViolations.length > 0) {
    try {
      const payload = data.bkViolations.map((v) => ({
        id: v.id,
        school_id: v.school_id,
        student_id: v.student_id,
        student_name: v.student_name,
        class_id: v.class_id,
        class_name: v.class_name,
        date: v.date,
        category: v.category,
        points: v.points,
        description: v.description,
        action_taken: v.action_taken,
        followup_notes: v.followup_notes,
        parent_notified: v.parent_notified,
        parent_notified_at: v.parent_notified_at,
        recorded_by: v.recorded_by,
        created_at: v.created_at,
      }));
      const { error } = await client.from("bk_violations").upsert(payload);
      if (error) errors.push(`Buku BK: ${error.message}`);
      else syncedCounts.bkViolations = data.bkViolations.length;
    } catch (e: any) {
      errors.push(`Buku BK: ${e.message}`);
    }
  }

  return {
    success: errors.length === 0,
    syncedCounts,
    errors,
  };
}
