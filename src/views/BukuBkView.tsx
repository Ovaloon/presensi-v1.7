import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Award,
  Users,
  Search,
  Plus,
  Phone,
  MessageSquare,
  FileText,
  Printer,
  Calendar,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSchoolStore } from "@/lib/store";
import { BkViolationRecord, BkCategory, BkActionTaken } from "@/types";
import { todayIso } from "@/lib/attendance";
import { toast } from "sonner";

interface BukuBkViewProps {
  onNavigate?: (view: string, param?: string) => void;
}

export function BukuBkView({ onNavigate }: BukuBkViewProps) {
  const {
    activeSchool,
    classes,
    students,
    records,
    bkViolations,
    addBkViolation,
    updateBkViolation,
    deleteBkViolation,
    sendWhatsAppNotification,
    currentUser,
  } = useSchoolStore();

  const [activeTab, setActiveTab] = useState<"early_warning" | "catatan" | "rekap">("early_warning");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for new BK record
  const [studentId, setStudentId] = useState<string>("");
  const [category, setCategory] = useState<BkCategory>("terlambat_berulang");
  const [points, setPoints] = useState<number>(10);
  const [date, setDate] = useState<string>(todayIso());
  const [description, setDescription] = useState<string>("");
  const [actionTaken, setActionTaken] = useState<BkActionTaken>("teguran_lisan");
  const [followupNotes, setFollowupNotes] = useState<string>("");

  // 1. Calculate Early Warning list from attendance records + BK violations
  const earlyWarningStudents = useMemo(() => {
    return students
      .map((st) => {
        const studentRecords = records.filter((r) => r.student_id === st.id);
        const alpaCount = studentRecords.filter((r) => r.status === "alpa").length;
        const lateCount = studentRecords.filter((r) => r.status === "terlambat").length;
        const studentViolations = bkViolations.filter((v) => v.student_id === st.id);

        let totalPoints = 0;
        studentViolations.forEach((v) => {
          if (v.category === "prestasi_positif") {
            totalPoints -= v.points; // Prestasi mengurangi poin pelanggaran
          } else {
            totalPoints += v.points;
          }
        });

        const targetClass = classes.find((c) => c.id === st.class_id);

        // Warning level determination
        let riskLevel: "safe" | "warning" | "danger" | "critical" = "safe";
        let recommendation = "Kehadiran baik & disiplin.";

        if (totalPoints >= 50 || alpaCount >= 5) {
          riskLevel = "critical";
          recommendation = "Penerbitan SP 2 / Panggilan Orang Tua ke Sekolah";
        } else if (totalPoints >= 25 || alpaCount >= 3 || lateCount >= 5) {
          riskLevel = "danger";
          recommendation = "Penerbitan Surat Peringatan (SP 1) & Konseling BK";
        } else if (totalPoints >= 10 || alpaCount >= 2 || lateCount >= 3) {
          riskLevel = "warning";
          recommendation = "Teguran lisan & Pembinaan oleh Wali Kelas";
        }

        return {
          student: st,
          className: targetClass?.name || "Tanpa Kelas",
          alpaCount,
          lateCount,
          totalPoints,
          riskLevel,
          recommendation,
          violationsCount: studentViolations.length,
        };
      })
      .filter((item) => item.riskLevel !== "safe" || item.violationsCount > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints || b.alpaCount - a.alpaCount);
  }, [students, records, bkViolations, classes]);

  const selectedStudentObj = useMemo(() => {
    return students.find((s) => s.id === studentId);
  }, [students, studentId]);

  const handleOpenAddModal = (defaultStudentId?: string) => {
    if (defaultStudentId) {
      setStudentId(defaultStudentId);
    } else if (students.length > 0) {
      setStudentId(students[0].id);
    }
    setDate(todayIso());
    setCategory("terlambat_berulang");
    setPoints(10);
    setDescription("");
    setActionTaken("teguran_lisan");
    setFollowupNotes("");
    setIsModalOpen(true);
  };

  const handleSaveBkViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentObj) {
      toast.error("Silakan pilih siswa terlebih dahulu.");
      return;
    }
    if (!description.trim()) {
      toast.error("Deskripsi pelanggaran / catatan wajib diisi.");
      return;
    }

    const targetClass = classes.find((c) => c.id === selectedStudentObj.class_id);

    addBkViolation({
      student_id: selectedStudentObj.id,
      student_name: selectedStudentObj.full_name,
      class_id: selectedStudentObj.class_id || "",
      class_name: targetClass?.name || "-",
      date,
      category,
      points: Number(points),
      description,
      action_taken: actionTaken,
      followup_notes: followupNotes || undefined,
      parent_notified: false,
      recorded_by: currentUser?.full_name || "Guru BK",
    });

    toast.success(`Catatan BK untuk ${selectedStudentObj.full_name} berhasil disimpan.`);
    setIsModalOpen(false);
  };

  const handleSendWaParent = (viol: BkViolationRecord) => {
    const student = students.find((s) => s.id === viol.student_id);
    const phone = student?.guardian_phone;

    if (!phone) {
      toast.error(`Nomor WhatsApp orang tua ${viol.student_name} belum terdaftar.`);
      return;
    }

    const message = `Yth. Bapak/Ibu Orang Tua/Wali dari ananda ${viol.student_name} (${viol.class_name}).\n\nKami menginformasikan catatan kedisiplinan sekolah:\n- Tanggal: ${viol.date}\n- Kategori: ${viol.category.replace(/_/g, " ").toUpperCase()}\n- Catatan: ${viol.description}\n- Tindakan: ${viol.action_taken.replace(/_/g, " ").toUpperCase()}\n- Poin: +${viol.points}\n\nMohon kerja sama dan pendampingan di rumah. Terima kasih.\n- Bimbingan Konseling ${activeSchool?.name || "Sekolah"}`;

    sendWhatsAppNotification({
      studentId: viol.student_id,
      studentName: viol.student_name,
      guardianPhone: phone,
      guardianName: student?.guardian_name || "Wali Murid",
      status: "alpa",
    });

    updateBkViolation(viol.id, {
      parent_notified: true,
      parent_notified_at: new Date().toISOString(),
    });

    toast.success(`Notifikasi WhatsApp terkirim ke orang tua ${viol.student_name}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <Badge variant="outline" className="text-rose-600 border-rose-300 font-medium">
              Early Warning & Kedisiplinan Siswa
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Buku Catatan BK & Sistem Peringatan Dini
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deteksi otomatis siswa rentan alpa/terlambat berulang, pencatatan poin pelanggaran & konseling orang tua
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => handleOpenAddModal()} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Catat Pelanggaran / Prestasi
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Button
          variant={activeTab === "early_warning" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("early_warning")}
          className="rounded-xl gap-1.5"
        >
          <AlertTriangle className="w-4 h-4" />
          Peringatan Dini (Early Warning)
          <Badge variant="secondary" className="ml-1 text-xs">
            {earlyWarningStudents.length} Siswa
          </Badge>
        </Button>
        <Button
          variant={activeTab === "catatan" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("catatan")}
          className="rounded-xl gap-1.5"
        >
          <FileText className="w-4 h-4" />
          Buku Pelanggaran & Poin ({bkViolations.length})
        </Button>
        <Button
          variant={activeTab === "rekap" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("rekap")}
          className="rounded-xl gap-1.5"
        >
          <Award className="w-4 h-4" />
          Klasifikasi & Statistik
        </Button>
      </div>

      {/* 1. EARLY WARNING TAB */}
      {activeTab === "early_warning" && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <span className="font-semibold">Algoritma Early Warning Sekolah Aktif:</span> Siswa yang memiliki akumulasi Alpa &ge; 3 hari, Terlambat &ge; 3 kali, atau Poin Pelanggaran &ge; 10 poin secara otomatis masuk ke dalam daftar perhatian khusus Guru BK dan Wali Kelas untuk pencegahan dini putus sekolah atau penurunan prestasi.
            </div>
          </div>

          {earlyWarningStudents.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
              <h3 className="font-semibold text-lg">Semua Siswa Dalam Status Aman</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Tidak ada siswa yang mencapai batas peringatan dini kehadiran atau poin pelanggaran saat ini.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {earlyWarningStudents.map((item) => {
                const isCritical = item.riskLevel === "critical";
                const isDanger = item.riskLevel === "danger";

                return (
                  <Card
                    key={item.student.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isCritical
                        ? "border-rose-400 bg-rose-50/30 dark:bg-rose-950/10"
                        : isDanger
                        ? "border-amber-400 bg-amber-50/30 dark:bg-amber-950/10"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <Badge
                          className={
                            isCritical
                              ? "bg-rose-600 text-white"
                              : isDanger
                              ? "bg-amber-600 text-white"
                              : "bg-yellow-600 text-white"
                          }
                        >
                          {isCritical
                            ? "Kritis (SP 2 / Panggilan)"
                            : isDanger
                            ? "Bahaya (SP 1 / Konseling)"
                            : "Perhatian (Teguran)"}
                        </Badge>
                        <h4 className="font-bold text-foreground text-base mt-2">
                          {item.student.full_name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          NIS: {item.student.nis} | Kelas:{" "}
                          <span className="font-semibold text-foreground">{item.className}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-2xl font-black text-rose-600">{item.totalPoints}</span>
                        <span className="text-[10px] text-muted-foreground block">Poin Disiplin</span>
                      </div>
                    </div>

                    {/* Attendance Stats */}
                    <div className="grid grid-cols-2 gap-2 bg-background/80 rounded-xl p-2.5 text-xs mb-3 border">
                      <div>
                        <span className="text-muted-foreground">Alpa Tanpa Keterangan:</span>
                        <p className="font-bold text-rose-600 text-sm">{item.alpaCount} Hari</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Terlambat Masuk:</span>
                        <p className="font-bold text-amber-600 text-sm">{item.lateCount} Kali</p>
                      </div>
                    </div>

                    <div className="text-xs space-y-1 mb-4">
                      <span className="font-semibold text-muted-foreground block">
                        Rekomendasi Tindakan:
                      </span>
                      <p className="text-foreground bg-muted/60 p-2 rounded-lg font-medium">
                        {item.recommendation}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAddModal(item.student.id)}
                        className="rounded-lg text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Catat Tindakan
                      </Button>

                      {item.student.guardian_phone ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const dummyViol: BkViolationRecord = {
                              id: `bk-warn-${Date.now()}`,
                              school_id: activeSchool?.id || "sch-1",
                              student_id: item.student.id,
                              student_name: item.student.full_name,
                              class_id: item.student.class_id || "",
                              class_name: item.className,
                              date: todayIso(),
                              category: item.alpaCount >= 3 ? "alpa_berulang" : "terlambat_berulang",
                              points: item.totalPoints,
                              description: `Peringatan kehadiran: Alpa ${item.alpaCount} hari, Terlambat ${item.lateCount} kali.`,
                              action_taken: item.alpaCount >= 3 ? "surat_peringatan_1" : "teguran_lisan",
                              parent_notified: false,
                              recorded_by: "BK",
                              created_at: new Date().toISOString(),
                            };
                            handleSendWaParent(dummyViol);
                          }}
                          className="rounded-lg text-xs gap-1 text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 hover:bg-emerald-200"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Hubungi Orang Tua
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          No HP Wali (-)
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. CATATAN PELANGGARAN & PRESTASI TAB */}
      {activeTab === "catatan" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-2xl p-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa, kelas, atau deskripsi pelanggaran..."
                className="border-0 shadow-none focus-visible:ring-0 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border bg-background text-xs"
              >
                <option value="all">Semua Kelas</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {bkViolations.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl">
              <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-semibold text-lg">Belum Ada Catatan BK</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                Catat pelanggaran disiplin atau apresiasi prestasi siswa untuk rekam jejak bimbingan konseling.
              </p>
              <Button onClick={() => handleOpenAddModal()} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Catat Pelanggaran Pertama
              </Button>
            </Card>
          ) : (
            <div className="overflow-x-auto bg-card border rounded-2xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                    <th className="py-3 px-4 text-left">Tanggal</th>
                    <th className="py-3 px-4 text-left">Nama Siswa & Kelas</th>
                    <th className="py-3 px-4 text-left">Kategori</th>
                    <th className="py-3 px-4 text-left">Deskripsi Kejadian</th>
                    <th className="py-3 px-4 text-center">Poin</th>
                    <th className="py-3 px-4 text-left">Tindakan / Sanksi</th>
                    <th className="py-3 px-4 text-center">Notifikasi Ortu</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bkViolations
                    .filter((v) => {
                      if (selectedClassFilter !== "all" && v.class_id !== selectedClassFilter) {
                        return false;
                      }
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        v.student_name.toLowerCase().includes(q) ||
                        v.class_name.toLowerCase().includes(q) ||
                        v.description.toLowerCase().includes(q)
                      );
                    })
                    .map((viol) => {
                      const isPrestasi = viol.category === "prestasi_positif";
                      return (
                        <tr key={viol.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                            {viol.date}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-foreground block">
                              {viol.student_name}
                            </span>
                            <span className="text-xs text-muted-foreground">{viol.class_name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                isPrestasi
                                  ? "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                                  : "text-rose-700 border-rose-300 bg-rose-50 dark:bg-rose-950/40"
                              }`}
                            >
                              {viol.category.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs max-w-xs">
                            <p className="text-foreground">{viol.description}</p>
                            {viol.followup_notes && (
                              <p className="text-muted-foreground italic mt-0.5">
                                Tindak lanjut: {viol.followup_notes}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-bold ${
                                isPrestasi ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isPrestasi ? `-${viol.points}` : `+${viol.points}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs capitalize text-muted-foreground">
                            {viol.action_taken.replace(/_/g, " ")}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {viol.parent_notified ? (
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                Terkirim WA
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendWaParent(viol)}
                                className="h-7 text-xs text-primary gap-1"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Kirim WA
                              </Button>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Hapus catatan BK ini?")) {
                                  deleteBkViolation(viol.id);
                                  toast.success("Catatan BK dihapus.");
                                }
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. REKAP & ATURAN POIN TAB */}
      {activeTab === "rekap" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Tabel Bobot Poin Tata Tertib & Sanksi
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/50">
                <span>Terlambat Masuk Sekolah (&gt; 15 menit)</span>
                <span className="font-bold text-rose-600">+10 Poin</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/50">
                <span>Alpa / Tanpa Keterangan 1 Hari</span>
                <span className="font-bold text-rose-600">+15 Poin</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/50">
                <span>Meninggalkan KBM / Bolos Jam Pelajaran</span>
                <span className="font-bold text-rose-600">+20 Poin</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/50">
                <span>Pelanggaran Seragam / Kerapian Atribut</span>
                <span className="font-bold text-rose-600">+5 Poin</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/50">
                <span>Merokok / Membawa Barang Terlarang</span>
                <span className="font-bold text-rose-600">+50 Poin</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200">
                <span>Prestasi Akademik / Non-Akademik / Kedisiplinan Positif</span>
                <span className="font-bold text-emerald-600">-15 Poin (Apresiasi)</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Tingkat Sanksi Pembinaan
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 border rounded-xl space-y-1">
                <span className="font-bold text-amber-600 text-sm">Akumulasi 10 - 20 Poin:</span>
                <p className="text-muted-foreground">Teguran Lisan dan Pembinaan oleh Wali Kelas.</p>
              </div>
              <div className="p-3 border rounded-xl space-y-1 border-amber-300 bg-amber-50/20">
                <span className="font-bold text-amber-700 text-sm">Akumulasi 25 - 45 Poin:</span>
                <p className="text-muted-foreground">Surat Peringatan 1 (SP 1) dan Konseling Bimbingan BK.</p>
              </div>
              <div className="p-3 border rounded-xl space-y-1 border-rose-300 bg-rose-50/30">
                <span className="font-bold text-rose-600 text-sm">Akumulasi 50 - 74 Poin:</span>
                <p className="text-muted-foreground">Surat Peringatan 2 (SP 2) & Panggilan Orang Tua ke Sekolah.</p>
              </div>
              <div className="p-3 border rounded-xl space-y-1 border-rose-600 bg-rose-50 dark:bg-rose-950/40">
                <span className="font-bold text-rose-700 dark:text-rose-400 text-sm">Akumulasi &ge; 75 Poin:</span>
                <p className="text-muted-foreground">Konferensi Kasus Tim BK, Kepala Sekolah, dan Skorsing/Penyaluran.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Catat Pelanggaran / Prestasi Siswa
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan detail catatan kedisiplinan atau poin apresiasi siswa
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBkViolation} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Pilih Siswa *
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                required
              >
                {students.map((st) => {
                  const cls = classes.find((c) => c.id === st.class_id);
                  return (
                    <option key={st.id} value={st.id}>
                      {st.full_name} ({cls?.name || "Tanpa Kelas"}) - NIS: {st.nis}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Tanggal Kejadian
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Bobot Poin
                </label>
                <Input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value as BkCategory;
                    setCategory(cat);
                    if (cat === "terlambat_berulang") setPoints(10);
                    else if (cat === "alpa_berulang") setPoints(15);
                    else if (cat === "bolos_kbm") setPoints(20);
                    else if (cat === "seragam") setPoints(5);
                    else if (cat === "rokok_miras") setPoints(50);
                    else if (cat === "prestasi_positif") setPoints(15);
                  }}
                  className="w-full h-10 px-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="terlambat_berulang">Terlambat Berulang (+10)</option>
                  <option value="alpa_berulang">Alpa / Tanpa Keterangan (+15)</option>
                  <option value="bolos_kbm">Bolos Jam KBM (+20)</option>
                  <option value="seragam">Pelanggaran Seragam (+5)</option>
                  <option value="rokok_miras">Merokok / Barang Terlarang (+50)</option>
                  <option value="perkelahian">Perkelahian / Bullying (+50)</option>
                  <option value="prestasi_positif">Prestasi / Apresiasi Positif (-15)</option>
                  <option value="lainnya">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Tindakan / Sanksi
                </label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value as BkActionTaken)}
                  className="w-full h-10 px-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="teguran_lisan">Teguran Lisan</option>
                  <option value="konseling_bk">Konseling Bimbingan BK</option>
                  <option value="panggilan_ortu">Panggilan Orang Tua</option>
                  <option value="surat_peringatan_1">Surat Peringatan (SP 1)</option>
                  <option value="surat_peringatan_2">Surat Peringatan (SP 2)</option>
                  <option value="skorsing">Skorsing Sementara</option>
                  <option value="apresiasi">Apresiasi Penghargaan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Deskripsi Kejadian / Keterangan *
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="cth: Terlambat hadir ke sekolah 3 hari berturut-turut"
                className="rounded-xl"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Catatan Bimbingan / Kesepakatan Siswa
              </label>
              <Input
                value={followupNotes}
                onChange={(e) => setFollowupNotes(e.target.value)}
                placeholder="cth: Siswa berjanji berangkat sebelum pukul 06.30 WIB"
                className="rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button type="submit" className="rounded-xl">
                Simpan Catatan BK
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
