import React, { useState, useMemo } from "react";
import { useSchoolStore } from "@/lib/store";
import { todayIso, formatDateId } from "@/lib/attendance";
import { StudentLeaveRequest, Student } from "@/types";
import {
  GraduationCap,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Send,
  Printer,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Phone,
  UserCheck,
  AlertCircle,
  Eye,
  Info,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";

export function WaliKelasView() {
  const {
    currentUser,
    role,
    isAdmin,
    isHomeroomTeacher,
    homeroomClass,
    classes,
    students,
    records,
    sessions,
    leaveRequests,
    updateLeaveRequestStatus,
    sendWhatsAppNotification,
    markAttendance,
    terms,
  } = useSchoolStore();

  // If admin/superadmin, allow switching class to supervise any class. If teacher, default to their homeroom class.
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (homeroomClass) return homeroomClass.id;
    return classes[0]?.id || "";
  });

  const activeClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || homeroomClass || classes[0];
  }, [classes, selectedClassId, homeroomClass]);

  const [activeTab, setActiveTab] = useState<"validation" | "students" | "recap" | "broadcast">("validation");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedRequest, setSelectedRequest] = useState<StudentLeaveRequest | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState(
    `Yth. Bapak/Ibu Wali Murid kelas {kelas},\n\nDiberitahukan bahwa ananda tercatat [KETERANGAN] pada hari ini {tanggal}. Mohon konfirmasi atau perhatian dari bapak/ibu.\n\nSalam hangat,\nWali Kelas {wali_kelas}`
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Students belonging to the active class
  const classStudents = useMemo(() => {
    if (!activeClass) return [];
    return students.filter((s) => s.class_id === activeClass.id);
  }, [students, activeClass]);

  // Leave requests for the active class
  const classLeaveRequests = useMemo(() => {
    if (!activeClass) return [];
    return leaveRequests.filter((lr) => {
      if (lr.class_id && lr.class_id === activeClass.id) return true;
      // fallback matching by student id
      return classStudents.some((s) => s.id === lr.student_id);
    });
  }, [leaveRequests, activeClass, classStudents]);

  const filteredLeaveRequests = useMemo(() => {
    return classLeaveRequests.filter((req) => {
      const matchFilter = filterStatus === "all" || req.status === filterStatus;
      const matchSearch =
        req.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.reason.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [classLeaveRequests, filterStatus, searchQuery]);

  // Attendance stats for today
  const todayRecords = useMemo(() => {
    const today = todayIso();
    const classStudentIds = new Set(classStudents.map((s) => s.id));
    return records.filter((r) => (r.marked_at?.startsWith(today) || (r as any).date === today) && classStudentIds.has(r.student_id));
  }, [records, classStudents]);

  const stats = useMemo(() => {
    const total = classStudents.length;
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    const recordedStudentIds = new Set<string>();

    todayRecords.forEach((r) => {
      recordedStudentIds.add(r.student_id);
      if (r.status === "hadir") hadir++;
      else if (r.status === "terlambat") terlambat++;
      else if (r.status === "izin") izin++;
      else if (r.status === "sakit") sakit++;
      else if (r.status === "alpa") alpa++;
    });

    const pendingRequestsCount = classLeaveRequests.filter((r) => r.status === "pending").length;
    const unrecordedCount = Math.max(0, total - recordedStudentIds.size);

    return {
      total,
      hadir,
      terlambat,
      izin,
      sakit,
      alpa,
      pendingRequestsCount,
      unrecordedCount,
      rate: total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0,
    };
  }, [classStudents, todayRecords, classLeaveRequests]);

  const handleOpenReviewModal = (req: StudentLeaveRequest, action: "approved" | "rejected") => {
    setSelectedRequest(req);
    setReviewAction(action);
    setReviewNoteInput(
      action === "approved"
        ? "Pengajuan disetujui oleh Wali Kelas. Semoga lekas sembuh / kegiatan lancar."
        : "Pengajuan ditolak. Mohon sertakan surat resmi bertanda tangan orang tua."
    );
  };

  const handleConfirmReview = () => {
    if (!selectedRequest || !reviewAction) return;

    updateLeaveRequestStatus(selectedRequest.id, reviewAction, reviewNoteInput);

    // If approved, check if there is an active session today and mark attendance as izin or sakit
    if (reviewAction === "approved") {
      const activeSession = sessions.find(
        (s) => s.class_id === activeClass?.id && s.date === todayIso()
      );
      if (activeSession) {
        markAttendance({
          sessionId: activeSession.id,
          studentId: selectedRequest.student_id,
          status: selectedRequest.type === "sakit" ? "sakit" : "izin",
          method: "manual",
          notes: `Divalidasi Wali Kelas: ${selectedRequest.reason}`,
        });
      }
    }

    showToast(
      `Pengajuan ${selectedRequest.student_name} berhasil ${
        reviewAction === "approved" ? "DISETUJUI" : "DITOLAK"
      }`
    );
    setSelectedRequest(null);
    setReviewAction(null);
  };

  const handleSendWaToParent = (student: Student, customText?: string) => {
    if (!student.guardian_phone) {
      showToast(`Nomor WhatsApp orang tua untuk ${student.full_name} belum diisi.`);
      return;
    }

    const text =
      customText ||
      `Halo Bapak/Ibu Wali dari ${student.full_name}, kami dari Wali Kelas ${activeClass?.name} ingin menginformasikan perkembangan ananda...`;

    let clean = student.guardian_phone.replace(/\D/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <PageHeader
        icon={GraduationCap}
        title={activeClass ? `Supervisi Kelas: ${activeClass.name}` : "Portal Wali Kelas"}
        subtitle={`Pusat supervisi ${terms.student_label.toLowerCase()}, verifikasi surat izin/sakit, absensi harian, dan komunikasi wali murid.`}
        badge={currentUser?.full_name ? `Wali: ${currentUser.full_name}` : "Wali Kelas"}
        kpiCards={[
          {
            label: `Total ${terms.student_label}`,
            value: stats.total,
            helper: `Kelas ${activeClass?.name || "-"}`,
            icon: Users,
            color: "primary",
          },
          {
            label: "Hadir Hari Ini",
            value: stats.hadir,
            helper: `${stats.rate}% tingkat kehadiran`,
            icon: CheckCircle2,
            color: "emerald",
          },
          {
            label: "Terlambat / Izin",
            value: `${stats.terlambat} / ${stats.izin + stats.sakit}`,
            helper: "Perlu pendampingan",
            icon: Clock,
            color: "amber",
          },
          {
            label: "Izin Menunggu Validasi",
            value: stats.pendingRequestsCount,
            helper: stats.pendingRequestsCount > 0 ? "Butuh tindakan segera" : "Semua sudah diproses",
            icon: AlertCircle,
            color: stats.pendingRequestsCount > 0 ? "rose" : "blue",
          },
        ]}
      >
        <div className="flex items-center gap-2 bg-card border p-1 rounded-xl shadow-xs">
          <label htmlFor="select-class-wali" className="text-xs text-muted-foreground px-2 font-medium">
            Pilih {terms.class_label}:
          </label>
          <select
            id="select-class-wali"
            aria-label="Pilih Kelas Bimbingan"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-background text-foreground text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} {cls.homeroom_teacher ? `(${cls.homeroom_teacher})` : ""}
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab("validation")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === "validation"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          <span>Validasi Izin</span>
          {stats.pendingRequestsCount > 0 && (
            <Badge className="bg-rose-500 text-white text-[10px] px-1.5 py-0 h-4 font-bold">
              {stats.pendingRequestsCount}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === "students"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-3.5" />
          <span>Data Siswa ({classStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("recap")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === "recap"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="size-3.5" />
          <span>Rekap Presensi</span>
        </button>

        <button
          onClick={() => setActiveTab("broadcast")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === "broadcast"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="size-3.5" />
          <span>Pesan WhatsApp</span>
        </button>
      </div>

      {/* TAB 1: VALIDASI IZIN & SAKIT */}
      {activeTab === "validation" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama siswa atau alasan izin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              {(["all", "pending", "approved", "rejected"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                    filterStatus === st
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold"
                      : "text-slate-600 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  {st === "all"
                    ? "Semua"
                    : st === "pending"
                    ? "Menunggu Validasi"
                    : st === "approved"
                    ? "Disetujui"
                    : "Ditolak"}
                </button>
              ))}
            </div>
          </div>

          {/* List of Requests */}
          {filteredLeaveRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Tidak Ada Pengajuan Izin / Sakit</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Semua pengajuan izin siswa kelas {activeClass?.name} telah diproses atau belum ada pengajuan baru dari siswa.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLeaveRequests.map((req) => {
                const isPending = req.status === "pending";
                const isApproved = req.status === "approved";
                const isRejected = req.status === "rejected";

                const stu = classStudents.find((s) => s.id === req.student_id);

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-xl p-5 border shadow-sm transition-all flex flex-col justify-between ${
                      isPending
                        ? "border-amber-300 ring-1 ring-amber-200/50 bg-gradient-to-b from-amber-50/20 to-white"
                        : isApproved
                        ? "border-emerald-200"
                        : "border-slate-200 opacity-80"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                              req.type === "sakit"
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {req.type === "sakit" ? "🏥 Sakit" : "📝 Izin Resmi"}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {formatDateId(req.start_date)}
                            {req.end_date !== req.start_date && ` s.d ${formatDateId(req.end_date)}`}
                          </span>
                        </div>

                        {isPending ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-300">
                            <Clock className="w-3.5 h-3.5" /> Menunggu
                          </span>
                        ) : isApproved ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                            <Check className="w-3.5 h-3.5" /> Disetujui
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Ditolak
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 mt-1">{req.student_name}</h4>
                      {stu && <p className="text-xs text-slate-500">NIS: {stu.nis}</p>}

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 my-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                          Alasan Keterangan:
                        </p>
                        <p className="text-sm text-slate-700 italic">"{req.reason}"</p>
                      </div>

                      {req.attachment_url && (
                        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 p-2 rounded-lg border border-indigo-100 mb-3">
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate">Lampiran: {req.attachment_url}</span>
                        </div>
                      )}

                      {req.reviewed_by && (
                        <p className="text-[11px] text-slate-500 mb-3">
                          Ditinjau oleh: <strong>{req.reviewed_by}</strong> ({req.review_notes || "Tidak ada catatan"})
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {stu && stu.guardian_phone ? (
                        <button
                          onClick={() =>
                            handleSendWaToParent(
                              stu,
                              `Yth. Bapak/Ibu Wali dari ${stu.full_name}, kami menerima surat permohonan ${req.type} untuk tanggal ${formatDateId(req.start_date)}: "${req.reason}".`
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1.5 transition-colors border border-emerald-200"
                        >
                          <Phone className="w-3.5 h-3.5" /> Hubungi Orang Tua
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No HP ortu belum terdaftar</span>
                      )}

                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenReviewModal(req, "rejected")}
                            className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition-colors border border-rose-200"
                          >
                            <X className="w-3.5 h-3.5" /> Tolak
                          </button>
                          <button
                            onClick={() => handleOpenReviewModal(req, "approved")}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" /> Setujui
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenReviewModal(req, isApproved ? "rejected" : "approved")}
                          className="text-xs text-indigo-600 hover:underline font-medium"
                        >
                          Ubah Status
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BUKU INDUK SISWA KELAS */}
      {activeTab === "students" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Daftar {terms.students_label} Kelas {activeClass?.name}
              </h3>
              <p className="text-xs text-slate-500">
                Total {classStudents.length} {terms.student_label} terdaftar di rombel ini
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak Lembar Rombel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/75 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3">{terms.identifier_label}</th>
                  <th className="px-4 py-3">Nama Lengkap {terms.student_label}</th>
                  <th className="px-4 py-3">L/P</th>
                  <th className="px-4 py-3">Nama {terms.guardian_label}</th>
                  <th className="px-4 py-3">Kontak WhatsApp</th>
                  <th className="px-4 py-3 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((stu, idx) => (
                  <tr key={stu.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-4 py-3 text-center text-xs text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{stu.nis}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{stu.full_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          stu.gender === "L" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"
                        }`}
                      >
                        {stu.gender === "L" ? "Laki-laki" : "Perempuan"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{stu.guardian_name || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {stu.guardian_phone ? (
                        <span className="font-mono text-emerald-700 font-medium">{stu.guardian_phone}</span>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSendWaToParent(stu)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1.5 border border-emerald-200 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chat WA
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REKAP JURNAL PRESENSI KELAS */}
      {activeTab === "recap" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Jurnal & Laporan Rekap Kehadiran Kelas {activeClass?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perhitungan total kehadiran, persentase kehadiran, izin, sakit, dan alpa semester berjalan.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors self-start md:self-auto"
            >
              <Printer className="w-4 h-4" /> Cetak Leger Absensi Resmi
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/75 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Nama {terms.student_label}</th>
                    <th className="px-4 py-3 text-center text-emerald-700 bg-emerald-50/50">Hadir</th>
                    <th className="px-4 py-3 text-center text-amber-700 bg-amber-50/50">Telat</th>
                    <th className="px-4 py-3 text-center text-blue-700 bg-blue-50/50">Izin</th>
                    <th className="px-4 py-3 text-center text-purple-700 bg-purple-50/50">Sakit</th>
                    <th className="px-4 py-3 text-center text-rose-700 bg-rose-50/50">Alpa</th>
                    <th className="px-4 py-3 text-center font-bold">Persentase</th>
                    <th className="px-4 py-3 text-center">Status Disiplin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((stu, idx) => {
                    const stuRecords = records.filter((r) => r.student_id === stu.id);
                    let h = 0,
                      t = 0,
                      i = 0,
                      s = 0,
                      a = 0;
                    stuRecords.forEach((r) => {
                      if (r.status === "hadir") h++;
                      else if (r.status === "terlambat") t++;
                      else if (r.status === "izin") i++;
                      else if (r.status === "sakit") s++;
                      else if (r.status === "alpa") a++;
                    });
                    const totalSession = h + t + i + s + a || 1;
                    const percent = Math.round(((h + t) / totalSession) * 100);

                    return (
                      <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-xs text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{stu.full_name}</div>
                          <div className="text-xs text-slate-500 font-mono">NIS: {stu.nis}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600 bg-emerald-50/20">{h}</td>
                        <td className="px-4 py-3 text-center font-bold text-amber-600 bg-amber-50/20">{t}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-600 bg-blue-50/20">{i}</td>
                        <td className="px-4 py-3 text-center font-bold text-purple-600 bg-purple-50/20">{s}</td>
                        <td className="px-4 py-3 text-center font-bold text-rose-600 bg-rose-50/20">{a}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              percent >= 90
                                ? "bg-emerald-100 text-emerald-800"
                                : percent >= 75
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {percent}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a >= 3 ? (
                            <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Butuh Perhatian
                            </span>
                          ) : percent >= 95 ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Sangat Baik
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BROADCAST WHATSAPP WALI MURID */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Broadcast & Pengumuman Kelas</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kirim pemberitahuan langsung ke nomor WhatsApp seluruh orang tua murid kelas {activeClass?.name}.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Template Pesan Pengumuman:
                </label>
                <textarea
                  rows={6}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Variabel otomatis: <code>{"{kelas}"}</code>, <code>{"{tanggal}"}</code>, <code>{"{wali_kelas}"}</code>
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Pengiriman menggunakan integrasi Direct WhatsApp. Tombol di bawah akan membuka percakapan satu per satu secara aman tanpa risiko spam blocking nomor.
                </span>
              </div>
            </div>

            {/* List of parents with 1-click button */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-800">Daftar Kontak Wali Murid ({classStudents.length})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {classStudents.map((stu) => {
                  const parsedMsg = broadcastMessage
                    .replace(/{kelas}/g, activeClass?.name || "Kelas")
                    .replace(/{tanggal}/g, new Date().toLocaleDateString("id-ID"))
                    .replace(/{wali_kelas}/g, currentUser?.full_name || "Wali Kelas");

                  return (
                    <div
                      key={stu.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{stu.full_name}</div>
                        <div className="text-xs text-slate-500">
                          Wali: <strong>{stu.guardian_name || "Orang Tua"}</strong> (
                          {stu.guardian_phone || "Belum ada no WA"})
                        </div>
                      </div>

                      {stu.guardian_phone ? (
                        <button
                          onClick={() => handleSendWaToParent(stu, parsedMsg)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" /> Kirim Pesan
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No HP belum ada</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Notice Panel for Absentees today */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-slate-900">Siswa Tidak Hadir Hari Ini</h4>
            </div>
            <p className="text-xs text-slate-500">
              Siswa yang belum ada keterangan atau tercatat alpa hari ini untuk segera dikonfirmasi ke wali murid:
            </p>

            {todayRecords.filter((r) => r.status === "alpa").length === 0 ? (
              <div className="p-4 bg-emerald-50 rounded-xl text-center text-xs text-emerald-800 font-medium border border-emerald-100">
                🎉 Tidak ada siswa tercatat Alpa hari ini!
              </div>
            ) : (
              <div className="space-y-2">
                {todayRecords
                  .filter((r) => r.status === "alpa")
                  .map((rec) => {
                    const stu = classStudents.find((s) => s.id === rec.student_id);
                    if (!stu) return null;
                    return (
                      <div key={rec.id} className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                        <div className="font-bold text-xs text-rose-900">{stu.full_name}</div>
                        <p className="text-[11px] text-rose-700 mt-0.5">Status: ALPA (Tanpa Keterangan)</p>
                        <button
                          onClick={() =>
                            handleSendWaToParent(
                              stu,
                              `Yth. Bapak/Ibu Wali dari ${stu.full_name}, kami menginformasikan bahwa ananda hari ini tercatat ALPA / belum hadir di sekolah. Mohon konfirmasi ke pihak wali kelas.`
                            )
                          }
                          className="mt-2 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" /> Konfirmasi Alpa ke Orang Tua
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedRequest && reviewAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {reviewAction === "approved" ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                    <X className="w-5 h-5" />
                  </div>
                )}
                <h3 className="font-bold text-slate-900 text-base">
                  {reviewAction === "approved" ? "Setujui Permohonan Izin" : "Tolak Permohonan Izin"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewAction(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500 font-semibold uppercase">Nama Siswa:</div>
                <div className="text-sm font-bold text-slate-800">{selectedRequest.student_name}</div>
                <div className="text-xs text-slate-600 mt-1">Alasan: "{selectedRequest.reason}"</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Tanggapan Wali Kelas:
                </label>
                <textarea
                  rows={3}
                  value={reviewNoteInput}
                  onChange={(e) => setReviewNoteInput(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tuliskan catatan verifikasi..."
                />
              </div>

              {reviewAction === "approved" && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Status absensi siswa hari ini akan otomatis diperbarui menjadi "
                  {selectedRequest.type.toUpperCase()}".
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewAction(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReview}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm ${
                  reviewAction === "approved"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                Konfirmasi {reviewAction === "approved" ? "Setujui" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
