import React, { useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  Filter,
  FileText,
  Calendar,
  Send,
  Sparkles,
  Download,
  Share2,
  ChevronRight,
  Eye,
  MapPin,
  Upload,
  LogOut,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSchoolStore } from "@/lib/store";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  formatDateId,
  formatTimeId,
  calculateDurationHoursMinutes,
  todayIso,
  METHOD_LABEL,
  AttendanceStatus,
} from "@/lib/attendance";
import { soundManager } from "@/lib/sound";
import { toast } from "sonner";
import { AttendanceRecord } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";

interface RiwayatSiswaViewProps {
  onNavigate: (view: string, param?: string) => void;
  defaultTab?: "riwayat" | "izin";
}

export function RiwayatSiswaView({ onNavigate, defaultTab = "riwayat" }: RiwayatSiswaViewProps) {
  const {
    students,
    classes,
    sessions,
    records,
    currentUser,
    myStudentProfile,
    role,
    activeSchool,
    markAttendance,
    terms,
  } = useSchoolStore();

  const [activeTab, setActiveTab] = useState<"riwayat" | "izin">(defaultTab);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Leave / Sick Request Form State
  const [leaveType, setLeaveType] = useState<"sakit" | "izin">("sakit");
  const [leaveDate, setLeaveDate] = useState<string>(todayIso());
  const [leaveReason, setLeaveReason] = useState<string>("");
  const [leaveAttachmentName, setLeaveAttachmentName] = useState<string>("");

  // Identify current student
  const studentInfo =
    myStudentProfile ||
    students.find((s) => s.nis === currentUser?.nis) ||
    students.find((s) => s.user_id === currentUser?.id) ||
    students[0];

  const studentClass = classes.find((c) => c.id === studentInfo?.class_id);

  // Student's records
  const myRecords = records
    .filter((r) => r.student_id === studentInfo?.id)
    .sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime());

  // Filtered records
  const filteredRecords = myRecords.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  // Calculate statistics
  const totalHadir = myRecords.filter((r) => r.status === "hadir").length;
  const totalTerlambat = myRecords.filter((r) => r.status === "terlambat").length;
  const totalSakit = myRecords.filter((r) => r.status === "sakit").length;
  const totalIzin = myRecords.filter((r) => r.status === "izin").length;
  const totalAlpa = myRecords.filter((r) => r.status === "alpa").length;

  const totalEffectivePresent = totalHadir + totalTerlambat;
  const rate =
    sessions.length > 0
      ? Math.min(100, Math.round((totalEffectivePresent / sessions.length) * 100))
      : 100;

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      toast.error("Mohon isi alasan atau keterangan izin/sakit.");
      return;
    }

    soundManager.playSuccess();

    // Find or create session for the selected date
    let targetSession = sessions.find((s) => s.date === leaveDate);
    if (!targetSession && sessions.length > 0) {
      targetSession = sessions[0];
    }

    if (targetSession && studentInfo) {
      markAttendance({
        sessionId: targetSession.id,
        studentId: studentInfo.id,
        status: leaveType,
        method: "manual",
        notes: `Pengajuan ${leaveType.toUpperCase()}: ${leaveReason}${
          leaveAttachmentName ? ` [Lampiran: ${leaveAttachmentName}]` : ""
        }`,
      });
    }

    // Prepare WhatsApp text for Homeroom Teacher
    const textWa = `*SURAT IZIN / SAKIT DIGITAL*\nLembaga: ${activeSchool?.name}\nNama: ${studentInfo?.full_name} (${terms.identifier_label}: ${studentInfo?.nis})\n${terms.class_label}: ${studentClass?.name || "-"}\nJenis: ${leaveType === "sakit" ? "SAKIT" : "IZIN"}\nTanggal: ${formatDateId(leaveDate)}\nAlasan: ${leaveReason}\n\nMohon dicatat dan diizinkan bapak/ibu ${terms.teacher_label.toLowerCase()}. Terima kasih.`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(textWa)}`;

    toast.success(`Pengajuan ${leaveType === "sakit" ? "Surat Sakit" : "Izin"} berhasil dikirim ke sistem!`);

    // Reset form & switch tab
    setLeaveReason("");
    setLeaveAttachmentName("");
    setActiveTab("riwayat");

    // Suggest share to WA
    if (confirm("Ingin meneruskan surat izin ini ke WhatsApp Wali Kelas / Pengajar sekarang?")) {
      window.open(waUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <PageHeader
        icon={CalendarCheck}
        title={`Riwayat & Kehadiran ${terms.student_label}`}
        subtitle={`${studentInfo?.full_name || "Siswa"} • ${terms.identifier_label}: ${studentInfo?.nis || "-"} • ${terms.class_label} ${studentClass?.name || "-"}`}
        badge={`${rate}% Kehadiran`}
        kpiCards={[
          {
            label: "Persentase Kehadiran",
            value: `${rate}%`,
            helper: `${totalEffectivePresent} dari ${sessions.length} sesi`,
            icon: CheckCircle2,
            color: "primary",
          },
          {
            label: "Hadir Tepat Waktu",
            value: totalHadir,
            helper: "Sesuai jadwal",
            icon: CheckCircle2,
            color: "emerald",
          },
          {
            label: "Terlambat",
            value: totalTerlambat,
            helper: "Toleransi jam masuk",
            icon: Clock,
            color: "amber",
          },
          {
            label: "Izin, Sakit & Alpa",
            value: totalIzin + totalSakit + totalAlpa,
            helper: `${totalAlpa} tanpa keterangan`,
            icon: AlertCircle,
            color: "rose",
          },
        ]}
      >
        <Button
          size="sm"
          onClick={() => {
            soundManager.playBeep();
            onNavigate("absen");
          }}
          className="bg-primary text-primary-foreground font-bold shadow-xs text-xs rounded-xl h-9 px-3.5"
        >
          <Camera className="mr-1.5 size-4" /> Presensi Sekarang
        </Button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => {
            soundManager.playBeep();
            setActiveTab("riwayat");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
            activeTab === "riwayat"
              ? "border-primary text-primary bg-primary/5 shadow-xs"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="size-4" /> Riwayat Kehadiran
        </button>

        <button
          onClick={() => {
            soundManager.playBeep();
            setActiveTab("izin");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
            activeTab === "izin"
              ? "border-primary text-primary bg-primary/5 shadow-xs"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="size-4 text-amber-500" /> Pengajuan Izin
        </button>
      </div>

      {/* TAB 1: RIWAYAT KEHADIRAN */}
      {activeTab === "riwayat" && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="border shadow-xs bg-card p-3 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-muted-foreground block">Persentase</span>
              <strong className="text-lg sm:text-xl font-extrabold text-foreground">{rate}%</strong>
              <div className="w-full bg-secondary h-1 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rate}%` }} />
              </div>
            </Card>

            <Card className="border shadow-xs bg-card p-3 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-emerald-600 block">Hadir Tepat Waktu</span>
              <strong className="text-lg sm:text-xl font-extrabold text-emerald-600">{totalHadir}</strong>
              <span className="text-[10px] text-muted-foreground block mt-1">sesi</span>
            </Card>

            <Card className="border shadow-xs bg-card p-3 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-amber-600 block">Terlambat</span>
              <strong className="text-lg sm:text-xl font-extrabold text-amber-600">{totalTerlambat}</strong>
              <span className="text-[10px] text-muted-foreground block mt-1">kali</span>
            </Card>

            <Card className="border shadow-xs bg-card p-3 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-blue-600 block">Sakit & Izin</span>
              <strong className="text-lg sm:text-xl font-extrabold text-blue-600">{totalSakit + totalIzin}</strong>
              <span className="text-[10px] text-muted-foreground block mt-1">surat</span>
            </Card>

            <Card className="border shadow-xs bg-card p-3 rounded-xl text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-rose-600 block">Alpa / Tanpa Keterangan</span>
              <strong className="text-lg sm:text-xl font-extrabold text-rose-600">{totalAlpa}</strong>
              <span className="text-[10px] text-muted-foreground block mt-1">kali</span>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border shadow-xs">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">Filter Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="hadir">Hadir Saja</SelectItem>
                  <SelectItem value="terlambat">Terlambat Saja</SelectItem>
                  <SelectItem value="sakit">Sakit Saja</SelectItem>
                  <SelectItem value="izin">Izin Saja</SelectItem>
                  <SelectItem value="alpa">Alpa Saja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="text-xs text-muted-foreground">
              Menampilkan <strong>{filteredRecords.length}</strong> catatan kehadiran
            </span>
          </div>

          {/* Records List */}
          {filteredRecords.length === 0 ? (
            <Card className="p-10 text-center border-dashed bg-card/40">
              <CalendarCheck className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="font-bold text-foreground">Belum Ada Catatan Kehadiran</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Catatan kehadiran Anda akan otomatis muncul di sini setiap kali Anda melakukan absensi masuk atau diverifikasi guru.
              </p>
              <Button
                size="sm"
                onClick={() => onNavigate("absen")}
                className="mt-4 rounded-xl text-xs"
              >
                <Camera className="mr-1.5 size-3.5" /> Absen Sekarang
              </Button>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filteredRecords.map((rec) => {
                const session = sessions.find((s) => s.id === rec.session_id);
                const markedTime = formatTimeId(rec.marked_at);
                const checkOutTime = formatTimeId(rec.check_out_time);
                const durationStr = calculateDurationHoursMinutes(rec.marked_at, rec.check_out_time);
                const markedDate = session ? formatDateId(session.date) : formatDateId(rec.marked_at.split("T")[0]);

                return (
                  <div
                    key={rec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 gap-3 transition-colors shadow-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {rec.status === "hadir" ? "✓" : rec.status === "terlambat" ? "!" : rec.status === "sakit" ? "S" : rec.status === "izin" ? "I" : "A"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">
                            {session?.subject || "Presensi Harian"}
                          </span>
                          <Badge className={`${STATUS_CLASS[rec.status]} text-[10px] font-bold py-0.5 px-2 rounded-lg`}>
                            {STATUS_LABEL[rec.status]}
                          </Badge>
                          {rec.check_out_time && (
                            <Badge variant="secondary" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <LogOut className="size-2.5 mr-1" /> Pulang: {checkOutTime} WIB
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground" /> {markedDate}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <LogIn className="size-3 text-emerald-600" /> Masuk: {markedTime} WIB
                          </span>
                          {rec.check_out_time && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-foreground font-medium">
                                ⏱️ Durasi: {durationStr}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="font-mono text-[11px]">Metode: {METHOD_LABEL[rec.method]}</span>
                        </p>
                        {rec.notes && (
                          <p className="text-[11px] text-foreground/80 mt-1 italic bg-muted/40 px-2 py-0.5 rounded">
                            "{rec.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {rec.selfie_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRecord(rec)}
                          className="h-8 text-xs rounded-lg"
                        >
                          <Eye className="mr-1.5 size-3.5 text-primary" /> Lihat Bukti Foto
                        </Button>
                      )}
                      {rec.latitude && rec.longitude && (
                        <Badge variant="outline" className="text-[10px] py-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                          <MapPin className="size-2.5 mr-1" /> GPS Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENGAJUAN IZIN / SAKIT */}
      {activeTab === "izin" && (
        <Card className="border shadow-sm bg-card rounded-2xl max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="size-4 text-primary" /> Form Pengajuan Surat Izin / Sakit Digital
            </CardTitle>
            <CardDescription className="text-xs">
              Kirim permohonan dispensasi resmi ke sistem. Status presensi akan tercatat dan Anda dapat membagikan surat ke WhatsApp wali kelas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Jenis Pengajuan</Label>
                  <Select value={leaveType} onValueChange={(val: any) => setLeaveType(val)}>
                    <SelectTrigger className="text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sakit">Sakit (Kondisi Kesehatan)</SelectItem>
                      <SelectItem value="izin">Izin (Urusan Keluarga / Kegiatan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tanggal Berhalangan</Label>
                  <Input
                    type="date"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    required
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Alasan / Keterangan Lengkap
                </Label>
                <Textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Contoh: Mengalami demam tinggi dan disarankan dokter untuk istirahat selama 2 hari..."
                  rows={3}
                  required
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5 border-t pt-3">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Upload className="size-3.5 text-primary" /> Foto Surat Dokter / Keterangan Orang Tua (Opsional)
                </Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setLeaveAttachmentName(e.target.files[0].name);
                      toast.success(`File "${e.target.files[0].name}" terlampir.`);
                    }
                  }}
                  className="text-xs rounded-xl cursor-pointer"
                />
                <p className="text-[11px] text-muted-foreground">
                  Format gambar JPG/PNG atau PDF surat dokter / surat dari orang tua.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("riwayat")}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-primary-foreground font-bold shadow-md rounded-xl text-xs px-6"
                >
                  <Send className="mr-1.5 size-3.5" /> Kirim Pengajuan Izin
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Modal View Selfie / Photo */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Bukti Kehadiran Digital
            </DialogTitle>
            <DialogDescription className="text-xs">
              Foto selfie asli yang diunggah saat jam absensi.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-3">
              {selectedRecord.selfie_url ? (
                <div className="rounded-xl overflow-hidden border bg-black flex items-center justify-center max-h-72">
                  <img
                    src={selectedRecord.selfie_url}
                    alt="Selfie Presensi"
                    className="w-full h-auto object-cover"
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-muted/40 rounded-xl text-xs text-muted-foreground">
                  Tidak ada rekaman foto selfie untuk absensi ini.
                </div>
              )}

              <div className="text-xs space-y-1 border-t pt-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Waktu Absen:</span>
                  <strong className="text-foreground">{new Date(selectedRecord.marked_at).toLocaleString("id-ID")}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <strong className="text-foreground uppercase">{selectedRecord.status}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Metode:</span>
                  <strong className="text-foreground">{METHOD_LABEL[selectedRecord.method]}</strong>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
