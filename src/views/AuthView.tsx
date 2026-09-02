import React, { useState } from "react";
import {
  Fingerprint,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  UserCheck,
  GraduationCap,
  Sparkles,
  KeyRound,
  Mail,
  Lock,
  User,
  Shield,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchoolStore } from "@/lib/store";
import { toast } from "sonner";

interface AuthViewProps {
  initialTab?: "admin" | "guru" | "siswa" | "masuk";
  onNavigate: (view: string, param?: string) => void;
}

export function AuthView({ initialTab = "admin", onNavigate }: AuthViewProps) {
  const { loginWithCredentials, loginTeacherOrStaff, loginStudent, schools } = useSchoolStore();

  const getInitialTab = (): "admin" | "guru" | "siswa" => {
    if (initialTab === "siswa") return "siswa";
    if (initialTab === "guru") return "guru";
    return "admin";
  };

  const [tab, setTab] = useState<"admin" | "guru" | "siswa">(getInitialTab());

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [schoolCode, setSchoolCode] = useState(schools[0]?.join_code || "");
  const [teacherIdentifier, setTeacherIdentifier] = useState("");
  const [nis, setNis] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      try {
        if (tab === "siswa") {
          if (!schoolCode.trim()) {
            toast.error("Silakan masukkan Kode Sekolah resmi Anda.");
            setLoading(false);
            return;
          }
          if (!nis.trim()) {
            toast.error("Silakan masukkan Nomor Induk Siswa (NIS).");
            setLoading(false);
            return;
          }
          const success = loginStudent(schoolCode.trim(), nis.trim(), password);
          if (success) {
            toast.success("Autentikasi berhasil. Selamat datang di Portal Siswa.");
            onNavigate("dashboard");
          } else {
            toast.error("Kombinasi Kode Sekolah atau NIS tidak ditemukan. Silakan periksa kembali.");
          }
        } else if (tab === "guru") {
          if (!schoolCode.trim()) {
            toast.error("Silakan masukkan Kode Sekolah resmi Anda.");
            setLoading(false);
            return;
          }
          if (!teacherIdentifier.trim()) {
            toast.error("Silakan masukkan Email, NUPTK, atau Nama lengkap.");
            setLoading(false);
            return;
          }
          const result = loginTeacherOrStaff(schoolCode.trim(), teacherIdentifier.trim(), password);
          if (result.success) {
            toast.success(result.message || "Autentikasi berhasil. Selamat datang di Portal GTK.");
            onNavigate("dashboard");
          } else {
            toast.error(result.message || "Kode Sekolah atau identitas tidak valid.");
          }
        } else {
          // Administrator login
          if (!email.trim()) {
            toast.error("Silakan masukkan alamat email administrator.");
            setLoading(false);
            return;
          }
          const isSuper =
            email.toLowerCase().includes("superadmin") ||
            email.toLowerCase().includes("super") ||
            email.toLowerCase().includes("master");
          loginWithCredentials(email.trim(), password, isSuper ? "superadmin" : "admin");
          toast.success("Autentikasi berhasil. Selamat datang kembali di Dashboard Manajemen.");
          onNavigate("dashboard");
        }
      } catch (err) {
        toast.error("Terjadi kendala saat memproses autentikasi. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-12 bg-background selection:bg-primary/10">
      {/* Left visual & branding column (5 cols) */}
      <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-12 bg-gradient-to-b from-sidebar to-sidebar/95 text-sidebar-foreground border-r border-sidebar-border/40 overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-sidebar-primary/20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <button
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md group-hover:scale-105 transition-all">
              <Fingerprint className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-xl font-bold tracking-tight text-white">Presensia</span>
              <span className="text-[11px] text-sidebar-foreground/70 font-medium tracking-wide">Enterprise School Attendance</span>
            </div>
          </button>
        </div>

        <div className="relative z-10 my-auto max-w-md space-y-6 py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-white/90 shadow-sm">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Portal Presensi Terpadu
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight text-white">
              Akurasi Kehadiran, Efisiensi Tata Kelola.
            </h1>
            <p className="text-sidebar-foreground/80 leading-relaxed text-sm">
              Sistem manajemen presensi cerdas terintegrasi untuk seluruh ekosistem pendidikan dengan standar keamanan data tingkat tinggi.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3 text-xs text-sidebar-foreground/90">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Validasi presensi multi-metode: QR Code Dinamis, GPS Geofencing, dan RFID Card.</span>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3 text-xs text-sidebar-foreground/90">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Sinkronisasi otomatis laporan harian, rekap periodik, serta integrasi notifikasi instan.</span>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3 text-xs text-sidebar-foreground/90">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Pemisahan hak akses terisolasi untuk privasi dan integritas data institusi.</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-sidebar-foreground/60">
          <div className="flex items-center gap-2">
            <Shield className="size-3.5 text-white/60" />
            <span>256-Bit SSL Enkripsi Terproteksi</span>
          </div>
          <span>© {new Date().getFullYear()} Presensia</span>
        </div>
      </div>

      {/* Right form column (7 cols) */}
      <div className="col-span-12 lg:col-span-7 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24 overflow-y-auto">
        <div className="mx-auto w-full max-w-md">
          {/* Back button */}
          <button
            onClick={() => onNavigate("landing")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors group"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Kembali ke halaman utama
          </button>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {tab === "admin"
                ? "Portal Administrasi"
                : tab === "guru"
                ? "Portal Pendidik & Staf"
                : "Portal Peserta Didik"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {tab === "admin"
                ? "Akses kontrol pengelolaan sekolah, laporan komprehensif, dan konfigurasi sistem."
                : tab === "guru"
                ? "Akses modul presensi mandiri, jurnal mengajar, dan rekap wali kelas."
                : "Akses riwayat kehadiran pribadi, status presensi harian, dan pengajuan izin."}
            </p>
          </div>

          {/* Role selector tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "admin" | "guru" | "siswa")}
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/70 rounded-xl border">
              <TabsTrigger
                value="admin"
                className="text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="size-3.5 text-primary" /> Administrator
              </TabsTrigger>
              <TabsTrigger
                value="guru"
                className="text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
              >
                <UserCheck className="size-3.5 text-primary" /> Guru & GTK
              </TabsTrigger>
              <TabsTrigger
                value="siswa"
                className="text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
              >
                <GraduationCap className="size-3.5 text-primary" /> Siswa
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Institution Code for Teacher / Student */}
              {tab !== "admin" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="kode-sekolah"
                      className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                    >
                      <KeyRound className="size-3.5 text-muted-foreground" /> Kode Sekolah
                    </Label>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                      Identitas Institusi
                    </span>
                  </div>
                  <Input
                    id="kode-sekolah"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan Kode Sekolah (contoh: SEKOLAH1)"
                    className="font-mono tracking-wider uppercase font-semibold h-11 bg-muted/20 focus:bg-background transition-colors"
                    required
                  />
                </div>
              )}

              {/* Form fields based on role */}
              {tab === "admin" && (
                <div className="space-y-1.5">
                  <Label htmlFor="admin-email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5 text-muted-foreground" /> Alamat Email
                  </Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sekolah.sch.id"
                    className="h-11 bg-muted/20 focus:bg-background transition-colors"
                    required
                  />
                </div>
              )}

              {tab === "guru" && (
                <div className="space-y-1.5">
                  <Label htmlFor="guru-id" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground" /> Email / NUPTK / Nama Lengkap
                  </Label>
                  <Input
                    id="guru-id"
                    value={teacherIdentifier}
                    onChange={(e) => setTeacherIdentifier(e.target.value)}
                    placeholder="nama.guru@sekolah.sch.id atau NUPTK"
                    className="h-11 bg-muted/20 focus:bg-background transition-colors"
                    required
                  />
                </div>
              )}

              {tab === "siswa" && (
                <div className="space-y-1.5">
                  <Label htmlFor="nis-input" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground" /> Nomor Induk Siswa (NIS)
                  </Label>
                  <Input
                    id="nis-input"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    placeholder="Masukkan NIS Anda"
                    className="h-11 bg-muted/20 focus:bg-background transition-colors"
                    required
                  />
                </div>
              )}

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="size-3.5 text-muted-foreground" /> Kata Sandi
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 pr-11 bg-muted/20 focus:bg-background transition-colors"
                    required
                  />
                  <button
                    type="button"
                    id="btn-toggle-password-auth"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3.5 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center focus:outline-none"
                    title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold mt-2 shadow-sm transition-all"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {tab === "admin"
                  ? "Masuk ke Portal Administrasi"
                  : tab === "guru"
                  ? "Masuk ke Portal Pendidik"
                  : "Masuk ke Portal Siswa"}
              </Button>
            </form>
          </Tabs>

          {/* Registration / Institution setup */}
          <div className="mt-8 pt-6 border-t border-border/80 text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              Ingin mendaftarkan instansi atau sekolah baru?
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => onNavigate("auth_daftar")}
              className="w-full h-10 text-xs font-semibold rounded-lg border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Building2 className="size-3.5 text-primary" /> Registrasi Instansi Sekolah
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

