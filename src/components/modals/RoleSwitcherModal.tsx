import React, { useState } from "react";
import {
  Shield,
  UserCheck,
  GraduationCap,
  Users,
  School as SchoolIcon,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSchoolStore } from "@/lib/store";
import { AppRole } from "@/types";
import { toast } from "sonner";
import { soundManager } from "@/lib/sound";

interface RoleSwitcherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (view: string, param?: string) => void;
}

export function RoleSwitcherModal({ open, onOpenChange, onNavigate }: RoleSwitcherModalProps) {
  const {
    role,
    isHomeroomTeacher,
    currentUser,
    switchRole,
    schools,
    activeSchool,
    classes,
    students,
    gtkProfiles,
    terms,
  } = useSchoolStore();

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(activeSchool?.id || "sch-1");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedGtkId, setSelectedGtkId] = useState<string>("");

  const targetSchool = schools.find((s) => s.id === selectedSchoolId) || activeSchool || schools[0];
  const schoolClasses = classes.filter((c) => c.school_id === targetSchool?.id);
  const schoolStudents = students.filter((s) => s.school_id === targetSchool?.id);
  const schoolGtks = gtkProfiles.filter((g) => g.school_id === targetSchool?.id);

  const handleSwitch = (
    targetRole: AppRole,
    options?: {
      isWaliKelas?: boolean;
      homeroomClassId?: string;
      nis?: string;
      gtkId?: string;
      fullName?: string;
      email?: string;
    }
  ) => {
    soundManager.playSuccess();
    switchRole(targetRole, {
      ...options,
      schoolId: targetSchool?.id,
    });

    const roleNameMap: Record<string, string> = {
      superadmin: "Administrator Platform",
      admin: `Admin ${targetSchool?.name || "Sekolah"}`,
      wali_kelas: `Wali Kelas (${options?.fullName || "Guru"})`,
      teacher: `Guru GTK (${options?.fullName || "Pengajar"})`,
      student: `${terms.student_label} (${options?.fullName || "Siswa"})`,
    };

    const targetLabel =
      targetRole === "teacher" && options?.isWaliKelas
        ? roleNameMap.wali_kelas
        : roleNameMap[targetRole] || targetRole;

    toast.success(`Berhasil beralih mode role: ${targetLabel}`);
    onOpenChange(false);

    if (onNavigate) {
      onNavigate("dashboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Shield className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Beralih Hak Akses & Simulasi Peran
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Simulasikan dan tinjau tampilan sistem dari perspektif seluruh tingkatan peran (Admin Sekolah, Wali Kelas, Guru GTK, Siswa).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Current Active Status Indicator */}
        <div className="p-3 rounded-xl bg-muted/60 border flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-muted-foreground truncate">
              Posisi Saat Ini:{" "}
              <strong className="text-foreground">
                {currentUser?.full_name || "Administrator"}
              </strong>
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold shrink-0 border-primary/30 text-primary"
          >
            {role === "teacher" && isHomeroomTeacher ? "⭐ Wali Kelas" : role}
          </Badge>
        </div>

        {/* Instansi / Tenant Scope Selector */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <SchoolIcon className="size-3.5 text-primary" /> Target Lingkup Instansi / Sekolah:
            </span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {schools.length} Instansi Terdaftar
            </span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {schools.map((sch) => (
              <button
                key={sch.id}
                type="button"
                onClick={() => setSelectedSchoolId(sch.id)}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                  selectedSchoolId === sch.id
                    ? "border-primary bg-primary/5 text-foreground shadow-xs font-semibold"
                    : "border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="truncate">
                  <p className="truncate text-foreground font-medium">{sch.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Kode: {sch.join_code}</p>
                </div>
                {selectedSchoolId === sch.id && (
                  <CheckCircle2 className="size-4 text-primary shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Role Switch Selection Cards */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-foreground">
            Pilih Peran yang Ingin Dituju:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Administrator Platform (Global Access) */}
            <div
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                role === "superadmin"
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Shield className="size-4" />
                  </div>
                  <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">
                    Akses Penuh
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-foreground">Administrator Platform</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Akses master multi-tenant SaaS, kelola seluruh instansi, sinkronisasi database, dan konfigurasi global.
                </p>
              </div>
              <Button
                size="sm"
                variant={role === "superadmin" ? "default" : "outline"}
                onClick={() =>
                  handleSwitch("superadmin", {
                    fullName: "Administrator Platform (SaaS Owner & Yayasan)",
                    email: "admin@presensi.app",
                  })
                }
                className="mt-3 w-full text-xs font-semibold justify-between h-8"
              >
                <span>{role === "superadmin" ? "Aktif Saat Ini" : "Beralih ke Administrator"}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>

            {/* 2. Admin Sekolah (Kepala Sekolah / Operator) */}
            <div
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                role === "admin"
                  ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                  : "border-border hover:border-emerald-500/40 hover:bg-muted/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <SchoolIcon className="size-4" />
                  </div>
                  <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                    Instansi
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-foreground">Admin {targetSchool.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Kelola data rombel, presensi harian, kios QR, jadwal, kalender, dan laporan {targetSchool.name}.
                </p>
              </div>
              <Button
                size="sm"
                variant={role === "admin" ? "default" : "outline"}
                onClick={() =>
                  handleSwitch("admin", {
                    fullName: `Bambang Sudarsono, M.Pd (Kepala Sekolah - ${targetSchool.name})`,
                    email: `admin@${targetSchool.join_code.toLowerCase()}.sch.id`,
                  })
                }
                className="mt-3 w-full text-xs font-semibold justify-between h-8 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                <span>{role === "admin" ? "Aktif Saat Ini" : "Beralih ke Admin Sekolah"}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>

            {/* 3. Wali Kelas */}
            <div
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                role === "teacher" && isHomeroomTeacher
                  ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30"
                  : "border-border hover:border-amber-500/40 hover:bg-muted/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="size-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <GraduationCap className="size-4" />
                  </div>
                  <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500">
                    ⭐ Wali Kelas
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-foreground">Wali Kelas (Validasi Izin & Ruang Wali)</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Memantau kehadiran kelas binaan, menyetujui surat izin/sakit, dan rekapitulasi rombel.
                </p>
              </div>
              <Button
                size="sm"
                variant={role === "teacher" && isHomeroomTeacher ? "default" : "outline"}
                onClick={() => {
                  const targetClass = schoolClasses[0] || classes[0];
                  handleSwitch("teacher", {
                    isWaliKelas: true,
                    homeroomClassId: targetClass?.id || "cls-1",
                    gtkId: "gtk-1",
                    fullName: `Drs. Bambang Sudarsono, M.Pd (Wali Kelas ${targetClass?.name || "X RPL 1"})`,
                    email: `wali.${targetSchool.join_code.toLowerCase()}@sch.id`,
                  });
                }}
                className="mt-3 w-full text-xs font-semibold justify-between h-8 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                <span>{role === "teacher" && isHomeroomTeacher ? "Aktif Saat Ini" : "Beralih ke Wali Kelas"}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>

            {/* 4. Guru GTK / Pengajar Mata Pelajaran */}
            <div
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                role === "teacher" && !isHomeroomTeacher
                  ? "border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/30"
                  : "border-border hover:border-blue-500/40 hover:bg-muted/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="size-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <UserCheck className="size-4" />
                  </div>
                  <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-500">
                    Tenaga Pendidik
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-foreground">Guru & GTK ({terms.teacher_label})</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Presensi mandiri GTK (Selfie GPS), jadwal mengajar mata pelajaran, dan input absen siswa.
                </p>
              </div>
              <Button
                size="sm"
                variant={role === "teacher" && !isHomeroomTeacher ? "default" : "outline"}
                onClick={() =>
                  handleSwitch("teacher", {
                    isWaliKelas: false,
                    gtkId: "gtk-2",
                    fullName: "Siti Rahmawati, S.Kom (Guru Mata Pelajaran)",
                    email: `siti.rahma@${targetSchool.join_code.toLowerCase()}.sch.id`,
                  })
                }
                className="mt-3 w-full text-xs font-semibold justify-between h-8 border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
              >
                <span>{role === "teacher" && !isHomeroomTeacher ? "Aktif Saat Ini" : "Beralih ke Guru GTK"}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>

            {/* 5. Siswa / Peserta Didik */}
            <div
              className={`p-3.5 rounded-2xl border sm:col-span-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                role === "student"
                  ? "border-purple-500/50 bg-purple-500/5 ring-1 ring-purple-500/30"
                  : "border-border hover:border-purple-500/40 hover:bg-muted/30"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Users className="size-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">
                    Portal Mandiri {terms.student_label} (Presensiku)
                  </h4>
                  <Badge variant="outline" className="text-[9px] border-purple-500/40 text-purple-500">
                    Mandiri
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Lihat UI siswa untuk absen selfie kamera + verifikasi radius GPS, ajukan izin/sakit, dan cek riwayat absensi pribadi.
                </p>
              </div>
              <Button
                size="sm"
                variant={role === "student" ? "default" : "outline"}
                onClick={() => {
                  const targetStudent = schoolStudents[0] || students[0];
                  handleSwitch("student", {
                    nis: targetStudent?.nis || "102401",
                    fullName: `${targetStudent?.full_name || "Aditya Pratama"} (${terms.student_label})`,
                    email: `${targetStudent?.nis || "102401"}@siswa.${targetSchool.join_code.toLowerCase()}.sch.id`,
                  });
                }}
                className="text-xs font-semibold justify-between sm:w-auto shrink-0 h-8 border-purple-500/30 text-purple-500 hover:bg-purple-500/10"
              >
                <span>{role === "student" ? "Aktif Saat Ini" : `Beralih ke ${terms.student_label}`}</span>
                <ArrowRight className="size-3.5 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            Hak administrator tetap melekat di sesi untuk berganti peran kapan saja.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-7"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
