import React, { useState } from "react";
import {
  Calendar,
  Plus,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  BookOpen,
  Sparkles,
  Search,
  Filter,
  Check,
  GraduationCap,
  Layers,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSchoolStore } from "@/lib/store";
import { AcademicYear } from "@/types";
import { toast } from "sonner";
import { soundManager } from "@/lib/sound";
import { PageHeader } from "@/components/layout/PageHeader";

interface TahunAjaranViewProps {
  onNavigate: (view: string, param?: string) => void;
}

export function TahunAjaranView({ onNavigate }: TahunAjaranViewProps) {
  const {
    activeSchool,
    academicYears,
    activeAcademicYear,
    addAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    setActiveAcademicYear,
    isAdmin,
    terms,
  } = useSchoolStore();

  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<"all" | "ganjil" | "genap">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademicYear | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "2025/2026",
    semester: "ganjil" as "ganjil" | "genap",
    start_date: "2025-07-14",
    end_date: "2025-12-19",
    curriculum: "Kurikulum Merdeka",
    is_active: false,
    notes: "",
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: "2026/2027",
      semester: "ganjil",
      start_date: "2026-07-13",
      end_date: "2026-12-18",
      curriculum: "Kurikulum Merdeka",
      is_active: false,
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AcademicYear) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      semester: item.semester,
      start_date: item.start_date,
      end_date: item.end_date,
      curriculum: item.curriculum,
      is_active: item.is_active,
      notes: item.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Nama tahun ajaran wajib diisi (misal: 2025/2026)");
      return;
    }

    if (editingItem) {
      updateAcademicYear(editingItem.id, formData);
      toast.success(`Tahun ajaran ${formData.name} berhasil diperbarui`);
    } else {
      addAcademicYear(formData);
      toast.success(`Tahun ajaran ${formData.name} (${formData.semester.toUpperCase()}) berhasil ditambahkan`);
    }
    soundManager.playSuccess();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (academicYears.length <= 1) {
      toast.error("Minimal harus ada satu data tahun ajaran di sistem.");
      return;
    }
    if (window.confirm(`Hapus tahun ajaran "${name}"? Data riwayat presensi terkait tetap aman.`)) {
      deleteAcademicYear(id);
      soundManager.playBeep();
      toast.success(`Tahun ajaran "${name}" telah dihapus.`);
    }
  };

  const handleToggleActive = (id: string, name: string, sem: string) => {
    setActiveAcademicYear(id);
    soundManager.playSuccess();
    toast.success(`Tahun ajaran aktif diubah ke: ${name} (${sem.toUpperCase()})`);
  };

  const filteredYears = academicYears.filter((ay) => {
    const matchesSearch =
      ay.name.toLowerCase().includes(search.toLowerCase()) ||
      ay.curriculum.toLowerCase().includes(search.toLowerCase()) ||
      (ay.notes && ay.notes.toLowerCase().includes(search.toLowerCase()));
    const matchesSemester =
      semesterFilter === "all" || ay.semester === semesterFilter;
    return matchesSearch && matchesSemester;
  });

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <PageHeader
        icon={Calendar}
        title="Manajemen Tahun Ajaran"
        subtitle={`Atur kalender periode akademik, kurikulum, dan semester aktif di ${activeSchool?.name}.`}
        badge={activeAcademicYear ? `Aktif: ${activeAcademicYear.name} (${activeAcademicYear.semester.toUpperCase()})` : "Tahun Ajaran"}
        kpiCards={[
          {
            label: "Total Periode",
            value: academicYears.length,
            helper: "Periode akademik tersimpan",
            icon: Calendar,
            color: "primary",
          },
          {
            label: "Semester Aktif",
            value: activeAcademicYear ? activeAcademicYear.semester.toUpperCase() : "-",
            helper: activeAcademicYear ? activeAcademicYear.name : "Belum diatur",
            icon: Sparkles,
            color: "emerald",
          },
          {
            label: "Kurikulum Utama",
            value: activeAcademicYear?.curriculum?.split(" ")[1] || "Merdeka",
            helper: activeAcademicYear?.curriculum || "Kurikulum Nasional",
            icon: BookOpen,
            color: "blue",
          },
          {
            label: "Rombel Terhubung",
            value: "Semua",
            helper: "Tersinkronisasi otomatis",
            icon: Layers,
            color: "amber",
          },
        ]}
      >
        {isAdmin && (
          <Button
            onClick={handleOpenAdd}
            className="rounded-xl shadow-xs gap-2 font-bold text-xs h-9 px-3.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-4" />
            Tambah Tahun Ajaran
          </Button>
        )}
      </PageHeader>

      {/* Active Academic Year Banner */}
      {activeAcademicYear && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-sm">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground text-xs px-2.5 py-0.5">
                    TAHUN AJARAN AKTIF SEKARANG
                  </Badge>
                  <Badge variant="outline" className="font-semibold uppercase text-xs">
                    Semester {activeAcademicYear.semester}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold font-display text-foreground mt-1">
                  Tahun Ajaran {activeAcademicYear.name}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>Kurikulum: <strong className="text-foreground">{activeAcademicYear.curriculum}</strong></span>
                  <span>•</span>
                  <span>Rentang: {activeAcademicYear.start_date} s.d {activeAcademicYear.end_date}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5"
                onClick={() => onNavigate("kalender_akademik")}
              >
                <Calendar className="size-3.5" />
                Kalender Akademik
                <ArrowRight className="size-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5"
                onClick={() => onNavigate("jadwal_mingguan")}
              >
                <Layers className="size-3.5" />
                Jadwal Mingguan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari tahun ajaran, kurikulum..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
            <Filter className="size-3.5" /> Semester:
          </span>
          <div className="flex rounded-xl bg-muted/60 p-1 border">
            {(["all", "ganjil", "genap"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSemesterFilter(filter)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  semesterFilter === filter
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter === "all" ? "Semua" : filter === "ganjil" ? "Ganjil" : "Genap"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Academic Years Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredYears.map((ay) => {
          const isActive = ay.is_active;
          return (
            <div
              key={ay.id}
              className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                isActive
                  ? "bg-card border-primary/40 shadow-sm ring-1 ring-primary/20"
                  : "bg-card/70 border-border hover:border-primary/30"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-lg font-bold text-foreground">
                        {ay.name}
                      </span>
                      <Badge
                        variant={ay.semester === "ganjil" ? "default" : "secondary"}
                        className="text-[10px] uppercase font-bold"
                      >
                        {ay.semester}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium block mt-0.5">
                      {ay.curriculum}
                    </span>
                  </div>

                  {isActive ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                      <CheckCircle2 className="size-3" />
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                      Nonaktif
                    </Badge>
                  )}
                </div>

                {/* Date Ranges */}
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3 text-primary" /> Mulai:
                    </span>
                    <strong className="text-foreground font-mono">{ay.start_date}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3 text-primary" /> Selesai:
                    </span>
                    <strong className="text-foreground font-mono">{ay.end_date}</strong>
                  </div>
                </div>

                {ay.notes && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2 italic">
                    "{ay.notes}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t flex items-center justify-between gap-2">
                {!isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-xl gap-1.5 text-primary hover:bg-primary/10"
                    onClick={() => handleToggleActive(ay.id, ay.name, ay.semester)}
                  >
                    <Check className="size-3.5" />
                    Jadikan Aktif
                  </Button>
                ) : (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Sedang Berjalan
                  </span>
                )}

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(ay)}
                      title="Edit Tahun Ajaran"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(ay.id, `${ay.name} (${ay.semester})`)}
                      title="Hapus Tahun Ajaran"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredYears.length === 0 && (
        <div className="text-center py-12 border rounded-2xl bg-card/40">
          <BookOpen className="size-10 mx-auto text-muted-foreground/50 mb-2" />
          <h3 className="text-base font-bold text-foreground">Tidak Ada Tahun Ajaran</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            Data tahun ajaran tidak ditemukan. Klik tombol Tambah Tahun Ajaran untuk membuat periode baru.
          </p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card border text-card-foreground shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold font-display flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                {editingItem ? "Edit Tahun Ajaran" : "Tambah Tahun Ajaran Baru"}
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
                  Nama Tahun Ajaran <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2025/2026 atau 1446/1447 H"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) =>
                      setFormData({ ...formData, semester: e.target.value as "ganjil" | "genap" })
                    }
                    className="w-full p-2.5 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  >
                    <option value="ganjil">Semester Ganjil</option>
                    <option value="genap">Semester Genap</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Kurikulum Acuan</label>
                  <input
                    type="text"
                    placeholder="Kurikulum Merdeka / K13"
                    value={formData.curriculum}
                    onChange={(e) => setFormData({ ...formData, curriculum: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
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
                <label className="block font-semibold mb-1 text-foreground">Catatan / Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan untuk periode ini..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-semibold cursor-pointer text-foreground">
                  Langsung aktifkan sebagai Tahun Ajaran Utama
                </label>
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
                  {editingItem ? "Simpan Perubahan" : "Tambahkan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
