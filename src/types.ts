export type AppRole = "superadmin" | "admin" | "teacher" | "student";
export type AttendanceMethod = "manual" | "qr" | "selfie_gps" | "card" | "rfid";
export type AttendanceStatus = "hadir" | "terlambat" | "sakit" | "izin" | "alpa";
export type SessionStatus = "open" | "locked";
export type DomainMode = "presensi.app" | "presensiku.app";

export type SaaSPlanTier = "starter" | "pro" | "enterprise";
export type SaaSLicenseStatus = "active" | "trial" | "expired" | "grace_period";
export type BrandThemePreset = "blue" | "emerald" | "maroon" | "indigo" | "amber" | "teal" | "custom";

export interface SaaSFeatureMap {
  mass_scheduling_72?: boolean;
  lesson_attendance?: boolean;
  bk_counseling?: boolean;
  gtk_attendance?: boolean;
  official_reports?: boolean;
  whatsapp_gateway?: boolean;
  custom_branding?: boolean;
  rfid_terminal?: boolean;
  gps_geofence?: boolean;
  byodb_supabase?: boolean;
  multi_campus_gps?: boolean;
}

export interface TenantPlan {
  plan_tier?: SaaSPlanTier;
  plan_name: "Starter" | "Pro" | "Enterprise" | "Starter (Gratis)" | "Pro Sekolah" | "Enterprise SaaS" | string;
  status?: SaaSLicenseStatus;
  max_students: number;
  max_classes: number;
  max_locations?: number;
  whatsapp_enabled: boolean;
  rfid_enabled: boolean;
  gps_enabled: boolean;
  active_until: string;
  license_key?: string;
  features?: SaaSFeatureMap;
}

export interface TerminologyConfig {
  preset: "sekolah" | "madrasah" | "pesantren" | "bimbel" | "kampus" | "custom";
  institution_label: string; // e.g. "Sekolah", "Pesantren", "Madrasah", "Bimbel"
  student_label: string; // e.g. "Siswa", "Santri", "Murid", "Mahasiswa"
  students_label: string; // e.g. "Data Siswa", "Data Santri", "Data Murid"
  teacher_label: string; // e.g. "Guru", "Ustadz / Ustadzah", "Pengajar", "Dosen", "Tutor"
  class_label: string; // e.g. "Kelas", "Halaqah", "Rombel", "Kelompok Belajar"
  identifier_label: string; // e.g. "NIS", "ID Santri", "NISN", "NIM", "Nomor Induk"
  guardian_label: string; // e.g. "Orang Tua / Wali", "Wali Santri", "Wali Murid"
}

export interface DailyAttendanceConfig {
  auto_session_enabled: boolean;
  check_in_start: string; // e.g. "06:00"
  check_in_end?: string; // e.g. "07:15"
  check_in_late?: string; // e.g. "07:15"
  late_cutoff_time?: string; // e.g. "07:15"
  check_out_start: string; // e.g. "14:00"
  check_out_end: string; // e.g. "18:00"
  auto_alpa_enabled?: boolean;
  auto_alpa_cutoff_time?: string; // e.g. "12:00"
  active_days: (number | "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu")[];
  require_selfie: boolean;
  require_location: boolean;
  allow_student_self_checkout?: boolean;
}

export interface SchoolLocation {
  id: string;
  name: string; // e.g. "Gedung Utama (Kampus 1)", "Gedung Timur (Kampus 2)", "Lab & Bengkel Praktik", "Asrama"
  latitude: number;
  longitude: number;
  radius_meters: number;
  address?: string;
  is_main?: boolean;
}

export interface School {
  id: string;
  name: string;
  subdomain?: string;
  npsn?: string | null;
  join_code: string;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  locations?: SchoolLocation[]; // Multi-building / Multi-campus GPS Geofencing
  start_time: string; // e.g. "07:00"
  late_after_minutes: number;
  address?: string;
  phone?: string;
  logo_url?: string;
  brand_theme?: BrandThemePreset;
  brand_color?: string; // e.g. hex code "#1e40af"
  principal_name?: string;
  principal_nip?: string;
  headmaster_name?: string;
  headmaster_nip?: string;
  plan?: TenantPlan;
  terminology?: TerminologyConfig;
  daily_config?: DailyAttendanceConfig;
  fonnte_token?: string;
  wa_gateway?: WhatsAppGatewayConfig;
  created_at: string;
  updated_at: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  name: string; // e.g. "X RPL 1"
  grade_level: string; // e.g. "10", "X", "11", "12"
  academic_year: string; // e.g. "2026/2027"
  homeroom_teacher?: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  class_id: string | null;
  nis: string;
  full_name: string;
  gender: "L" | "P" | "Laki-laki" | "Perempuan" | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  card_uid: string | null;
  active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSession {
  id: string;
  school_id: string;
  class_id: string | null;
  created_by: string;
  date: string; // YYYY-MM-DD
  subject: string; // Mata Pelajaran or "Presensi Harian"
  start_time: string; // HH:mm
  end_time?: string;
  late_after_minutes: number;
  require_selfie: boolean;
  require_location: boolean;
  status: SessionStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  school_id: string;
  student_id: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  marked_at: string; // Check-in timestamp (ISO string)
  check_out_time?: string | null; // Check-out timestamp (ISO string or HH:mm:ss)
  check_out_method?: AttendanceMethod | null;
  check_out_selfie_url?: string | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
  marked_by?: string;
  latitude: number | null;
  longitude: number | null;
  selfie_url?: string | null;
  notes?: string | null;
  guardian_notified_at?: string | null;
  guardian_checkout_notified_at?: string | null;
}

export interface QrToken {
  id: string;
  session_id: string;
  school_id: string;
  token: string;
  expires_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  school_id: string;
  nis?: string;
  gtk_id?: string;
  homeroom_class_id?: string;
  is_wali_kelas?: boolean;
  is_superadmin?: boolean;
}

export interface StudentLeaveRequest {
  id: string;
  school_id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  type: "izin" | "sakit" | "dispensasi";
  start_date: string;
  end_date: string;
  reason: string;
  attachment_url?: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export interface WhatsAppNotification {
  id: string;
  school_id: string;
  student_id: string;
  student_name: string;
  recipient_phone: string;
  recipient_name: string;
  message: string;
  status: "sent" | "pending" | "failed";
  timestamp: string;
}

export interface WhatsAppGatewayConfig {
  provider: "fonnte" | "wablas" | "custom_webhook" | "direct_wa_me";
  api_key: string;
  sender_number?: string;
  endpoint_url?: string;
  auto_notify_on_presence: boolean;
  auto_notify_on_checkout?: boolean;
  auto_notify_on_late: boolean;
  auto_notify_on_absent: boolean;
  message_template_hadir: string;
  message_template_pulang?: string;
  message_template_terlambat: string;
  message_template_alpa: string;
}

export interface AcademicYear {
  id: string;
  school_id: string;
  name: string; // e.g. "2025/2026"
  semester: "ganjil" | "genap";
  start_date: string;
  end_date: string;
  is_active: boolean;
  curriculum: string; // e.g. "Kurikulum Merdeka", "Kurikulum 2013"
  notes?: string;
}

export interface AcademicCalendarEvent {
  id: string;
  school_id: string;
  title: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  type: "libur_nasional" | "kegiatan_sekolah" | "ujian" | "rapat" | "cuti_bersama";
  color?: string;
  description?: string;
  target_audience: "all" | "student" | "teacher" | "staff";
}

export type SmkLearningGroup = "teori_1" | "teori_2" | "praktik_lab" | "umum";

export interface WeeklyScheduleItem {
  id: string;
  school_id: string;
  class_id: string;
  day: "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu";
  period: number; // 1, 2, 3, etc.
  start_time: string; // "07:15"
  end_time: string; // "08:00"
  subject: string; // e.g. "Pemrograman Web & Mobile"
  teacher_name: string;
  teacher_nip?: string;
  room?: string;
  learning_group?: SmkLearningGroup; // "teori_1" | "teori_2" | "praktik_lab" | "umum"
  block_duration?: number; // e.g. 2, 4, 8 jam pelajaran blok
  is_block_practical?: boolean; // true if workshop/lab block
}

export type GtkRole = "guru_pns" | "guru_pppk" | "guru_honorer" | "kepala_sekolah" | "tata_usaha" | "laboran" | "pustakawan" | "satpam" | "kebersihan";

export interface GtkProfile {
  id: string;
  school_id: string;
  nip_or_nik: string;
  full_name: string;
  gtk_role: GtkRole;
  subject_specialty?: string;
  phone: string;
  email: string;
  gender: "L" | "P";
  status: "aktif" | "cuti" | "mutasi";
  avatar_url?: string;
}

export interface GtkAttendanceRecord {
  id: string;
  school_id: string;
  gtk_id: string;
  gtk_name: string;
  gtk_role: GtkRole;
  date: string; // YYYY-MM-DD
  check_in_time: string | null; // "06:45"
  check_out_time: string | null; // "15:30"
  status: "hadir" | "terlambat" | "izin" | "sakit" | "dinas_luar" | "cuti" | "alpa";
  late_minutes: number;
  location_verified: boolean;
  latitude?: number;
  longitude?: number;
  selfie_url?: string | null;
  check_out_latitude?: number;
  check_out_longitude?: number;
  check_out_selfie_url?: string | null;
  method?: "selfie_gps" | "kiosk_qr" | "rfid_card" | "manual" | "qr_scan";
  distance_meters?: number;
  device_info?: string;
  notes?: string;
}

export interface LessonAttendanceRecord {
  id: string;
  school_id: string;
  class_id: string;
  class_name: string;
  schedule_id?: string;
  date: string; // YYYY-MM-DD
  period_start: number; // e.g. 1
  period_end: number; // e.g. 2 or 8 for blok lab
  subject: string;
  teacher_name: string;
  teacher_nip?: string;
  room?: string;
  learning_group?: SmkLearningGroup;
  topic_material: string; // Materi Pokok / Modul Pembelajaran
  learning_objective?: string; // Capaian Pembelajaran (CP) / TP
  obstacles_notes?: string; // Catatan Kendala / Kejadian Khusus di Kelas/Lab
  created_at: string;
  updated_at: string;
  student_statuses: {
    student_id: string;
    student_name: string;
    status: AttendanceStatus;
    notes?: string;
  }[];
}

export type BkViolationCategory = 
  | "terlambat_berulang"
  | "alpa_berulang"
  | "bolos_kbm"
  | "seragam"
  | "seragam_atribut"
  | "rokok_miras"
  | "perkelahian"
  | "kedisiplinan"
  | "prestasi_positif"
  | "lainnya";

export type BkCategory = BkViolationCategory;
export type BkActionTaken = "teguran_lisan" | "surat_peringatan_1" | "surat_peringatan_2" | "panggilan_ortu" | "konseling_bk" | "apresiasi";

export interface BkViolationRecord {
  id: string;
  school_id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  date: string;
  category: BkViolationCategory;
  points: number; // Poin pelanggaran (positif) atau apresiasi
  description: string;
  action_taken: BkActionTaken;
  followup_notes?: string;
  parent_notified: boolean;
  parent_notified_at?: string;
  recorded_by: string;
  created_at: string;
}

export interface OfficialReportHeader {
  provinsi: string;
  kabupaten_kota: string;
  satuan_pendidikan: string;
  npsn: string;
  alamat_lengkap: string;
  tahun_ajaran: string;
  semester: "Ganjil" | "Genap";
  bulan: string;
  tahun: number;
  kelas: string;
  wali_kelas: string;
  nip_wali_kelas?: string;
  guru_bk: string;
  nip_guru_bk?: string;
  kepala_sekolah: string;
  nip_kepala_sekolah?: string;
}

