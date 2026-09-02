import React, { useState, useMemo } from "react";
import {
  GraduationCap,
  Plus,
  Users,
  Edit2,
  Trash2,
  BookOpen,
  ArrowRight,
  UserCheck,
  Search,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchoolStore } from "@/lib/store";
import { SchoolClass } from "@/types";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";

interface KelasViewProps {
  onNavigate: (view: string, param?: string) => void;
}

export function KelasView({ onNavigate }: KelasViewProps) {
  const {
    classes,
    students,
    addClass,
    updateClass,
    deleteClass,
    terms,
    isHomeroomTeacher,
    homeroomClass,
  } = useSchoolStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  // Form states
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("10");
  const [academicYear, setAcademicYear] = useState("2026/2027");
  const [homeroomTeacher, setHomeroomTeacher] = useState("");

  const resetForm = () => {
    setName("");
    setGradeLevel("10");
    setAcademicYear("2026/2027");
    setHomeroomTeacher("");
    setEditingClass(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error(`Nama ${terms.class_label.toLowerCase()} wajib diisi.`);
      return;
    }

    if (editingClass) {
      updateClass(editingClass.id, {
        name,
        grade_level: gradeLevel,
        academic_year: academicYear,
        homeroom_teacher: homeroomTeacher || null,
      });
      toast.success(`Data ${terms.class_label.toLowerCase()} berhasil diperbarui.`);
    } else {
      addClass({
        name,
        grade_level: gradeLevel,
        academic_year: academicYear,
        homeroom_teacher: homeroomTeacher || null,
      });
      toast.success(`${terms.class_label} baru berhasil ditambahkan.`);
    }

    setModalOpen(false);
    resetForm();
  };

  const handleOpenEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    setName(cls.name);
    setGradeLevel(cls.grade_level || "10");
    setAcademicYear(cls.academic_year || "2026/2027");
    setHomeroomTeacher(cls.homeroom_teacher || "");
    setModalOpen(true);
  };

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchSearch =
        cls.name.toLowerCase().includes(search.toLowerCase()) ||
        (cls.homeroom_teacher && cls.homeroom_teacher.toLowerCase().includes(search.toLowerCase()));
      const matchGrade = gradeFilter === "all" || cls.grade_level === gradeFilter;
      return matchSearch && matchGrade;
    });
  }, [classes, search, gradeFilter]);

  const totalClasses = classes.length;
  const totalStudents = students.length;
  const classesWithHomeroom = classes.filter((c) => !!c.homeroom_teacher).length;
  const avgPerClass = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <PageHeader
        icon={Layers}
        title={`Daftar ${terms.class_label} & Rombel`}
        subtitle={`Kelola tingkatan ${terms.class_label.toLowerCase()}, rombongan belajar, dan penugasan ${terms.teacher_label.toLowerCase()} pembimbing/wali.`}
        badge={`${totalClasses} Rombel`}
        kpiCards={[
          {
            label: `Total ${terms.class_label}`,
            value: totalClasses,
            helper: "Rombel aktif terdaftar",
            icon: Layers,
            color: "primary",
          },
          {
            label: `Total ${terms.student_label}`,
            value: totalStudents,
            helper: "Siswa terbagi rombel",
            icon: Users,
            color: "blue",
          },
          {
            label: "Ada Wali Kelas",
            value: classesWithHomeroom,
            helper: `${totalClasses - classesWithHomeroom} rombel belum ada wali`,
            icon: GraduationCap,
            color: "amber",
          },
          {
            label: "Rata-rata Siswa",
            value: avgPerClass,
            helper: "Siswa per rombongan",
            icon: Sparkles,
            color: "emerald",
          },
        ]}
      >
        <Button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="bg-primary text-primary-foreground font-bold shadow-xs text-xs h-9 rounded-xl px-3.5"
        >
          <Plus className="mr-1.5 size-4" /> Tambah {terms.class_label} Baru
        </Button>
      </PageHeader>

      {/* Filter & Search Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl border shadow-xs bg-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={`Cari nama ${terms.class_label.toLowerCase()} atau wali...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 rounded-xl bg-background border"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full sm:w-44 text-xs h-9 rounded-xl bg-background border font-medium">
              <SelectValue placeholder="Semua Tingkatan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tingkatan</SelectItem>
              <SelectItem value="7">Tingkat 7 / VII</SelectItem>
              <SelectItem value="8">Tingkat 8 / VIII</SelectItem>
              <SelectItem value="9">Tingkat 9 / IX</SelectItem>
              <SelectItem value="10">Tingkat 10 / X</SelectItem>
              <SelectItem value="11">Tingkat 11 / XI</SelectItem>
              <SelectItem value="12">Tingkat 12 / XII</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of Classes */}
      {filteredClasses.length === 0 ? (
        <Card className="border-dashed p-10 text-center bg-card/40 rounded-3xl">
          <GraduationCap className="size-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="font-bold text-foreground">Tidak Ada {terms.class_label} Ditemukan</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search || gradeFilter !== "all"
              ? "Coba ubah kata kunci pencarian atau filter tingkatan."
              : `Buat ${terms.class_label.toLowerCase()} pertama Anda untuk mulai mengelompokkan ${terms.student_label.toLowerCase()} dan jadwal presensi.`}
          </p>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="mt-4 rounded-xl text-xs font-bold"
          >
            <Plus className="mr-1.5 size-4" /> Tambah {terms.class_label} Baru
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls) => {
            const classStudents = students.filter((s) => s.class_id === cls.id);
            const isMyHomeroom = isHomeroomTeacher && homeroomClass?.id === cls.id;

            return (
              <Card
                key={cls.id}
                className={`border shadow-xs hover:shadow-md transition-all overflow-hidden bg-card rounded-2xl flex flex-col justify-between ${
                  isMyHomeroom ? "ring-2 ring-amber-500/60 border-amber-500/40" : ""
                }`}
              >
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge variant="outline" className="text-xs font-semibold rounded-lg">
                          Tingkat {cls.grade_level || "10"} • {cls.academic_year || "2026/2027"}
                        </Badge>
                        {isMyHomeroom && (
                          <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] rounded-lg">
                            ⭐ Kelas Binaan Anda
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                        {cls.name}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(cls)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Hapus ${terms.class_label.toLowerCase()} ${cls.name}? ${terms.student_label} dalam rombel ini akan dipindahkan.`)) {
                            deleteClass(cls.id);
                            toast.success(`${terms.class_label} berhasil dihapus.`);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {terms.teacher_label.split("/")[0].trim()} / Pembimbing:{" "}
                    <strong className="text-foreground font-semibold">
                      {cls.homeroom_teacher || "Belum Ditentukan"}
                    </strong>
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 pt-0">
                  <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Users className="size-3.5 text-primary" />
                      {classStudents.length} {terms.student_label} Terdaftar
                    </span>

                    {isMyHomeroom ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onNavigate("wali_kelas")}
                        className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-7 px-2.5 rounded-lg shadow-xs"
                      >
                        Portal Wali <ArrowRight className="size-3 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate("siswa")}
                        className="text-xs text-primary hover:text-primary h-7 px-2 rounded-lg"
                      >
                        Lihat {terms.student_label} <ArrowRight className="size-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingClass ? `Edit ${terms.class_label}` : `Tambah ${terms.class_label} Baru`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tentukan nama {terms.class_label.toLowerCase()}, tingkat, dan {terms.teacher_label.toLowerCase()} pembimbing/wali.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama {terms.class_label} / Rombel</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: X RPL 1 atau Halaqah Al-Fatih"
                required
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tingkatan (Grade)</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger className="text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Kelas 7 (SMP/MTs)</SelectItem>
                    <SelectItem value="8">Kelas 8 (SMP/MTs)</SelectItem>
                    <SelectItem value="9">Kelas 9 (SMP/MTs)</SelectItem>
                    <SelectItem value="10">Kelas 10 (SMA/SMK/MA)</SelectItem>
                    <SelectItem value="11">Kelas 11 (SMA/SMK/MA)</SelectItem>
                    <SelectItem value="12">Kelas 12 (SMA/SMK/MA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tahun Ajaran</Label>
                <Input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026/2027"
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama {terms.teacher_label.split("/")[0].trim()} / Wali</Label>
              <Input
                value={homeroomTeacher}
                onChange={(e) => setHomeroomTeacher(e.target.value)}
                placeholder="Drs. Ahmad Dahlan, M.Pd"
                className="text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" size="sm" className="font-bold rounded-xl text-xs">
                {editingClass ? "Simpan Perubahan" : `Simpan ${terms.class_label}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
