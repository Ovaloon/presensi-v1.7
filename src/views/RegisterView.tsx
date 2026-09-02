import React, { useState } from "react";
import {
  Fingerprint,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  School as SchoolIcon,
  Sparkles,
  Building2,
  User,
  Mail,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSchoolStore } from "@/lib/store";
import { toast } from "sonner";

interface RegisterViewProps {
  onNavigate: (view: string, param?: string) => void;
}

export function RegisterView({ onNavigate }: RegisterViewProps) {
  const { registerAccount, createSchool } = useSchoolStore();

  const [schoolName, setSchoolName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Kata sandi minimal terdiri dari 6 karakter.");
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok!");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        // Create school if name provided
        if (schoolName.trim()) {
          createSchool(schoolName.trim(), "1000" + Math.floor(1000 + Math.random() * 9000));
        }

        registerAccount(fullName, email, password);
        toast.success("Pendaftaran instansi berhasil! Selamat datang di Presensia.");
        onNavigate("dashboard");
      } catch (err) {
        toast.error("Terjadi kesalahan saat memproses pendaftaran.");
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background">
      {/* Left visual column */}
      <div className="grid-paper hidden flex-col justify-between border-r p-12 lg:flex bg-card/60">
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
            <Fingerprint className="size-5" />
          </span>
          <span className="font-display text-lg font-bold text-foreground">Presensia</span>
        </button>

        <div className="max-w-md space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> Registrasi Mandiri Instansi
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-foreground">
            Daftarkan sekolah Anda dan mulai dalam hitungan menit.
          </h1>
          <p className="text-muted-foreground leading-relaxed text-sm">
            Siapkan portal presensi otomatis lengkap dengan pembagian rombel, jadwal harian, geofencing GPS, integrasi WhatsApp, dan laporan kehadiran terstruktur.
          </p>

          <div className="pt-4 space-y-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              <span>Akses penuh Multi-Tenant & Database Terisolasi</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              <span>Dukungan Absen QR Dinamis, Selfie GPS & Kartu RFID</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              <span>Notifikasi pesan WhatsApp langsung ke nomor wali murid</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              <span>Rekap otomatis siap ekspor format resmi</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Presensia. Data setiap instansi terenkripsi dan terlindungi.
        </p>
      </div>

      {/* Right form column */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          <button
            onClick={() => onNavigate("landing")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Kembali ke beranda
          </button>

          <div className="space-y-1 mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">
              <SchoolIcon className="size-3.5" /> Pendaftaran Baru
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Daftarkan Sekolah Baru
            </h2>
            <p className="text-xs text-muted-foreground">
              Lengkapi informasi sekolah dan akun administrator Anda untuk memulai.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="school-name" className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="size-3.5 text-muted-foreground" /> Nama Sekolah / Madrasah
              </Label>
              <Input
                id="school-name"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SMA Negeri 1 Nusantara"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-name" className="text-xs font-semibold flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" /> Nama Administrator / Kepala Sekolah
              </Label>
              <Input
                id="admin-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Drs. Bambang Sudarsono, M.Pd"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-email" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" /> Email Resmi Sekolah
              </Label>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sekolah.sch.id"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-password" className="text-xs font-semibold flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" /> Kata Sandi (Min. 6 Karakter)
              </Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  id="btn-toggle-reg-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center focus:outline-none"
                  title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-confirm-password" className="text-xs font-semibold flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" /> Ulangi Kata Sandi
              </Label>
              <div className="relative">
                <Input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  id="btn-toggle-confirm-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center focus:outline-none"
                  title={showConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  aria-label={showConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full font-medium mt-2" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Daftarkan Sekolah Sekarang
            </Button>
          </form>

          {/* Dedicated link to Login page */}
          <div className="mt-6 pt-5 border-t text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              Sudah memiliki akun instansi atau siswa?
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => onNavigate("auth")}
              className="w-full text-xs font-semibold"
            >
              Masuk ke Akun Anda
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[11px] text-muted-foreground">
              🔒 <strong>Pendaftaran Aman:</strong> Instansi Anda akan langsung mendapatkan ruang kerja terpisah dengan konfigurasi siap pakai.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
