import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  Plus,
  Printer,
  Sparkles,
  Users,
  Search,
  Filter,
  FileText,
  CheckSquare,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSchoolStore } from "@/lib/store";
import { LessonAttendanceRecord, AttendanceStatus, SmkLearningGroup } from "@/types";
import { todayIso } from "@/lib/attendance";
import { toast } from "sonner";

interface PresensiMapelViewProps {
  onNavigate?: (view: string, param?: string) => void;
}

export function PresensiMapelView({ onNavigate }: PresensiMapelViewProps) {
  const {
    activeSchool,
    classes,
    students,
    weeklySchedules,
    lessonAttendances,
    addLessonAttendance,
    updateLessonAttendance,
    deleteLessonAttendance,
    currentUser,
    role,
  } = useSchoolStore();

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState<string>(todayIso());
  const [selectedPeriodStart, setSelectedPeriodStart] = useState<number>(1);
  const [selectedPeriodEnd, setSelectedPeriodEnd] = useState<number>(4);
  const [subjectName, setSubjectName] = useState<string>("Pemrograman Web & Perangkat Bergerak (Praktik Lab)");
  const [teacherName, setTeacherName] = useState<string>(
    currentUser?.full_name || "Siti Rahmawati, S.Kom"
  );
  const [learningGroup, setLearningGroup] = useState<SmkLearningGroup>("praktik_lab");
  const [roomName, setRoomName] = useState<string>("Lab Komputer 2 (RPL)");
  const [topicMaterial, setTopicMaterial] = useState<string>("");
  const [learningObjective, setLearningObjective] = useState<string>("");
  const [obstaclesNotes, setObstaclesNotes] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"input" | "riwayat">("input");
  const [searchHistory, setSearchHistory] = useState<string>("");

  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter((s) => s.class_id === selectedClass.id);
  }, [students, selectedClass]);

  // Student Attendance Form State
  const [studentStatusMap, setStudentStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [studentNotesMap, setStudentNotesMap] = useState<Record<string, string>>({});

  // Initialize or re-init student statuses when class changes
  const initClassStatuses = () => {
    const initialStatus: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st) => {
      initialStatus[st.id] = "hadir";
    });
    setStudentStatusMap(initialStatus);
  };

  // Check if there is already a record for this class & date
  const existingRecord = useMemo(() => {
    return lessonAttendances.find(
      (l) =>
        l.class_id === selectedClassId &&
        l.date === selectedDate &&
        l.period_start === selectedPeriodStart
    );
  }, [lessonAttendances, selectedClassId, selectedDate, selectedPeriodStart]);

  // Load existing record into form if available
  const handleLoadRecord = (rec: LessonAttendanceRecord) => {
    setSelectedClassId(rec.class_id);
    setSelectedDate(rec.date);
    setSelectedPeriodStart(rec.period_start);
    setSelectedPeriodEnd(rec.period_end);
    setSubjectName(rec.subject);
    setTeacherName(rec.teacher_name);
    setLearningGroup(rec.learning_group || "teori_1");
    setRoomName(rec.room || "");
    setTopicMaterial(rec.topic_material);
    setLearningObjective(rec.learning_objective || "");
    setObstaclesNotes(rec.obstacles_notes || "");

    const statusMap: Record<string, AttendanceStatus> = {};
    const notesMap: Record<string, string> = {};
    rec.student_statuses.forEach((st) => {
      statusMap[st.student_id] = st.status;
      if (st.notes) notesMap[st.student_id] = st.notes;
    });
    setStudentStatusMap(statusMap);
    setStudentNotesMap(notesMap);
    setActiveTab("input");
    toast.info(`Memuat jurnal KBM ${rec.class_name} - ${rec.subject}`);
  };

  const handleSetAllStatus = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st) => {
      next[st.id] = status;
    });
    setStudentStatusMap(next);
    toast.success(`Semua siswa diatur: ${status.toUpperCase()}`);
  };

  const handleSaveJurnal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) {
      toast.error("Silakan pilih rombel / kelas terlebih dahulu.");
      return;
    }
    if (!topicMaterial.trim()) {
      toast.error("Materi pokok pembelajaran / topik wajib diisi.");
      return;
    }

    const studentStatusesPayload = classStudents.map((st) => ({
      student_id: st.id,
      student_name: st.full_name,
      status: studentStatusMap[st.id] || "hadir",
      notes: studentNotesMap[st.id] || undefined,
    }));

    if (existingRecord) {
      updateLessonAttendance(existingRecord.id, {
        period_start: selectedPeriodStart,
        period_end: selectedPeriodEnd,
        subject: subjectName,
        teacher_name: teacherName,
        room: roomName,
        learning_group: learningGroup,
        topic_material: topicMaterial,
        learning_objective: learningObjective,
        obstacles_notes: obstaclesNotes,
        student_statuses: studentStatusesPayload,
      });
      toast.success("Jurnal KBM & presensi mapel berhasil diperbarui!");
    } else {
      addLessonAttendance({
        class_id: selectedClass.id,
        class_name: selectedClass.name,
        date: selectedDate,
        period_start: selectedPeriodStart,
        period_end: selectedPeriodEnd,
        subject: subjectName,
        teacher_name: teacherName,
        room: roomName,
        learning_group: learningGroup,
        topic_material: topicMaterial,
        learning_objective: learningObjective,
        obstacles_notes: obstaclesNotes,
        student_statuses: studentStatusesPayload,
      });
      toast.success("Jurnal KBM & presensi mata pelajaran berhasil disimpan!");
    }
  };

  // Stats calculation for current sheet
  const summaryStats = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    classStudents.forEach((st) => {
      const stt = studentStatusMap[st.id] || "hadir";
      if (stt === "hadir") hadir++;
      else if (stt === "terlambat") terlambat++;
      else if (stt === "sakit") sakit++;
      else if (stt === "izin") izin++;
      else if (stt === "alpa") alpa++;
    });

    const total = classStudents.length;
    const persen = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 100;
    return { hadir, terlambat, sakit, izin, alpa, total, persen };
  }, [classStudents, studentStatusMap]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </span>
            <Badge variant="outline" className="text-primary font-medium">
              Modul KBM SMK / Guru Pengampu
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Presensi Mata Pelajaran & Jurnal Mengajar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Presensi per jam pelajaran, blok bengkel/lab, dan jurnal harian guru pengampu mata pelajaran
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "input" ? "default" : "outline"}
            onClick={() => setActiveTab("input")}
            size="sm"
            className="rounded-xl"
          >
            <CheckSquare className="w-4 h-4 mr-1.5" />
            Form Presensi & Jurnal
          </Button>
          <Button
            variant={activeTab === "riwayat" ? "default" : "outline"}
            onClick={() => setActiveTab("riwayat")}
            size="sm"
            className="rounded-xl"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Riwayat Jurnal ({lessonAttendances.length})
          </Button>
        </div>
      </div>

      {activeTab === "input" ? (
        <form onSubmit={handleSaveJurnal} className="space-y-6">
          {/* Top Session Config Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-card border rounded-2xl p-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Rombel / Kelas
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setStudentStatusMap({});
                }}
                className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.grade_level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Tanggal KBM
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Jam Ke- (Mulai s.d Selesai)
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={selectedPeriodStart}
                  onChange={(e) => setSelectedPeriodStart(Number(e.target.value))}
                  className="h-10 rounded-xl text-center"
                />
                <span className="text-muted-foreground text-xs">s/d</span>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={selectedPeriodEnd}
                  onChange={(e) => setSelectedPeriodEnd(Number(e.target.value))}
                  className="h-10 rounded-xl text-center"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Kelompok KBM SMK
              </label>
              <select
                value={learningGroup}
                onChange={(e) => setLearningGroup(e.target.value as SmkLearningGroup)}
                className="w-full h-10 px-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="teori_1">Teori (Sesi 1)</option>
                <option value="teori_2">Teori (Sesi 2)</option>
                <option value="praktik_lab">Praktik Lab / Bengkel (Blok)</option>
                <option value="umum">Umum (Reguler)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Ruang / Bengkel
              </label>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="cth: Lab RPL 2"
                className="h-10 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Guru Pengampu
              </label>
              <Input
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Nama Guru"
                className="h-10 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Jurnal Mengajar Content Form */}
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Catatan Jurnal KBM Harian
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Mata Pelajaran
                </label>
                <Input
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Mata pelajaran"
                  className="rounded-xl font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Materi Pokok / Modul Pembelajaran *
                </label>
                <Input
                  value={topicMaterial}
                  onChange={(e) => setTopicMaterial(e.target.value)}
                  placeholder="cth: Perancangan Skema Database Supabase & REST API"
                  className="rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Capaian Pembelajaran (CP) / Tujuan Pembelajaran (TP)
                </label>
                <Input
                  value={learningObjective}
                  onChange={(e) => setLearningObjective(e.target.value)}
                  placeholder="cth: Siswa memahami konsep RLS dan Foreign Key pada database relasional"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Kendala / Catatan Kejadian Khusus di Kelas/Lab
                </label>
                <Input
                  value={obstaclesNotes}
                  onChange={(e) => setObstaclesNotes(e.target.value)}
                  placeholder="cth: Semua unit PC lab bekerja baik, 1 siswa izin sakit"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Attendance Checklist Table */}
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Presensi Siswa Kelas {selectedClass?.name} ({classStudents.length} Siswa)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tingkat kehadiran: <span className="font-bold text-emerald-600">{summaryStats.persen}%</span> (Hadir: {summaryStats.hadir}, Terlambat: {summaryStats.terlambat}, Sakit: {summaryStats.sakit}, Izin: {summaryStats.izin}, Alpa: {summaryStats.alpa})
                </p>
              </div>

              {/* Quick Batch Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground mr-1">Atur Semua:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetAllStatus("hadir")}
                  className="h-8 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200"
                >
                  Hadir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetAllStatus("sakit")}
                  className="h-8 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border-amber-200"
                >
                  Sakit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetAllStatus("izin")}
                  className="h-8 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 border-blue-200"
                >
                  Izin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetAllStatus("alpa")}
                  className="h-8 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border-rose-200"
                >
                  Alpa
                </Button>
              </div>
            </div>

            {classStudents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
                <p className="font-medium">Belum ada data siswa di kelas ini.</p>
                <p className="text-xs">Silakan tambahkan siswa di menu Data Siswa.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                      <th className="py-2.5 px-3 text-left w-12">No</th>
                      <th className="py-2.5 px-3 text-left">NIS</th>
                      <th className="py-2.5 px-3 text-left">Nama Lengkap Siswa</th>
                      <th className="py-2.5 px-3 text-center">Status Kehadiran</th>
                      <th className="py-2.5 px-3 text-left">Catatan Khusus Siswa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {classStudents.map((st, idx) => {
                      const currentStatus = studentStatusMap[st.id] || "hadir";
                      return (
                        <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono text-xs">{st.nis}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {st.full_name}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({st.gender === "L" ? "L" : "P"})
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              {(["hadir", "terlambat", "sakit", "izin", "alpa"] as AttendanceStatus[]).map(
                                (stt) => {
                                  const isSelected = currentStatus === stt;
                                  return (
                                    <button
                                      key={stt}
                                      type="button"
                                      onClick={() => {
                                        setStudentStatusMap((prev) => ({
                                          ...prev,
                                          [st.id]: stt,
                                        }));
                                      }}
                                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                                        isSelected
                                          ? stt === "hadir"
                                            ? "bg-emerald-600 text-white shadow-sm"
                                            : stt === "terlambat"
                                            ? "bg-amber-600 text-white shadow-sm"
                                            : stt === "sakit"
                                            ? "bg-yellow-500 text-white shadow-sm"
                                            : stt === "izin"
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "bg-rose-600 text-white shadow-sm"
                                          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                                      }`}
                                    >
                                      {stt}
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Input
                              value={studentNotesMap[st.id] || ""}
                              onChange={(e) =>
                                setStudentNotesMap((prev) => ({
                                  ...prev,
                                  [st.id]: e.target.value,
                                }))
                              }
                              placeholder="cth: Masuk lab terlambat 15 mnt"
                              className="h-8 text-xs rounded-lg"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                Pastikan data absensi dan catatan materi KBM sudah lengkap sebelum menyimpan.
              </div>
              <Button type="submit" size="lg" className="rounded-xl px-6 gap-2">
                <Save className="w-4 h-4" />
                Simpan Jurnal & Presensi Mapel
              </Button>
            </div>
          </div>
        </form>
      ) : (
        /* History & Journal List Tab */
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-card border rounded-2xl p-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Cari berdasarkan kelas, guru, mapel atau materi..."
              className="border-0 shadow-none focus-visible:ring-0 text-sm"
            />
          </div>

          {lessonAttendances.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-semibold text-lg">Belum Ada Riwayat Jurnal Mengajar</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                Guru dapat mengisi presensi mata pelajaran dan jurnal KBM melalui formulir presensi.
              </p>
              <Button onClick={() => setActiveTab("input")} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Buat Jurnal KBM Sekarang
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessonAttendances
                .filter((rec) => {
                  if (!searchHistory.trim()) return true;
                  const q = searchHistory.toLowerCase();
                  return (
                    rec.class_name.toLowerCase().includes(q) ||
                    rec.subject.toLowerCase().includes(q) ||
                    rec.teacher_name.toLowerCase().includes(q) ||
                    rec.topic_material.toLowerCase().includes(q)
                  );
                })
                .map((rec) => {
                  const hadirCount = rec.student_statuses.filter((s) => s.status === "hadir").length;
                  const total = rec.student_statuses.length;
                  const persen = total > 0 ? Math.round((hadirCount / total) * 100) : 100;

                  return (
                    <Card key={rec.id} className="p-5 rounded-2xl border hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-primary text-primary-foreground font-semibold">
                              {rec.class_name}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-normal">
                              Jam Ke-{rec.period_start} s/d {rec.period_end}
                            </Badge>
                            {rec.room && (
                              <Badge variant="secondary" className="text-xs">
                                {rec.room}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-bold text-foreground text-base">{rec.subject}</h4>
                          <p className="text-xs text-muted-foreground">
                            Oleh: <span className="font-medium text-foreground">{rec.teacher_name}</span> | {rec.date}
                          </p>
                        </div>
                        <span className="text-right">
                          <span className="text-xl font-bold text-emerald-600 block leading-tight">
                            {persen}%
                          </span>
                          <span className="text-[10px] text-muted-foreground">Kehadiran</span>
                        </span>
                      </div>

                      <div className="bg-muted/40 rounded-xl p-3 text-xs space-y-1.5 mb-4">
                        <p>
                          <span className="font-semibold text-foreground">Materi:</span>{" "}
                          {rec.topic_material}
                        </p>
                        {rec.learning_objective && (
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-foreground">Capaian (CP):</span>{" "}
                            {rec.learning_objective}
                          </p>
                        )}
                        {rec.obstacles_notes && (
                          <p className="text-amber-700 dark:text-amber-400">
                            <span className="font-semibold">Catatan/Kendala:</span>{" "}
                            {rec.obstacles_notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t text-xs">
                        <span className="text-muted-foreground">
                          {rec.student_statuses.length} Siswa Terdaftar
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadRecord(rec)}
                            className="h-8 rounded-lg text-xs"
                          >
                            Edit / Buka Form
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Hapus catatan jurnal KBM ini?")) {
                                deleteLessonAttendance(rec.id);
                                toast.success("Jurnal KBM dihapus.");
                              }
                            }}
                            className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
