import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import {
  School,
  SchoolLocation,
  SchoolClass,
  Student,
  AttendanceSession,
  AttendanceRecord,
  QrToken,
  UserProfile,
  AppRole,
  AttendanceStatus,
  AttendanceMethod,
  DomainMode,
  WhatsAppGatewayConfig,
  WhatsAppNotification,
  TerminologyConfig,
  AcademicYear,
  AcademicCalendarEvent,
  WeeklyScheduleItem,
  GtkProfile,
  GtkAttendanceRecord,
  StudentLeaveRequest,
  DailyAttendanceConfig,
  LessonAttendanceRecord,
  BkViolationRecord,
  TenantPlan,
  SaaSPlanTier,
  BrandThemePreset,
} from "@/types";
import { todayIso } from "@/lib/attendance";
import {
  isSupabaseConfigured,
  signInWithPassword,
  signUpWithPassword,
  sendWhatsAppViaEdgeFunction,
  syncRecordToSupabase,
} from "@/lib/supabase";
import { applySchoolBrandColor } from "@/lib/theme";

export const TERMINOLOGY_PRESETS: Record<
  TerminologyConfig["preset"],
  { name: string; description: string; config: TerminologyConfig }
> = {
  sekolah: {
    name: "Sekolah Umum (SD / SMP / SMA / SMK)",
    description: "Siswa, Guru, Kelas/Rombel, NIS / NISN, Orang Tua / Wali",
    config: {
      preset: "sekolah",
      institution_label: "Sekolah",
      student_label: "Siswa",
      students_label: "Data Siswa",
      teacher_label: "Guru",
      class_label: "Kelas",
      identifier_label: "NIS / NISN",
      guardian_label: "Orang Tua / Wali",
    },
  },
  pesantren: {
    name: "Pesantren & Rumah Tahfidz",
    description: "Santri, Ustadz / Ustadzah, Halaqah / Asrama, ID Santri, Wali Santri",
    config: {
      preset: "pesantren",
      institution_label: "Pondok Pesantren",
      student_label: "Santri",
      students_label: "Data Santri",
      teacher_label: "Ustadz / Ustadzah",
      class_label: "Halaqah / Asrama",
      identifier_label: "ID Santri / NIS",
      guardian_label: "Wali Santri",
    },
  },
  madrasah: {
    name: "Madrasah (MI / MTs / MA / Diniyah)",
    description: "Siswa / Santri, Guru / Ustadz, Kelas / Rombel, NIS / NISN, Wali Murid",
    config: {
      preset: "madrasah",
      institution_label: "Madrasah",
      student_label: "Siswa / Santri",
      students_label: "Data Siswa & Santri",
      teacher_label: "Guru / Ustadz",
      class_label: "Kelas / Rombel",
      identifier_label: "NIS / NISN",
      guardian_label: "Wali Murid",
    },
  },
  bimbel: {
    name: "Bimbingan Belajar (Bimbel) & Kursus",
    description: "Murid, Pengajar / Tutor, Kelompok Belajar, ID Murid, Orang Tua",
    config: {
      preset: "bimbel",
      institution_label: "Bimbel / Lembaga Kursus",
      student_label: "Murid",
      students_label: "Data Murid",
      teacher_label: "Pengajar / Tutor",
      class_label: "Kelompok Belajar",
      identifier_label: "ID Murid / Nomor Peserta",
      guardian_label: "Orang Tua Murid",
    },
  },
  kampus: {
    name: "Perguruan Tinggi / Kampus / Akademi",
    description: "Mahasiswa, Dosen / Pengampu, Kelas Kuliah, NIM, Wali Mahasiswa",
    config: {
      preset: "kampus",
      institution_label: "Perguruan Tinggi / Kampus",
      student_label: "Mahasiswa",
      students_label: "Data Mahasiswa",
      teacher_label: "Dosen / Pengampu",
      class_label: "Kelas Kuliah / Angkatan",
      identifier_label: "NIM / NPM",
      guardian_label: "Orang Tua / Wali",
    },
  },
  custom: {
    name: "Kustom Mandiri",
    description: "Sesuaikan seluruh istilah secara bebas sesuai kebutuhan institusi Anda",
    config: {
      preset: "custom",
      institution_label: "Lembaga",
      student_label: "Peserta Didik",
      students_label: "Data Peserta Didik",
      teacher_label: "Pendidik",
      class_label: "Rombel",
      identifier_label: "Nomor Registrasi",
      guardian_label: "Wali",
    },
  },
};

export const DEFAULT_TERMINOLOGY: TerminologyConfig = TERMINOLOGY_PRESETS.sekolah.config;

export const SAAS_PLAN_CONFIGS: Record<SaaSPlanTier, TenantPlan> = {
  starter: {
    plan_tier: "starter",
    plan_name: "Starter",
    status: "active",
    max_classes: 6,
    max_students: 250,
    max_locations: 1,
    whatsapp_enabled: false,
    rfid_enabled: false,
    gps_enabled: true,
    active_until: "2029-12-31",
    license_key: "FREE-STARTER-TIER",
    features: {
      mass_scheduling_72: false,
      lesson_attendance: false,
      bk_counseling: false,
      gtk_attendance: false,
      official_reports: false,
      whatsapp_gateway: false,
      custom_branding: false,
      rfid_terminal: false,
      gps_geofence: true,
      byodb_supabase: false,
      multi_campus_gps: false,
    },
  },
  pro: {
    plan_tier: "pro",
    plan_name: "Pro",
    status: "active",
    max_classes: 24,
    max_students: 1200,
    max_locations: 3,
    whatsapp_enabled: true,
    rfid_enabled: true,
    gps_enabled: true,
    active_until: "2028-12-31",
    license_key: "PRO-SCH-2028-TIER2",
    features: {
      mass_scheduling_72: false,
      lesson_attendance: true,
      bk_counseling: true,
      gtk_attendance: true,
      official_reports: true,
      whatsapp_gateway: true,
      custom_branding: true,
      rfid_terminal: true,
      gps_geofence: true,
      byodb_supabase: false,
      multi_campus_gps: true,
    },
  },
  enterprise: {
    plan_tier: "enterprise",
    plan_name: "Enterprise",
    status: "active",
    max_classes: 120, // Full support for multi-class & large institutions
    max_students: 5000,
    max_locations: 15,
    whatsapp_enabled: true,
    rfid_enabled: true,
    gps_enabled: true,
    active_until: "2030-12-31",
    license_key: "PRE-ENT-2030-UNLIMITED",
    features: {
      mass_scheduling_72: true,
      lesson_attendance: true,
      bk_counseling: true,
      gtk_attendance: true,
      official_reports: true,
      whatsapp_gateway: true,
      custom_branding: true,
      rfid_terminal: true,
      gps_geofence: true,
      byodb_supabase: true,
      multi_campus_gps: true,
    },
  },
};

const STORAGE_KEY = "presensi_app_state_v4_clean";

export const CLEAN_DEFAULT_SCHOOL: School = {
  id: "sch-1",
  name: "SMK Negeri 1 Teknologi & Rekayasa",
  subdomain: "smkn1",
  npsn: "20108921",
  join_code: "SMKN1",
  latitude: -6.2088,
  longitude: 106.8456,
  radius_meters: 300,
  logo_url: "",
  brand_theme: "maroon",
  brand_color: "#991b1b",
  locations: [
    {
      id: "loc-def-1",
      name: "Kampus Utama & Lab Komputer",
      latitude: -6.2088,
      longitude: 106.8456,
      radius_meters: 300,
      address: "Jl. Pendidikan Vokasi No. 1",
      is_main: true,
    },
    {
      id: "loc-def-2",
      name: "Bengkel Praktik Pemesinan & Otomotif",
      latitude: -6.2095,
      longitude: 106.8465,
      radius_meters: 250,
      address: "Kompleks Bengkel Industri Blok B",
      is_main: false,
    },
  ],
  start_time: "07:00",
  late_after_minutes: 15,
  address: "Jl. Pendidikan Vokasi No. 1",
  phone: "021-1234567",
  plan: { ...SAAS_PLAN_CONFIGS.enterprise },
  terminology: { ...TERMINOLOGY_PRESETS.sekolah.config },
  daily_config: {
    auto_session_enabled: true,
    check_in_start: "06:00",
    check_in_late: "07:15",
    check_out_start: "14:00",
    check_out_end: "17:30",
    active_days: ["senin", "selasa", "rabu", "kamis", "jumat"],
    require_selfie: true,
    require_location: true,
    allow_student_self_checkout: true,
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const CLEAN_DEFAULT_USER: UserProfile = {
  id: "usr-admin-1",
  email: "admin@sekolah.sch.id",
  full_name: "Administrator Sekolah",
  role: "admin",
  school_id: "sch-1",
  is_superadmin: true,
};

export const CLEAN_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: "ay-1",
    school_id: "sch-1",
    name: "2026/2027",
    semester: "ganjil",
    start_date: "2026-07-15",
    end_date: "2026-12-20",
    is_active: true,
    curriculum: "Kurikulum Merdeka",
    notes: "Tahun Ajaran Aktif",
  },
];

interface StoreState {
  schools: School[];
  classes: SchoolClass[];
  students: Student[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  qrTokens: QrToken[];
  currentUser: UserProfile | null;
  activeSchoolId: string | null;
  domainMode: DomainMode;
  whatsappConfig: WhatsAppGatewayConfig;
  whatsappLogs: WhatsAppNotification[];
  academicYears: AcademicYear[];
  calendarEvents: AcademicCalendarEvent[];
  weeklySchedules: WeeklyScheduleItem[];
  gtkProfiles: GtkProfile[];
  gtkRecords: GtkAttendanceRecord[];
  leaveRequests: StudentLeaveRequest[];
  lessonAttendances: LessonAttendanceRecord[];
  bkViolations: BkViolationRecord[];
}

const DEFAULT_WHATSAPP_CONFIG: WhatsAppGatewayConfig = {
  provider: "direct_wa_me",
  api_key: "",
  sender_number: "628123456789",
  endpoint_url: "https://api.fonnte.com/send",
  auto_notify_on_presence: false,
  auto_notify_on_checkout: false,
  auto_notify_on_late: false,
  auto_notify_on_absent: false,
  message_template_hadir:
    "Yth. Wali dari {nama_siswa}, ananda telah hadir di {nama_sekolah} pada {waktu_presensi} WIB (Status: HADIR TEPAT WAKTU).",
  message_template_pulang:
    "Yth. Bapak/Ibu Wali dari {nama_siswa}, ananda telah melakukan presensi PULANG sekolah pada {waktu_presensi} WIB ({tanggal}). Terima kasih.",
  message_template_terlambat:
    "Pemberitahuan: Siswa {nama_siswa} tercatat HADIR TERLAMBAT pada {waktu_presensi} WIB di {nama_sekolah}. Mohon perhatian bapak/ibu.",
  message_template_alpa:
    "Pemberitahuan Penting: Ananda {nama_siswa} tercatat TIDAK HADIR (TANPA KETERANGAN) pada hari ini {tanggal} di {nama_sekolah}.",
};

export const DEFAULT_DAILY_CONFIG = {
  auto_session_enabled: true,
  check_in_start: "06:00",
  check_in_late: "07:15",
  check_out_start: "14:00",
  check_out_end: "17:30",
  active_days: ["senin", "selasa", "rabu", "kamis", "jumat"] as ("senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu")[],
  require_selfie: true,
  require_location: true,
  allow_student_self_checkout: true,
};

const SEED_SCHOOLS: School[] = [
  {
    id: "sch-1",
    name: "SMA Negeri 1 Nusantara",
    subdomain: "sman1",
    npsn: "20104589",
    join_code: "SMAN1N",
    latitude: -6.2088,
    longitude: 106.8456,
    radius_meters: 300,
    locations: [
      {
        id: "loc-1",
        name: "Kampus 1 (Gedung Utama)",
        latitude: -6.2088,
        longitude: 106.8456,
        radius_meters: 300,
        address: "Jl. Merdeka No. 45, Jakarta Pusat",
        is_main: true,
      },
      {
        id: "loc-2",
        name: "Kampus 2 (Gedung Lab & Olahraga Terpisah)",
        latitude: -6.2125,
        longitude: 106.8492,
        radius_meters: 250,
        address: "Jl. Lapangan Timur No. 8, Jakarta Pusat",
        is_main: false,
      },
    ],
    start_time: "07:00",
    late_after_minutes: 15,
    address: "Jl. Merdeka No. 45, Jakarta Pusat",
    phone: "021-3456789",
    plan: {
      plan_name: "Pro Sekolah",
      max_students: 1500,
      max_classes: 40,
      whatsapp_enabled: true,
      rfid_enabled: true,
      gps_enabled: true,
      active_until: "2027-12-31",
    },
    terminology: { ...TERMINOLOGY_PRESETS.sekolah.config },
    daily_config: { ...DEFAULT_DAILY_CONFIG },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sch-2",
    name: "SMK Teknologi Bangsa",
    subdomain: "smktb",
    npsn: "20108922",
    join_code: "SMKTB",
    latitude: -6.9175,
    longitude: 107.6191,
    radius_meters: 250,
    start_time: "07:15",
    late_after_minutes: 10,
    address: "Jl. Pendidikan No. 12, Bandung",
    phone: "022-8765432",
    plan: {
      plan_name: "Enterprise SaaS",
      max_students: 3000,
      max_classes: 80,
      whatsapp_enabled: true,
      rfid_enabled: true,
      gps_enabled: true,
      active_until: "2028-06-30",
    },
    terminology: { ...TERMINOLOGY_PRESETS.sekolah.config },
    daily_config: { ...DEFAULT_DAILY_CONFIG, check_in_late: "07:15", check_out_start: "14:30" },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sch-3",
    name: "Pondok Pesantren Al-Hikmah & MTs Cerdas Mandiri",
    subdomain: "pesantrenalhikmah",
    npsn: "20109931",
    join_code: "SANTRI",
    latitude: -7.2575,
    longitude: 112.7521,
    radius_meters: 200,
    start_time: "06:45",
    late_after_minutes: 15,
    address: "Jl. Pesantren No. 88, Surabaya",
    phone: "031-5544332",
    plan: {
      plan_name: "Starter (Gratis)",
      max_students: 500,
      max_classes: 15,
      whatsapp_enabled: true,
      rfid_enabled: true,
      gps_enabled: true,
      active_until: "2027-01-01",
    },
    terminology: { ...TERMINOLOGY_PRESETS.pesantren.config },
    daily_config: { ...DEFAULT_DAILY_CONFIG, check_in_late: "07:00", active_days: ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_CLASSES: SchoolClass[] = [
  {
    id: "cls-1",
    school_id: "sch-1",
    name: "X RPL 1",
    grade_level: "10",
    academic_year: "2026/2027",
    homeroom_teacher: "Drs. Bambang Sudarsono, M.Pd",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "cls-2",
    school_id: "sch-1",
    name: "X RPL 2",
    grade_level: "10",
    academic_year: "2026/2027",
    homeroom_teacher: "Siti Rahmawati, S.Kom",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "cls-3",
    school_id: "sch-1",
    name: "XI TKJ 1",
    grade_level: "11",
    academic_year: "2026/2027",
    homeroom_teacher: "Ahmad Fauzi, S.T",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "cls-4",
    school_id: "sch-1",
    name: "XII MIPA 1",
    grade_level: "12",
    academic_year: "2026/2027",
    homeroom_teacher: "Dewi Lestari, M.Si",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "cls-5",
    school_id: "sch-2",
    name: "X Mekatronika A",
    grade_level: "10",
    academic_year: "2026/2027",
    homeroom_teacher: "Ir. Handoko, S.T",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_STUDENTS: Student[] = [
  {
    id: "stu-1",
    school_id: "sch-1",
    class_id: "cls-1",
    nis: "102401",
    full_name: "Aditya Pratama Putra",
    gender: "L",
    guardian_name: "Bapak Hendra Pratama",
    guardian_phone: "081234567890",
    card_uid: "RFID-9901-A",
    active: true,
    user_id: "usr-stu-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "stu-2",
    school_id: "sch-1",
    class_id: "cls-1",
    nis: "102402",
    full_name: "Alya Putri Ramadhani",
    gender: "P",
    guardian_name: "Ibu Nurhayati",
    guardian_phone: "081298765432",
    card_uid: "RFID-9902-B",
    active: true,
    user_id: "usr-stu-2",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "stu-3",
    school_id: "sch-1",
    class_id: "cls-1",
    nis: "102403",
    full_name: "Bima Arya Wijaya",
    gender: "L",
    guardian_name: "Bapak Sunardi",
    guardian_phone: "081377889900",
    card_uid: "RFID-9903-C",
    active: true,
    user_id: "usr-stu-3",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "stu-4",
    school_id: "sch-1",
    class_id: "cls-1",
    nis: "102404",
    full_name: "Citra Kirana Dewi",
    gender: "P",
    guardian_name: "Bapak Gunawan",
    guardian_phone: "081911223344",
    card_uid: "RFID-9904-D",
    active: true,
    user_id: "usr-stu-4",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "stu-5",
    school_id: "sch-1",
    class_id: "cls-1",
    nis: "102405",
    full_name: "Daffa Rizky Alfarizi",
    gender: "L",
    guardian_name: "Ibu Ratna Sari",
    guardian_phone: "085744556677",
    card_uid: "RFID-9905-E",
    active: true,
    user_id: "usr-stu-5",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "stu-6",
    school_id: "sch-1",
    class_id: "cls-1",
    nis: "102406",
    full_name: "Elsa Amelia",
    gender: "P",
    guardian_name: "Bapak Hermawan",
    guardian_phone: "082133445566",
    card_uid: "RFID-9906-F",
    active: true,
    user_id: "usr-stu-6",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const today = todayIso();

const SEED_SESSIONS: AttendanceSession[] = [
  {
    id: "ses-1",
    school_id: "sch-1",
    class_id: "cls-1",
    created_by: "usr-admin-1",
    date: today,
    subject: "Presensi Harian X RPL 1",
    start_time: "06:00",
    end_time: "17:30",
    late_after_minutes: 15,
    require_selfie: true,
    require_location: true,
    status: "open",
    notes: "Presensi Harian Masuk & Pulang Siswa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ses-2",
    school_id: "sch-1",
    class_id: "cls-2",
    created_by: "usr-admin-1",
    date: today,
    subject: "Presensi Harian X RPL 2",
    start_time: "06:00",
    end_time: "17:30",
    late_after_minutes: 15,
    require_selfie: true,
    require_location: true,
    status: "open",
    notes: "Presensi Harian Masuk & Pulang Siswa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ses-3",
    school_id: "sch-1",
    class_id: "cls-3",
    created_by: "usr-admin-1",
    date: today,
    subject: "Presensi Harian XI TKJ 1",
    start_time: "06:00",
    end_time: "17:30",
    late_after_minutes: 15,
    require_selfie: true,
    require_location: true,
    status: "open",
    notes: "Presensi Harian Masuk & Pulang Siswa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ses-4",
    school_id: "sch-1",
    class_id: "cls-4",
    created_by: "usr-admin-1",
    date: today,
    subject: "Presensi Harian XII MIPA 1",
    start_time: "06:00",
    end_time: "17:30",
    late_after_minutes: 15,
    require_selfie: true,
    require_location: true,
    status: "open",
    notes: "Presensi Harian Masuk & Pulang Siswa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_RECORDS: AttendanceRecord[] = [
  {
    id: "rec-1",
    session_id: "ses-1",
    school_id: "sch-1",
    student_id: "stu-1",
    status: "hadir",
    method: "card",
    marked_at: `${today}T06:45:12.000Z`,
    check_out_time: `${today}T15:15:20.000Z`,
    check_out_method: "card",
    latitude: -6.2088,
    longitude: 106.8456,
  },
  {
    id: "rec-2",
    session_id: "ses-1",
    school_id: "sch-1",
    student_id: "stu-2",
    status: "hadir",
    method: "selfie_gps",
    marked_at: `${today}T06:58:30.000Z`,
    check_out_time: `${today}T15:10:05.000Z`,
    check_out_method: "selfie_gps",
    latitude: -6.2089,
    longitude: 106.8457,
  },
  {
    id: "rec-3",
    session_id: "ses-1",
    school_id: "sch-1",
    student_id: "stu-3",
    status: "terlambat",
    method: "qr",
    marked_at: `${today}T07:22:04.000Z`,
    check_out_time: null,
    latitude: -6.2088,
    longitude: 106.8456,
    notes: "Terlambat 7 menit karena macet",
  },
  {
    id: "rec-4",
    session_id: "ses-1",
    school_id: "sch-1",
    student_id: "stu-4",
    status: "sakit",
    method: "manual",
    marked_at: `${today}T07:05:00.000Z`,
    check_out_time: null,
    latitude: null,
    longitude: null,
    notes: "Surat dokter terlampir via WA",
  },
];

const SEED_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: "ay-1",
    school_id: "sch-1",
    name: "2025/2026",
    semester: "ganjil",
    start_date: "2025-07-14",
    end_date: "2025-12-19",
    is_active: true,
    curriculum: "Kurikulum Merdeka",
    notes: "Tahun Ajaran Aktif Semester Ganjil 2025/2026",
  },
  {
    id: "ay-2",
    school_id: "sch-1",
    name: "2025/2026",
    semester: "genap",
    start_date: "2026-01-05",
    end_date: "2026-06-20",
    is_active: false,
    curriculum: "Kurikulum Merdeka",
    notes: "Semester Genap TA 2025/2026",
  },
  {
    id: "ay-3",
    school_id: "sch-1",
    name: "2024/2025",
    semester: "genap",
    start_date: "2025-01-06",
    end_date: "2025-06-21",
    is_active: false,
    curriculum: "Kurikulum Merdeka",
    notes: "Arsip TA 2024/2025",
  },
  {
    id: "ay-4",
    school_id: "sch-2",
    name: "2025/2026",
    semester: "ganjil",
    start_date: "2025-07-14",
    end_date: "2025-12-19",
    is_active: true,
    curriculum: "Kurikulum Merdeka SMK",
    notes: "Tahun Ajaran SMK TB",
  },
  {
    id: "ay-5",
    school_id: "sch-3",
    name: "1446/1447 H (2025/2026)",
    semester: "ganjil",
    start_date: "2025-07-14",
    end_date: "2025-12-19",
    is_active: true,
    curriculum: "Kurikulum Terpadu & Salafiyah",
    notes: "Tahun Ajaran Pesantren",
  },
];

const SEED_CALENDAR_EVENTS: AcademicCalendarEvent[] = [
  {
    id: "evt-1",
    school_id: "sch-1",
    title: "Awal Masuk Sekolah & MPLS (Masa Pengenalan Lingkungan)",
    start_date: "2025-07-14",
    end_date: "2025-07-16",
    type: "kegiatan_sekolah",
    color: "#3b82f6",
    description: "Kegiatan sambut peserta didik baru dan sosialisasi program sekolah",
    target_audience: "all",
  },
  {
    id: "evt-2",
    school_id: "sch-1",
    title: "Hari Ulang Tahun Kemerdekaan RI Ke-80",
    start_date: "2025-08-17",
    end_date: "2025-08-17",
    type: "libur_nasional",
    color: "#ef4444",
    description: "Upacara bendera & Libur Nasional",
    target_audience: "all",
  },
  {
    id: "evt-3",
    school_id: "sch-1",
    title: "Asesmen Sumatif Tengah Semester (STS / PTS) Ganjil",
    start_date: "2025-09-22",
    end_date: "2025-09-27",
    type: "ujian",
    color: "#f59e0b",
    description: "Pelaksanaan STS Berbasis Komputer & Smartphone di sekolah",
    target_audience: "student",
  },
  {
    id: "evt-4",
    school_id: "sch-1",
    title: "Rapat Pleno GTK & Evaluasi Capaian Pembelajaran",
    start_date: "2025-10-04",
    end_date: "2025-10-04",
    type: "rapat",
    color: "#8b5cf6",
    description: "Evaluasi capaian modul ajar, presensi guru, dan bimbingan siswa",
    target_audience: "teacher",
  },
  {
    id: "evt-5",
    school_id: "sch-1",
    title: "Asesmen Sumatif Akhir Semester (SAS / PAS) Ganjil",
    start_date: "2025-12-01",
    end_date: "2025-12-10",
    type: "ujian",
    color: "#ec4899",
    description: "Penilaian akhir semester ganjil seluruh jenjang kelas",
    target_audience: "student",
  },
  {
    id: "evt-6",
    school_id: "sch-1",
    title: "Pembagian Rapor Semester Ganjil",
    start_date: "2025-12-19",
    end_date: "2025-12-19",
    type: "kegiatan_sekolah",
    color: "#10b981",
    description: "Pengambilan laporan hasil belajar peserta didik oleh orang tua/wali",
    target_audience: "all",
  },
  {
    id: "evt-7",
    school_id: "sch-1",
    title: "Libur Akhir Semester Ganjil & Cuti Bersama",
    start_date: "2025-12-22",
    end_date: "2026-01-03",
    type: "cuti_bersama",
    color: "#64748b",
    description: "Libur semester ganjil dan pergantian tahun",
    target_audience: "all",
  },
];

const SEED_WEEKLY_SCHEDULES: WeeklyScheduleItem[] = [
  // Senin - X RPL 1
  {
    id: "ws-1",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "senin",
    period: 1,
    start_time: "07:00",
    end_time: "07:45",
    subject: "Upacara Bendera & Pembinaan Karakter",
    teacher_name: "Drs. Bambang Sudarsono, M.Pd",
    teacher_nip: "197204151998021001",
    room: "Lapangan Utama",
  },
  {
    id: "ws-2",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "senin",
    period: 2,
    start_time: "07:45",
    end_time: "08:30",
    subject: "Dasar Pemrograman Web & Logika",
    teacher_name: "Siti Rahmawati, S.Kom",
    teacher_nip: "198506202010012008",
    room: "Lab Komputer 1",
  },
  {
    id: "ws-3",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "senin",
    period: 3,
    start_time: "08:30",
    end_time: "09:15",
    subject: "Dasar Pemrograman Web & Logika",
    teacher_name: "Siti Rahmawati, S.Kom",
    teacher_nip: "198506202010012008",
    room: "Lab Komputer 1",
  },
  {
    id: "ws-4",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "senin",
    period: 4,
    start_time: "09:30",
    end_time: "10:15",
    subject: "Matematika Tingkat Lanjut",
    teacher_name: "Ahmad Fauzi, M.Sc",
    teacher_nip: "199011122019031005",
    room: "Ruang Teori 101",
  },
  {
    id: "ws-5",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "senin",
    period: 5,
    start_time: "10:15",
    end_time: "11:00",
    subject: "Matematika Tingkat Lanjut",
    teacher_name: "Ahmad Fauzi, M.Sc",
    teacher_nip: "199011122019031005",
    room: "Ruang Teori 101",
  },
  {
    id: "ws-6",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "senin",
    period: 6,
    start_time: "11:00",
    end_time: "11:45",
    subject: "Bahasa Indonesia",
    teacher_name: "Dra. Sri Wahyuni, M.Hum",
    teacher_nip: "198003102008012015",
    room: "Ruang Teori 101",
  },

  // Selasa - X RPL 1
  {
    id: "ws-7",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "selasa",
    period: 1,
    start_time: "07:15",
    end_time: "08:00",
    subject: "Pemodelan Perangkat Lunak (UML & Flowchart)",
    teacher_name: "Siti Rahmawati, S.Kom",
    teacher_nip: "198506202010012008",
    room: "Lab Komputer 1",
  },
  {
    id: "ws-8",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "selasa",
    period: 2,
    start_time: "08:00",
    end_time: "08:45",
    subject: "Pemodelan Perangkat Lunak (UML & Flowchart)",
    teacher_name: "Siti Rahmawati, S.Kom",
    teacher_nip: "198506202010012008",
    room: "Lab Komputer 1",
  },
  {
    id: "ws-9",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "selasa",
    period: 3,
    start_time: "09:00",
    end_time: "09:45",
    subject: "Basis Data Relasional (SQL & Design)",
    teacher_name: "Rian Hidayat, M.Kom",
    teacher_nip: "199408222022011009",
    room: "Lab Komputer 2",
  },
  {
    id: "ws-10",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "selasa",
    period: 4,
    start_time: "09:45",
    end_time: "10:30",
    subject: "Basis Data Relasional (SQL & Design)",
    teacher_name: "Rian Hidayat, M.Kom",
    teacher_nip: "199408222022011009",
    room: "Lab Komputer 2",
  },
  {
    id: "ws-11",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "selasa",
    period: 5,
    start_time: "10:45",
    end_time: "11:30",
    subject: "Bahasa Inggris Komunikasi",
    teacher_name: "Sarah Jenkins, B.Ed",
    room: "Ruang Teori 101",
  },

  // Rabu - X RPL 1
  {
    id: "ws-12",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "rabu",
    period: 1,
    start_time: "07:15",
    end_time: "08:45",
    subject: "Pendidikan Jasmani, Olahraga & Kesehatan",
    teacher_name: "Hendra Wijaya, S.Pd",
    teacher_nip: "197805142006041003",
    room: "GOR / Lapangan Olahraga",
  },
  {
    id: "ws-13",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "rabu",
    period: 3,
    start_time: "09:00",
    end_time: "10:30",
    subject: "Pendidikan Agama & Budi Pekerti",
    teacher_name: "Drs. Bambang Sudarsono, M.Pd",
    room: "Ruang Teori 101",
  },
  {
    id: "ws-14",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "rabu",
    period: 5,
    start_time: "10:45",
    end_time: "12:00",
    subject: "Pendidikan Pancasila (PPKn)",
    teacher_name: "Dra. Sri Wahyuni, M.Hum",
    room: "Ruang Teori 101",
  },

  // Kamis - X RPL 1
  {
    id: "ws-15",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "kamis",
    period: 1,
    start_time: "07:15",
    end_time: "09:15",
    subject: "Projek Kreatif & Produk Kewirausahaan (PKK)",
    teacher_name: "Rian Hidayat, M.Kom",
    room: "Ruang Praktik Kreatif",
  },
  {
    id: "ws-16",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "kamis",
    period: 3,
    start_time: "09:30",
    end_time: "11:00",
    subject: "Informatika & Sistem Jaringan Komputer",
    teacher_name: "Ahmad Fauzi, M.Sc",
    room: "Lab Komputer 1",
  },

  // Jumat - X RPL 1
  {
    id: "ws-17",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "jumat",
    period: 1,
    start_time: "07:00",
    end_time: "07:45",
    subject: "Jumat Bersih, Sehat & Literasi Pagi",
    teacher_name: "Drs. Bambang Sudarsono, M.Pd",
    room: "Area Sekolah & Perpustakaan",
  },
  {
    id: "ws-18",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "jumat",
    period: 2,
    start_time: "07:45",
    end_time: "09:15",
    subject: "Bimbingan Konseling & Pengembangan Diri",
    teacher_name: "Drs. Bambang Sudarsono, M.Pd",
    room: "Ruang BK / Kelas 101",
  },
  {
    id: "ws-19",
    school_id: "sch-1",
    class_id: "cls-1",
    day: "jumat",
    period: 4,
    start_time: "09:30",
    end_time: "10:30",
    subject: "Seni Budaya & Keterampilan Digital",
    teacher_name: "Siti Rahmawati, S.Kom",
    room: "Ruang Multimedia",
  },
];

const SEED_GTK_PROFILES: GtkProfile[] = [
  {
    id: "gtk-1",
    school_id: "sch-1",
    nip_or_nik: "197204151998021001",
    full_name: "Drs. Bambang Sudarsono, M.Pd",
    gtk_role: "guru_pns",
    subject_specialty: "Kepala Sekolah & Guru BK",
    phone: "6281234567801",
    email: "bambang.sudarsono@sman1.sch.id",
    gender: "L",
    status: "aktif",
  },
  {
    id: "gtk-2",
    school_id: "sch-1",
    nip_or_nik: "198506202010012008",
    full_name: "Siti Rahmawati, S.Kom",
    gtk_role: "guru_pns",
    subject_specialty: "Rekayasa Perangkat Lunak & Web",
    phone: "6281234567802",
    email: "siti.rahma@sman1.sch.id",
    gender: "P",
    status: "aktif",
  },
  {
    id: "gtk-3",
    school_id: "sch-1",
    nip_or_nik: "199011122019031005",
    full_name: "Ahmad Fauzi, M.Sc",
    gtk_role: "guru_honorer",
    subject_specialty: "Matematika & Pemrograman Dasar",
    phone: "6281234567803",
    email: "ahmad.fauzi@sman1.sch.id",
    gender: "L",
    status: "aktif",
  },
  {
    id: "gtk-4",
    school_id: "sch-1",
    nip_or_nik: "198003102008012015",
    full_name: "Dra. Sri Wahyuni, M.Hum",
    gtk_role: "guru_pns",
    subject_specialty: "Bahasa Indonesia & PPKn",
    phone: "6281234567804",
    email: "sri.wahyuni@sman1.sch.id",
    gender: "P",
    status: "aktif",
  },
  {
    id: "gtk-5",
    school_id: "sch-1",
    nip_or_nik: "199408222022011009",
    full_name: "Rian Hidayat, M.Kom",
    gtk_role: "guru_honorer",
    subject_specialty: "Basis Data & Jaringan Komputer",
    phone: "6281234567805",
    email: "rian.hidayat@sman1.sch.id",
    gender: "L",
    status: "aktif",
  },
  {
    id: "gtk-6",
    school_id: "sch-1",
    nip_or_nik: "197805142006041003",
    full_name: "Hendra Wijaya, S.Pd",
    gtk_role: "guru_pns",
    subject_specialty: "Pendidikan Jasmani & Kesehatan",
    phone: "6281234567806",
    email: "hendra.wijaya@sman1.sch.id",
    gender: "L",
    status: "aktif",
  },
  {
    id: "gtk-7",
    school_id: "sch-1",
    nip_or_nik: "198802102014022004",
    full_name: "Ratna Kusuma Dewi, A.Md",
    gtk_role: "tata_usaha",
    subject_specialty: "Kepala Tata Usaha & Kepegawaian",
    phone: "6281234567807",
    email: "tu.ratna@sman1.sch.id",
    gender: "P",
    status: "aktif",
  },
  {
    id: "gtk-8",
    school_id: "sch-1",
    nip_or_nik: "3171056708910002",
    full_name: "Tri Yulianto, S.I.Pust",
    gtk_role: "pustakawan",
    subject_specialty: "Pengelola Perpustakaan & Arsip",
    phone: "6281234567808",
    email: "perpus.tri@sman1.sch.id",
    gender: "L",
    status: "aktif",
  },
  {
    id: "gtk-9",
    school_id: "sch-1",
    nip_or_nik: "3171092305880004",
    full_name: "Supriyadi",
    gtk_role: "satpam",
    subject_specialty: "Keamanan Gerbang & Sterilisasi",
    phone: "6281234567809",
    email: "keamanan@sman1.sch.id",
    gender: "L",
    status: "aktif",
  },
  {
    id: "gtk-10",
    school_id: "sch-1",
    nip_or_nik: "3171021109920005",
    full_name: "Agus Santoso",
    gtk_role: "kebersihan",
    subject_specialty: "Teknisi Sarpras & Kebersihan",
    phone: "6281234567810",
    email: "sarpras@sman1.sch.id",
    gender: "L",
    status: "aktif",
  },
];

const SEED_GTK_RECORDS: GtkAttendanceRecord[] = [
  {
    id: "gtkr-1",
    school_id: "sch-1",
    gtk_id: "gtk-1",
    gtk_name: "Drs. Bambang Sudarsono, M.Pd",
    gtk_role: "guru_pns",
    date: todayIso(),
    check_in_time: "06:38",
    check_out_time: null,
    status: "hadir",
    late_minutes: 0,
    location_verified: true,
    latitude: -6.2088,
    longitude: 106.8456,
    notes: "Tepat waktu (Radius GPS Sekolah)",
  },
  {
    id: "gtkr-2",
    school_id: "sch-1",
    gtk_id: "gtk-2",
    gtk_name: "Siti Rahmawati, S.Kom",
    gtk_role: "guru_pns",
    date: todayIso(),
    check_in_time: "06:50",
    check_out_time: null,
    status: "hadir",
    late_minutes: 0,
    location_verified: true,
    latitude: -6.2087,
    longitude: 106.8455,
    notes: "Presensi via Geolocation",
  },
  {
    id: "gtkr-3",
    school_id: "sch-1",
    gtk_id: "gtk-3",
    gtk_name: "Ahmad Fauzi, M.Sc",
    gtk_role: "guru_honorer",
    date: todayIso(),
    check_in_time: "07:18",
    check_out_time: null,
    status: "terlambat",
    late_minutes: 18,
    location_verified: true,
    latitude: -6.2089,
    longitude: 106.8457,
    notes: "Terlambat 18 menit karena perbaikan jalan tol",
  },
  {
    id: "gtkr-4",
    school_id: "sch-1",
    gtk_id: "gtk-4",
    gtk_name: "Dra. Sri Wahyuni, M.Hum",
    gtk_role: "guru_pns",
    date: todayIso(),
    check_in_time: null,
    check_out_time: null,
    status: "dinas_luar",
    late_minutes: 0,
    location_verified: false,
    notes: "Pelatihan Kurikulum Merdeka di Dinas Pendidikan",
  },
  {
    id: "gtkr-5",
    school_id: "sch-1",
    gtk_id: "gtk-7",
    gtk_name: "Ratna Kusuma Dewi, A.Md",
    gtk_role: "tata_usaha",
    date: todayIso(),
    check_in_time: "06:45",
    check_out_time: null,
    status: "hadir",
    late_minutes: 0,
    location_verified: true,
    latitude: -6.2088,
    longitude: 106.8456,
    notes: "Presensi staf TU",
  },
  {
    id: "gtkr-6",
    school_id: "sch-1",
    gtk_id: "gtk-9",
    gtk_name: "Supriyadi",
    gtk_role: "satpam",
    date: todayIso(),
    check_in_time: "05:55",
    check_out_time: null,
    status: "hadir",
    late_minutes: 0,
    location_verified: true,
    notes: "Shift Pagi",
  },
];

const SEED_LEAVE_REQUESTS: StudentLeaveRequest[] = [
  {
    id: "lvr-1",
    school_id: "sch-1",
    student_id: "stu-4",
    student_name: "Citra Kirana Dewi",
    class_id: "cls-1",
    type: "sakit",
    start_date: todayIso(),
    end_date: todayIso(),
    reason: "Demam tinggi dan flu, disarankan istirahat dokter 1 hari.",
    attachment_url: "surat_keterangan_dokter_citra.pdf",
    status: "pending",
    created_at: new Date().toISOString(),
  },
  {
    id: "lvr-2",
    school_id: "sch-1",
    student_id: "stu-6",
    student_name: "Elsa Amelia",
    class_id: "cls-1",
    type: "izin",
    start_date: todayIso(),
    end_date: todayIso(),
    reason: "Menghadiri acara pernikahan keluarga di luar kota.",
    status: "approved",
    reviewed_by: "Drs. Bambang Sudarsono, M.Pd",
    reviewed_at: new Date().toISOString(),
    review_notes: "Disetujui. Tetap belajar mandiri.",
    created_at: new Date().toISOString(),
  },
];

const SEED_LESSON_ATTENDANCES: LessonAttendanceRecord[] = [
  {
    id: "les-1",
    school_id: "sch-1",
    class_id: "cls-1",
    class_name: "X RPL 1",
    date: todayIso(),
    period_start: 1,
    period_end: 4,
    subject: "Pemrograman Web & Perangkat Bergerak (Praktik Lab)",
    teacher_name: "Siti Rahmawati, S.Kom",
    teacher_nip: "198803122011012004",
    room: "Lab Komputer 2 (RPL)",
    learning_group: "praktik_lab",
    topic_material: "Implementasi REST API dan Client Fetching dengan React & Supabase",
    learning_objective: "Siswa mampu mengonfigurasi client database dan mengintegrasikan form CRUD presensi",
    obstacles_notes: "Koneksi internet stabil, seluruh unit komputer lab berfungsi normal.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    student_statuses: [
      { student_id: "stu-1", student_name: "Aditya Pratama Putra", status: "hadir" },
      { student_id: "stu-2", student_name: "Budi Santoso", status: "hadir" },
      { student_id: "stu-3", student_name: "Bayu Saputra", status: "terlambat", notes: "Masuk lab jam 07.30" },
      { student_id: "stu-4", student_name: "Citra Kirana Dewi", status: "sakit", notes: "Surat dokter" },
      { student_id: "stu-5", student_name: "Dina Mariana", status: "hadir" },
      { student_id: "stu-6", student_name: "Elsa Amelia", status: "izin", notes: "Izin acara keluarga" },
    ],
  },
  {
    id: "les-2",
    school_id: "sch-1",
    class_id: "cls-2",
    class_name: "XI TKR 1",
    date: todayIso(),
    period_start: 1,
    period_end: 6,
    subject: "Pemeliharaan Mesin Kendaraan Ringan (PMKR Blok Bengkel)",
    teacher_name: "Budi Santoso, S.T",
    teacher_nip: "198207192008011007",
    room: "Bengkel Otomotif Utama",
    learning_group: "praktik_lab",
    topic_material: "Tune-Up Mesin EFI dan Analisis Kerusakan Sensor Engine",
    learning_objective: "Siswa mampu melakukan diagnosa scanner OBD-II dan servis berkala sistem injeksi",
    obstacles_notes: "1 unit scanner OBD sedang dikalibrasi, siswa bergantian per kelompok kerja.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    student_statuses: [
      { student_id: "stu-7", student_name: "Fajar Nugraha", status: "hadir" },
      { student_id: "stu-8", student_name: "Gita Permata", status: "hadir" },
      { student_id: "stu-9", student_name: "Hadi Kusuma", status: "hadir" },
    ],
  },
];

const SEED_BK_VIOLATIONS: BkViolationRecord[] = [
  {
    id: "bk-1",
    school_id: "sch-1",
    student_id: "stu-3",
    student_name: "Bayu Saputra",
    class_id: "cls-1",
    class_name: "X RPL 1",
    date: todayIso(),
    category: "terlambat_berulang",
    points: 10,
    description: "Terlambat masuk sekolah sebanyak 3 kali berturut-turut dalam satu minggu (> 15 menit).",
    action_taken: "teguran_lisan",
    followup_notes: "Siswa berjanji berangkat lebih awal dengan menggunakan transportasi umum pagi.",
    parent_notified: true,
    parent_notified_at: new Date().toISOString(),
    recorded_by: "Dra. Hj. Nurul Hidayati, M.Pd (Guru BK)",
    created_at: new Date().toISOString(),
  },
  {
    id: "bk-2",
    school_id: "sch-1",
    student_id: "stu-1",
    student_name: "Aditya Pratama Putra",
    class_id: "cls-1",
    class_name: "X RPL 1",
    date: todayIso(),
    category: "prestasi_positif",
    points: 15,
    description: "Juara 2 Lomba Kompetensi Siswa (LKS) Web Technologies Tingkat Kota.",
    action_taken: "apresiasi",
    followup_notes: "Diberikan sertifikat penghargaan dan poin apresiasi kedisiplinan.",
    parent_notified: true,
    parent_notified_at: new Date().toISOString(),
    recorded_by: "Dra. Hj. Nurul Hidayati, M.Pd (Guru BK)",
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_USER: UserProfile = {
  id: "usr-admin-1",
  email: "admin@sman1.sch.id",
  full_name: "Bambang Sudarsono, M.Pd (Kepala Sekolah / Admin)",
  role: "admin",
  school_id: "sch-1",
};

export interface SchoolContextType {
  schools: School[];
  activeSchool: School | null;
  classes: SchoolClass[];
  students: Student[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  currentUser: UserProfile | null;
  myStudentProfile: Student | null;
  role: AppRole;
  isStaff: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isHomeroomTeacher: boolean;
  homeroomClass: SchoolClass | null;
  loading: boolean;
  domainMode: DomainMode;
  setDomainMode: (mode: DomainMode) => void;
  isSupabaseActive: boolean;
  terms: TerminologyConfig;
  updateTerminology: (updates: Partial<TerminologyConfig>) => void;
  setTerminologyPreset: (presetKey: TerminologyConfig["preset"]) => void;
  whatsappConfig: WhatsAppGatewayConfig;
  whatsappLogs: WhatsAppNotification[];
  updateWhatsAppConfig: (updates: Partial<WhatsAppGatewayConfig>) => void;
  sendWhatsAppNotification: (params: {
    studentId: string;
    studentName: string;
    guardianPhone: string;
    guardianName: string;
    status: AttendanceStatus;
    isCheckout?: boolean;
    customTime?: string;
  }) => { success: boolean; message: string; waUrl?: string };
  setActiveSchoolId: (id: string) => void;
  // Role switcher for Super Admin
  switchRole: (
    targetRole: AppRole,
    options?: {
      isWaliKelas?: boolean;
      homeroomClassId?: string;
      nis?: string;
      gtkId?: string;
      fullName?: string;
      email?: string;
      schoolId?: string;
    }
  ) => void;
  // Auth
  loginAs: (
    role: AppRole,
    customEmail?: string,
    options?: {
      isWaliKelas?: boolean;
      homeroomClassId?: string;
      nis?: string;
      gtkId?: string;
      fullName?: string;
    }
  ) => void;
  loginWithCredentials: (email: string, pass: string, role?: AppRole) => Promise<{ success: boolean; message?: string }>;
  loginTeacherOrStaff: (schoolCode: string, identifier: string, pass: string) => { success: boolean; message?: string };
  loginStudent: (schoolCode: string, nis: string, pass: string) => boolean;
  registerAccount: (fullName: string, email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  // Daily Attendance Automation
  dailyConfig: DailyAttendanceConfig;
  updateDailyConfig: (updates: Partial<DailyAttendanceConfig>) => void;
  generateDailySessionsNow: (targetDate?: string) => number;
  // School & Multi-Campus Locations
  createSchool: (name: string, npsn?: string) => School;
  joinSchool: (code: string) => boolean;
  updateSchool: (id: string, updates: Partial<School>) => void;
  updateSchoolPlan: (
    schoolId: string,
    tier: SaaSPlanTier,
    activeUntil?: string,
    licenseKey?: string
  ) => void;
  updateSchoolBranding: (
    schoolId: string,
    branding: {
      logo_url?: string;
      brand_theme?: BrandThemePreset;
      brand_color?: string;
    }
  ) => void;
  addSchoolLocation: (loc: Omit<SchoolLocation, "id">) => SchoolLocation;
  updateSchoolLocation: (id: string, updates: Partial<SchoolLocation>) => void;
  deleteSchoolLocation: (id: string) => void;
  // Classes
  addClass: (cls: Omit<SchoolClass, "id" | "school_id" | "created_at" | "updated_at">) => SchoolClass;
  updateClass: (id: string, updates: Partial<SchoolClass>) => void;
  deleteClass: (id: string) => void;
  // Students
  addStudent: (stu: Omit<Student, "id" | "school_id" | "created_at" | "updated_at">) => Student;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  importStudents: (classId: string, text: string) => number;
  // Sessions
  createSession: (ses: Omit<AttendanceSession, "id" | "school_id" | "created_by" | "created_at" | "updated_at">) => AttendanceSession;
  updateSession: (id: string, updates: Partial<AttendanceSession>) => void;
  deleteSession: (id: string) => void;
  toggleSessionStatus: (id: string) => void;
  // Records
  markAttendance: (params: {
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
    method?: AttendanceMethod;
    latitude?: number | null;
    longitude?: number | null;
    selfieUrl?: string | null;
    notes?: string | null;
  }) => AttendanceRecord;
  markCheckOut: (params: {
    sessionId?: string;
    studentId: string;
    checkOutTime?: string;
    method?: AttendanceMethod;
    latitude?: number | null;
    longitude?: number | null;
    selfieUrl?: string | null;
  }) => AttendanceRecord | null;
  batchMarkAttendance: (sessionId: string, studentIds: string[], status: AttendanceStatus) => void;
  // Leave Requests (Izin & Sakit)
  leaveRequests: StudentLeaveRequest[];
  addLeaveRequest: (req: Omit<StudentLeaveRequest, "id" | "school_id" | "status" | "created_at">) => StudentLeaveRequest;
  updateLeaveRequestStatus: (id: string, status: "approved" | "rejected", reviewNotes?: string) => void;
  // QR Token
  getOrCreateQrToken: (sessionId: string) => string;
  verifyQrToken: (token: string) => { valid: boolean; session?: AttendanceSession; school?: School };
  // Academic Years
  academicYears: AcademicYear[];
  activeAcademicYear: AcademicYear | undefined;
  addAcademicYear: (ay: Omit<AcademicYear, "id" | "school_id">) => AcademicYear;
  updateAcademicYear: (id: string, updates: Partial<AcademicYear>) => void;
  deleteAcademicYear: (id: string) => void;
  setActiveAcademicYear: (id: string) => void;
  // Calendar Events
  calendarEvents: AcademicCalendarEvent[];
  addCalendarEvent: (evt: Omit<AcademicCalendarEvent, "id" | "school_id">) => AcademicCalendarEvent;
  updateCalendarEvent: (id: string, updates: Partial<AcademicCalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  // Weekly Schedules
  weeklySchedules: WeeklyScheduleItem[];
  addWeeklyScheduleItem: (item: Omit<WeeklyScheduleItem, "id" | "school_id">) => WeeklyScheduleItem;
  updateWeeklyScheduleItem: (id: string, updates: Partial<WeeklyScheduleItem>) => void;
  deleteWeeklyScheduleItem: (id: string) => void;
  batchSaveWeeklySchedule: (classId: string, items: Omit<WeeklyScheduleItem, "id" | "school_id">[]) => void;
  batchSaveMultiClassSchedules: (targetClassIds: string[], items: Omit<WeeklyScheduleItem, "id" | "school_id">[]) => void;
  clearWeeklySchedulesForClasses: (targetClassIds?: string[]) => void;
  populate72SmkClasses: () => number;
  // GTK (Guru & Tenaga Kependidikan)
  gtkProfiles: GtkProfile[];
  gtkRecords: GtkAttendanceRecord[];
  addGtkProfile: (gtk: Omit<GtkProfile, "id" | "school_id">) => GtkProfile;
  updateGtkProfile: (id: string, updates: Partial<GtkProfile>) => void;
  deleteGtkProfile: (id: string) => void;
  markGtkAttendance: (params: {
    gtkId: string;
    status: GtkAttendanceRecord["status"];
    checkInTime?: string;
    checkOutTime?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
    locationVerified?: boolean;
    selfieUrl?: string | null;
    checkOutLatitude?: number;
    checkOutLongitude?: number;
    checkOutSelfieUrl?: string | null;
    method?: "selfie_gps" | "kiosk_qr" | "rfid_card" | "manual" | "qr_scan";
    distanceMeters?: number;
    deviceInfo?: string;
  }) => GtkAttendanceRecord;
  updateGtkRecord: (id: string, updates: Partial<GtkAttendanceRecord>) => void;
  // Lesson Attendance & Jurnal Mengajar
  lessonAttendances: LessonAttendanceRecord[];
  addLessonAttendance: (rec: Omit<LessonAttendanceRecord, "id" | "school_id" | "created_at" | "updated_at">) => LessonAttendanceRecord;
  updateLessonAttendance: (id: string, updates: Partial<LessonAttendanceRecord>) => void;
  deleteLessonAttendance: (id: string) => void;
  // BK Violations & Early Warning
  bkViolations: BkViolationRecord[];
  addBkViolation: (rec: Omit<BkViolationRecord, "id" | "school_id" | "created_at">) => BkViolationRecord;
  updateBkViolation: (id: string, updates: Partial<BkViolationRecord>) => void;
  deleteBkViolation: (id: string) => void;
  // Mass Student Import Helper
  batchImportStudents: (
    studentsList: {
      nis: string;
      fullName: string;
      className?: string;
      gender?: "L" | "P" | null;
      guardianPhone?: string | null;
      guardianName?: string | null;
      cardUid?: string | null;
    }[]
  ) => { addedCount: number; matchedClasses: number; createdClasses: number };
  // Utility
  clearAllData: () => void;
  resetToDemoData: () => void;
}

const activeQrTokensMap = new Map<string, QrToken>();

const SchoolContext = createContext<SchoolContextType | null>(null);

function getInitialDomainMode(): DomainMode {
  if (typeof window !== "undefined") {
    if (window.location.hostname.includes("presensiku") || window.location.search.includes("mode=siswa")) {
      return "presensiku.app";
    }
  }
  return "presensi.app";
}

function loadInitialState(): StoreState {
  const fallbackState: StoreState = {
    schools: [CLEAN_DEFAULT_SCHOOL],
    classes: [],
    students: [],
    sessions: [],
    records: [],
    qrTokens: [],
    currentUser: CLEAN_DEFAULT_USER,
    activeSchoolId: "sch-1",
    domainMode: getInitialDomainMode(),
    whatsappConfig: DEFAULT_WHATSAPP_CONFIG,
    whatsappLogs: [],
    academicYears: CLEAN_ACADEMIC_YEARS,
    calendarEvents: [],
    weeklySchedules: [],
    gtkProfiles: [],
    gtkRecords: [],
    leaveRequests: [],
    lessonAttendances: [],
    bkViolations: [],
  };

  if (typeof window === "undefined") {
    return fallbackState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.schools && parsed.schools.length > 0) {
        return {
          ...fallbackState,
          ...parsed,
          domainMode: getInitialDomainMode(),
          whatsappConfig: { ...DEFAULT_WHATSAPP_CONFIG, ...(parsed.whatsappConfig || {}) },
          whatsappLogs: parsed.whatsappLogs || [],
          academicYears: parsed.academicYears && parsed.academicYears.length > 0 ? parsed.academicYears : CLEAN_ACADEMIC_YEARS,
          calendarEvents: parsed.calendarEvents || [],
          weeklySchedules: parsed.weeklySchedules || [],
          gtkProfiles: parsed.gtkProfiles || [],
          gtkRecords: parsed.gtkRecords || [],
          leaveRequests: parsed.leaveRequests || [],
          lessonAttendances: parsed.lessonAttendances || [],
          bkViolations: parsed.bkViolations || [],
        };
      }
    }
  } catch (e) {
    console.error("Failed to parse store state:", e);
  }

  return fallbackState;
}

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>(loadInitialState);
  const [loading, setLoading] = useState(false);

  // Save to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }, [state]);

  const activeSchool = useMemo(() => {
    return (
      state.schools.find((s) => s.id === state.activeSchoolId) ||
      state.schools[0] ||
      null
    );
  }, [state.schools, state.activeSchoolId]);

  // Dynamically apply school brand color & theme to document root
  useEffect(() => {
    if (activeSchool) {
      applySchoolBrandColor(activeSchool.brand_theme, activeSchool.brand_color);
    }
  }, [activeSchool?.id, activeSchool?.brand_theme, activeSchool?.brand_color]);

  const isSuperAdmin = state.currentUser?.role === "superadmin" || state.currentUser?.is_superadmin === true;
  const role: AppRole = state.currentUser?.role || "admin";
  const isStaff = role === "admin" || role === "teacher" || role === "superadmin";
  const isAdmin = role === "admin" || role === "superadmin";
  const isSupabaseActive = isSupabaseConfigured();

  const isHomeroomTeacher = useMemo(() => {
    if (role !== "teacher") return false;
    if (state.currentUser?.is_wali_kelas) return true;
    if (state.currentUser?.homeroom_class_id) return true;
    if (state.currentUser?.full_name) {
      return state.classes.some(
        (c) => c.homeroom_teacher && state.currentUser?.full_name?.includes(c.homeroom_teacher.split(",")[0])
      );
    }
    return false;
  }, [role, state.currentUser, state.classes]);

  const homeroomClass = useMemo(() => {
    if (!isHomeroomTeacher) return null;
    if (state.currentUser?.homeroom_class_id) {
      const found = state.classes.find((c) => c.id === state.currentUser?.homeroom_class_id);
      if (found) return found;
    }
    if (state.currentUser?.full_name) {
      const found = state.classes.find(
        (c) => c.homeroom_teacher && state.currentUser?.full_name?.includes(c.homeroom_teacher.split(",")[0])
      );
      if (found) return found;
    }
    return state.classes.find((c) => c.school_id === activeSchool?.id) || null;
  }, [isHomeroomTeacher, state.currentUser, state.classes, activeSchool?.id]);

  const terms: TerminologyConfig = useMemo(() => {
    return activeSchool?.terminology || DEFAULT_TERMINOLOGY;
  }, [activeSchool?.terminology]);

  const setDomainMode = (mode: DomainMode) => {
    setState((prev) => ({ ...prev, domainMode: mode }));
  };

  const updateWhatsAppConfig = (updates: Partial<WhatsAppGatewayConfig>) => {
    setState((prev) => ({
      ...prev,
      whatsappConfig: {
        ...prev.whatsappConfig,
        ...updates,
      },
    }));
  };

  const sendWhatsAppNotification = ({
    studentId,
    studentName,
    guardianPhone,
    guardianName,
    status,
    customTime,
    isCheckout = false,
  }: {
    studentId: string;
    studentName: string;
    guardianPhone: string;
    guardianName: string;
    status: AttendanceStatus;
    customTime?: string;
    isCheckout?: boolean;
  }) => {
    const schoolName = activeSchool?.name || "Sekolah";
    const timeStr = customTime || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const dateStr = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    let rawTemplate = state.whatsappConfig.message_template_hadir;
    if (isCheckout) {
      rawTemplate = state.whatsappConfig.message_template_pulang || "Yth. Wali dari {nama_siswa}, ananda telah melakukan presensi PULANG pada {waktu_presensi} WIB ({tanggal}) di {nama_sekolah}.";
    } else if (status === "terlambat") {
      rawTemplate = state.whatsappConfig.message_template_terlambat;
    } else if (status === "alpa" || status === "izin" || status === "sakit") {
      rawTemplate = state.whatsappConfig.message_template_alpa;
    }

    const message = rawTemplate
      .replace(/{nama_siswa}/g, studentName)
      .replace(/{nama_sekolah}/g, schoolName)
      .replace(/{waktu_presensi}/g, timeStr)
      .replace(/{tanggal}/g, dateStr)
      .replace(/{status}/g, isCheckout ? "PULANG" : status.toUpperCase());

    // Clean phone number to 62...
    let cleanPhone = guardianPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    const newLog: WhatsAppNotification = {
      id: `wa-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      school_id: activeSchool?.id || "sch-1",
      student_id: studentId,
      student_name: studentName,
      recipient_phone: cleanPhone,
      recipient_name: guardianName || "Wali Siswa",
      message,
      status: "sent",
      timestamp: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      whatsappLogs: [newLog, ...prev.whatsappLogs].slice(0, 100),
    }));

    if (state.whatsappConfig.provider === "fonnte") {
      void sendWhatsAppViaEdgeFunction(cleanPhone, message).then(({ error }) => {
        if (error) console.error("WhatsApp Edge Function failed:", error.message);
      });
      return { success: true, message };
    }

    return { success: true, message, waUrl };
  };

  const setActiveSchoolId = (id: string) => {
    setState((prev) => ({
      ...prev,
      activeSchoolId: id,
      currentUser: prev.currentUser
        ? { ...prev.currentUser, school_id: id }
        : null,
    }));
  };

  const loginAs = (
    targetRole: AppRole,
    customEmail?: string,
    options?: {
      isWaliKelas?: boolean;
      homeroomClassId?: string;
      nis?: string;
      gtkId?: string;
      fullName?: string;
    }
  ) => {
    let defaultEmail = customEmail;
    let defaultName = options?.fullName;
    let isWali = options?.isWaliKelas ?? false;
    let homeroomClassId = options?.homeroomClassId;
    let gtkId = options?.gtkId;
    let nis = options?.nis;

    if (targetRole === "superadmin") {
      defaultEmail = defaultEmail || "admin@presensi.app";
      defaultName = defaultName || "Administrator Platform (SaaS & Yayasan)";
    } else if (targetRole === "admin") {
      defaultEmail = defaultEmail || "admin@sman1.sch.id";
      defaultName = defaultName || "Bambang Sudarsono, M.Pd (Kepala Sekolah / Admin)";
    } else if (targetRole === "teacher") {
      if (isWali || homeroomClassId) {
        defaultEmail = defaultEmail || "wali.bambang@sman1.sch.id";
        defaultName = defaultName || "Drs. Bambang Sudarsono, M.Pd (Wali Kelas X RPL 1)";
        isWali = true;
        homeroomClassId = homeroomClassId || "cls-1";
        gtkId = gtkId || "gtk-1";
      } else {
        defaultEmail = defaultEmail || "siti.rahma@sman1.sch.id";
        defaultName = defaultName || "Siti Rahmawati, S.Kom (Guru Mata Pelajaran RPL)";
        isWali = false;
        gtkId = gtkId || "gtk-2";
      }
    } else if (targetRole === "student") {
      defaultEmail = defaultEmail || "aditya.siswa@sman1.sch.id";
      defaultName = defaultName || "Aditya Pratama Putra (Siswa X RPL 1)";
      nis = nis || "102401";
    }

    const user: UserProfile = {
      id: `usr-${targetRole}-${Date.now()}`,
      email: defaultEmail || `${targetRole}@sman1.sch.id`,
      full_name: defaultName || `User ${targetRole}`,
      role: targetRole,
      school_id: activeSchool?.id || "sch-1",
      nis: targetRole === "student" ? nis || "102401" : undefined,
      gtk_id: gtkId,
      is_wali_kelas: isWali,
      homeroom_class_id: homeroomClassId,
      is_superadmin: targetRole === "superadmin" ? true : undefined,
    };

    setState((prev) => ({ ...prev, currentUser: user }));
  };

  // Role Switcher (Preserves authority while changing acting role)
  const switchRole = (
    targetRole: AppRole,
    options?: {
      isWaliKelas?: boolean;
      homeroomClassId?: string;
      nis?: string;
      gtkId?: string;
      fullName?: string;
      email?: string;
      schoolId?: string;
    }
  ) => {
    let defaultEmail = options?.email;
    let defaultName = options?.fullName;
    let isWali = options?.isWaliKelas ?? false;
    let homeroomClassId = options?.homeroomClassId;
    let gtkId = options?.gtkId;
    let nis = options?.nis;
    const targetSchoolId = options?.schoolId || state.activeSchoolId || "sch-1";

    if (targetRole === "superadmin") {
      defaultEmail = defaultEmail || "admin@presensi.app";
      defaultName = defaultName || "Administrator Platform (SaaS & Yayasan)";
    } else if (targetRole === "admin") {
      defaultEmail = defaultEmail || "admin@sman1.sch.id";
      defaultName = defaultName || "Bambang Sudarsono, M.Pd (Kepala Sekolah / Admin)";
    } else if (targetRole === "teacher") {
      if (isWali || homeroomClassId) {
        defaultEmail = defaultEmail || "wali.bambang@sman1.sch.id";
        defaultName = defaultName || "Drs. Bambang Sudarsono, M.Pd (Wali Kelas X RPL 1)";
        isWali = true;
        homeroomClassId = homeroomClassId || "cls-1";
        gtkId = gtkId || "gtk-1";
      } else {
        defaultEmail = defaultEmail || "siti.rahma@sman1.sch.id";
        defaultName = defaultName || "Siti Rahmawati, S.Kom (Guru Mata Pelajaran RPL)";
        isWali = false;
        gtkId = gtkId || "gtk-2";
      }
    } else if (targetRole === "student") {
      defaultEmail = defaultEmail || "aditya.siswa@sman1.sch.id";
      defaultName = defaultName || "Aditya Pratama Putra (Siswa X RPL 1)";
      nis = nis || "102401";
    }

    const user: UserProfile = {
      id: `usr-${targetRole}-${Date.now()}`,
      email: defaultEmail || `${targetRole}@sman1.sch.id`,
      full_name: defaultName || `User ${targetRole}`,
      role: targetRole,
      school_id: targetSchoolId,
      nis: targetRole === "student" ? nis || "102401" : undefined,
      gtk_id: gtkId,
      is_wali_kelas: isWali,
      homeroom_class_id: homeroomClassId,
      is_superadmin: true, // Super admin authority is retained so they can switch back or to any role anytime!
    };

    setState((prev) => ({
      ...prev,
      currentUser: user,
      activeSchoolId: targetSchoolId,
    }));
  };

  const loginWithCredentials = async (email: string, pass: string, targetRole?: AppRole) => {
    if (!pass.trim()) return { success: false, message: "Kata sandi wajib diisi." };

    if (isSupabaseConfigured()) {
      const { data, error } = await signInWithPassword(email.trim(), pass);
      if (error || !data?.user) {
        return { success: false, message: error?.message || "Email atau kata sandi tidak valid." };
      }
    }

    const assignedRole: AppRole =
      targetRole || "admin";

    loginAs(assignedRole, email);
    return { success: true };
  };

  const loginTeacherOrStaff = (schoolCode: string, identifier: string, pass: string) => {
    const school = state.schools.find(
      (s) => s.join_code.trim().toLowerCase() === schoolCode.trim().toLowerCase()
    );
    if (!school) {
      return { success: false, message: "Kode sekolah tidak ditemukan. Pastikan kode sekolah yang diberikan admin sudah benar." };
    }

    const cleanId = identifier.trim().toLowerCase();
    const gtk = state.gtkProfiles.find(
      (g) =>
        g.school_id === school.id &&
        (g.email?.toLowerCase() === cleanId ||
          g.nip_or_nik?.trim().toLowerCase() === cleanId ||
          g.full_name.toLowerCase() === cleanId)
    );

    const user: UserProfile = {
      id: gtk ? `usr-${gtk.id}` : `usr-teacher-${Date.now()}`,
      email: gtk?.email || (identifier.includes("@") ? identifier : `${identifier.toLowerCase().replace(/[^a-z0-9]/g, "")}@guru.${school.id}.sch.id`),
      full_name: gtk?.full_name || `Guru / Staf (${identifier})`,
      role: "teacher",
      school_id: school.id,
      gtk_id: gtk?.id,
      is_wali_kelas: gtk?.subject_specialty?.toLowerCase().includes("wali") || false,
    };

    setState((prev) => ({
      ...prev,
      activeSchoolId: school.id,
      currentUser: user,
    }));
    return { success: true, message: "Berhasil masuk sebagai Tenaga Pendidik / GTK!" };
  };

  const loginStudent = (schoolCode: string, nis: string, pass: string) => {
    const school = state.schools.find(
      (s) => s.join_code.toLowerCase() === schoolCode.toLowerCase()
    );
    if (!school) return false;

    const student = state.students.find(
      (s) => s.school_id === school.id && s.nis.trim() === nis.trim()
    );

    const user: UserProfile = {
      id: student ? student.id : `usr-stu-${Date.now()}`,
      email: `${nis}@siswa.${school.id}.sch.id`,
      full_name: student ? student.full_name : `Siswa NIS ${nis}`,
      role: "student",
      school_id: school.id,
      nis,
    };

    setState((prev) => ({
      ...prev,
      activeSchoolId: school.id,
      currentUser: user,
    }));
    return true;
  };

  const registerAccount = async (fullName: string, email: string, pass: string) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await signUpWithPassword(email.trim(), pass, fullName.trim());
      if (error) return { success: false, message: error.message };
      if (!data?.session) {
        return { success: false, message: "Pendaftaran berhasil. Periksa email Anda untuk konfirmasi akun." };
      }
    }

    const user: UserProfile = {
      id: `usr-${Date.now()}`,
      email,
      full_name: fullName,
      role: "admin",
      school_id: activeSchool?.id || "sch-1",
    };
    setState((prev) => ({ ...prev, currentUser: user }));
    return { success: true };
  };

  const logout = () => {
    setState((prev) => ({
      ...prev,
      currentUser: null,
    }));
  };

  const createSchool = (nameOrData: string | Partial<School>, npsn?: string) => {
    const newId = `sch-${Date.now()}`;
    let newSchool: School;

    if (typeof nameOrData === "object") {
      newSchool = {
        id: nameOrData.id || newId,
        name: nameOrData.name || "Sekolah Baru",
        subdomain: nameOrData.subdomain || `sch${Date.now().toString().slice(-4)}`,
        npsn: nameOrData.npsn || npsn || null,
        join_code: nameOrData.join_code || `SCH${Math.floor(1000 + Math.random() * 9000)}`,
        latitude: nameOrData.latitude ?? -6.2088,
        longitude: nameOrData.longitude ?? 106.8456,
        radius_meters: nameOrData.radius_meters ?? 200,
        start_time: nameOrData.start_time || "07:00",
        late_after_minutes: nameOrData.late_after_minutes ?? 15,
        address: nameOrData.address || "Alamat Sekolah Baru",
        phone: nameOrData.phone || "",
        logo_url: nameOrData.logo_url,
        plan: nameOrData.plan || {
          plan_name: "Pro Sekolah",
          max_students: 1500,
          max_classes: 40,
          whatsapp_enabled: true,
          rfid_enabled: true,
          gps_enabled: true,
          active_until: "2028-12-31",
        },
        terminology: (nameOrData.terminology as any) || { ...DEFAULT_TERMINOLOGY },
        daily_config: nameOrData.daily_config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else {
      const name = nameOrData;
      const cleanSub = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
      newSchool = {
        id: newId,
        name,
        subdomain: cleanSub || `sch${Date.now().toString().slice(-4)}`,
        npsn: npsn || null,
        join_code: `SCH${Math.floor(1000 + Math.random() * 9000)}`,
        latitude: -6.2088,
        longitude: 106.8456,
        radius_meters: 200,
        start_time: "07:00",
        late_after_minutes: 15,
        address: "Alamat Sekolah Baru",
        plan: {
          plan_name: "Pro Sekolah",
          max_students: 1500,
          max_classes: 40,
          whatsapp_enabled: true,
          rfid_enabled: true,
          gps_enabled: true,
          active_until: "2028-12-31",
        },
        terminology: { ...DEFAULT_TERMINOLOGY },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    setState((prev) => ({
      ...prev,
      schools: [...prev.schools, newSchool],
      activeSchoolId: newSchool.id,
    }));

    return newSchool;
  };

  const joinSchool = (code: string) => {
    const school = state.schools.find(
      (s) => s.join_code.toUpperCase() === code.trim().toUpperCase()
    );
    if (!school) return false;

    setActiveSchoolId(school.id);
    return true;
  };

  const updateSchool = (id: string, updates: Partial<School>) => {
    setState((prev) => ({
      ...prev,
      schools: prev.schools.map((s) =>
        s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
      ),
    }));
  };

  const updateSchoolPlan = (
    schoolId: string,
    tier: SaaSPlanTier,
    activeUntil?: string,
    licenseKey?: string
  ) => {
    const basePlan = SAAS_PLAN_CONFIGS[tier] || SAAS_PLAN_CONFIGS.enterprise;
    const updatedPlan: TenantPlan = {
      ...basePlan,
      active_until: activeUntil || basePlan.active_until,
      license_key: licenseKey || basePlan.license_key,
      status: "active",
    };
    updateSchool(schoolId, { plan: updatedPlan });
  };

  const updateSchoolBranding = (
    schoolId: string,
    branding: {
      logo_url?: string;
      brand_theme?: BrandThemePreset;
      brand_color?: string;
    }
  ) => {
    updateSchool(schoolId, branding);
    if (activeSchool?.id === schoolId) {
      applySchoolBrandColor(branding.brand_theme, branding.brand_color);
    }
  };

  const addSchoolLocation = (loc: Omit<SchoolLocation, "id">): SchoolLocation => {
    const schoolId = activeSchool?.id || "sch-1";
    const newLoc: SchoolLocation = {
      ...loc,
      id: `loc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    
    setState((prev) => ({
      ...prev,
      schools: prev.schools.map((s) => {
        if (s.id !== schoolId) return s;
        const currentLocs = s.locations || [];
        return {
          ...s,
          locations: [...currentLocs, newLoc],
          updated_at: new Date().toISOString(),
        };
      }),
    }));

    return newLoc;
  };

  const updateSchoolLocation = (id: string, updates: Partial<SchoolLocation>) => {
    const schoolId = activeSchool?.id || "sch-1";
    setState((prev) => ({
      ...prev,
      schools: prev.schools.map((s) => {
        if (s.id !== schoolId) return s;
        const currentLocs = s.locations || [];
        return {
          ...s,
          locations: currentLocs.map((loc) => (loc.id === id ? { ...loc, ...updates } : loc)),
          updated_at: new Date().toISOString(),
        };
      }),
    }));
  };

  const deleteSchoolLocation = (id: string) => {
    const schoolId = activeSchool?.id || "sch-1";
    setState((prev) => ({
      ...prev,
      schools: prev.schools.map((s) => {
        if (s.id !== schoolId) return s;
        const currentLocs = s.locations || [];
        return {
          ...s,
          locations: currentLocs.filter((loc) => loc.id !== id),
          updated_at: new Date().toISOString(),
        };
      }),
    }));
  };

  const updateTerminology = (updates: Partial<TerminologyConfig>) => {
    if (!activeSchool) return;
    const current = activeSchool.terminology || DEFAULT_TERMINOLOGY;
    const newTerm: TerminologyConfig = {
      ...current,
      ...updates,
      preset: updates.preset || "custom",
    };
    updateSchool(activeSchool.id, { terminology: newTerm });
  };

  const setTerminologyPreset = (presetKey: TerminologyConfig["preset"]) => {
    if (!activeSchool) return;
    const preset = TERMINOLOGY_PRESETS[presetKey];
    if (preset) {
      updateSchool(activeSchool.id, { terminology: { ...preset.config } });
    }
  };

  // Daily Attendance Config & Automation
  const dailyConfig: DailyAttendanceConfig = useMemo(() => {
    return activeSchool?.daily_config || DEFAULT_DAILY_CONFIG;
  }, [activeSchool?.daily_config]);

  const updateDailyConfig = (updates: Partial<DailyAttendanceConfig>) => {
    if (!activeSchool) return;
    const current = activeSchool.daily_config || DEFAULT_DAILY_CONFIG;
    const updatedConfig: DailyAttendanceConfig = {
      ...current,
      ...updates,
    };
    updateSchool(activeSchool.id, { daily_config: updatedConfig });
  };

  const generateDailySessionsNow = (targetDate = todayIso()) => {
    if (!activeSchool) return 0;
    const schoolId = activeSchool.id;
    const schoolClasses = state.classes.filter((c) => c.school_id === schoolId);
    const cfg = activeSchool.daily_config || DEFAULT_DAILY_CONFIG;

    let createdCount = 0;
    const newSessions: AttendanceSession[] = [];

    if (schoolClasses.length > 0) {
      schoolClasses.forEach((cls) => {
        const existing = state.sessions.find(
          (s) => s.school_id === schoolId && s.class_id === cls.id && s.date === targetDate
        );
        if (!existing) {
          const newSession: AttendanceSession = {
            id: `ses-${Date.now()}-${cls.id}-${Math.random().toString(36).substring(2, 5)}`,
            school_id: schoolId,
            class_id: cls.id,
            created_by: state.currentUser?.id || "usr-admin",
            date: targetDate,
            subject: `Presensi Harian ${cls.name}`,
            start_time: cfg.check_in_start || "06:00",
            end_time: cfg.check_out_end || "17:30",
            late_after_minutes: 15,
            require_selfie: cfg.require_selfie ?? true,
            require_location: cfg.require_location ?? true,
            status: "open",
            notes: `Presensi harian otomatis kelas ${cls.name}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          newSessions.push(newSession);
          createdCount++;
        }
      });
    } else {
      const existing = state.sessions.find(
        (s) => s.school_id === schoolId && s.date === targetDate && !s.class_id
      );
      if (!existing) {
        const newSession: AttendanceSession = {
          id: `ses-${Date.now()}-all-${Math.random().toString(36).substring(2, 5)}`,
          school_id: schoolId,
          class_id: null,
          created_by: state.currentUser?.id || "usr-admin",
          date: targetDate,
          subject: "Presensi Harian Sekolah",
          start_time: cfg.check_in_start || "06:00",
          end_time: cfg.check_out_end || "17:30",
          late_after_minutes: 15,
          require_selfie: cfg.require_selfie ?? true,
          require_location: cfg.require_location ?? true,
          status: "open",
          notes: "Presensi harian otomatis sekolah",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        newSessions.push(newSession);
        createdCount++;
      }
    }

    if (newSessions.length > 0) {
      setState((prev) => ({
        ...prev,
        sessions: [...newSessions, ...prev.sessions],
      }));
    }
    return createdCount;
  };

  // Automatically ensure today has daily sessions if auto_session_enabled
  useEffect(() => {
    if (!loading && activeSchool && dailyConfig.auto_session_enabled) {
      generateDailySessionsNow(todayIso());
    }
  }, [loading, activeSchool?.id, dailyConfig.auto_session_enabled]);

  const addClass = (cls: Omit<SchoolClass, "id" | "school_id" | "created_at" | "updated_at">) => {
    const schoolId = activeSchool?.id || "sch-1";
    const newClass: SchoolClass = {
      ...cls,
      id: `cls-${Date.now()}`,
      school_id: schoolId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      classes: [...prev.classes, newClass],
    }));
    return newClass;
  };

  const updateClass = (id: string, updates: Partial<SchoolClass>) => {
    setState((prev) => ({
      ...prev,
      classes: prev.classes.map((c) =>
        c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ),
    }));
  };

  const deleteClass = (id: string) => {
    setState((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => c.id !== id),
      students: prev.students.map((s) => (s.class_id === id ? { ...s, class_id: null } : s)),
    }));
  };

  const addStudent = (stu: Omit<Student, "id" | "school_id" | "created_at" | "updated_at">) => {
    const schoolId = activeSchool?.id || "sch-1";
    const newStudent: Student = {
      ...stu,
      id: `stu-${Date.now()}`,
      school_id: schoolId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      students: [...prev.students, newStudent],
    }));
    return newStudent;
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
      ),
    }));
  };

  const deleteStudent = (id: string) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== id),
      records: prev.records.filter((r) => r.student_id !== id),
    }));
  };

  const importStudents = (classId: string, text: string) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const schoolId = activeSchool?.id || "sch-1";
    let count = 0;

    const newStudents: Student[] = [];

    for (const line of lines) {
      // Parse CSV or TSV line: NIS, Name, Gender, ParentPhone, CardUID
      const parts = line.includes("\t")
        ? line.split("\t")
        : line.includes(";")
        ? line.split(";")
        : line.split(",");

      if (parts.length >= 2) {
        const nis = parts[0].trim();
        const fullName = parts[1].trim();
        const gender = (parts[2]?.trim().toUpperCase().startsWith("P") ? "P" : "L") as "L" | "P";
        const guardianPhone = parts[3]?.trim() || null;
        const cardUid = parts[4]?.trim() || null;

        if (nis && fullName) {
          newStudents.push({
            id: `stu-${Date.now()}-${count}`,
            school_id: schoolId,
            class_id: classId,
            nis,
            full_name: fullName,
            gender,
            guardian_name: `Orang Tua / Wali ${fullName}`,
            guardian_phone: guardianPhone,
            card_uid: cardUid,
            active: true,
            user_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          count++;
        }
      }
    }

    if (newStudents.length > 0) {
      setState((prev) => ({
        ...prev,
        students: [...prev.students, ...newStudents],
      }));
    }
    return count;
  };

  const createSession = (
    ses: Omit<AttendanceSession, "id" | "school_id" | "created_by" | "created_at" | "updated_at">
  ) => {
    const schoolId = activeSchool?.id || "sch-1";
    // Check if session for the same class and date already exists to enforce 1 session per day per class
    const existing = state.sessions.find(
      (s) => s.school_id === schoolId && s.class_id === (ses.class_id || null) && s.date === ses.date
    );
    if (existing) {
      // Re-activate if locked and return existing session without creating a duplicate
      if (existing.status === "locked" && ses.status === "open") {
        updateSession(existing.id, { status: "open" });
      }
      return existing;
    }

    const newSession: AttendanceSession = {
      ...ses,
      id: `ses-${Date.now()}`,
      school_id: schoolId,
      created_by: state.currentUser?.id || "usr-admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
    }));
    return newSession;
  };

  const updateSession = (id: string, updates: Partial<AttendanceSession>) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
      ),
    }));
  };

  const deleteSession = (id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
      records: prev.records.filter((r) => r.session_id !== id),
    }));
  };

  const toggleSessionStatus = (id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === id ? { ...s, status: s.status === "open" ? "locked" : "open" } : s
      ),
    }));
  };

  const markAttendance = ({
    sessionId,
    studentId,
    status,
    method = "manual",
    latitude = null,
    longitude = null,
    selfieUrl = null,
    notes = null,
  }: {
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
    method?: AttendanceMethod;
    latitude?: number | null;
    longitude?: number | null;
    selfieUrl?: string | null;
    notes?: string | null;
  }) => {
    const schoolId = activeSchool?.id || "sch-1";
    const existing = state.records.find(
      (r) => r.session_id === sessionId && r.student_id === studentId
    );

    let updatedRecord: AttendanceRecord;
    if (existing) {
      updatedRecord = {
        ...existing,
        status,
        method,
        latitude: latitude !== undefined ? latitude : existing.latitude,
        longitude: longitude !== undefined ? longitude : existing.longitude,
        selfie_url: selfieUrl !== undefined ? selfieUrl : existing.selfie_url,
        notes: notes !== undefined ? notes : existing.notes,
        marked_at: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        records: prev.records.map((r) => (r.id === existing.id ? updatedRecord : r)),
      }));
    } else {
      updatedRecord = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        session_id: sessionId,
        school_id: schoolId,
        student_id: studentId,
        status,
        method,
        latitude,
        longitude,
        selfie_url: selfieUrl,
        notes,
        marked_at: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        records: [...prev.records, updatedRecord],
      }));
    }

    // Auto trigger WhatsApp log if configured
    const student = state.students.find((s) => s.id === studentId);
    if (student && student.guardian_phone && state.whatsappConfig.auto_notify_on_presence) {
      sendWhatsAppNotification({
        studentId: student.id,
        studentName: student.full_name,
        guardianPhone: student.guardian_phone,
        guardianName: student.guardian_name || "Wali Murid",
        status,
      });
    }

    // Sync to Supabase in background if configured
    if (isSupabaseConfigured()) {
      syncRecordToSupabase(updatedRecord).catch(() => {});
    }

    return updatedRecord;
  };

  const markCheckOut = ({
    sessionId,
    studentId,
    checkOutTime,
    method = "manual",
    latitude = null,
    longitude = null,
    selfieUrl = null,
  }: {
    sessionId?: string;
    studentId: string;
    checkOutTime?: string;
    method?: AttendanceMethod;
    latitude?: number | null;
    longitude?: number | null;
    selfieUrl?: string | null;
  }) => {
    const today = todayIso();
    const nowIso = checkOutTime || new Date().toISOString();

    // Find existing attendance record for today
    let existingIndex = -1;
    if (sessionId) {
      existingIndex = state.records.findIndex(
        (r) => r.session_id === sessionId && r.student_id === studentId
      );
    } else {
      existingIndex = state.records.findIndex(
        (r) => r.student_id === studentId && (r.marked_at.startsWith(today) || (r as any).date === today)
      );
    }

    let updatedRecord: AttendanceRecord;

    if (existingIndex !== -1) {
      const existing = state.records[existingIndex];
      updatedRecord = {
        ...existing,
        check_out_time: nowIso,
        check_out_method: method,
        check_out_latitude: latitude !== undefined ? latitude : existing.check_out_latitude,
        check_out_longitude: longitude !== undefined ? longitude : existing.check_out_longitude,
        check_out_selfie_url: selfieUrl !== undefined ? selfieUrl : existing.check_out_selfie_url,
      };

      setState((prev) => {
        const nextRecords = [...prev.records];
        nextRecords[existingIndex] = updatedRecord;
        return { ...prev, records: nextRecords };
      });
    } else {
      // If no check-in record yet, create one with default present and checkout time
      const targetSessionId = sessionId || state.sessions.find((s) => s.status === "open")?.id || state.sessions[0]?.id || "ses-1";
      updatedRecord = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        session_id: targetSessionId,
        school_id: activeSchool?.id || "sch-1",
        student_id: studentId,
        status: "hadir",
        method: method,
        marked_at: nowIso, // Initialized
        check_out_time: nowIso,
        check_out_method: method,
        check_out_latitude: latitude,
        check_out_longitude: longitude,
        check_out_selfie_url: selfieUrl,
        latitude,
        longitude,
        selfie_url: selfieUrl,
      };

      setState((prev) => ({
        ...prev,
        records: [...prev.records, updatedRecord],
      }));
    }

    // Auto trigger WhatsApp log if configured
    const student = state.students.find((s) => s.id === studentId);
    if (student && student.guardian_phone && (state.whatsappConfig.auto_notify_on_checkout || state.whatsappConfig.auto_notify_on_presence)) {
      sendWhatsAppNotification({
        studentId: student.id,
        studentName: student.full_name,
        guardianPhone: student.guardian_phone,
        guardianName: student.guardian_name || "Wali Murid",
        status: "hadir",
        isCheckout: true,
      });
    }

    // Sync to Supabase in background if configured
    if (isSupabaseConfigured()) {
      syncRecordToSupabase(updatedRecord).catch(() => {});
    }

    return updatedRecord;
  };

  const batchMarkAttendance = (
    sessionId: string,
    studentIds: string[],
    status: AttendanceStatus
  ) => {
    const schoolId = activeSchool?.id || "sch-1";
    setState((prev) => {
      const recordsMap = new Map<string, AttendanceRecord>(
        prev.records.map((r) => [`${r.session_id}:${r.student_id}`, r])
      );
      studentIds.forEach((sid) => {
        const key = `${sessionId}:${sid}`;
        const existing = recordsMap.get(key);
        if (existing) {
          recordsMap.set(key, {
            ...existing,
            status,
            method: "manual",
            marked_at: new Date().toISOString(),
          });
        } else {
          recordsMap.set(key, {
            id: `rec-${Date.now()}-${sid}`,
            session_id: sessionId,
            school_id: schoolId,
            student_id: sid,
            status,
            method: "manual",
            marked_at: new Date().toISOString(),
            latitude: null,
            longitude: null,
          });
        }
      });
      return { ...prev, records: Array.from(recordsMap.values()) };
    });
  };

  const getOrCreateQrToken = (sessionId: string) => {
    const schoolId = activeSchool?.id || "sch-1";
    const token = `qr_${sessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expires_at = new Date(Date.now() + 45000).toISOString();

    const newToken: QrToken = {
      id: `tok-${Date.now()}`,
      session_id: sessionId,
      school_id: schoolId,
      token,
      expires_at,
    };

    activeQrTokensMap.set(sessionId, newToken);
    activeQrTokensMap.set(token, newToken);
    return token;
  };

  const verifyQrToken = (token: string) => {
    const found = activeQrTokensMap.get(token) || state.qrTokens.find((t) => t.token === token);
    let session = state.sessions.find((s) => s.id === (found?.session_id || token));
    if (!session && token.startsWith("qr_")) {
      const parts = token.split("_");
      const sId = parts[1];
      session = state.sessions.find((s) => s.id === sId);
    }

    if (!session) return { valid: false };
    const school = state.schools.find((s) => s.id === session?.school_id);
    return { valid: true, session, school };
  };

  // Academic Year Handlers
  const addAcademicYear = (ay: Omit<AcademicYear, "id" | "school_id">) => {
    const schoolId = activeSchool?.id || "sch-1";
    const newAy: AcademicYear = {
      ...ay,
      id: `ay-${Date.now()}`,
      school_id: schoolId,
    };
    setState((prev) => {
      // If new one is active, deactivate others in the same school
      let updatedList = prev.academicYears;
      if (newAy.is_active) {
        updatedList = updatedList.map((a) =>
          a.school_id === schoolId ? { ...a, is_active: false } : a
        );
      }
      return {
        ...prev,
        academicYears: [...updatedList, newAy],
      };
    });
    return newAy;
  };

  const updateAcademicYear = (id: string, updates: Partial<AcademicYear>) => {
    setState((prev) => {
      const schoolId = activeSchool?.id || "sch-1";
      return {
        ...prev,
        academicYears: prev.academicYears.map((ay) => {
          if (ay.id === id) {
            return { ...ay, ...updates };
          }
          if (updates.is_active && ay.school_id === schoolId && ay.id !== id) {
            return { ...ay, is_active: false };
          }
          return ay;
        }),
      };
    });
  };

  const deleteAcademicYear = (id: string) => {
    setState((prev) => ({
      ...prev,
      academicYears: prev.academicYears.filter((ay) => ay.id !== id),
    }));
  };

  const setActiveAcademicYear = (id: string) => {
    const schoolId = activeSchool?.id || "sch-1";
    setState((prev) => ({
      ...prev,
      academicYears: prev.academicYears.map((ay) =>
        ay.school_id === schoolId ? { ...ay, is_active: ay.id === id } : ay
      ),
    }));
  };

  // Academic Calendar Events Handlers
  const addCalendarEvent = (evt: Omit<AcademicCalendarEvent, "id" | "school_id">) => {
    const schoolId = activeSchool?.id || "sch-1";
    const newEvt: AcademicCalendarEvent = {
      ...evt,
      id: `evt-${Date.now()}`,
      school_id: schoolId,
    };
    setState((prev) => ({
      ...prev,
      calendarEvents: [...prev.calendarEvents, newEvt],
    }));
    return newEvt;
  };

  const updateCalendarEvent = (id: string, updates: Partial<AcademicCalendarEvent>) => {
    setState((prev) => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map((evt) =>
        evt.id === id ? { ...evt, ...updates } : evt
      ),
    }));
  };

  const deleteCalendarEvent = (id: string) => {
    setState((prev) => ({
      ...prev,
      calendarEvents: prev.calendarEvents.filter((evt) => evt.id !== id),
    }));
  };

  // Weekly Schedule Handlers
  const addWeeklyScheduleItem = (item: Omit<WeeklyScheduleItem, "id" | "school_id">) => {
    const schoolId = activeSchool?.id || "sch-1";
    const newItem: WeeklyScheduleItem = {
      ...item,
      id: `ws-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      school_id: schoolId,
    };
    setState((prev) => ({
      ...prev,
      weeklySchedules: [...prev.weeklySchedules, newItem],
    }));
    return newItem;
  };

  const updateWeeklyScheduleItem = (id: string, updates: Partial<WeeklyScheduleItem>) => {
    setState((prev) => ({
      ...prev,
      weeklySchedules: prev.weeklySchedules.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const deleteWeeklyScheduleItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      weeklySchedules: prev.weeklySchedules.filter((item) => item.id !== id),
    }));
  };

  const batchSaveWeeklySchedule = (
    classId: string,
    items: Omit<WeeklyScheduleItem, "id" | "school_id">[]
  ) => {
    const schoolId = activeSchool?.id || "sch-1";
    const generated: WeeklyScheduleItem[] = items.map((item, idx) => ({
      ...item,
      id: `ws-${Date.now()}_${idx}`,
      school_id: schoolId,
      class_id: classId,
    }));

    setState((prev) => ({
      ...prev,
      weeklySchedules: [
        ...prev.weeklySchedules.filter(
          (s) => !(s.school_id === schoolId && s.class_id === classId)
        ),
        ...generated,
      ],
    }));
  };

  const batchSaveMultiClassSchedules = (
    targetClassIds: string[],
    items: Omit<WeeklyScheduleItem, "id" | "school_id">[]
  ) => {
    const schoolId = activeSchool?.id || "sch-1";
    const targetSet = new Set(targetClassIds);

    const generated: WeeklyScheduleItem[] = [];
    let count = 0;
    for (const item of items) {
      if (targetSet.has(item.class_id)) {
        generated.push({
          ...item,
          id: `ws-${Date.now()}_${count++}`,
          school_id: schoolId,
        });
      }
    }

    setState((prev) => ({
      ...prev,
      weeklySchedules: [
        ...prev.weeklySchedules.filter(
          (s) => !(s.school_id === schoolId && targetSet.has(s.class_id))
        ),
        ...generated,
      ],
    }));
  };

  const clearWeeklySchedulesForClasses = (targetClassIds?: string[]) => {
    const schoolId = activeSchool?.id || "sch-1";
    setState((prev) => {
      if (!targetClassIds || targetClassIds.length === 0) {
        return {
          ...prev,
          weeklySchedules: prev.weeklySchedules.filter((s) => s.school_id !== schoolId),
        };
      }
      const targetSet = new Set(targetClassIds);
      return {
        ...prev,
        weeklySchedules: prev.weeklySchedules.filter(
          (s) => !(s.school_id === schoolId && targetSet.has(s.class_id))
        ),
      };
    });
  };

  const populate72SmkClasses = () => {
    const schoolId = activeSchool?.id || "sch-1";
    const grades = ["10", "11", "12"];
    const gradeLabels: Record<string, string> = { "10": "X", "11": "XI", "12": "XII" };
    const majors = [
      { code: "RPL", name: "Rekayasa Perangkat Lunak" },
      { code: "TKJ", name: "Teknik Komputer & Jaringan" },
      { code: "DKV", name: "Desain Komunikasi Visual" },
      { code: "TKR", name: "Teknik Kendaraan Ringan" },
      { code: "TPM", name: "Teknik Pemesinan" },
      { code: "AKL", name: "Akuntansi & Keuangan Lembaga" },
    ];

    const newClasses: SchoolClass[] = [];
    const academicYear = activeAcademicYear?.name || "2026/2027";

    grades.forEach((grade) => {
      majors.forEach((major) => {
        for (let num = 1; num <= 4; num++) {
          const className = `${gradeLabels[grade]} ${major.code} ${num}`;
          const existing = state.classes.find(
            (c) => c.school_id === schoolId && c.name === className
          );
          if (!existing) {
            newClasses.push({
              id: `cls-smk-${grade}-${major.code.toLowerCase()}-${num}-${Date.now().toString(36)}`,
              school_id: schoolId,
              name: className,
              grade_level: grade,
              academic_year: academicYear,
              homeroom_teacher: `Wali Kelas ${className}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      });
    });

    if (newClasses.length > 0) {
      setState((prev) => ({
        ...prev,
        classes: [...prev.classes, ...newClasses],
      }));
    }
    return newClasses.length;
  };

  // GTK Handlers
  const addGtkProfile = (gtk: Omit<GtkProfile, "id" | "school_id">) => {
    const schoolId = activeSchool?.id || "sch-1";
    const newGtk: GtkProfile = {
      ...gtk,
      id: `gtk-${Date.now()}`,
      school_id: schoolId,
    };
    setState((prev) => ({
      ...prev,
      gtkProfiles: [...prev.gtkProfiles, newGtk],
    }));
    return newGtk;
  };

  const updateGtkProfile = (id: string, updates: Partial<GtkProfile>) => {
    setState((prev) => ({
      ...prev,
      gtkProfiles: prev.gtkProfiles.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
    }));
  };

  const deleteGtkProfile = (id: string) => {
    setState((prev) => ({
      ...prev,
      gtkProfiles: prev.gtkProfiles.filter((g) => g.id !== id),
      gtkRecords: prev.gtkRecords.filter((r) => r.gtk_id !== id),
    }));
  };

  const markGtkAttendance = ({
    gtkId,
    status,
    checkInTime,
    checkOutTime,
    notes,
    latitude,
    longitude,
    locationVerified = true,
    selfieUrl,
    checkOutLatitude,
    checkOutLongitude,
    checkOutSelfieUrl,
    method = "selfie_gps",
    distanceMeters,
    deviceInfo,
  }: {
    gtkId: string;
    status: GtkAttendanceRecord["status"];
    checkInTime?: string;
    checkOutTime?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
    locationVerified?: boolean;
    selfieUrl?: string | null;
    checkOutLatitude?: number;
    checkOutLongitude?: number;
    checkOutSelfieUrl?: string | null;
    method?: "selfie_gps" | "kiosk_qr" | "rfid_card" | "manual" | "qr_scan";
    distanceMeters?: number;
    deviceInfo?: string;
  }) => {
    const schoolId = activeSchool?.id || "sch-1";
    const targetGtk = state.gtkProfiles.find((g) => g.id === gtkId);
    const today = todayIso();
    const existingIndex = state.gtkRecords.findIndex(
      (r) => r.school_id === schoolId && r.gtk_id === gtkId && r.date === today
    );

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    let lateMinutes = 0;
    if (status === "terlambat") {
      const schoolStart = activeSchool?.start_time || "07:00";
      const [sh, sm] = schoolStart.split(":").map(Number);
      const [ch, cm] = (checkInTime || timeStr).split(":").map(Number);
      const diff = ch * 60 + cm - (sh * 60 + sm);
      lateMinutes = diff > 0 ? diff : 0;
    }

    const prev = existingIndex >= 0 ? state.gtkRecords[existingIndex] : null;

    const newRecord: GtkAttendanceRecord = {
      id: prev ? prev.id : `gtkr-${Date.now()}`,
      school_id: schoolId,
      gtk_id: gtkId,
      gtk_name: targetGtk?.full_name || "GTK",
      gtk_role: targetGtk?.gtk_role || "guru_pns",
      date: today,
      check_in_time: checkInTime || (prev ? prev.check_in_time || timeStr : timeStr),
      check_out_time: checkOutTime || (prev ? prev.check_out_time : null),
      status,
      late_minutes: lateMinutes,
      location_verified: locationVerified,
      latitude: latitude !== undefined ? latitude : prev?.latitude,
      longitude: longitude !== undefined ? longitude : prev?.longitude,
      selfie_url: selfieUrl !== undefined ? selfieUrl : prev?.selfie_url,
      check_out_latitude: checkOutLatitude !== undefined ? checkOutLatitude : prev?.check_out_latitude,
      check_out_longitude: checkOutLongitude !== undefined ? checkOutLongitude : prev?.check_out_longitude,
      check_out_selfie_url: checkOutSelfieUrl !== undefined ? checkOutSelfieUrl : prev?.check_out_selfie_url,
      method: method || prev?.method || "selfie_gps",
      distance_meters: distanceMeters !== undefined ? distanceMeters : prev?.distance_meters,
      device_info: deviceInfo !== undefined ? deviceInfo : prev?.device_info,
      notes: notes !== undefined ? notes : prev?.notes,
    };

    setState((prev) => {
      const updated = [...prev.gtkRecords];
      if (existingIndex >= 0) {
        updated[existingIndex] = newRecord;
      } else {
        updated.push(newRecord);
      }
      return { ...prev, gtkRecords: updated };
    });

    return newRecord;
  };

  const updateGtkRecord = (id: string, updates: Partial<GtkAttendanceRecord>) => {
    setState((prev) => ({
      ...prev,
      gtkRecords: prev.gtkRecords.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  };

  const addLeaveRequest = (req: Omit<StudentLeaveRequest, "id" | "school_id" | "status" | "created_at">) => {
    const schoolId = activeSchool?.id || "sch-1";
    const newReq: StudentLeaveRequest = {
      ...req,
      id: `lvr-${Date.now()}`,
      school_id: schoolId,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      leaveRequests: [newReq, ...(prev.leaveRequests || [])],
    }));
    return newReq;
  };

  const updateLeaveRequestStatus = (id: string, status: "approved" | "rejected", reviewNotes?: string) => {
    setState((prev) => {
      const updated = (prev.leaveRequests || []).map((lr) => {
        if (lr.id === id) {
          return {
            ...lr,
            status,
            review_notes: reviewNotes !== undefined ? reviewNotes : lr.review_notes,
            reviewed_by: prev.currentUser?.full_name || "Wali Kelas",
            reviewed_at: new Date().toISOString(),
          };
        }
        return lr;
      });
      return { ...prev, leaveRequests: updated };
    });
  };

  const addLessonAttendance = (
    rec: Omit<LessonAttendanceRecord, "id" | "school_id" | "created_at" | "updated_at">
  ) => {
    const schoolId = activeSchool?.id || "sch-1";
    const newRec: LessonAttendanceRecord = {
      ...rec,
      id: `les-${Date.now()}`,
      school_id: schoolId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      lessonAttendances: [newRec, ...(prev.lessonAttendances || [])],
    }));
    return newRec;
  };

  const updateLessonAttendance = (id: string, updates: Partial<LessonAttendanceRecord>) => {
    setState((prev) => ({
      ...prev,
      lessonAttendances: (prev.lessonAttendances || []).map((l) =>
        l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
      ),
    }));
  };

  const deleteLessonAttendance = (id: string) => {
    setState((prev) => ({
      ...prev,
      lessonAttendances: (prev.lessonAttendances || []).filter((l) => l.id !== id),
    }));
  };

  const addBkViolation = (rec: Omit<BkViolationRecord, "id" | "school_id" | "created_at">) => {
    const schoolId = activeSchool?.id || "sch-1";
    const newBk: BkViolationRecord = {
      ...rec,
      id: `bk-${Date.now()}`,
      school_id: schoolId,
      created_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      bkViolations: [newBk, ...(prev.bkViolations || [])],
    }));
    return newBk;
  };

  const updateBkViolation = (id: string, updates: Partial<BkViolationRecord>) => {
    setState((prev) => ({
      ...prev,
      bkViolations: (prev.bkViolations || []).map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
  };

  const deleteBkViolation = (id: string) => {
    setState((prev) => ({
      ...prev,
      bkViolations: (prev.bkViolations || []).filter((b) => b.id !== id),
    }));
  };

  // Mass Student Import Helper (Up to 72 classes / 2500+ students)
  const batchImportStudents = (
    studentsList: {
      nis: string;
      fullName: string;
      className?: string;
      gender?: "L" | "P" | null;
      guardianPhone?: string | null;
      guardianName?: string | null;
      cardUid?: string | null;
    }[]
  ) => {
    const schoolId = activeSchool?.id || "sch-1";
    const currentClasses = [...state.classes.filter((c) => c.school_id === schoolId)];
    const classMapByName = new Map<string, string>();
    currentClasses.forEach((c) => classMapByName.set(c.name.trim().toLowerCase(), c.id));

    let createdClassesCount = 0;
    const newClassesToCreate: SchoolClass[] = [];

    // Resolve or auto-create classes if needed
    studentsList.forEach((st) => {
      if (st.className && st.className.trim()) {
        const key = st.className.trim().toLowerCase();
        if (!classMapByName.has(key)) {
          const newClsId = `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const gradeMatch = st.className.match(/\b(10|11|12|X|XI|XII)\b/i);
          const gradeLevel = gradeMatch ? gradeMatch[0].toUpperCase() : "10";
          const newCls: SchoolClass = {
            id: newClsId,
            school_id: schoolId,
            name: st.className.trim(),
            grade_level: gradeLevel,
            academic_year: "2026/2027",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          newClassesToCreate.push(newCls);
          classMapByName.set(key, newClsId);
          createdClassesCount++;
        }
      }
    });

    const newStudents: Student[] = [];
    let addedCount = 0;

    studentsList.forEach((st, idx) => {
      if (st.nis && st.fullName) {
        let matchedClassId: string | null = null;
        if (st.className && st.className.trim()) {
          matchedClassId = classMapByName.get(st.className.trim().toLowerCase()) || null;
        }

        newStudents.push({
          id: `stu-${Date.now()}-${idx}`,
          school_id: schoolId,
          class_id: matchedClassId,
          nis: st.nis.trim(),
          full_name: st.fullName.trim(),
          gender: st.gender || "L",
          guardian_name: st.guardianName?.trim() || `Wali dari ${st.fullName.trim()}`,
          guardian_phone: st.guardianPhone?.trim() || null,
          card_uid: st.cardUid?.trim() || null,
          active: true,
          user_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        addedCount++;
      }
    });

    setState((prev) => ({
      ...prev,
      classes: newClassesToCreate.length > 0 ? [...prev.classes, ...newClassesToCreate] : prev.classes,
      students: [...prev.students, ...newStudents],
    }));

    return {
      addedCount,
      matchedClasses: classMapByName.size,
      createdClasses: createdClassesCount,
    };
  };

  const clearAllData = () => {
    const emptyState: StoreState = {
      schools: [CLEAN_DEFAULT_SCHOOL],
      classes: [],
      students: [],
      sessions: [],
      records: [],
      qrTokens: [],
      currentUser: CLEAN_DEFAULT_USER,
      activeSchoolId: "sch-1",
      domainMode: "presensi.app",
      whatsappConfig: DEFAULT_WHATSAPP_CONFIG,
      whatsappLogs: [],
      academicYears: CLEAN_ACADEMIC_YEARS,
      calendarEvents: [],
      weeklySchedules: [],
      gtkProfiles: [],
      gtkRecords: [],
      leaveRequests: [],
      lessonAttendances: [],
      bkViolations: [],
    };
    setState(emptyState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyState));
    } catch (e) {
      console.error(e);
    }
  };

  const resetToDemoData = () => {
    const demoState: StoreState = {
      schools: SEED_SCHOOLS,
      classes: SEED_CLASSES,
      students: SEED_STUDENTS,
      sessions: SEED_SESSIONS,
      records: SEED_RECORDS,
      qrTokens: [],
      currentUser: DEFAULT_USER,
      activeSchoolId: "sch-1",
      domainMode: "presensi.app",
      whatsappConfig: DEFAULT_WHATSAPP_CONFIG,
      whatsappLogs: [],
      academicYears: SEED_ACADEMIC_YEARS,
      calendarEvents: SEED_CALENDAR_EVENTS,
      weeklySchedules: SEED_WEEKLY_SCHEDULES,
      gtkProfiles: SEED_GTK_PROFILES,
      gtkRecords: SEED_GTK_RECORDS,
      leaveRequests: SEED_LEAVE_REQUESTS,
      lessonAttendances: SEED_LESSON_ATTENDANCES,
      bkViolations: SEED_BK_VIOLATIONS,
    };
    setState(demoState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoState));
  };

  const activeAcademicYear = useMemo(() => {
    return (
      state.academicYears.find(
        (ay) => ay.school_id === activeSchool?.id && ay.is_active
      ) ||
      state.academicYears.find((ay) => ay.school_id === activeSchool?.id)
    );
  }, [state.academicYears, activeSchool?.id]);

  // Identify current student profile if user is a student
  const myStudentProfile = useMemo(() => {
    if (role !== "student" || !activeSchool) return null;
    return (
      state.students.find(
        (s) =>
          s.school_id === activeSchool.id &&
          (s.nis === state.currentUser?.nis || s.user_id === state.currentUser?.id)
      ) ||
      state.students.find((s) => s.school_id === activeSchool.id) ||
      null
    );
  }, [role, activeSchool, state.students, state.currentUser]);

  // Data isolation: if role is student, only expose student's own data
  const visibleStudents = useMemo(() => {
    if (role === "student") {
      return myStudentProfile ? [myStudentProfile] : [];
    }
    return state.students.filter((s) => s.school_id === activeSchool?.id);
  }, [role, myStudentProfile, state.students, activeSchool?.id]);

  const visibleRecords = useMemo(() => {
    if (role === "student") {
      return myStudentProfile
        ? state.records.filter(
            (r) => r.school_id === activeSchool?.id && r.student_id === myStudentProfile.id
          )
        : [];
    }
    return state.records.filter((r) => r.school_id === activeSchool?.id);
  }, [role, myStudentProfile, state.records, activeSchool?.id]);

  const visibleLeaveRequests = useMemo(() => {
    if (role === "student") {
      return myStudentProfile
        ? (state.leaveRequests || []).filter(
            (lr) => lr.school_id === activeSchool?.id && lr.student_id === myStudentProfile.id
          )
        : [];
    }
    return (state.leaveRequests || []).filter((lr) => lr.school_id === activeSchool?.id);
  }, [role, myStudentProfile, state.leaveRequests, activeSchool?.id]);

  const value: SchoolContextType = {
    schools: state.schools,
    activeSchool,
    classes: state.classes.filter((c) => c.school_id === activeSchool?.id),
    students: visibleStudents,
    sessions: state.sessions.filter((s) => s.school_id === activeSchool?.id),
    records: visibleRecords,
    currentUser: state.currentUser,
    myStudentProfile,
    role,
    isStaff,
    isAdmin,
    isSuperAdmin,
    isHomeroomTeacher,
    homeroomClass,
    loading,
    domainMode: state.domainMode,
    setDomainMode,
    isSupabaseActive,
    terms,
    updateTerminology,
    setTerminologyPreset,
    whatsappConfig: state.whatsappConfig,
    whatsappLogs: state.whatsappLogs,
    updateWhatsAppConfig,
    sendWhatsAppNotification,
    setActiveSchoolId,
    switchRole,
    loginAs,
    loginWithCredentials,
    loginTeacherOrStaff,
    loginStudent,
    registerAccount,
    logout,
    dailyConfig,
    updateDailyConfig,
    generateDailySessionsNow,
    createSchool,
    joinSchool,
    updateSchool,
    updateSchoolPlan,
    updateSchoolBranding,
    addSchoolLocation,
    updateSchoolLocation,
    deleteSchoolLocation,
    addClass,
    updateClass,
    deleteClass,
    addStudent,
    updateStudent,
    deleteStudent,
    importStudents,
    createSession,
    updateSession,
    deleteSession,
    toggleSessionStatus,
    markAttendance,
    markCheckOut,
    batchMarkAttendance,
    // Leave Requests
    leaveRequests: visibleLeaveRequests,
    addLeaveRequest,
    updateLeaveRequestStatus,
    getOrCreateQrToken,
    verifyQrToken,
    // Academic Years
    academicYears: state.academicYears.filter((ay) => ay.school_id === activeSchool?.id),
    activeAcademicYear,
    addAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    setActiveAcademicYear,
    // Calendar Events
    calendarEvents: state.calendarEvents.filter((e) => e.school_id === activeSchool?.id),
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    // Weekly Schedules
    weeklySchedules: state.weeklySchedules.filter((ws) => ws.school_id === activeSchool?.id),
    addWeeklyScheduleItem,
    updateWeeklyScheduleItem,
    deleteWeeklyScheduleItem,
    batchSaveWeeklySchedule,
    batchSaveMultiClassSchedules,
    clearWeeklySchedulesForClasses,
    populate72SmkClasses,
    // GTK
    gtkProfiles: state.gtkProfiles.filter((g) => g.school_id === activeSchool?.id),
    gtkRecords: state.gtkRecords.filter((r) => r.school_id === activeSchool?.id),
    addGtkProfile,
    updateGtkProfile,
    deleteGtkProfile,
    markGtkAttendance,
    updateGtkRecord,
    // Lesson Attendances & Jurnal Mengajar
    lessonAttendances: (state.lessonAttendances || []).filter((l) => l.school_id === activeSchool?.id),
    addLessonAttendance,
    updateLessonAttendance,
    deleteLessonAttendance,
    // BK Violations
    bkViolations: (state.bkViolations || []).filter((b) => b.school_id === activeSchool?.id),
    addBkViolation,
    updateBkViolation,
    deleteBkViolation,
    // Mass Student Import Helper
    batchImportStudents,
    // Reset & Clear
    clearAllData,
    resetToDemoData,
  };

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchoolStore() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error("useSchoolStore must be used within SchoolProvider");
  return ctx;
}
