import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Search,
  Users,
  GraduationCap,
  Briefcase,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Tag,
  Trash2,
  Edit2,
  CalendarCheck2,
  Share2,
  Printer,
  Info,
  BookOpen,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSchoolStore } from "@/lib/store";
import { AcademicCalendarEvent } from "@/types";
import { toast } from "sonner";
import { soundManager } from "@/lib/sound";
import { PageHeader } from "@/components/layout/PageHeader";

interface KalenderAkademikViewProps {
  onNavigate: (view: string, param?: string) => void;
}

const EVENT_TYPE_MAP: Record<
  AcademicCalendarEvent["type"],
  { label: string; bg: string; text: string; border: string }
> = {
  libur_nasional: {
    label: "Libur Nasional",
    bg: "bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
  kegiatan_sekolah: {
    label: "Kegiatan Sekolah",
    bg: "bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  ujian: {
    label: "Ujian / Asesmen",
    bg: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  rapat: {
    label: "Rapat GTK / Guru",
    bg: "bg-purple-500/15",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
  },
  cuti_bersama: {
    label: "Cuti Bersama",
    bg: "bg-slate-500/15",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/30",
  },
};

export function KalenderAkademikView({ onNavigate }: KalenderAkademikViewProps) {
  const {
    activeSchool,
    calendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    activeAcademicYear,
    isAdmin,
    terms,
  } = useSchoolStore();

  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademicCalendarEvent | null>(null);
  const [formData, setFormData] = useState<Omit<AcademicCalendarEvent, "id" | "school_id">>({
    title: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    type: "kegiatan_sekolah",
    color: "#3b82f6",
    description: "",
    target_audience: "all",
  });

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      title: "",
      start_date: today,
      end_date: today,
      type: "kegiatan_sekolah",
      color: "#3b82f6",
      description: "",
      target_audience: "all",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt: AcademicCalendarEvent) => {
    setEditingItem(evt);
    setFormData({
      title: evt.title,
      start_date: evt.start_date,
      end_date: evt.end_date,
      type: evt.type,
      color: evt.color || "#3b82f6",
      description: evt.description || "",
      target_audience: evt.target_audience,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Nama agenda / kegiatan wajib diisi");
      return;
    }

    if (editingItem) {
      updateCalendarEvent(editingItem.id, formData);
      toast.success("Agenda kegiatan berhasil diperbarui");
    } else {
      addCalendarEvent(formData);
      toast.success("Agenda kegiatan berhasil ditambahkan ke kalender");
    }
    soundManager.playSuccess();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Hapus kegiatan "${title}" dari kalender akademik?`)) {
      deleteCalendarEvent(id);
      soundManager.playBeep();
      toast.success(`Agenda "${title}" telah dihapus.`);
    }
  };

  // Filter events
  const filteredEvents = calendarEvents.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(search.toLowerCase()) ||
      (evt.description && evt.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === "all" || evt.type === typeFilter;
    const matchesAudience = audienceFilter === "all" || evt.target_audience === audienceFilter;
    return matchesSearch && matchesType && matchesAudience;
  });

  // Calculate days in month for calendar grid
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 is Sun
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mon = 0, Sun = 6
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <PageHeader
        icon={CalendarIcon}
        title="Kalender Akademik"
        subtitle={`Agenda kegiatan sekolah, hari libur nasional, periode ujian, dan rapat GTK di ${activeSchool?.name}.`}
        badge={activeAcademicYear ? `${activeAcademicYear.name} (${activeAcademicYear.semester.toUpperCase()})` : "Kalender"}
        kpiCards={[
          {
            label: "Total Agenda",
            value: calendarEvents.length,
            helper: "Kegiatan tercatat",
            icon: CalendarIcon,
            color: "primary",
          },
          {
            label: "Libur & Cuti",
            value: calendarEvents.filter((e) => e.type === "libur_nasional" || e.type === "cuti_bersama").length,
            helper: "Hari libur resmi",
            icon: Sparkles,
            color: "rose",
          },
          {
            label: "Ujian / Asesmen",
            value: calendarEvents.filter((e) => e.type === "ujian").length,
            helper: "Evaluasi belajar",
            icon: BookOpen,
            color: "amber",
          },
          {
            label: "Rapat & Event",
            value: calendarEvents.filter((e) => e.type === "rapat" || e.type === "kegiatan_sekolah").length,
            helper: "Agenda internal GTK",
            icon: Layers,
            color: "blue",
          },
        ]}
      >
        <div className="flex rounded-xl bg-muted/60 p-1 border">
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
              viewMode === "calendar"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Kalender
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Daftar Agenda
          </button>
        </div>

        {isAdmin && (
          <Button
            onClick={handleOpenAdd}
            className="rounded-xl shadow-xs gap-2 font-bold text-xs h-9 px-3.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-4" />
            Tambah Agenda
          </Button>
        )}
      </PageHeader>

      {/* Info & Category Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-card border">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted-foreground text-[11px] mr-1">Kategori:</span>
          {Object.entries(EVENT_TYPE_MAP).map(([key, val]) => (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-opacity ${
                val.bg
              } ${val.text} ${val.border} ${
                typeFilter === key ? "ring-2 ring-primary/40" : typeFilter !== "all" ? "opacity-50" : ""
              }`}
              onClick={() => setTypeFilter(typeFilter === key ? "all" : key)}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {val.label}
            </span>
          ))}
        </div>

        {activeAcademicYear && (
          <Badge variant="outline" className="text-xs bg-muted/50 font-mono">
            TA: {activeAcademicYear.name} ({activeAcademicYear.semester.toUpperCase()})
          </Badge>
        )}
      </div>

      {/* Controls / Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama agenda atau kegiatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border bg-card text-foreground focus:outline-none font-medium"
          >
            <option value="all">Semua Sasaran</option>
            <option value="student">Khusus {terms.student_label}</option>
            <option value="teacher">Khusus {terms.teacher_label.split("/")[0].trim()} / GTK</option>
            <option value="staff">Khusus Tenaga Kependidikan</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" />
            Cetak
          </Button>
        </div>
      </div>

      {/* Main View: Interactive Month Matrix Calendar */}
      {viewMode === "calendar" ? (
        <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
          {/* Month Navigator */}
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold font-display text-foreground">
                {monthNames[selectedMonth]} {selectedYear}
              </h2>
              <Badge variant="outline" className="text-xs font-mono">
                {
                  filteredEvents.filter((evt) => {
                    const d = new Date(evt.start_date);
                    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
                  }).length
                }{" "}
                Kegiatan Bulan Ini
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0 rounded-lg"
                onClick={handlePrevMonth}
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-lg px-2.5 h-8"
                onClick={() => {
                  setSelectedMonth(new Date().getMonth());
                  setSelectedYear(new Date().getFullYear());
                }}
              >
                Bulan Ini
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0 rounded-lg"
                onClick={handleNextMonth}
                title="Bulan Berikutnya"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid Header (Senin s.d Minggu) */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-muted-foreground uppercase py-1">
            <span className="text-foreground">Sen</span>
            <span className="text-foreground">Sel</span>
            <span className="text-foreground">Rab</span>
            <span className="text-foreground">Kam</span>
            <span className="text-foreground">Jum</span>
            <span className="text-amber-500">Sab</span>
            <span className="text-destructive">Min</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty slots for month start offset */}
            {Array.from({ length: adjustedFirstDay }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[85px] rounded-xl bg-muted/20 border border-transparent p-1.5 opacity-30"
              />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(
                dayNumber
              ).padStart(2, "0")}`;

              const todayStr = new Date().toISOString().split("T")[0];
              const isToday = dateString === todayStr;

              // Events happening on this date
              const dayEvents = filteredEvents.filter((evt) => {
                return dateString >= evt.start_date && dateString <= evt.end_date;
              });

              return (
                <div
                  key={`day-${dayNumber}`}
                  className={`min-h-[90px] rounded-xl border p-2 flex flex-col justify-between transition-all ${
                    isToday
                      ? "bg-primary/5 border-primary/40 ring-1 ring-primary/30"
                      : dayEvents.length > 0
                      ? "bg-card border-border hover:border-primary/40"
                      : "bg-card/60 border-border/60 hover:bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono size-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-primary text-primary-foreground font-extrabold"
                          : "text-foreground"
                      }`}
                    >
                      {dayNumber}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="size-1.5 rounded-full bg-primary" />
                    )}
                  </div>

                  <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((evt) => {
                      const meta = EVENT_TYPE_MAP[evt.type] || EVENT_TYPE_MAP.kegiatan_sekolah;
                      return (
                        <div
                          key={evt.id}
                          onClick={() => handleOpenEdit(evt)}
                          title={`${evt.title} (${evt.start_date} s.d ${evt.end_date})`}
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate cursor-pointer transition-transform hover:scale-102 ${meta.bg} ${meta.text}`}
                        >
                          {evt.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] font-semibold text-muted-foreground block px-1">
                        +{dayEvents.length - 2} lagi
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredEvents.map((evt) => {
            const meta = EVENT_TYPE_MAP[evt.type] || EVENT_TYPE_MAP.kegiatan_sekolah;
            return (
              <div
                key={evt.id}
                className="rounded-2xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-primary/30 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-xl ${meta.bg} ${meta.text} shrink-0`}>
                    <CalendarCheck2 className="size-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{evt.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.bg} ${meta.text} ${meta.border}`}>
                        {meta.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {evt.target_audience === "all"
                          ? "Semua Civitas"
                          : evt.target_audience === "student"
                          ? `Khusus ${terms.student_label}`
                          : `Khusus ${terms.teacher_label.split("/")[0].trim()}`}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <span className="font-mono font-semibold text-foreground">
                        {evt.start_date === evt.end_date
                          ? evt.start_date
                          : `${evt.start_date} s.d ${evt.end_date}`}
                      </span>
                      {evt.description && (
                        <>
                          <span>•</span>
                          <span>{evt.description}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(evt)}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(evt.id, evt.title)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filteredEvents.length === 0 && (
        <div className="text-center py-12 border rounded-2xl bg-card/40">
          <CalendarIcon className="size-10 mx-auto text-muted-foreground/50 mb-2" />
          <h3 className="text-base font-bold text-foreground">Belum Ada Agenda</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            Tidak ada agenda yang cocok dengan filter atau kata kunci pencarian.
          </p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card border text-card-foreground shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold font-display flex items-center gap-2">
                <CalendarIcon className="size-4 text-primary" />
                {editingItem ? "Edit Agenda Kegiatan" : "Tambah Agenda Kalender"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-foreground">
                  Nama Agenda / Kegiatan <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Asesmen Tengah Semester Ganjil"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Kategori</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as AcademicCalendarEvent["type"],
                      })
                    }
                    className="w-full p-2.5 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  >
                    <option value="kegiatan_sekolah">Kegiatan Sekolah</option>
                    <option value="ujian">Ujian / Asesmen</option>
                    <option value="libur_nasional">Libur Nasional</option>
                    <option value="rapat">Rapat GTK / Guru</option>
                    <option value="cuti_bersama">Cuti Bersama</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Target Sasaran</label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_audience: e.target.value as AcademicCalendarEvent["target_audience"],
                      })
                    }
                    className="w-full p-2.5 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  >
                    <option value="all">Semua Civitas</option>
                    <option value="student">Siswa / Santri</option>
                    <option value="teacher">Guru / Pendidik</option>
                    <option value="staff">Tenaga Kependidikan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Deskripsi / Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Detail pelaksanaan, lokasi, atau panduan kegiatan..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" className="rounded-xl font-semibold">
                  {editingItem ? "Simpan Perubahan" : "Tambahkan ke Kalender"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
