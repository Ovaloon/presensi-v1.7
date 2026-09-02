import React, { useState, useMemo } from "react";
import {
  CalendarPlus,
  Layers,
  Sparkles,
  Clock,
  User,
  MapPin,
  BookOpen,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Copy,
  Wand2,
  Save,
  RotateCcw,
  Wrench,
  Cpu,
  Monitor,
  Building,
  GraduationCap,
  Filter,
  CheckSquare,
  Square,
  Zap,
  Download,
  Eye,
  Sliders,
  Check,
  RefreshCw,
  FolderTree,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSchoolStore } from "@/lib/store";
import { WeeklyScheduleItem, SmkLearningGroup } from "@/types";
import { toast } from "sonner";
import { soundManager } from "@/lib/sound";
import { PageHeader } from "@/components/layout/PageHeader";

interface BuatJadwalViewProps {
  onNavigate: (view: string, param?: string) => void;
}

const DAYS_ORDER: WeeklyScheduleItem["day"][] = [
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
];

const DAY_LABELS: Record<WeeklyScheduleItem["day"], string> = {
  senin: "Senin",
  selasa: "Selasa",
  rabu: "Rabu",
  kamis: "Kamis",
  jumat: "Jumat",
  sabtu: "Sabtu",
};

const STANDARD_PERIODS = [
  { period: 1, start: "07:15", end: "08:00" },
  { period: 2, start: "08:00", end: "08:45" },
  { period: 3, start: "08:45", end: "09:30" },
  { period: 4, start: "09:45", end: "10:30" },
  { period: 5, start: "10:30", end: "11:15" },
  { period: 6, start: "11:15", end: "12:00" },
  { period: 7, start: "12:45", end: "13:30" },
  { period: 8, start: "13:30", end: "14:15" },
];

// Standard SMK Subject Templates by Learning Groups
const DEFAULT_SMK_TEORI_1_SUBJECTS = [
  { subject: "Matematika", teacher: "Drs. Bambang Sudarsono, M.Pd", periods: 2 },
  { subject: "Bahasa Indonesia", teacher: "Dra. Sri Wahyuni, M.Hum", periods: 2 },
  { subject: "Bahasa Inggris Komunikasi", teacher: "Sarah Jenkins, B.Ed", periods: 2 },
  { subject: "Pendidikan Agama & Budi Pekerti", teacher: "Ahmad Fauzi, S.Pd.I", periods: 2 },
];

const DEFAULT_SMK_TEORI_2_SUBJECTS = [
  { subject: "Dasar-Dasar Program Keahlian (Teori)", teacher: "Siti Rahmawati, S.Kom", periods: 2 },
  { subject: "Projek IPAS (Ilmu Pengetahuan Alam & Sosial)", teacher: "Dewi Lestari, M.Si", periods: 2 },
  { subject: "Pendidikan Pancasila (PPKn)", teacher: "Dra. Sri Wahyuni, M.Hum", periods: 2 },
  { subject: "Sejarah Indonesia & Kebangsaan", teacher: "Hendra Wijaya, S.Pd", periods: 2 },
];

const DEFAULT_SMK_PRAKTIK_MAP: Record<string, { subject: string; room: string; teacher: string }> = {
  RPL: { subject: "Praktik Pemrograman & Lab RPL", room: "Lab Komputer & Software", teacher: "Siti Rahmawati, S.Kom" },
  TKJ: { subject: "Praktik Perakitan Jaringan & Server", room: "Lab Jaringan & CISCO", teacher: "Ahmad Fauzi, S.T" },
  DKV: { subject: "Praktik Desain Grafis & Multimedia", room: "Studio Kreatif DKV", teacher: "Rian Hidayat, M.Kom" },
  TKR: { subject: "Praktik Kelistrikan & Mesin Otomotif", room: "Bengkel Otomotif Utama", teacher: "Ir. Handoko, S.T" },
  TPM: { subject: "Praktik Bubut, CNC & Fabrikasi", room: "Bengkel Pemesinan Presisi", teacher: "Sutrisno, S.T" },
  AKL: { subject: "Praktik Komputer Akuntansi & Spreadsheet", room: "Lab Akuntansi & Bisnis", teacher: "Nurul Hidayah, S.E" },
  DEFAULT: { subject: "Praktik Kejuruan & Workshop Industri", room: "Bengkel / Lab Utama", teacher: "Guru Produktif Kejuruan" },
};

export function BuatJadwalView({ onNavigate }: BuatJadwalViewProps) {
  const {
    activeSchool,
    classes,
    weeklySchedules,
    addWeeklyScheduleItem,
    deleteWeeklyScheduleItem,
    batchSaveWeeklySchedule,
    batchSaveMultiClassSchedules,
    clearWeeklySchedulesForClasses,
    populate72SmkClasses,
    gtkProfiles,
    activeAcademicYear,
    terms,
  } = useSchoolStore();

  const [activeTab, setActiveTab] = useState<"bulk_smk" | "matrix" | "single" | "conflicts">("bulk_smk");

  // Bulk SMK Generator State
  const [selectedScope, setSelectedScope] = useState<"all" | "grade_10" | "grade_11" | "grade_12" | "major">("all");
  const [selectedMajorFilter, setSelectedMajorFilter] = useState<string>("RPL");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [rotationPattern, setRotationPattern] = useState<"rolling_3_shift" | "block_daily" | "standard_parallel">("rolling_3_shift");
  const [isGenerating, setIsGenerating] = useState(false);

  // Single Class Editor State
  const [singleClassId, setSingleClassId] = useState<string>(classes[0]?.id || "");
  const [singleDay, setSingleDay] = useState<WeeklyScheduleItem["day"]>("senin");
  const [period, setPeriod] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>("07:15");
  const [endTime, setEndTime] = useState<string>("08:00");
  const [subject, setSubject] = useState<string>("");
  const [learningGroup, setLearningGroup] = useState<SmkLearningGroup>("teori_1");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(gtkProfiles[0]?.id || "");
  const [customTeacherName, setCustomTeacherName] = useState<string>("");
  const [room, setRoom] = useState<string>("Ruang Teori");
  const [copySourceClassId, setCopySourceClassId] = useState<string>("");

  // Matrix Filter State
  const [matrixDayFilter, setMatrixDayFilter] = useState<WeeklyScheduleItem["day"] | "all">("senin");
  const [matrixGradeFilter, setMatrixGradeFilter] = useState<string>("all");
  const [matrixMajorFilter, setMatrixMajorFilter] = useState<string>("all");
  const [matrixGroupFilter, setMatrixGroupFilter] = useState<string>("all");

  // Helper: Extract Major from class name (e.g., "X RPL 1" -> "RPL")
  const getMajorFromClassName = (name: string): string => {
    const parts = name.toUpperCase().split(" ");
    if (parts.length >= 2) return parts[1];
    return "UMUM";
  };

  // Helper: Get unique majors from existing classes
  const availableMajors = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      const major = getMajorFromClassName(c.name);
      if (major) set.add(major);
    });
    return Array.from(set);
  }, [classes]);

  // Determine target classes based on selected scope
  const targetClassesForGeneration = useMemo(() => {
    if (selectedScope === "all") {
      return classes;
    }
    if (selectedScope === "grade_10") {
      return classes.filter((c) => c.grade_level === "10" || c.grade_level.toUpperCase() === "X");
    }
    if (selectedScope === "grade_11") {
      return classes.filter((c) => c.grade_level === "11" || c.grade_level.toUpperCase() === "XI");
    }
    if (selectedScope === "grade_12") {
      return classes.filter((c) => c.grade_level === "12" || c.grade_level.toUpperCase() === "XII");
    }
    if (selectedScope === "major") {
      return classes.filter((c) => getMajorFromClassName(c.name) === selectedMajorFilter);
    }
    return classes;
  }, [classes, selectedScope, selectedMajorFilter]);

  // Detect Conflicts Across All Schedules
  const scheduleConflicts = useMemo(() => {
    const conflicts: {
      type: "teacher" | "room";
      key: string;
      day: WeeklyScheduleItem["day"];
      period: number;
      items: WeeklyScheduleItem[];
      description: string;
    }[] = [];

    // Group by Day + Period + Teacher
    const teacherMap = new Map<string, WeeklyScheduleItem[]>();
    // Group by Day + Period + Room
    const roomMap = new Map<string, WeeklyScheduleItem[]>();

    weeklySchedules.forEach((ws) => {
      if (ws.teacher_name && ws.teacher_name !== "Guru Pengampu") {
        const key = `${ws.day}_${ws.period}_${ws.teacher_name.toLowerCase().trim()}`;
        if (!teacherMap.has(key)) teacherMap.set(key, []);
        teacherMap.get(key)!.push(ws);
      }

      if (ws.room && !ws.room.toLowerCase().includes("teori")) {
        const key = `${ws.day}_${ws.period}_${ws.room.toLowerCase().trim()}`;
        if (!roomMap.has(key)) roomMap.set(key, []);
        roomMap.get(key)!.push(ws);
      }
    });

    teacherMap.forEach((items, key) => {
      if (items.length > 1) {
        const first = items[0];
        const classNames = items
          .map((it) => classes.find((c) => c.id === it.class_id)?.name || it.class_id)
          .join(", ");
        conflicts.push({
          type: "teacher",
          key,
          day: first.day,
          period: first.period,
          items,
          description: `Guru "${first.teacher_name}" mengajar di ${items.length} kelas sekaligus (${classNames}) pada hari ${DAY_LABELS[first.day]} Jam ke-${first.period}.`,
        });
      }
    });

    roomMap.forEach((items, key) => {
      if (items.length > 1) {
        const first = items[0];
        const classNames = items
          .map((it) => classes.find((c) => c.id === it.class_id)?.name || it.class_id)
          .join(", ");
        conflicts.push({
          type: "room",
          key,
          day: first.day,
          period: first.period,
          items,
          description: `Bengkel/Ruang "${first.room}" dipakai ${items.length} rombel bersamaan (${classNames}) pada hari ${DAY_LABELS[first.day]} Jam ke-${first.period}.`,
        });
      }
    });

    return conflicts;
  }, [weeklySchedules, classes]);

  // Handler: Populate 72 SMK Classes if needed
  const handlePopulate72Classes = () => {
    if (
      window.confirm(
        "Generate otomatis struktur 72 Rombel SMK (Tingkat X, XI, XII masing-masing 4 rombel untuk RPL, TKJ, DKV, TKR, TPM, AKL)?"
      )
    ) {
      const added = populate72SmkClasses();
      soundManager.playSuccess();
      toast.success(`Berhasil menambahkan ${added} kelas SMK standar! Total kelas sekarang: ${classes.length + added}`);
    }
  };

  // Handler: Execute Bulk SMK Schedule Generation for All / Filtered Classes
  const handleGenerateBulkSmkSchedules = () => {
    if (targetClassesForGeneration.length === 0) {
      toast.error("Tidak ada kelas target yang terpilih.");
      return;
    }

    const confirmMsg = `Buat jadwal serentak untuk ${targetClassesForGeneration.length} rombel sekaligus dengan pembagian:
• Kelompok Teori 1 (Dasar & Umum)
• Kelompok Teori 2 (Kejuruan Peminatan)
• Kelompok Praktik (Sistem Blok Lab/Bengkel)
Rotasi: ${
      rotationPattern === "rolling_3_shift"
        ? "Rolling 3 Shift (Anti-Bentrok Lab)"
        : rotationPattern === "block_daily"
        ? "Blok Harian Praktik Penuh"
        : "Paralel Terjadwal"
    }

Lanjutkan proses pembuatan jadwal massal?`;

    if (!window.confirm(confirmMsg)) return;

    setIsGenerating(true);

    try {
      const targetClassIds = targetClassesForGeneration.map((c) => c.id);
      const allNewScheduleItems: Omit<WeeklyScheduleItem, "id" | "school_id">[] = [];

      targetClassesForGeneration.forEach((targetClass, classIndex) => {
        const major = getMajorFromClassName(targetClass.name);
        const practicalConfig = DEFAULT_SMK_PRAKTIK_MAP[major] || DEFAULT_SMK_PRAKTIK_MAP.DEFAULT;
        const shiftIndex = classIndex % 3; // 0, 1, 2 for rolling shifts

        DAYS_ORDER.forEach((day, dayIndex) => {
          let dayLearningGroup: SmkLearningGroup = "teori_1";

          if (rotationPattern === "rolling_3_shift") {
            // Shift 0: Senin-Selasa (Praktik), Rabu-Kamis (Teori 1), Jumat-Sabtu (Teori 2)
            // Shift 1: Senin-Selasa (Teori 1), Rabu-Kamis (Praktik), Jumat-Sabtu (Teori 2)
            // Shift 2: Senin-Selasa (Teori 2), Rabu-Kamis (Teori 1), Jumat-Sabtu (Praktik)
            const dayPair = Math.floor(dayIndex / 2); // 0 (Senin-Selasa), 1 (Rabu-Kamis), 2 (Jumat-Sabtu)
            const effectiveGroupIndex = (dayPair + shiftIndex) % 3;
            if (effectiveGroupIndex === 0) dayLearningGroup = "praktik_lab";
            else if (effectiveGroupIndex === 1) dayLearningGroup = "teori_1";
            else dayLearningGroup = "teori_2";
          } else if (rotationPattern === "block_daily") {
            if (dayIndex === 0 || dayIndex === 1) dayLearningGroup = "praktik_lab";
            else if (dayIndex === 2 || dayIndex === 3) dayLearningGroup = "teori_1";
            else dayLearningGroup = "teori_2";
          } else {
            // Standard parallel: Pagi Teori, Siang Praktik
            dayLearningGroup = "teori_1";
          }

          if (dayLearningGroup === "praktik_lab") {
            // 8 Jam Blok Praktik di Bengkel / Lab
            STANDARD_PERIODS.forEach((sp) => {
              allNewScheduleItems.push({
                class_id: targetClass.id,
                day,
                period: sp.period,
                start_time: sp.start,
                end_time: sp.end,
                subject: `${practicalConfig.subject} (Blok Jam ke-${sp.period})`,
                teacher_name: practicalConfig.teacher,
                room: `${practicalConfig.room} ${(classIndex % 4) + 1}`,
                learning_group: "praktik_lab",
                block_duration: 8,
                is_block_practical: true,
              });
            });
          } else if (dayLearningGroup === "teori_1") {
            // Teori 1: 4 Mapel @ 2 Jam
            let currentSubjectIndex = 0;
            STANDARD_PERIODS.forEach((sp, pIndex) => {
              currentSubjectIndex = Math.floor(pIndex / 2) % DEFAULT_SMK_TEORI_1_SUBJECTS.length;
              const subConfig = DEFAULT_SMK_TEORI_1_SUBJECTS[currentSubjectIndex];
              allNewScheduleItems.push({
                class_id: targetClass.id,
                day,
                period: sp.period,
                start_time: sp.start,
                end_time: sp.end,
                subject: `${subConfig.subject} (Teori 1)`,
                teacher_name: subConfig.teacher,
                room: `Ruang Teori ${targetClass.name}`,
                learning_group: "teori_1",
                block_duration: 2,
                is_block_practical: false,
              });
            });
          } else {
            // Teori 2: Kejuruan Produktif Teori & Peminatan
            let currentSubjectIndex = 0;
            STANDARD_PERIODS.forEach((sp, pIndex) => {
              currentSubjectIndex = Math.floor(pIndex / 2) % DEFAULT_SMK_TEORI_2_SUBJECTS.length;
              const subConfig = DEFAULT_SMK_TEORI_2_SUBJECTS[currentSubjectIndex];
              allNewScheduleItems.push({
                class_id: targetClass.id,
                day,
                period: sp.period,
                start_time: sp.start,
                end_time: sp.end,
                subject: `${subConfig.subject} (Teori 2)`,
                teacher_name: subConfig.teacher,
                room: `Ruang Teori ${targetClass.name}`,
                learning_group: "teori_2",
                block_duration: 2,
                is_block_practical: false,
              });
            });
          }
        });
      });

      // Save to store in a single transaction
      batchSaveMultiClassSchedules(targetClassIds, allNewScheduleItems);
      soundManager.playSuccess();
      toast.success(
        `Jadwal massal berhasil dibuat untuk ${targetClassesForGeneration.length} kelas (${allNewScheduleItems.length} slot jadwal terisi otomatis)!`
      );
      setActiveTab("matrix");
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kendala saat menyusun jadwal massal.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Clear schedules for target classes
  const handleClearTargetSchedules = () => {
    if (
      window.confirm(
        `Kosongkan seluruh jadwal untuk ${targetClassesForGeneration.length} rombel target? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      const targetIds = targetClassesForGeneration.map((c) => c.id);
      clearWeeklySchedulesForClasses(targetIds);
      soundManager.playBeep();
      toast.success(`Jadwal untuk ${targetClassesForGeneration.length} kelas telah dikosongkan.`);
    }
  };

  // Single Class Add Slot
  const currentSingleClass = classes.find((c) => c.id === singleClassId) || classes[0];
  const singleClassDaySchedules = weeklySchedules
    .filter((ws) => ws.class_id === singleClassId && ws.day === singleDay)
    .sort((a, b) => a.period - b.period);

  const selectedTeacher = gtkProfiles.find((g) => g.id === selectedTeacherId);
  const teacherNameToUse = selectedTeacher
    ? selectedTeacher.full_name
    : customTeacherName || "Guru Pengampu";

  const handlePeriodChange = (pNum: number) => {
    setPeriod(pNum);
    const standard = STANDARD_PERIODS.find((sp) => sp.period === pNum);
    if (standard) {
      setStartTime(standard.start);
      setEndTime(standard.end);
    }
  };

  const handleAddSingleSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) {
      toast.error("Nama mata pelajaran wajib diisi");
      return;
    }

    addWeeklyScheduleItem({
      class_id: singleClassId,
      day: singleDay,
      period,
      start_time: startTime,
      end_time: endTime,
      subject,
      teacher_name: teacherNameToUse,
      teacher_nip: selectedTeacher?.nip_or_nik,
      room,
      learning_group: learningGroup,
    });

    soundManager.playSuccess();
    toast.success(`Jam ke-${period} (${subject}) berhasil disimpan`);
    setSubject("");
    if (period < 8) handlePeriodChange(period + 1);
  };

  // Matrix Filtered Classes
  const filteredMatrixClasses = useMemo(() => {
    return classes.filter((c) => {
      if (matrixGradeFilter !== "all" && c.grade_level !== matrixGradeFilter) return false;
      if (matrixMajorFilter !== "all" && getMajorFromClassName(c.name) !== matrixMajorFilter) return false;
      return true;
    });
  }, [classes, matrixGradeFilter, matrixMajorFilter]);

  // Helper Badge Color for Learning Group
  const getGroupBadge = (group?: SmkLearningGroup) => {
    switch (group) {
      case "praktik_lab":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-bold">
            Praktik Lab / Bengkel
          </Badge>
        );
      case "teori_1":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[9px] font-bold">
            Kelompok Teori 1
          </Badge>
        );
      case "teori_2":
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 text-[9px] font-bold">
            Kelompok Teori 2
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[9px]">
            Umum
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        icon={CalendarPlus}
        title="Pembuat Jadwal SMK & Multi-Rombel"
        subtitle="Sistem penyusun jadwal cerdas untuk sekolah skala besar (hingga 72 kelas) dengan pembagian Kelompok Teori 1, Teori 2, dan Praktik Bengkel/Lab."
        badge={`Total ${classes.length} Rombel`}
        kpiCards={[
          {
            label: "Total Rombel / Kelas",
            value: `${classes.length} Kelas`,
            helper: `${availableMajors.length} Konsentrasi Keahlian`,
            icon: Building,
            color: "primary",
          },
          {
            label: "Slot Jadwal Aktif",
            value: weeklySchedules.length,
            helper: "Sesi terisi di semua kelas",
            icon: Clock,
            color: "emerald",
          },
          {
            label: "Status Bentrok",
            value: scheduleConflicts.length === 0 ? "Aman" : `${scheduleConflicts.length} Bentrok`,
            helper: scheduleConflicts.length === 0 ? "Tidak ada konflik guru/lab" : "Perlu penyesuaian",
            icon: AlertTriangle,
            color: scheduleConflicts.length === 0 ? "emerald" : "amber",
          },
          {
            label: "Guru Terdaftar",
            value: gtkProfiles.length,
            helper: "Dapat ditugaskan",
            icon: User,
            color: "blue",
          },
        ]}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {classes.length < 20 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
              onClick={handlePopulate72Classes}
            >
              <Cpu className="size-3.5" />
              ⚡ Buat 72 Rombel SMK Standar
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 font-bold h-9"
            onClick={() => onNavigate("jadwal_mingguan")}
          >
            <Layers className="size-3.5" />
            Lihat Jadwal Mingguan
            <ArrowRight className="size-3" />
          </Button>
        </div>
      </PageHeader>

      {/* Navigation Mode Tabs */}
      <div className="flex bg-card p-1.5 rounded-2xl border shadow-xs gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("bulk_smk")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "bulk_smk"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Zap className="size-4 text-amber-300" />
          <span>Generator Massal SMK (1x Buat 72 Kelas)</span>
        </button>

        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "matrix"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <FileSpreadsheet className="size-4" />
          <span>Matriks Jadwal Master ({classes.length} Kelas)</span>
        </button>

        <button
          onClick={() => setActiveTab("single")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "single"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Sliders className="size-4" />
          <span>Penyesuaian Khusus Per-Kelas</span>
        </button>

        <button
          onClick={() => setActiveTab("conflicts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "conflicts"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <AlertTriangle className={`size-4 ${scheduleConflicts.length > 0 ? "text-amber-500" : ""}`} />
          <span>Deteksi Bentrok ({scheduleConflicts.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BULK SMK MASTER GENERATOR (Satu Kali Buat untuk Semua 72 Kelas) */}
      {/* ========================================================================= */}
      {activeTab === "bulk_smk" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Step 1: Target Scope & Classes */}
            <div className="lg:col-span-4 rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b pb-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
                  1
                </span>
                <h3 className="text-sm font-bold text-foreground">Target Cakupan Kelas</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1.5 text-foreground">
                    Pilih Rombel Sasaran:
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedScope("all")}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedScope === "all"
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <div>
                        <div className="font-bold">⚡ Semua Kelas Sekolah</div>
                        <div className="text-[11px] text-muted-foreground font-normal">
                          Seluruh {classes.length} rombel aktif (Tingkat X, XI, XII)
                        </div>
                      </div>
                      {selectedScope === "all" && <Check className="size-4" />}
                    </button>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedScope("grade_10")}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          selectedScope === "grade_10"
                            ? "bg-primary/10 border-primary text-primary font-bold"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        Tingkat X ({classes.filter((c) => c.grade_level === "10" || c.grade_level === "X").length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedScope("grade_11")}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          selectedScope === "grade_11"
                            ? "bg-primary/10 border-primary text-primary font-bold"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        Tingkat XI ({classes.filter((c) => c.grade_level === "11" || c.grade_level === "XI").length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedScope("grade_12")}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          selectedScope === "grade_12"
                            ? "bg-primary/10 border-primary text-primary font-bold"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        Tingkat XII ({classes.filter((c) => c.grade_level === "12" || c.grade_level === "XII").length})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedScope("major")}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedScope === "major"
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <div>
                        <div className="font-bold">🎯 Per Jurusan / Keahlian</div>
                        <div className="text-[11px] text-muted-foreground font-normal">
                          Spesifik rombel serumpun (RPL, TKJ, TKR, DKV, dll.)
                        </div>
                      </div>
                      {selectedScope === "major" && <Check className="size-4" />}
                    </button>
                  </div>
                </div>

                {selectedScope === "major" && (
                  <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
                    <label className="font-semibold block text-foreground">Pilih Jurusan:</label>
                    <select
                      value={selectedMajorFilter}
                      onChange={(e) => setSelectedMajorFilter(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border bg-background text-foreground font-bold"
                    >
                      {availableMajors.map((m) => (
                        <option key={m} value={m}>
                          Jurusan {m} ({classes.filter((c) => getMajorFromClassName(c.name) === m).length} Rombel)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-foreground space-y-1">
                  <div className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    {targetClassesForGeneration.length} Rombel Terpilih
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Jadwal akan disusun sekaligus untuk seluruh rombel ini tanpa perlu membuat satu per satu.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: SMK Learning Groups Configuration */}
            <div className="lg:col-span-4 rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b pb-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
                  2
                </span>
                <h3 className="text-sm font-bold text-foreground">Struktur Kelompok SMK</h3>
              </div>

              <div className="space-y-3 text-xs">
                {/* Kelompok Teori 1 */}
                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <BookOpen className="size-3.5" /> Kelompok Teori 1 (Umum)
                    </span>
                    <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-none text-[10px]">
                      4 Mapel @ 2 Jam
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Matematika, Bahasa Indonesia, Bahasa Inggris, Pendidikan Agama & PJOK.
                  </p>
                </div>

                {/* Kelompok Teori 2 */}
                <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                      <GraduationCap className="size-3.5" /> Kelompok Teori 2 (Kejuruan)
                    </span>
                    <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 border-none text-[10px]">
                      4 Mapel @ 2 Jam
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Teori Konsentrasi Kejuruan, Projek IPAS, Pendidikan Pancasila & Sejarah.
                  </p>
                </div>

                {/* Kelompok Praktik Lab/Bengkel */}
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Wrench className="size-3.5" /> Kelompok Praktik (Bengkel/Lab)
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-none text-[10px]">
                      Blok 8 Jam / Hari
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Praktik Kejuruan Workshop Otomotif, Lab RPL & Multimedia, Mesin Bubut/CNC, atau Lab Akuntansi.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Rolling Pattern & Instant Execution */}
            <div className="lg:col-span-4 rounded-2xl border bg-card p-5 space-y-4 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-foreground">Pola Rotasi & Eksekusi</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1.5 text-foreground">
                      Pola Sistem Blok / Rotasi:
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setRotationPattern("rolling_3_shift")}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                          rotationPattern === "rolling_3_shift"
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>🔄 Rolling 3 Shift (Rekomendasi SMK)</span>
                          {rotationPattern === "rolling_3_shift" && <Check className="size-4" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-normal mt-0.5">
                          Bergantian Lab/Bengkel per 2 hari. Anti-bentrok kapasitas bengkel & guru produktif.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRotationPattern("block_daily")}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                          rotationPattern === "block_daily"
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>📅 Sistem Blok Harian Terjadwal</span>
                          {rotationPattern === "block_daily" && <Check className="size-4" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-normal mt-0.5">
                          Senin-Selasa Praktik, Rabu-Kamis Teori 1, Jumat-Sabtu Teori 2.
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Button
                  size="lg"
                  onClick={handleGenerateBulkSmkSchedules}
                  disabled={isGenerating || targetClassesForGeneration.length === 0}
                  className="w-full h-12 rounded-xl font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 text-xs"
                >
                  <Zap className="size-4 mr-2 text-amber-300" />
                  {isGenerating
                    ? "Menyusun Jadwal Massal..."
                    : `⚡ Generate Jadwal untuk ${targetClassesForGeneration.length} Kelas Sekaligus`}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearTargetSchedules}
                  className="w-full rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/20 h-9"
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Kosongkan Jadwal {targetClassesForGeneration.length} Kelas Ini
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MASTER MATRIX VIEW (Tampilan Matriks Semua 72 Kelas) */}
      {/* ========================================================================= */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl border bg-card shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="size-4 text-primary" />
              <span className="font-bold text-foreground">Filter Matriks:</span>

              {/* Day Filter */}
              <select
                value={matrixDayFilter}
                onChange={(e) => setMatrixDayFilter(e.target.value as any)}
                className="p-2 rounded-xl border bg-background text-foreground font-semibold"
              >
                <option value="all">Semua Hari (Senin - Sabtu)</option>
                {DAYS_ORDER.map((d) => (
                  <option key={d} value={d}>
                    Hari {DAY_LABELS[d]}
                  </option>
                ))}
              </select>

              {/* Grade Filter */}
              <select
                value={matrixGradeFilter}
                onChange={(e) => setMatrixGradeFilter(e.target.value)}
                className="p-2 rounded-xl border bg-background text-foreground font-semibold"
              >
                <option value="all">Semua Tingkat (X, XI, XII)</option>
                <option value="10">Tingkat X</option>
                <option value="11">Tingkat XI</option>
                <option value="12">Tingkat XII</option>
              </select>

              {/* Major Filter */}
              <select
                value={matrixMajorFilter}
                onChange={(e) => setMatrixMajorFilter(e.target.value)}
                className="p-2 rounded-xl border bg-background text-foreground font-semibold"
              >
                <option value="all">Semua Jurusan</option>
                {availableMajors.map((m) => (
                  <option key={m} value={m}>
                    Jurusan {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                Menampilkan {filteredMatrixClasses.length} dari {classes.length} Rombel
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="rounded-xl text-xs font-bold gap-1.5 h-8"
              >
                <Download className="size-3.5" />
                Cetak / PDF
              </Button>
            </div>
          </div>

          {/* Master Grid Table */}
          <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[700px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/80 text-foreground uppercase tracking-wider font-bold text-[10px] sticky top-0 z-10 border-b backdrop-blur">
                  <tr>
                    <th className="p-3 border-r min-w-[140px]">Rombel / Kelas</th>
                    <th className="p-3 border-r min-w-[80px]">Hari</th>
                    {STANDARD_PERIODS.map((sp) => (
                      <th key={sp.period} className="p-2.5 border-r text-center min-w-[120px]">
                        Jam {sp.period}
                        <span className="block text-[9px] font-normal text-muted-foreground font-mono">
                          {sp.start}-{sp.end}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMatrixClasses.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-muted-foreground">
                        Tidak ada rombel yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrixClasses.map((cls) => {
                      const daysToShow = matrixDayFilter === "all" ? DAYS_ORDER : [matrixDayFilter];
                      return daysToShow.map((day, dIdx) => {
                        const daySchedules = weeklySchedules.filter(
                          (ws) => ws.class_id === cls.id && ws.day === day
                        );
                        return (
                          <tr key={`${cls.id}_${day}`} className="hover:bg-muted/30 transition-colors">
                            {dIdx === 0 && (
                              <td
                                rowSpan={daysToShow.length}
                                className="p-3 border-r font-bold bg-muted/20 align-top"
                              >
                                <div className="text-foreground font-black text-sm">{cls.name}</div>
                                <div className="text-[10px] text-muted-foreground">Tingkat {cls.grade_level}</div>
                                <div className="text-[10px] text-primary font-semibold truncate max-w-[120px]">
                                  {cls.homeroom_teacher || "Belum ada wali"}
                                </div>
                              </td>
                            )}
                            <td className="p-2.5 border-r font-bold text-muted-foreground capitalize bg-muted/10">
                              {DAY_LABELS[day]}
                            </td>
                            {STANDARD_PERIODS.map((sp) => {
                              const slot = daySchedules.find((s) => s.period === sp.period);
                              if (!slot) {
                                return (
                                  <td key={sp.period} className="p-2 border-r text-center text-muted-foreground/40">
                                    -
                                  </td>
                                );
                              }
                              const isPractical = slot.learning_group === "praktik_lab" || slot.is_block_practical;
                              const isTeori1 = slot.learning_group === "teori_1";
                              const isTeori2 = slot.learning_group === "teori_2";

                              return (
                                <td
                                  key={sp.period}
                                  className={`p-2 border-r align-top transition-colors ${
                                    isPractical
                                      ? "bg-emerald-500/10 border-emerald-500/20"
                                      : isTeori1
                                      ? "bg-blue-500/5 border-blue-500/20"
                                      : isTeori2
                                      ? "bg-purple-500/5 border-purple-500/20"
                                      : ""
                                  }`}
                                >
                                  <div className="space-y-1">
                                    {getGroupBadge(slot.learning_group)}
                                    <div className="font-bold text-foreground truncate" title={slot.subject}>
                                      {slot.subject}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate" title={slot.teacher_name}>
                                      {slot.teacher_name}
                                    </div>
                                    {slot.room && (
                                      <div className="text-[9px] text-primary/80 font-mono truncate">{slot.room}</div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SINGLE CLASS FINE-TUNING & CUSTOM SLOTS */}
      {/* ========================================================================= */}
      {activeTab === "single" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Pilih Rombel Target:
              </label>
              <select
                value={singleClassId}
                onChange={(e) => setSingleClassId(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border bg-background text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} (Tingkat {cls.grade_level}) - Wali: {cls.homeroom_teacher || "Belum diset"}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Salin Cepat dari Rombel Lain:</span>
                <Copy className="size-3.5 text-muted-foreground" />
              </label>
              <div className="flex gap-2">
                <select
                  value={copySourceClassId}
                  onChange={(e) => setCopySourceClassId(e.target.value)}
                  className="flex-1 p-2 text-xs rounded-xl border bg-background text-foreground focus:outline-none"
                >
                  <option value="">-- Pilih Kelas Sumber --</option>
                  {classes
                    .filter((c) => c.id !== singleClassId)
                    .map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Tingkat {cls.grade_level})
                      </option>
                    ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-semibold shrink-0"
                  onClick={() => {
                    if (!copySourceClassId) {
                      toast.error("Pilih kelas sumber");
                      return;
                    }
                    const sourceSchedules = weeklySchedules.filter((ws) => ws.class_id === copySourceClassId);
                    if (sourceSchedules.length === 0) {
                      toast.error("Kelas sumber tidak memiliki jadwal");
                      return;
                    }
                    if (
                      window.confirm(
                        `Salin ${sourceSchedules.length} slot jadwal ke kelas ${currentSingleClass?.name}?`
                      )
                    ) {
                      const newItems = sourceSchedules.map((s) => ({
                        class_id: singleClassId,
                        day: s.day,
                        period: s.period,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        subject: s.subject,
                        teacher_name: s.teacher_name,
                        teacher_nip: s.teacher_nip,
                        room: s.room || `Ruang ${currentSingleClass?.name}`,
                        learning_group: s.learning_group,
                        block_duration: s.block_duration,
                        is_block_practical: s.is_block_practical,
                      }));
                      batchSaveWeeklySchedule(singleClassId, newItems);
                      soundManager.playSuccess();
                      toast.success(`Jadwal berhasil disalin ke kelas ${currentSingleClass?.name}!`);
                    }
                  }}
                  disabled={!copySourceClassId}
                >
                  Salin Semua
                </Button>
              </div>
            </div>
          </div>

          {/* Day Selector */}
          <div className="flex overflow-x-auto gap-2 pb-1">
            {DAYS_ORDER.map((d) => {
              const count = weeklySchedules.filter(
                (ws) => ws.class_id === singleClassId && ws.day === d
              ).length;
              const isSelected = singleDay === d;
              return (
                <button
                  key={d}
                  onClick={() => setSingleDay(d)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card text-muted-foreground hover:text-foreground border-border"
                  }`}
                >
                  <span>{DAY_LABELS[d]}</span>
                  <span
                    className={`size-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Form & List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-5 rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-3">
                <Plus className="size-4 text-primary" />
                Tambah / Ubah Slot Pelajaran
              </h3>

              <form onSubmit={handleAddSingleSlot} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Jam Ke:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {STANDARD_PERIODS.map((sp) => (
                      <button
                        type="button"
                        key={sp.period}
                        onClick={() => handlePeriodChange(sp.period)}
                        className={`py-1.5 rounded-lg border text-center font-mono font-bold transition-all ${
                          period === sp.period
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        Ke-{sp.period}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Kelompok SMK:</label>
                  <select
                    value={learningGroup}
                    onChange={(e) => setLearningGroup(e.target.value as SmkLearningGroup)}
                    className="w-full p-2 rounded-xl border bg-background text-foreground font-semibold"
                  >
                    <option value="teori_1">Kelompok Teori 1 (Dasar / Umum)</option>
                    <option value="teori_2">Kelompok Teori 2 (Kejuruan Peminatan)</option>
                    <option value="praktik_lab">Kelompok Praktik (Bengkel / Lab)</option>
                    <option value="umum">Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Nama Mata Pelajaran:</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Contoh: Pemrograman Berorientasi Objek"
                    className="w-full p-2.5 rounded-xl border bg-background text-foreground font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Guru Pengampu:</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full p-2 rounded-xl border bg-background text-foreground font-semibold"
                  >
                    {gtkProfiles.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.full_name} ({g.subject_specialty || "Guru"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Ruangan / Lab / Bengkel:</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Contoh: Lab Komputer 2 / Bengkel Otomotif"
                    className="w-full p-2.5 rounded-xl border bg-background text-foreground"
                  />
                </div>

                <Button type="submit" className="w-full rounded-xl font-bold bg-primary text-primary-foreground h-10 mt-2">
                  <Plus className="size-4 mr-1.5" />
                  Simpan Slot Pelajaran
                </Button>
              </form>
            </div>

            {/* Current Slots List */}
            <div className="lg:col-span-7 rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-foreground">
                  Jadwal {currentSingleClass?.name} - Hari {DAY_LABELS[singleDay]}
                </h3>
                <Badge variant="outline" className="font-mono text-xs">
                  {singleClassDaySchedules.length} Slot Terjadwal
                </Badge>
              </div>

              {singleClassDaySchedules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <Clock className="size-8 mx-auto opacity-40" />
                  <p className="text-xs">Belum ada slot mata pelajaran untuk hari {DAY_LABELS[singleDay]}.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto">
                  {singleClassDaySchedules.map((slot) => (
                    <div
                      key={slot.id}
                      className="p-3.5 rounded-xl border bg-background flex items-center justify-between gap-3 shadow-2xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 text-primary font-black font-mono flex items-center justify-center text-sm shrink-0">
                          {slot.period}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-xs">{slot.subject}</span>
                            {getGroupBadge(slot.learning_group)}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>{slot.teacher_name}</span>
                            <span>•</span>
                            <span className="text-primary font-mono">{slot.start_time}-{slot.end_time}</span>
                            <span>•</span>
                            <span>{slot.room || "Ruang Kelas"}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteWeeklyScheduleItem(slot.id)}
                        className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONFLICT SCANNER & AUDITOR */}
      {/* ========================================================================= */}
      {activeTab === "conflicts" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border bg-card shadow-xs space-y-2">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Hasil Pemindaian Bentrok Guru & Bengkel
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sistem secara otomatis memverifikasi seluruh {weeklySchedules.length} slot jadwal mingguan untuk memastikan tidak ada guru yang mengajar di dua kelas sekaligus atau bengkel lab yang melebihi kapasitas.
            </p>
          </div>

          {scheduleConflicts.length === 0 ? (
            <div className="p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-center space-y-3">
              <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                Semua Jadwal Bebas Bentrok!
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Tidak ditemukan konflik jam mengajar guru maupun tumpang tindih penggunaan bengkel / lab di seluruh {classes.length} rombel sekolah.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduleConflicts.map((c, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-none font-bold text-[10px]">
                      {c.type === "teacher" ? "Bentrok Guru Mengajar" : "Bentrok Ruang Bengkel / Lab"}
                    </Badge>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      Hari {DAY_LABELS[c.day]} • Jam ke-{c.period}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground">{c.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
