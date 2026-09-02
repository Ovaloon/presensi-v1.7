import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  Lock,
  MessageCircle,
  QrCode,
  Search,
  Sparkles,
  Unlock,
  Users,
  Camera,
  MapPin,
  Maximize2,
  RotateCw,
  Send,
  Edit3,
  LogOut,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSchoolStore } from "@/lib/store";
import { AttendanceRecord } from "@/types";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  STATUS_ORDER,
  METHOD_LABEL,
  downloadCsv,
  formatDateId,
  formatTimeId,
  calculateDurationHoursMinutes,
  toCsv,
  AttendanceStatus,
} from "@/lib/attendance";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { soundManager } from "@/lib/sound";
import { PageHeader } from "@/components/layout/PageHeader";

interface PresensiDetailViewProps {
  sessionId: string;
  onNavigate: (view: string, param?: string) => void;
}

export function PresensiDetailView({ sessionId, onNavigate }: PresensiDetailViewProps) {
  const {
    sessions,
    classes,
    students,
    records,
    activeSchool,
    markAttendance,
    markCheckOut,
    batchMarkAttendance,
    toggleSessionStatus,
    getOrCreateQrToken,
    sendWhatsAppNotification: storeSendWhatsApp,
    terms,
  } = useSchoolStore();

  const session = sessions.find((s) => s.id === sessionId);
  const sessionClass = classes.find((c) => c.id === session?.class_id);
  const classStudents = students.filter(
    (s) => !session?.class_id || s.class_id === session.class_id
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [projectorFullscreen, setProjectorFullscreen] = useState(false);
  const [currentToken, setCurrentToken] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [activeWaStudent, setActiveWaStudent] = useState<{ name: string; phone: string; status: string } | null>(null);

  // Notes dialog
  const [notesStudent, setNotesStudent] = useState<{ id: string; name: string; note: string } | null>(null);

  // Initialize and rotate QR code every 30s
  useEffect(() => {
    if (!session) return;
    const tok = getOrCreateQrToken(session.id);
    setCurrentToken(tok);
    setTimerSeconds(30);

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          const newTok = getOrCreateQrToken(session.id);
          setCurrentToken(newTok);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.id]);

  if (!session) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Lembar presensi tidak ditemukan.</h2>
        <Button onClick={() => onNavigate("presensi")} className="mt-4">
          Kembali ke Daftar Presensi
        </Button>
      </div>
    );
  }

  // Records map
  const sessionRecords = records.filter((r) => r.session_id === session.id);
  const recordMap = new Map<string, AttendanceRecord>(
    sessionRecords.map((r) => [r.student_id, r])
  );

  // Counts
  const hadir = sessionRecords.filter((r) => r.status === "hadir").length;
  const terlambat = sessionRecords.filter((r) => r.status === "terlambat").length;
  const sakit = sessionRecords.filter((r) => r.status === "sakit").length;
  const izin = sessionRecords.filter((r) => r.status === "izin").length;
  const alpa = sessionRecords.filter((r) => r.status === "alpa").length;
  const belumAbsen = classStudents.length - sessionRecords.length;

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    soundManager.playBeep();
    markAttendance({
      sessionId: session.id,
      studentId,
      status,
      method: "manual",
    });
    toast.success(`Status ${STATUS_LABEL[status]} berhasil disimpan.`);
  };

  const handleBatchPresent = () => {
    soundManager.playSuccess();
    const ids = classStudents.map((s) => s.id);
    batchMarkAttendance(session.id, ids, "hadir");
    toast.success(`Seluruh ${terms.student_label.toLowerCase()} (${ids.length}) ditandai Hadir.`);
  };

  const handleBatchAlpaForUnmarked = () => {
    soundManager.playError();
    const unmarked = classStudents
      .filter((s) => !recordMap.has(s.id))
      .map((s) => s.id);
    if (unmarked.length === 0) {
      toast.info(`Seluruh ${terms.student_label.toLowerCase()} sudah memiliki catatan kehadiran.`);
      return;
    }
    batchMarkAttendance(session.id, unmarked, "alpa");
    toast.success(`${unmarked.length} ${terms.student_label.toLowerCase()} yang belum absen ditandai Alpa.`);
  };

  const handleExportCsv = () => {
    soundManager.playBeep();
    const headers = [
      terms.identifier_label,
      `Nama Lengkap ${terms.student_label}`,
      terms.class_label,
      "Status Kehadiran",
      "Metode Masuk",
      "Jam Masuk",
      "Jam Pulang",
      "Metode Pulang",
      "Durasi Belajar",
      "Catatan",
    ];
    const rows = classStudents.map((s) => {
      const rec = recordMap.get(s.id);
      return [
        s.nis || "-",
        s.full_name,
        sessionClass?.name || "Semua",
        rec ? STATUS_LABEL[rec.status] : "Belum Absen",
        rec ? METHOD_LABEL[rec.method] : "-",
        formatTimeId(rec?.marked_at),
        formatTimeId(rec?.check_out_time),
        rec?.check_out_method ? METHOD_LABEL[rec.check_out_method] : "-",
        calculateDurationHoursMinutes(rec?.marked_at, rec?.check_out_time),
        rec?.notes || "-",
      ];
    });

    const csv = toCsv([headers, ...rows]);
    const filename = `Presensi_${session.subject}_${session.date}.csv`;
    downloadCsv(filename, csv);
    toast.success("Laporan CSV berhasil diunduh.");
  };

  const sendWhatsAppNotification = (
    studentName: string,
    guardianPhone: string | null,
    status: AttendanceStatus,
    isCheckout = false
  ) => {
    soundManager.playBeep();
    if (!guardianPhone) {
      toast.error(`Nomor WhatsApp wali untuk ${studentName} belum terdaftar.`);
      return;
    }

    // Clean phone number (replace leading 0 with 62)
    let cleanPhone = guardianPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.substring(1);
    }

    const res = storeSendWhatsApp({
      studentId: "stu",
      studentName,
      guardianPhone,
      guardianName: "Wali Murid",
      status,
      isCheckout,
      customTime: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    });

    if (res.waUrl) {
      window.open(res.waUrl, "_blank");
      toast.success(`Membuka WhatsApp untuk wali ${studentName} (${isCheckout ? "Pulang" : "Masuk"})`);
    }
  };

  const filteredStudents = classStudents.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nis && s.nis.includes(searchQuery))
  );

  const qrUrl = `${window.location.origin}/absen?token=${currentToken}&sessionId=${session.id}`;

  return (
    <div className="space-y-6">
      {/* Header & Back */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <button
            onClick={() => onNavigate("presensi")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Kembali ke Daftar Presensi
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              {session.subject}
            </h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              {sessionClass?.name || "Semua Kelas"}
            </Badge>
            <Badge
              className={`text-xs font-bold py-0.5 px-2.5 ${
                session.status === "open"
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {session.status === "open" ? "● Presensi Terbuka" : "Presensi Terkunci"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDateId(session.date)} • Jam {session.start_time} - {session.end_time || "Selesai"} • Toleransi: {session.late_after_minutes} menit
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {session.status === "open" && (
            <Button
              onClick={() => setQrModalOpen(true)}
              className="bg-primary text-primary-foreground font-semibold shadow-sm"
            >
              <QrCode className="mr-1.5 size-4" />
              Tayangkan QR Proyektor
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => toggleSessionStatus(session.id)}
            className="bg-card text-foreground text-xs"
          >
            {session.status === "open" ? (
              <>
                <Lock className="mr-1.5 size-3.5" /> Kunci Presensi
              </>
            ) : (
              <>
                <Unlock className="mr-1.5 size-3.5" /> Buka Presensi
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="bg-card text-foreground text-xs"
          >
            <Download className="mr-1.5 size-3.5" /> Unduh CSV
          </Button>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border shadow-sm p-3.5 text-center bg-card">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Total Siswa</span>
          <div className="text-xl font-bold font-display text-foreground mt-1">{classStudents.length}</div>
        </Card>
        <Card className="border shadow-sm p-3.5 text-center bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/20">
          <span className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">Hadir</span>
          <div className="text-xl font-bold font-display text-emerald-600 mt-1">{hadir}</div>
        </Card>
        <Card className="border shadow-sm p-3.5 text-center bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/20">
          <span className="text-[11px] font-semibold uppercase text-amber-700 dark:text-amber-400">Terlambat</span>
          <div className="text-xl font-bold font-display text-amber-600 mt-1">{terlambat}</div>
        </Card>
        <Card className="border shadow-sm p-3.5 text-center bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/20">
          <span className="text-[11px] font-semibold uppercase text-blue-700 dark:text-blue-400">Sakit / Izin</span>
          <div className="text-xl font-bold font-display text-blue-600 mt-1">{sakit + izin}</div>
        </Card>
        <Card className="border shadow-sm p-3.5 text-center bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/20">
          <span className="text-[11px] font-semibold uppercase text-rose-700 dark:text-rose-400">Alpa</span>
          <div className="text-xl font-bold font-display text-rose-600 mt-1">{alpa}</div>
        </Card>
        <Card className="border shadow-sm p-3.5 text-center bg-slate-50 dark:bg-slate-900 border-slate-200">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Belum Absen</span>
          <div className="text-xl font-bold font-display text-foreground mt-1">{belumAbsen}</div>
        </Card>
      </div>

      {/* Roster & Actions Table Card */}
      <Card className="border shadow-sm bg-card overflow-hidden">
        <CardHeader className="p-4 border-b bg-card/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder={`Cari ${terms.student_label.toLowerCase()} berdasarkan nama atau ${terms.identifier_label}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Fast Batch Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBatchPresent}
                className="text-xs font-semibold h-8"
              >
                <CheckCircle2 className="mr-1.5 size-3.5 text-emerald-600" />
                Semua Hadir
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchAlpaForUnmarked}
                className="text-xs text-rose-600 hover:text-rose-700 h-8"
              >
                Tandai Sisa Alpa
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-12 text-center text-xs">No</TableHead>
                <TableHead className="text-xs font-bold">{terms.identifier_label} & Nama {terms.student_label}</TableHead>
                <TableHead className="text-xs font-bold text-center">Status Kehadiran</TableHead>
                <TableHead className="text-xs font-bold text-center">Jam Masuk</TableHead>
                <TableHead className="text-xs font-bold text-center">Jam Pulang / Durasi</TableHead>
                <TableHead className="text-xs font-bold text-center">Aksi / WA Wali</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    Tidak ada data {terms.student_label.toLowerCase()} yang cocok dengan pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((stu, index) => {
                  const rec = recordMap.get(stu.id);
                  const currentStatus = rec?.status;
                  const durationStr = calculateDurationHoursMinutes(rec?.marked_at, rec?.check_out_time);

                  return (
                    <TableRow key={stu.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {stu.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{stu.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {terms.identifier_label}: {stu.nis || "-"} • {stu.gender === "P" ? "Perempuan" : "Laki-laki"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* 1-Click Status Pill Switcher */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {STATUS_ORDER.map((st) => {
                            const active = currentStatus === st;
                            return (
                              <button
                                key={st}
                                onClick={() => handleStatusChange(stu.id, st)}
                                className={`text-[11px] px-2 py-1 rounded-lg font-bold transition-all ${
                                  active
                                    ? `${STATUS_CLASS[st]} shadow-sm scale-105 ring-1 ring-black/10`
                                    : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground opacity-60"
                                }`}
                              >
                                {STATUS_LABEL[st]}
                              </button>
                            );
                          })}
                        </div>
                      </TableCell>

                      {/* Jam Masuk & Method */}
                      <TableCell className="text-center">
                        {rec ? (
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-foreground">
                              {formatTimeId(rec.marked_at)} WIB
                            </span>
                            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                              {rec.method === "qr" && <QrCode className="size-2.5" />}
                              {rec.method === "selfie_gps" && <Camera className="size-2.5 text-primary" />}
                              {METHOD_LABEL[rec.method]}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Belum absen</span>
                        )}
                      </TableCell>

                      {/* Jam Pulang & Durasi */}
                      <TableCell className="text-center">
                        {rec?.check_out_time ? (
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              {formatTimeId(rec.check_out_time)} WIB
                            </span>
                            <p className="text-[10px] text-muted-foreground">
                              ⏱️ {durationStr}
                            </p>
                          </div>
                        ) : rec ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              soundManager.playBeep();
                              markCheckOut({
                                sessionId: session.id,
                                studentId: stu.id,
                                method: "manual",
                              });
                              toast.success(`Jam pulang untuk ${stu.full_name} berhasil dicatat.`);
                            }}
                            className="text-[10px] h-6 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg border-amber-300"
                          >
                            <LogOut className="size-2.5 mr-1" /> Catat Pulang
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Notes & WhatsApp Notification */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Note button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setNotesStudent({
                                id: stu.id,
                                name: stu.full_name,
                                note: rec?.notes || "",
                              })
                            }
                            title="Tambah Catatan"
                          >
                            <Edit3 className="size-3.5" />
                          </Button>

                          {/* WhatsApp Notification trigger for Check-in */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                            onClick={() =>
                              sendWhatsAppNotification(
                                stu.full_name,
                                stu.guardian_phone,
                                currentStatus || "alpa",
                                false
                              )
                            }
                            title={`Kirim WA Masuk ke Wali (${stu.guardian_phone || "Belum ada no WA"})`}
                          >
                            <MessageCircle className="size-3.5" />
                          </Button>

                          {/* WhatsApp Notification trigger for Check-out */}
                          {rec?.check_out_time && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                              onClick={() =>
                                sendWhatsAppNotification(
                                  stu.full_name,
                                  stu.guardian_phone,
                                  "hadir",
                                  true
                                )
                              }
                              title={`Kirim WA Pulang ke Wali`}
                            >
                              <LogOut className="size-3.5" />
                            </Button>
                          )}
                        </div>
                        {rec?.notes && (
                          <p className="text-[10px] text-muted-foreground italic truncate max-w-[120px] mx-auto mt-0.5">
                            "{rec.notes}"
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* QR Code Projector Modal (Live Dynamic Rotating Anti-Cheat QR) */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-xl text-center bg-slate-950 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
              <QrCode className="size-6 text-emerald-400" />
              Pindai QR Presensi Kelas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              {session.subject} • {sessionClass?.name || "Semua Kelas"} • {activeSchool?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl my-4 shadow-2xl">
            <QRCodeSVG
              value={qrUrl}
              size={280}
              level="H"
              includeMargin
            />
            <div className="mt-4 flex items-center gap-2 bg-slate-100 text-slate-900 px-4 py-1.5 rounded-full font-mono text-xs font-bold">
              <RotateCw className="size-3.5 animate-spin text-emerald-600" />
              <span>Token berganti dalam: <strong className="text-emerald-600">{timerSeconds} detik</strong></span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <p>
              Siswa wajib membuka menu <strong>Portal Absen</strong> di smartphone masing-masing.
            </p>
            {session.require_location && (
              <p className="text-emerald-400 flex items-center justify-center gap-1">
                <MapPin className="size-3.5" /> Validasi GPS Geofence Aktif (Radius {activeSchool?.radius_meters}m)
              </p>
            )}
          </div>

          <div className="flex justify-center gap-3 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tok = getOrCreateQrToken(session.id);
                setCurrentToken(tok);
                setTimerSeconds(30);
                toast.success("Token QR berhasil diperbarui.");
              }}
              className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800 text-xs"
            >
              <RotateCw className="mr-1.5 size-3.5" /> Refresh Kode Sekarang
            </Button>
            <Button
              size="sm"
              onClick={() => setQrModalOpen(false)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Selesai / Tutup Proyektor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Editing Dialog */}
      <Dialog open={!!notesStudent} onOpenChange={() => setNotesStudent(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Catatan Siswa: {notesStudent?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tambahkan keterangan khusus (misal: Alasan izin, nomor surat dokter).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              value={notesStudent?.note || ""}
              onChange={(e) =>
                setNotesStudent((prev) => (prev ? { ...prev, note: e.target.value } : null))
              }
              placeholder="Contoh: Sakit demam tinggi, ada surat dokter"
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setNotesStudent(null)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (notesStudent) {
                  const existingRec = recordMap.get(notesStudent.id);
                  markAttendance({
                    sessionId: session.id,
                    studentId: notesStudent.id,
                    status: existingRec?.status || "izin",
                    notes: notesStudent.note,
                  });
                  toast.success("Catatan berhasil disimpan.");
                  setNotesStudent(null);
                }
              }}
            >
              Simpan Catatan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
