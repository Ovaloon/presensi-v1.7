import React, { useState, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  User,
  MapPin,
  BookOpen,
  Plus,
  Printer,
  Share2,
  Filter,
  GraduationCap,
  Layers,
  ArrowRight,
  Sparkles,
  Edit,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSchoolStore } from "@/lib/store";
import { WeeklyScheduleItem, SmkLearningGroup } from "@/types";
import { toast } from "sonner";
import { soundManager } from "@/lib/sound";
import { PageHeader } from "@/components/layout/PageHeader";

interface JadwalMingguanViewProps {
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

export function JadwalMingguanView({ onNavigate }: JadwalMingguanViewProps) {
  const {
    activeSchool,
    classes,
    weeklySchedules,
    deleteWeeklyScheduleItem,
    activeAcademicYear,
    isAdmin,
    terms,
  } = useSchoolStore();

  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id || "cls-1"
  );
  const [selectedDay, setSelectedDay] = useState<WeeklyScheduleItem["day"] | "all">("senin");
  const [viewLayout, setViewLayout] = useState<"day" | "grid">("day");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  const currentClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  // Schedules for selected class
  const classSchedules = useMemo(() => {
    return weeklySchedules.filter((ws) => {
      if (ws.class_id !== selectedClassId) return false;
      if (groupFilter !== "all" && ws.learning_group !== groupFilter) return false;
      return true;
    });
  }, [weeklySchedules, selectedClassId, groupFilter]);

  const getSchedulesForDay = (day: WeeklyScheduleItem["day"]) => {
    return classSchedules
      .filter((ws) => ws.day === day)
      .sort((a, b) => a.period - b.period);
  };

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
        return null;
    }
  };

  const handleShareWhatsApp = () => {
    if (!currentClass) return;
    const scheduleText =
      `*JADWAL PELAJARAN ${currentClass.name.toUpperCase()}*\n_${activeSchool?.name || "Sekolah"}_ (TA: ${activeAcademicYear?.name || "2026/2027"})\n\n` +
      DAYS_ORDER.map((d) => {
        const items = getSchedulesForDay(d);
        if (items.length === 0) return "";
        return (
          `📅 *${DAY_LABELS[d].toUpperCase()}*\n` +
          items
            .map(
              (it) =>
                `• Jam ke-${it.period} (${it.start_time}-${it.end_time}): *${it.subject}* - ${it.teacher_name} (${it.room || "Kelas"})`
            )
            .join("\n") +
          "\n"
        );
      })
        .filter(Boolean)
        .join("\n");

    const encoded = encodeURIComponent(scheduleText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    toast.success("Membuka WhatsApp untuk membagikan jadwal!");
  };

  const handleDeleteItem = (id: string, subject: string) => {
    if (window.confirm(`Hapus mata pelajaran "${subject}" dari jadwal?`)) {
      deleteWeeklyScheduleItem(id);
      soundManager.playBeep();
      toast.success(`Jadwal "${subject}" telah dihapus.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <PageHeader
        icon={CalendarDays}
        title="Jadwal Pelajaran Mingguan"
        subtitle={`Lihat susunan jam pelajaran, kelompok pembelajaran SMK (Teori 1, Teori 2, Praktik), dan pengampu per rombel.`}
        badge={currentClass ? `Rombel: ${currentClass.name}` : "Jadwal"}
        kpiCards={[
          {
            label: "Total Sesi Terjadwal",
            value: classSchedules.length,
            helper: `Di kelas ${currentClass?.name || "-"}`,
            icon: BookOpen,
            color: "primary",
          },
          {
            label: "Kelas Terpilih",
            value: currentClass?.name || "-",
            helper: `Tingkat ${currentClass?.grade_level || "10"}`,
            icon: Layers,
            color: "blue",
          },
          {
            label: "Sesi Praktik Lab",
            value: classSchedules.filter((s) => s.learning_group === "praktik_lab" || s.is_block_practical).length,
            helper: "Jam bengkel/workshop",
            icon: Wrench,
            color: "emerald",
          },
          {
            label: "Tahun Ajaran",
            value: activeAcademicYear?.name || "2026/2027",
            helper: `Semester ${activeAcademicYear?.semester || "Ganjil"}`,
            icon: Sparkles,
            color: "amber",
          },
        ]}
      >
        {isAdmin && (
          <Button
            onClick={() => onNavigate("buat_jadwal")}
            className="rounded-xl shadow-xs gap-2 font-bold text-xs h-9 px-3.5 bg-primary text-primary-foreground"
          >
            <Zap className="size-4 text-amber-300" />
            Generator Massal (72 Kelas)
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs gap-1.5 h-9 font-semibold"
          onClick={handleShareWhatsApp}
        >
          <Share2 className="size-3.5 text-emerald-500" />
          Bagikan WA
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs gap-1.5 h-9 font-semibold"
          onClick={() => window.print()}
        >
          <Printer className="size-3.5" />
          Cetak
        </Button>
      </PageHeader>

      {/* Class Selector Bar, Filter Kelompok & Layout Switcher */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-card border shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <GraduationCap className="size-5 text-primary shrink-0" />
          <div className="w-full sm:w-64">
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
              Pilih {terms.class_label}:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (Tingkat {cls.grade_level}) - Wali: {cls.homeroom_teacher || "Belum diset"}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-56">
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
              Filter Kelompok SMK:
            </label>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border bg-background text-foreground font-semibold"
            >
              <option value="all">Semua Kelompok Belajar</option>
              <option value="teori_1">🔵 Kelompok Teori 1 (Dasar/Umum)</option>
              <option value="teori_2">🟣 Kelompok Teori 2 (Kejuruan)</option>
              <option value="praktik_lab">🟢 Kelompok Praktik (Lab/Bengkel)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <div className="flex rounded-xl bg-muted/60 p-1 border">
            <button
              onClick={() => setViewLayout("day")}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                viewLayout === "day"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Per Hari
            </button>
            <button
              onClick={() => setViewLayout("grid")}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                viewLayout === "grid"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Matriks Sepekan
            </button>
          </div>
        </div>
      </div>

      {/* Day Tabs (When in Day View) */}
      {viewLayout === "day" && (
        <div className="flex overflow-x-auto gap-2 pb-1">
          {DAYS_ORDER.map((d) => {
            const count = getSchedulesForDay(d).length;
            const isSelected = selectedDay === d;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground hover:text-foreground border-border hover:border-primary/40"
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
      )}

      {/* Main Content: Per-Day Cards View */}
      {viewLayout === "day" && selectedDay !== "all" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold font-display text-foreground flex items-center gap-2">
              Jadwal Hari {DAY_LABELS[selectedDay]} — {currentClass?.name}
            </h3>
            <span className="text-xs text-muted-foreground font-mono font-medium">
              {getSchedulesForDay(selectedDay).length} Sesi Pembelajaran
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {getSchedulesForDay(selectedDay).map((item) => {
              const isPractical = item.learning_group === "praktik_lab" || item.is_block_practical;
              const isTeori1 = item.learning_group === "teori_1";
              const isTeori2 = item.learning_group === "teori_2";

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 space-y-3 hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between ${
                    isPractical
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : isTeori1
                      ? "bg-blue-500/5 border-blue-500/30"
                      : isTeori2
                      ? "bg-purple-500/5 border-purple-500/30"
                      : "bg-card"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        Jam ke-{item.period}
                      </span>
                      <span className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3 text-primary" />
                        {item.start_time} - {item.end_time}
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      {getGroupBadge(item.learning_group)}
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {item.subject}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-foreground font-medium truncate">
                        <User className="size-3.5 text-primary shrink-0" />
                        <span className="truncate">{item.teacher_name}</span>
                      </span>
                    </div>
                    {item.room && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="size-3 text-muted-foreground" /> {item.room}
                        </span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="pt-2 border-t flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteItem(item.id, item.subject)}
                      >
                        <Trash2 className="size-3 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {getSchedulesForDay(selectedDay).length === 0 && (
            <div className="text-center py-12 border rounded-2xl bg-card/40">
              <CalendarDays className="size-10 mx-auto text-muted-foreground/50 mb-2" />
              <h3 className="text-base font-bold text-foreground">
                Tidak Ada Jadwal di Hari {DAY_LABELS[selectedDay]}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Belum ada mata pelajaran yang diatur untuk kelas {currentClass?.name} di hari ini.
              </p>
              {isAdmin && (
                <Button
                  onClick={() => onNavigate("buat_jadwal")}
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs rounded-xl font-bold bg-primary/10 text-primary border-primary/30"
                >
                  <Zap className="size-3.5 mr-1.5" />
                  Generate Jadwal SMK Massal
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Content: Full Weekly Matrix Grid View */}
      {viewLayout === "grid" && (
        <div className="rounded-2xl border bg-card overflow-x-auto shadow-xs">
          <div className="min-w-[850px] p-4">
            <div className="grid grid-cols-6 gap-2 mb-3 text-center">
              {DAYS_ORDER.map((d) => (
                <div
                  key={d}
                  className="p-2.5 rounded-xl bg-muted/60 font-display font-bold text-xs uppercase tracking-wider text-foreground border"
                >
                  {DAY_LABELS[d]}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-6 gap-2">
              {DAYS_ORDER.map((d) => {
                const items = getSchedulesForDay(d);
                return (
                  <div key={d} className="space-y-2">
                    {items.map((item) => {
                      const isPractical = item.learning_group === "praktik_lab" || item.is_block_practical;
                      const isTeori1 = item.learning_group === "teori_1";
                      const isTeori2 = item.learning_group === "teori_2";

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-2.5 text-xs space-y-1.5 shadow-2xs hover:border-primary/40 transition-colors ${
                            isPractical
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : isTeori1
                              ? "bg-blue-500/5 border-blue-500/20"
                              : isTeori2
                              ? "bg-purple-500/5 border-purple-500/20"
                              : "bg-background"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                            <span className="font-bold text-primary">J-{item.period}</span>
                            <span>{item.start_time}</span>
                          </div>
                          {getGroupBadge(item.learning_group)}
                          <p className="font-bold text-foreground text-[11px] leading-tight line-clamp-2">
                            {item.subject}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate" title={item.teacher_name}>
                            {item.teacher_name.split(",")[0]}
                          </p>
                          {item.room && (
                            <span className="inline-block text-[9px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground truncate max-w-full">
                              {item.room}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {items.length === 0 && (
                      <div className="h-24 rounded-xl border border-dashed flex items-center justify-center text-[11px] text-muted-foreground/60 italic">
                        Kosong
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
