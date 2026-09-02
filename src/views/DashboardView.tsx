import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  GraduationCap,
  Percent,
  Users,
  Clock,
  QrCode,
  CheckCircle2,
  Check,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Camera,
  MapPin,
  FileText,
  Printer,
  RefreshCw,
  Sun,
  Award,
  Zap,
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Layers,
  Briefcase,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSchoolStore } from "@/lib/store";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  formatDateId,
  todayIso,
  AttendanceStatus,
  METHOD_LABEL,
} from "@/lib/attendance";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { soundManager } from "@/lib/sound";
import { toast } from "sonner";

interface DashboardViewProps {
  onNavigate: (view: string, param?: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const {
    activeSchool,
    students,
    classes,
    sessions,
    records,
    currentUser,
    role,
    isHomeroomTeacher,
    homeroomClass,
    leaveRequests,
    getOrCreateQrToken,
    terms,
    gtkProfiles,
    gtkRecords,
    markGtkAttendance,
  } = useSchoolStore();

  const [activeQrSession, setActiveQrSession] = useState<{ id: string; subject: string; className: string } | null>(null);
  const [qrToken, setQrToken] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("Selamat Datang");
  const [currentTime, setCurrentTime] = useState<string>("");

  const today = todayIso();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 4 && hour < 11) setGreeting("Selamat Pagi");
      else if (hour >= 11 && hour < 15) setGreeting("Selamat Siang");
      else if (hour >= 15 && hour < 18) setGreeting("Selamat Sore");
      else setGreeting("Selamat Malam");

      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter records for today
  const todaySessions = sessions.filter((s) => s.date === today);
  const todaySessionIds = new Set(todaySessions.map((s) => s.id));
  const todayRecords = records.filter((r) => todaySessionIds.has(r.session_id));

  // Counts
  const totalStudents = students.length;
  const hadirCount = todayRecords.filter((r) => r.status === "hadir").length;
  const terlambatCount = todayRecords.filter((r) => r.status === "terlambat").length;
  const sakitIzinCount = todayRecords.filter((r) => r.status === "sakit" || r.status === "izin").length;
  const alpaCount = todayRecords.filter((r) => r.status === "alpa").length;

  const totalPresensiMasuk = hadirCount + terlambatCount;
  const attendanceRate = totalStudents > 0 ? Math.round((totalPresensiMasuk / totalStudents) * 100) : 0;

  const openQrModal = (session: { id: string; subject: string; class_id: string | null }) => {
    soundManager.playBeep();
    const cls = classes.find((c) => c.id === session.class_id);
    const token = getOrCreateQrToken(session.id);
    setQrToken(token);
    setActiveQrSession({
      id: session.id,
      subject: session.subject,
      className: cls?.name || "Semua Kelas",
    });
  };

  const [chartType, setChartType] = useState<"line" | "bar" | "area">("area");
  const [chartMetric, setChartMetric] = useState<"percentage" | "counts">("percentage");

  // Generate 7-day attendance trend data
  const trendData = useMemo(() => {
    const dates: string[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    return dates.map((dStr, idx) => {
      const dateObj = new Date(dStr);
      const dayName = dateObj.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
      const daySessions = sessions.filter((s) => s.date === dStr);
      const daySessionIds = new Set(daySessions.map((s) => s.id));
      const dayRecords = records.filter((r) => daySessionIds.has(r.session_id));

      const h = dayRecords.filter((r) => r.status === "hadir").length;
      const t = dayRecords.filter((r) => r.status === "terlambat").length;
      const i = dayRecords.filter((r) => r.status === "izin" || r.status === "sakit").length;
      const a = dayRecords.filter((r) => r.status === "alpa").length;
      const total = totalStudents;

      const hadirPct = total > 0 ? Math.round(((h + t) / total) * 100) : 0;
      const telatPct = total > 0 ? Math.round((t / total) * 100) : 0;
      const izinPct = total > 0 ? Math.round((i / total) * 100) : 0;
      const alpaPct = total > 0 ? Math.round((a / total) * 100) : 0;

      return {
        date: dayName,
        hadir: h,
        terlambat: t,
        izin_sakit: i,
        alpa: a,
        persentase: hadirPct,
        telatPersen: telatPct,
      };
    });
  }, [sessions, records, totalStudents]);

  // Per-class attendance distribution
  const classDistributionData = useMemo(() => {
    return classes.map((c) => {
      const classStudents = students.filter((s) => s.class_id === c.id);
      const classStudentIds = new Set(classStudents.map((s) => s.id));
      const classRecords = todayRecords.filter((r) => classStudentIds.has(r.student_id));

      const h = classRecords.filter((r) => r.status === "hadir" || r.status === "terlambat").length;
      const total = classStudents.length;
      const pct = total > 0 ? Math.round((h / total) * 100) : 0;

      return {
        name: c.name,
        persentase: pct,
        hadir: h,
        total: classStudents.length,
      };
    });
  }, [classes, students, todayRecords]);

  // Student specific view
  if (role === "student") {
    const studentInfo = students.find((s) => s.nis === currentUser?.nis || s.id === currentUser?.id) || students[0];
    const studentClass = classes.find((c) => c.id === studentInfo?.class_id);
    const myRecords = records.filter((r) => r.student_id === studentInfo?.id);
    const myHadir = myRecords.filter((r) => r.status === "hadir" || r.status === "terlambat").length;
    const myTotalSessions = sessions.length || 1;
    const myRate = Math.round((myHadir / myTotalSessions) * 100);

    // Student Today's Attendance Status Data
    const studentTodayRecord = todayRecords.find((r) => r.student_id === studentInfo?.id);
    const studentTodayLeave = leaveRequests.find(
      (l) => l.student_id === studentInfo?.id && l.start_date <= today && l.end_date >= today
    );

    const checkInTimeStr = studentTodayRecord?.marked_at
      ? studentTodayRecord.marked_at.includes("T")
        ? studentTodayRecord.marked_at.split("T")[1].slice(0, 5)
        : studentTodayRecord.marked_at
      : null;

    const checkOutTimeStr = studentTodayRecord?.check_out_time || null;
    const isCheckedIn = !!studentTodayRecord;
    const isCheckedOut = !!checkOutTimeStr;

    let attendanceBadgeClass = "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400";
    let attendanceTitle = "BELUM MELAKUKAN PRESENSI";
    let attendanceIcon = AlertCircle;

    if (studentTodayLeave) {
      attendanceBadgeClass = "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400";
      attendanceTitle = `SEDANG ${studentTodayLeave.type.toUpperCase()} (${studentTodayLeave.status === "approved" ? "DISETUJUI" : "MENUNGGU PERSETUJUAN"})`;
      attendanceIcon = FileText;
    } else if (studentTodayRecord) {
      if (studentTodayRecord.status === "hadir") {
        attendanceBadgeClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
        attendanceTitle = "SUDAH HADIR (TEPAT WAKTU)";
        attendanceIcon = CheckCircle2;
      } else if (studentTodayRecord.status === "terlambat") {
        attendanceBadgeClass = "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400";
        attendanceTitle = "SUDAH HADIR (TERLAMBAT)";
        attendanceIcon = Clock;
      } else if (studentTodayRecord.status === "sakit" || studentTodayRecord.status === "izin") {
        attendanceBadgeClass = "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400";
        attendanceTitle = `STATUS: ${studentTodayRecord.status.toUpperCase()}`;
        attendanceIcon = FileText;
      } else {
        attendanceBadgeClass = "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400";
        attendanceTitle = "BELUM HADIR / ALFA";
        attendanceIcon = AlertCircle;
      }
    }

    const AttendanceBadgeIcon = attendanceIcon;

    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-xs font-bold mb-1 border border-emerald-500/20">
              <UserCheck className="size-3.5" /> Portal {terms.student_label} Mandiri
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {greeting}, {studentInfo?.full_name || currentUser?.full_name}!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {activeSchool?.name} • {terms.class_label} {studentClass?.name || "-"} • {terms.identifier_label} {studentInfo?.nis || "-"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              size="lg"
              onClick={() => {
                soundManager.playSuccess();
                onNavigate("absen");
              }}
              className="bg-primary text-primary-foreground shadow-lg hover:shadow-primary/20 font-bold rounded-xl text-sm"
            >
              <Camera className="mr-2 size-5" />
              {isCheckedIn ? "Presensi Pulang / Update" : "Ambil Absen Selfie & GPS"}
            </Button>
          </div>
        </div>

        {/* PRIMARY PROMINENT CARD: STATUS PRESENSI SISWA HARI INI */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-md rounded-3xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <CalendarCheck className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Status Presensi Hari Ini
                  </span>
                  <Badge className={`text-xs font-extrabold px-3 py-0.5 border ${attendanceBadgeClass}`}>
                    <AttendanceBadgeIcon className="size-3.5 mr-1" />
                    {attendanceTitle}
                  </Badge>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-foreground mt-0.5">
                  {formatDateId(today)}
                </h2>
              </div>
            </div>

            {/* Live Clock Display */}
            <div className="flex items-center gap-3 bg-muted/60 dark:bg-muted/30 px-4 py-2 rounded-2xl border border-border/80 self-start md:self-auto">
              <Clock className="size-4 text-primary animate-pulse" />
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Waktu Server Saat Ini</span>
                <span className="font-mono text-sm sm:text-base font-black text-foreground tracking-tight">
                  {currentTime || "07:00:00 WIB"}
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* Check-In vs Check-Out Two Column Summary */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Sesi Masuk (Check-In) */}
              <div className="p-4 rounded-2xl border bg-card/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-xs font-bold uppercase text-foreground">Sesi Masuk (Check-In)</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Target: {activeSchool?.daily_config?.check_in_start || activeSchool?.start_time || "07:00"} WIB
                  </Badge>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Jam Tercatat Masuk:</span>
                    <span className="font-mono text-base font-black text-foreground">
                      {checkInTimeStr ? `${checkInTimeStr} WIB` : "— Belum Presensi"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Validasi Radius GPS:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      {isCheckedIn ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="size-3.5" /> Valid ({activeSchool?.radius_meters || 100}m)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Menunggu Absen</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Metode Presensi:</span>
                    <span className="font-semibold text-foreground">
                      {studentTodayRecord?.method ? METHOD_LABEL[studentTodayRecord.method] : "Kamera Selfie + GPS"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Batas Toleransi Terlambat:</span>
                  <strong className="text-foreground">
                    +{activeSchool?.late_after_minutes || 15} Menit ({activeSchool?.daily_config?.check_in_end || "07:15"} WIB)
                  </strong>
                </div>
              </div>

              {/* Sesi Pulang (Check-Out) */}
              <div className="p-4 rounded-2xl border bg-card/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-blue-500" />
                    <h3 className="text-xs font-bold uppercase text-foreground">Sesi Pulang (Check-Out)</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Target: {activeSchool?.daily_config?.check_out_start || "15:00"} WIB
                  </Badge>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Jam Tercatat Pulang:</span>
                    <span className="font-mono text-base font-black text-foreground">
                      {checkOutTimeStr ? `${checkOutTimeStr} WIB` : "— Belum Check-Out"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Status Kepulangan:</span>
                    <span className="font-semibold">
                      {isCheckedOut ? (
                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                          <Check className="size-3.5" /> Sudah Check-Out
                        </span>
                      ) : isCheckedIn ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">Siap Check-Out saat Jam Pulang</span>
                      ) : (
                        <span className="text-muted-foreground">Belum Check-In Masuk</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Lokasi Presensi:</span>
                    <span className="font-semibold text-foreground truncate max-w-[180px]">
                      {activeSchool?.name || "Sekolah"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Batas Maksimal Pulang:</span>
                  <strong className="text-foreground">{activeSchool?.daily_config?.check_out_end || "18:00"} WIB</strong>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {!isCheckedIn ? (
                <Button
                  onClick={() => onNavigate("absen")}
                  className="bg-primary text-primary-foreground font-bold rounded-xl text-xs h-10 px-5 shadow-md gap-2"
                >
                  <Camera className="size-4" /> Ambil Presensi Masuk Sekarang
                </Button>
              ) : !isCheckedOut ? (
                <Button
                  onClick={() => onNavigate("absen")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-10 px-5 shadow-md gap-2"
                >
                  <CheckCircle2 className="size-4" /> Ambil Presensi Pulang (Check-Out)
                </Button>
              ) : (
                <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs py-2 px-3.5 font-bold">
                  ✓ Presensi Masuk dan Pulang Anda Hari Ini Sudah Lengkap
                </Badge>
              )}

              <Button
                variant="outline"
                onClick={() => onNavigate("izin")}
                className="rounded-xl text-xs h-10 px-4 gap-1.5 border font-semibold bg-card"
              >
                <FileText className="size-3.5 text-amber-500" /> Ajukan Izin / Sakit
              </Button>

              <Button
                variant="ghost"
                onClick={() => onNavigate("riwayat")}
                className="rounded-xl text-xs h-10 px-4 gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
              >
                <Clock className="size-3.5" /> Riwayat Presensi Saya
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Student Stat Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border shadow-sm bg-card p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Persentase Kehadiran</span>
              <Award className="size-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-display text-foreground mt-2">{myRate}%</div>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(myRate, 100)}%` }} />
            </div>
          </Card>

          <Card className="border shadow-sm bg-card p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Kehadiran</span>
              <CheckCircle2 className="size-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-display text-primary mt-2">
              {myHadir} <span className="text-xs font-normal text-muted-foreground">/ {sessions.length} hari</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Tercatat aktif di sistem presensi</p>
          </Card>

          <Card className="border shadow-sm bg-card p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Status Sesi Hari Ini</span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-display text-foreground mt-2">
              {todaySessions.length > 0 ? "Presensi Dibuka" : "Belum Dibuka"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {formatDateId(today)}
            </p>
          </Card>
        </div>

        {/* Sessions & Student ID Card Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border shadow-sm rounded-2xl">
            <CardHeader className="pb-3 border-b bg-card/60">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CalendarCheck className="size-4 text-primary" />
                Presensi Harian Hari Ini
              </CardTitle>
              <CardDescription className="text-xs">
                Ketuk tombol "Absen Sekarang" untuk mengirim selfie dan memvalidasi radius lokasi GPS.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              {todaySessions.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground border border-dashed rounded-xl">
                  Belum ada presensi harian yang dibuka hari ini.
                </div>
              ) : (
                todaySessions.map((ses) => {
                  const cls = classes.find((c) => c.id === ses.class_id);
                  const myRecord = todayRecords.find(
                    (r) => r.session_id === ses.id && r.student_id === studentInfo?.id
                  );

                  return (
                    <div
                      key={ses.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border bg-card/60 hover:bg-card gap-3 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{ses.subject}</span>
                          <Badge variant="secondary" className="text-[11px] font-semibold">
                            {cls?.name || "Umum"}
                          </Badge>
                          {ses.require_location && (
                            <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                              <MapPin className="size-2.5 mr-1" /> GPS {activeSchool?.radius_meters}m
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span>Waktu: {ses.start_time} - {ses.end_time || "Selesai"}</span>
                          <span>•</span>
                          <span>Toleransi: {ses.late_after_minutes} menit</span>
                        </p>
                      </div>

                      <div className="shrink-0">
                        {myRecord ? (
                          <Badge className={`${STATUS_CLASS[myRecord.status]} text-xs font-bold px-3 py-1.5 rounded-xl`}>
                            ✓ {STATUS_LABEL[myRecord.status]}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              soundManager.playBeep();
                              onNavigate("absen", ses.id);
                            }}
                            className="w-full sm:w-auto text-xs font-bold rounded-xl bg-primary text-primary-foreground shadow-sm"
                          >
                            <Camera className="mr-1.5 size-3.5" />
                            Absen Sekarang
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Student ID Card Preview */}
          <Card className="border shadow-sm rounded-2xl bg-gradient-to-br from-card to-secondary/30 overflow-hidden">
            <CardHeader className="pb-3 border-b bg-card/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Kartu {terms.student_label} Digital
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                  VALID RFID
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center p-5 space-y-3">
              <div className="bg-white p-3 rounded-2xl shadow-sm border">
                <QRCodeSVG
                  value={`PRESENSI:${studentInfo?.school_id}:${studentInfo?.nis}`}
                  size={130}
                  level="M"
                />
              </div>
              <div>
                <p className="font-extrabold text-base text-foreground">{studentInfo?.full_name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{terms.identifier_label}: {studentInfo?.nis}</p>
                <p className="text-xs text-primary font-bold mt-1">{activeSchool?.name}</p>
              </div>
              <div className="w-full space-y-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("riwayat")}
                  className="w-full text-xs rounded-xl"
                >
                  <CalendarCheck className="mr-1.5 size-3.5 text-primary" />
                  Buka Riwayat Kehadiran
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate("izin")}
                  className="w-full text-xs rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                >
                  <FileText className="mr-1.5 size-3.5" />
                  Ajukan Izin / Sakit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Staff (Admin & Teacher) Dashboard
  const currentGtkProfile = gtkProfiles.find(
    (g) => g.email === currentUser?.email || g.nip_or_nik === currentUser?.nis || g.id === currentUser?.id
  ) || gtkProfiles[0];

  const gtkTodayRecord = gtkRecords.find(
    (r) => r.gtk_id === currentGtkProfile?.id && r.date === today
  );

  const totalGtk = gtkProfiles.length;
  const todayGtkRecords = gtkRecords.filter((r) => r.date === today);
  const gtkHadirCount = todayGtkRecords.filter((r) => r.status === "hadir" || r.status === "terlambat").length;
  const gtkIzinCount = todayGtkRecords.filter((r) => r.status === "izin" || r.status === "sakit" || r.status === "cuti" || r.status === "dinas_luar").length;
  const gtkBelumAbsenCount = Math.max(0, totalGtk - todayGtkRecords.length);
  const isGtkCheckedIn = !!gtkTodayRecord;
  const isGtkCheckedOut = !!gtkTodayRecord?.check_out_time;

  const handleQuickGtkAttendance = () => {
    if (!currentGtkProfile) {
      toast.error("Profil GTK tidak ditemukan");
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");

    if (!isGtkCheckedIn) {
      // Check in
      const isLate = timeStr > (activeSchool?.daily_config?.check_in_end || "07:15");
      markGtkAttendance({
        gtkId: currentGtkProfile.id,
        status: isLate ? "terlambat" : "hadir",
        checkInTime: timeStr,
        locationVerified: true,
        method: "selfie_gps",
        notes: "Presensi Mandiri Dashboard",
      });
      soundManager.playSuccess();
      toast.success(`Presensi Masuk Berhasil (${timeStr} WIB) - ${isLate ? "Terlambat" : "Tepat Waktu"}`);
    } else if (!isGtkCheckedOut) {
      // Check out
      markGtkAttendance({
        gtkId: currentGtkProfile.id,
        status: gtkTodayRecord.status,
        checkInTime: gtkTodayRecord.check_in_time,
        checkOutTime: timeStr,
        locationVerified: true,
        method: "selfie_gps",
        notes: "Check-out Presensi Mandiri Dashboard",
      });
      soundManager.playSuccess();
      toast.success(`Presensi Pulang Berhasil (${timeStr} WIB)`);
    } else {
      toast.info("Presensi masuk dan pulang Anda hari ini sudah lengkap");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-0.5 text-xs font-bold">
              <Sparkles className="size-3 text-amber-500" /> {greeting},{" "}
              {currentUser?.full_name || (role === "teacher" ? terms.teacher_label : "Administrator")}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            {role === "teacher"
              ? `Dashboard ${terms.teacher_label.split("/")[0].trim()}`
              : `Dashboard Presensi ${terms.institution_label}`}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            {activeSchool?.name} • NPSN: {activeSchool?.npsn || "20104589"} • {formatDateId(today)}
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              soundManager.playBeep();
              onNavigate("presensi");
            }}
            className="bg-primary text-primary-foreground font-bold shadow-sm rounded-xl text-xs h-9 px-4"
          >
            <Plus className="mr-1.5 size-3.5" />
            Presensi Harian Siswa
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("gtk")}
            className="bg-card text-foreground font-semibold rounded-xl text-xs h-9 px-3.5 border shadow-sm"
          >
            <Briefcase className="mr-1.5 size-3.5 text-primary" />
            Portal GTK &amp; Guru
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("laporan")}
            className="bg-card text-foreground font-semibold rounded-xl text-xs h-9 px-3.5 border shadow-sm"
          >
            <FileText className="mr-1.5 size-3.5 text-primary" />
            Rekap Laporan
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate("absen")}
            className="text-xs font-semibold rounded-xl h-9 px-3.5 border"
          >
            <QrCode className="mr-1.5 size-3.5 text-emerald-500" />
            Portal Absen
          </Button>
        </div>
      </div>

      {/* PROMINENT CARD: STATUS PRESENSI GTK / GURU HARI INI */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-md rounded-3xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-border/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Briefcase className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Status Presensi GTK / Guru Hari Ini
                </span>
                {isGtkCheckedIn ? (
                  <Badge className={`text-xs font-extrabold px-3 py-0.5 border ${
                    gtkTodayRecord?.status === "hadir"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : gtkTodayRecord?.status === "terlambat"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                  }`}>
                    <CheckCircle2 className="size-3.5 mr-1" />
                    {gtkTodayRecord?.status === "hadir"
                      ? "HADIR TEPAT WAKTU"
                      : gtkTodayRecord?.status === "terlambat"
                      ? "HADIR TERLAMBAT"
                      : gtkTodayRecord?.status.toUpperCase()}
                  </Badge>
                ) : (
                  <Badge className="bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-extrabold px-3 py-0.5 border">
                    <AlertCircle className="size-3.5 mr-1" />
                    BELUM PRESENSI MASUK GTK
                  </Badge>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-foreground mt-0.5">
                {currentGtkProfile?.full_name || currentUser?.full_name} • NIP: {currentGtkProfile?.nip_or_nik || "-"}
              </h2>
            </div>
          </div>

          {/* Live Clock Display */}
          <div className="flex items-center gap-3 bg-muted/60 dark:bg-muted/30 px-4 py-2 rounded-2xl border border-border/80 self-start lg:self-auto">
            <Clock className="size-4 text-primary animate-pulse" />
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Waktu Server Saat Ini</span>
              <span className="font-mono text-sm sm:text-base font-black text-foreground tracking-tight">
                {currentTime || "07:00:00 WIB"}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Check-In vs Check-Out Grid + Summary GTK */}
          <div className="grid lg:grid-cols-12 gap-4">
            {/* Sesi Masuk GTK */}
            <div className="lg:col-span-4 p-4 rounded-2xl border bg-card/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase text-foreground">Sesi Masuk GTK</h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Target: {activeSchool?.daily_config?.check_in_start || activeSchool?.start_time || "07:00"} WIB
                </Badge>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Jam Tercatat:</span>
                  <span className="font-mono text-base font-black text-foreground">
                    {gtkTodayRecord?.check_in_time ? `${gtkTodayRecord.check_in_time} WIB` : "— Belum Presensi"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Validasi Lokasi:</span>
                  <span className="font-semibold text-foreground">
                    {gtkTodayRecord?.location_verified ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="size-3.5" /> GPS Valid
                      </span>
                    ) : (
                      "Radius Sekolah"
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Metode:</span>
                  <span className="font-semibold text-foreground">
                    {gtkTodayRecord?.method ? METHOD_LABEL[gtkTodayRecord.method] : "Selfie GPS Mandiri"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sesi Pulang GTK */}
            <div className="lg:col-span-4 p-4 rounded-2xl border bg-card/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-xs font-bold uppercase text-foreground">Sesi Pulang GTK</h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Target: {activeSchool?.daily_config?.check_out_start || "15:30"} WIB
                </Badge>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Jam Tercatat:</span>
                  <span className="font-mono text-base font-black text-foreground">
                    {gtkTodayRecord?.check_out_time ? `${gtkTodayRecord.check_out_time} WIB` : "— Belum Check-Out"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Status Pulang:</span>
                  <span className="font-semibold">
                    {isGtkCheckedOut ? (
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                        <Check className="size-3.5" /> Sudah Check-Out
                      </span>
                    ) : isGtkCheckedIn ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">Siap Check-Out</span>
                    ) : (
                      <span className="text-muted-foreground">Belum Masuk</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Unit Kerja:</span>
                  <span className="font-semibold text-foreground truncate max-w-[150px]">
                    {currentGtkProfile?.subject_specialty || (currentGtkProfile?.gtk_role ? currentGtkProfile.gtk_role.replace(/_/g, " ").toUpperCase() : "Guru / GTK")}
                  </span>
                </div>
              </div>
            </div>

            {/* Ringkasan Seluruh Rekan GTK Hari Ini */}
            <div className="lg:col-span-4 p-4 rounded-2xl border bg-muted/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" /> Kehadiran GTK Sekolah
                </h3>
                <span className="font-mono text-xs font-bold text-primary">Total: {totalGtk} GTK</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-xl bg-card border">
                  <span className="text-[10px] text-muted-foreground block font-medium">Hadir</span>
                  <strong className="text-sm font-black text-emerald-600">{gtkHadirCount}</strong>
                </div>
                <div className="p-2 rounded-xl bg-card border">
                  <span className="text-[10px] text-muted-foreground block font-medium">Izin/Dinas</span>
                  <strong className="text-sm font-black text-blue-600">{gtkIzinCount}</strong>
                </div>
                <div className="p-2 rounded-xl bg-card border">
                  <span className="text-[10px] text-muted-foreground block font-medium">Belum Absen</span>
                  <strong className="text-sm font-black text-rose-600">{gtkBelumAbsenCount}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t">
            {!isGtkCheckedIn ? (
              <Button
                onClick={handleQuickGtkAttendance}
                className="bg-primary text-primary-foreground font-bold rounded-xl text-xs h-9 px-4 shadow-sm gap-1.5"
              >
                <Camera className="size-3.5" /> Ambil Presensi Mandiri GTK Sekarang
              </Button>
            ) : !isGtkCheckedOut ? (
              <Button
                onClick={handleQuickGtkAttendance}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 shadow-sm gap-1.5"
              >
                <CheckCircle2 className="size-3.5" /> Ambil Presensi Pulang GTK
              </Button>
            ) : (
              <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs py-1.5 px-3 font-bold">
                ✓ Presensi GTK Anda Hari Ini Sudah Selesai
              </Badge>
            )}

            <Button
              variant="outline"
              onClick={() => onNavigate("gtk")}
              className="rounded-xl text-xs h-9 px-3.5 gap-1.5 border font-semibold bg-card"
            >
              <Briefcase className="size-3.5 text-primary" /> Buka Modul Presensi GTK Lengkap
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wali Kelas Highlight Banner */}
      {isHomeroomTeacher && homeroomClass && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  Akses Khusus Wali Kelas
                </span>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold">
                  {homeroomClass.name}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-foreground mt-0.5">
                Ruang Supervisi Kelas {homeroomClass.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                Tersedia pengajuan izin siswa yang menunggu persetujuan, data buku induk kelas, dan notifikasi WA wali murid.
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              soundManager.playBeep();
              onNavigate("wali_kelas");
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs h-9 px-4 shrink-0 shadow-sm"
          >
            <GraduationCap className="mr-1.5 size-4" /> Buka Ruang Wali Kelas
          </Button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Students */}
        <Card className="border shadow-sm rounded-2xl bg-card hover:border-primary/40 transition-all p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total {terms.students_label}
            </span>
            <span className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-foreground mt-3">{totalStudents}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <GraduationCap className="size-3.5 text-primary" /> Tersebar di {classes.length} {terms.class_label.toLowerCase()} aktif
          </p>
        </Card>

        {/* Present Today */}
        <Card className="border shadow-sm rounded-2xl bg-card hover:border-emerald-500/40 transition-all p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Hadir Hari Ini
            </span>
            <span className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-emerald-600 mt-3">
            {hadirCount} <span className="text-xs font-normal text-muted-foreground">({terlambatCount} telat)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total tercatat: <strong className="text-foreground">{totalPresensiMasuk}</strong> {terms.student_label.toLowerCase()}
          </p>
        </Card>

        {/* Attendance Rate */}
        <Card className="border shadow-sm rounded-2xl bg-card hover:border-primary/40 transition-all p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tingkat Kehadiran
            </span>
            <span className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Percent className="size-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-foreground mt-3">{attendanceRate}%</div>
          <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(attendanceRate, 100)}%` }}
            />
          </div>
        </Card>

        {/* Sick / Permission / Absent */}
        <Card className="border shadow-sm rounded-2xl bg-card hover:border-rose-500/40 transition-all p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sakit / Izin / Alpa
            </span>
            <span className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="size-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-foreground mt-3">
            {sakitIzinCount} <span className="text-xs font-semibold text-rose-500">({alpaCount} Alpa)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {alpaCount > 0 ? "Kirim peringatan via WhatsApp" : "Presensi terpantau tertib"}
          </p>
        </Card>
      </div>

      {/* Recharts Data Visualization: Tren & Distribusi Kehadiran */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 7-Day Attendance Trend Chart (2 Columns) */}
        <Card className="lg:col-span-2 border shadow-sm rounded-2xl bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="size-4" />
                </span>
                <h2 className="text-base font-bold font-display text-foreground">
                  Tren Kehadiran {terms.students_label} (7 Hari Terakhir)
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Grafik fluktuasi persentase kehadiran, keterlambatan, dan izin harian.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex rounded-xl bg-muted/60 p-1 border text-xs">
                <button
                  onClick={() => setChartType("area")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    chartType === "area"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Diagram Area"
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType("line")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    chartType === "line"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Diagram Garis"
                >
                  Garis
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    chartType === "bar"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Diagram Batang"
                >
                  Batang
                </button>
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(val: any) => [`${val}%`, ""]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="persentase"
                    name="Tingkat Hadir (%)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="telatPersen"
                    name="Terlambat (%)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: "#f59e0b" }}
                  />
                </LineChart>
              ) : chartType === "bar" ? (
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`${val}%`, ""]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
                  />
                  <Bar
                    dataKey="persentase"
                    name="Tingkat Hadir (%)"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="telatPersen"
                    name="Terlambat (%)"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              ) : (
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorTelat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`${val}%`, ""]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="persentase"
                    name="Tingkat Hadir (%)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorHadir)"
                  />
                  <Area
                    type="monotone"
                    dataKey="telatPersen"
                    name="Terlambat (%)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTelat)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Per-Class Distribution Bar Chart */}
        <Card className="border shadow-sm rounded-2xl bg-card p-5 space-y-4">
          <div className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <BarChart3 className="size-4" />
                </span>
                <h3 className="text-sm font-bold font-display text-foreground">
                  Kehadiran per {terms.class_label}
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                Hari Ini
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Perbandingan partisipasi antar rombel kelas.
            </p>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={classDistributionData}
                layout="vertical"
                margin={{ top: 0, right: 15, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fontWeight: "600", fill: "hsl(var(--foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={65}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${val}%`, "Kehadiran"]}
                />
                <Bar
                  dataKey="persentase"
                  name="Kehadiran"
                  fill="#3b82f6"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Main Grid: Active Sessions & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Today Sessions (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <CalendarCheck className="size-4 sm:size-5 text-primary" />
              Presensi Harian Hari Ini ({todaySessions.length})
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("presensi")}
              className="text-xs font-semibold text-primary hover:text-primary p-0 h-auto"
            >
              Lihat Semua Presensi <ChevronRight className="size-3.5 ml-0.5 inline" />
            </Button>
          </div>

          {todaySessions.length === 0 ? (
            <Card className="border border-dashed p-8 text-center bg-card/50 rounded-2xl">
              <CalendarCheck className="size-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-bold text-foreground text-sm">Belum Ada Presensi Harian Hari Ini</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Buka presensi harian untuk kelas hari ini agar {terms.students_label.toLowerCase()} dapat mulai check-in.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  soundManager.playBeep();
                  onNavigate("presensi");
                }}
                className="mt-4 font-bold text-xs rounded-xl"
              >
                <Plus className="mr-1.5 size-3.5" /> Buka Presensi Baru
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((ses) => {
                const cls = classes.find((c) => c.id === ses.class_id);
                const classStudents = students.filter((s) => !ses.class_id || s.class_id === ses.class_id);
                const sessionRecs = records.filter((r) => r.session_id === ses.id);
                const filledCount = sessionRecs.length;
                const percent = classStudents.length > 0 ? Math.round((filledCount / classStudents.length) * 100) : 0;

                return (
                  <Card
                    key={ses.id}
                    className="border shadow-sm hover:shadow-md transition-all bg-card rounded-2xl overflow-hidden"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm sm:text-base text-foreground">{ses.subject}</span>
                            <Badge variant="secondary" className="font-bold text-[11px] rounded-lg">
                              {cls?.name || "Semua Kelas"}
                            </Badge>
                            <Badge
                              className={`text-[10px] uppercase font-bold py-0.5 rounded-lg ${
                                ses.status === "open"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {ses.status === "open" ? "● Aktif" : "Terkunci"}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="size-3 text-primary" /> {ses.start_time} - {ses.end_time || "Selesai"}
                            </span>
                            {ses.require_location && (
                              <span className="text-primary font-medium flex items-center gap-0.5">
                                <MapPin className="size-3" /> GPS ({activeSchool?.radius_meters}m)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ses.status === "open" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openQrModal(ses)}
                              className="text-xs border-primary/30 hover:bg-primary/10 text-primary font-bold rounded-xl h-8"
                            >
                              <QrCode className="mr-1.5 size-3.5" />
                              Tayangkan QR
                            </Button>
                          )}

                          <Button
                            size="sm"
                            onClick={() => {
                              soundManager.playBeep();
                              onNavigate("presensi_detail", ses.id);
                            }}
                            className="text-xs font-bold rounded-xl h-8 bg-primary text-primary-foreground shadow-sm"
                          >
                            Lembar Presensi
                            <ArrowRight className="ml-1.5 size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground gap-4">
                        <span>
                          Terisi: <strong className="text-foreground">{filledCount}</strong> / {classStudents.length} siswa
                        </span>
                        <div className="flex-1 max-w-xs bg-secondary h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="font-bold text-foreground">{percent}%</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Feed */}
        <div className="space-y-6">
          {/* Recent Live Records Feed */}
          <Card className="border shadow-sm rounded-2xl bg-card overflow-hidden">
            <CardHeader className="p-4 border-b bg-card/60 flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Presensi Masuk Terbaru
              </CardTitle>
              <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-bold">
                ● Live
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              {todayRecords.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Belum ada presensi masuk hari ini.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {todayRecords.slice(-5).reverse().map((rec) => {
                    const stu = students.find((s) => s.id === rec.student_id);
                    const cls = classes.find((c) => c.id === stu?.class_id);
                    const time = rec.marked_at ? new Date(rec.marked_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

                    return (
                      <div key={rec.id} className="flex items-center justify-between text-xs py-2 border-b last:border-0">
                        <div className="overflow-hidden pr-2">
                          <p className="font-bold text-foreground truncate">
                            {stu?.full_name || "Siswa"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {cls?.name || "Kelas"} • {METHOD_LABEL[rec.method]} • {time}
                          </p>
                        </div>
                        <Badge className={`${STATUS_CLASS[rec.status]} text-[10px] font-bold py-0.5 px-2 rounded-lg shrink-0`}>
                          {STATUS_LABEL[rec.status]}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Projector Modal */}
      <Dialog open={!!activeQrSession} onOpenChange={() => setActiveQrSession(null)}>
        <DialogContent className="sm:max-w-md text-center rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              QR Code Presensi: {activeQrSession?.subject}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Minta siswa memindai QR code ini via kamera smartphone mereka di Portal Absen Siswa.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border shadow-inner my-2">
            <QRCodeSVG
              value={`${window.location.origin}/absen?token=${qrToken}`}
              size={220}
              level="H"
              includeMargin
            />
            <p className="text-xs font-mono font-bold text-slate-800 mt-3 bg-slate-100 px-3 py-1 rounded">
              Token: {qrToken.substring(0, 16)}...
            </p>
          </div>

          <div className="flex gap-2 justify-center mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeQrSession) {
                  soundManager.playBeep();
                  const tok = getOrCreateQrToken(activeQrSession.id);
                  setQrToken(tok);
                  toast.success("Token QR diperbarui!");
                }
              }}
              className="text-xs rounded-xl"
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Perbarui Token
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (activeQrSession) {
                  soundManager.playSuccess();
                  onNavigate("presensi_detail", activeQrSession.id);
                  setActiveQrSession(null);
                }
              }}
              className="text-xs font-bold rounded-xl bg-primary text-primary-foreground"
            >
              Buka Layar Proyektor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

