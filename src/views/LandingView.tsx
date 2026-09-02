import React, { useState } from "react";
import {
  CalendarCheck,
  CreditCard,
  Fingerprint,
  LineChart,
  MapPin,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Users,
  ArrowRight,
  GraduationCap,
  Download,
  Smartphone,
  CheckCircle2,
  Lock,
  Sparkles,
  Camera,
  Layers,
  Clock,
  Building2,
  FileSpreadsheet,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  X,
  School,
  FileText,
  Calculator,
  Wallet,
  Zap,
  Crown,
  CheckCheck,
  Receipt,
  Headphones,
  Bell,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSchoolStore } from "@/lib/store";
import { SaaSPlanTier } from "@/types";
import { QrisCheckoutModal } from "@/components/payment/QrisCheckoutModal";

interface LandingViewProps {
  onNavigate: (view: string, param?: string) => void;
}

export function LandingView({ onNavigate }: LandingViewProps) {
  const { setDomainMode, activeSchool } = useSchoolStore();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  // QRIS Checkout Modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<SaaSPlanTier>("pro");

  const handleOpenCheckout = (planTier: SaaSPlanTier) => {
    setSelectedCheckoutPlan(planTier);
    setCheckoutModalOpen(true);
  };

  // FAQ Data
  const faqs = [
    {
      q: "Bagaimana cara pembayaran paling mudah untuk langganan sekolah?",
      a: "Metode pembayaran paling mudah dan direkomendasikan adalah via QRIS (Quick Response Code Indonesian Standard). Anda dapat membayar menggunakan seluruh aplikasi Mobile Banking (BCA Mobile, Livin' Mandiri, BRImo, BNI Mobile, BSI) maupun E-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja). Pembayaran langsung terverifikasi otomatis dalam 5 detik dan lisensi tenant sekolah langsung aktif saat itu juga!",
    },
    {
      q: "Apakah dapat dibayar menggunakan anggaran Dana BOS (Bantuan Operasional Sekolah)?",
      a: "Sangat bisa! Setiap pembayaran via QRIS atau Transfer Bank akan langsung menerbitkan Invoice & Kuitansi Resmi lengkap dengan nomor faktur, rincian PPN, serta bukti potong administrasi yang memenuhi standar pelaporan SPJ Dana BOS Kemendikbudristek & Kemenag.",
    },
    {
      q: "Apakah siswa wajib membawa smartphone ke sekolah?",
      a: "Tidak wajib! Untuk sekolah yang melarang HP (khususnya jenjang SD dan SMP), sekolah dapat menggunakan fitur 'Kios Gerbang QR' di mana siswa cukup menunjukkan Kartu Pelajar ber-QR Code atau diabsenkan secara cepat oleh Wali Kelas melalui Portal Wali Kelas.",
    },
    {
      q: "Bagaimana cara kerja sistem anti-titip absen?",
      a: "Sistem mengombinasikan 3 lapis validasi keamanan: (1) Validasi koordinat GPS Geofence area sekolah, (2) Foto selfie kamera depan real-time (tanpa upload galeri), dan (3) QR Code dinamis kelas yang berganti berkala untuk mencegah screenshot.",
    },
    {
      q: "Apakah perlu download aplikasi berat dari Play Store / App Store?",
      a: "Tidak perlu. Aplikasi ini dibangun dengan teknologi Progressive Web App (PWA) generasi terbaru. Pengguna cukup membuka link di browser HP atau menekan tombol 'Pasang Aplikasi' untuk memunculkan ikon di layar utama (home screen) tanpa memakan memori HP dan tetap bisa absen saat internet lambat/offline.",
    },
    {
      q: "Berapa lama proses setup awal sampai sistem bisa digunakan?",
      a: "Hanya butuh waktu kurang dari 5 menit! Anda cukup mendaftarkan sekolah, mengatur jam masuk sekolah, mengimpor data siswa via file Excel, lalu langsung dapat mencetak kartu presensi dan memulai absensi hari pertama.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Banner: School Solution Announcement */}
      <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-primary/15 border-b border-primary/20 text-foreground py-2 px-4 text-center text-xs font-medium">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.2 font-bold uppercase tracking-wider">
            ⚡ Presensi Digital Terpadu
          </Badge>
          <span className="text-muted-foreground hidden sm:inline">•</span>
          <span>
            GPS Geofence Anti-Titip Absen, Kios QR Gerbang, &amp; Notifikasi WhatsApp Orang Tua.
          </span>
          <button
            onClick={() => onNavigate("auth_daftar")}
            className="text-primary font-bold hover:underline inline-flex items-center gap-1 ml-1"
          >
            Daftarkan Sekolah Gratis <ArrowRight className="size-3" />
          </button>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-card/80 via-background to-background pt-12 pb-16 md:pt-20 md:pb-24">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/90 backdrop-blur px-4 py-1.5 text-xs font-semibold text-primary shadow-xs">
              <Sparkles className="size-3.5 text-primary animate-pulse" />
              <span>SaaS Presensi Multi-Tenant &amp; PWA Sekolah Modern</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-foreground">
              Presensi Siswa Cerdas,{" "}
              <span className="text-primary underline decoration-primary/30 decoration-wavy underline-offset-8">
                Anti-Titip Absen
              </span>
              , &amp; Terkoneksi Real-Time
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Gantikan mesin fingerprint error dan buku jurnal kertas. Solusi absensi komprehensif untuk jenjang <strong>SD, SMP, SMA, &amp; SMK</strong> dengan GPS Geofencing, Kios QR Kartu Siswa, dan rekapitulasi otomatis.
            </p>

            {/* Quick Action CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => onNavigate("auth_daftar")}
                className="w-full sm:w-auto h-12 px-7 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 text-sm gap-2"
              >
                <School className="size-4" />
                Daftarkan Sekolah Gratis
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  const pricingEl = document.getElementById("pricing");
                  if (pricingEl) pricingEl.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold bg-card hover:bg-muted text-sm border-border text-foreground gap-2 shadow-xs"
              >
                <Layers className="size-4 text-primary" />
                Lihat Pilihan Paket
              </Button>
            </div>

            {/* Social Proof & Value Highlights */}
            <div className="pt-4 flex items-center justify-center gap-6 sm:gap-10 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Tanpa Mesin Tambahan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Format Rekap SPJ BOS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Siap Pakai dalam 5 Menit</span>
              </div>
            </div>
          </div>

          {/* 4 Essential Core Capabilities Grid */}
          <div className="mt-12 max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5 hover:border-primary/50 transition-all">
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Smartphone className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Siswa Mandiri (GPS + Selfie)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Geofencing radius sekolah dengan deteksi anti-fake GPS dan kamera langsung.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5 hover:border-primary/50 transition-all">
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <QrCode className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Kios Gerbang (Tanpa HP)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Scan kartu QR / RFID di gerbang dengan audio sambutan otomatis dalam 0.3 detik.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5 hover:border-primary/50 transition-all">
              <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <MessageCircle className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Supervisi Wali Kelas &amp; WA</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pantau kehadiran rombel dan kirim pesan konfirmasi ke nomor orang tua 1-klik.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5 hover:border-primary/50 transition-all">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <FileSpreadsheet className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Rekap Dapodik &amp; SPJ BOS</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ekspor rekapitulasi format Excel/PDF dan cetak surat panggilan orang tua otomatis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 STEPS WORKFLOW SECTION */}
      <section className="py-16 border-b bg-gradient-to-b from-card/40 via-background to-card/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 uppercase">
              Mudah &amp; Cepat
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Alur Penerapan Presensi Sekolah yang Praktis
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Hanya butuh 3 langkah sederhana untuk mendigitalkan seluruh sistem kehadiran di sekolah Anda.
            </p>
          </div>

          {/* 3 Step Visual Flow */}
          <div className="grid md:grid-cols-3 gap-5">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4 relative">
              <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black text-lg">
                1
              </div>
              <h3 className="text-base font-bold text-foreground">Setup Profil &amp; Impor Siswa</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Daftarkan identitas sekolah, tentukan jam masuk dan toleransi keterlambatan, lalu impor daftar siswa dan rombel via Excel dalam hitungan detik.
              </p>
              <div className="text-[11px] font-semibold text-primary flex items-center gap-1">
                <Check className="size-3.5 text-emerald-500" /> Template Excel Otomatis
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4 relative">
              <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-black text-lg">
                2
              </div>
              <h3 className="text-base font-bold text-foreground">Presensi Real-Time Multi-Metode</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Siswa dan guru dapat absen mandiri menggunakan GPS Geofence &amp; Selfie, atau memindai kartu QR Code di kios gerbang sekolah tanpa memerlukan HP.
              </p>
              <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="size-3.5" /> Anti-Titip Absen &amp; Anti-Fake GPS
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4 relative">
              <div className="size-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-black text-lg">
                3
              </div>
              <h3 className="text-base font-bold text-foreground">Rekapitulasi &amp; Laporan Otomatis</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Laporan kehadiran harian, bulanan, dan semester siap dicetak untuk LPJ BOS, evaluasi wali kelas, hingga pengiriman notifikasi WhatsApp ke orang tua.
              </p>
              <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                <Check className="size-3.5" /> Siap Ekspor PDF &amp; Excel
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE PRICING & TIERING TABLE */}
      <section className="py-16 border-b bg-background" id="pricing">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 uppercase">
              Paket &amp; Langganan SaaS
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Investasi Transparan &amp; Fleksibel Sesuai Kebutuhan Sekolah
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Pilih paket yang sesuai dengan jumlah rombel dan skala sekolah Anda. Beli langsung dengan metode termudah via QRIS.
            </p>

            {/* Monthly vs Annual Toggle */}
            <div className="pt-2 flex items-center justify-center">
              <div className="inline-flex items-center p-1.5 rounded-2xl bg-muted border text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    billingCycle === "monthly"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tagihan Bulanan (Mulai Rp 199rb/bln)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("annual")}
                  className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                    billingCycle === "annual"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>Tagihan Tahunan</span>
                  <Badge className="bg-amber-400 text-slate-950 text-[9px] px-2 py-0.2 font-black uppercase">
                    HEMAT 20%
                  </Badge>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Pricing Cards Grid */}
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {/* TIER 1: STARTER */}
            <Card className="border border-border/80 transition-all flex flex-col justify-between bg-card hover:border-primary/50 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/80">
                <Badge variant="outline" className="w-fit text-xs font-bold uppercase text-muted-foreground border-border">
                  Starter
                </Badge>
                <CardTitle className="text-xl font-bold text-foreground mt-2">
                  Starter Sekolah
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cocok untuk SD, TK, atau Bimbingan Belajar skala kecil dengan kebutuhan dasar.
                </p>
                <div className="pt-3">
                  <span className="text-2xl sm:text-3xl font-black text-foreground">Gratis</span>
                  <span className="text-xs text-muted-foreground ml-1">selamanya</span>
                </div>
                <div className="font-mono text-xs font-bold text-primary mt-1">
                  Hingga 6 Rombel • 250 Siswa
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-3 text-xs flex-1">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-3.5 text-emerald-500 shrink-0" />
                    <span>Presensi QR Scanner &amp; Kartu RFID</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-3.5 text-emerald-500 shrink-0" />
                    <span>Mode Offline PWA (Bebas Memori HP)</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-3.5 text-emerald-500 shrink-0" />
                    <span>Rekapitulasi Excel &amp; CSV Standar</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-3.5 text-emerald-500 shrink-0" />
                    <span>GPS Radius 1 Titik Gedung</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground/60 line-through">
                    <X className="size-3.5 text-muted-foreground/70 shrink-0" />
                    <span>Notifikasi WhatsApp Otomatis</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground/60 line-through">
                    <X className="size-3.5 text-muted-foreground/70 shrink-0" />
                    <span>Kustom Logo &amp; Tema White-Label</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-5 border-t border-border/80 bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenCheckout("starter")}
                  className="w-full text-xs font-bold h-10 border-border hover:bg-muted"
                >
                  Mulai Gratis Sekarang
                </Button>
              </div>
            </Card>

            {/* TIER 2: PRO */}
            <Card className="border-2 border-primary bg-card shadow-lg flex flex-col justify-between relative ring-1 ring-primary/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase shadow-xs px-3 py-0.5">
                  POPULER DI SMP &amp; SMA
                </Badge>
              </div>
              <CardHeader className="pb-4 border-b border-border/80">
                <Badge className="w-fit bg-primary/15 text-primary border border-primary/30 text-xs font-bold uppercase">
                  Pro
                </Badge>
                <CardTitle className="text-xl font-bold text-foreground mt-2">
                  Pro Sekolah &amp; Madrasah
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Untuk SMP, SMA, dan MTs/MA dengan pelaporan lengkap dan notifikasi orang tua.
                </p>
                <div className="pt-3">
                  <span className="text-2xl sm:text-3xl font-black text-foreground">
                    {billingCycle === "annual" ? "Rp 1.890.000" : "Rp 199.000"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    {billingCycle === "annual" ? "/ tahun" : "/ bulan"}
                  </span>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    {billingCycle === "annual"
                      ? "Setara ~Rp 157.500/bulan (Hemat Rp 498.000/thn)"
                      : "Hanya ~Rp 165/siswa per bulan"}
                  </p>
                </div>
                <div className="font-mono text-xs font-bold text-primary mt-1">
                  Hingga 24 Rombel • 1.200 Siswa
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-3 text-xs flex-1">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Check className="size-3.5 text-primary shrink-0" />
                    <span>Semua fitur Starter</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-3.5 text-primary shrink-0" />
                    <span>Multi-Campus (3 Titik Lokasi GPS)</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-3.5 text-primary shrink-0" />
                    <span>Subdomain Khusus Tenant Sekolah</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-3.5 text-primary shrink-0" />
                    <span>Notifikasi WhatsApp Orang Tua Otomatis</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-3.5 text-primary shrink-0" />
                    <span>Presensi Guru &amp; GTK Mandiri GPS</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="size-3.5 text-primary shrink-0" />
                    <span>Surat Panggilan BK Otomatis</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-5 border-t border-border/80 bg-primary/5">
                <Button
                  type="button"
                  onClick={() => handleOpenCheckout("pro")}
                  className="w-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md h-10 gap-1.5"
                >
                  <Sparkles className="size-4" /> Pilih Paket Pro
                </Button>
              </div>
            </Card>

            {/* TIER 3: ENTERPRISE */}
            <Card className="border border-border/80 bg-card shadow-md flex flex-col justify-between relative hover:border-amber-500/50 transition-all">
              <div className="absolute -top-3 right-4">
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase shadow-xs px-3 py-0.5">
                  REKOMENDASI YAYASAN &amp; SMK
                </Badge>
              </div>
              <CardHeader className="pb-4 border-b border-border/80">
                <Badge className="w-fit bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-black uppercase">
                  Enterprise
                </Badge>
                <CardTitle className="text-xl font-black text-foreground mt-2 flex items-center gap-1.5">
                  Enterprise <Crown className="size-4 text-amber-500 shrink-0" />
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Untuk SMK Kejuruan, Pesantren Terpadu, &amp; Yayasan Pendidikan Multi-Kampus.
                </p>
                <div className="pt-3">
                  <span className="text-2xl sm:text-3xl font-black text-foreground">
                    {billingCycle === "annual" ? "Rp 3.790.000" : "Rp 399.000"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    {billingCycle === "annual" ? "/ tahun" : "/ bulan"}
                  </span>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                    {billingCycle === "annual"
                      ? "Setara ~Rp 315.800/bulan (Hemat Rp 998.000/thn)"
                      : "Hanya ~Rp 80/siswa per bulan"}
                  </p>
                </div>
                <div className="font-mono text-xs font-black text-amber-600 dark:text-amber-400 mt-1">
                  Hingga 120 Rombel • 5.000 Siswa • Unlimited GTK
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-3 text-xs flex-1">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                    <span>Semua fitur Pro</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                    <span>Full White-Label (Logo &amp; Tema Mandiri)</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                    <span>Kapasitas Rombel Besar &amp; Multi-Scanner</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                    <span>Multi-Campus 15 Titik Lokasi GPS</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                    <span>Sinkronisasi Cloud PostgreSQL &amp; Supabase</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                    <span>Dedicated Support 24/7 &amp; SLA Prioritas</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-5 border-t border-border/80 bg-amber-500/5">
                <Button
                  type="button"
                  onClick={() => handleOpenCheckout("enterprise")}
                  className="w-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md h-10 gap-1.5"
                >
                  <Crown className="size-4" /> Pilih Paket Enterprise
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="py-14 border-b bg-card/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
              Pusat Informasi &amp; Bantuan
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Informasi lengkap seputar implementasi, fitur sistem, dan penggunaan di sekolah.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="rounded-2xl border bg-card overflow-hidden transition-colors">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left p-4.5 sm:p-5 flex items-center justify-between gap-4 font-bold text-sm text-foreground hover:bg-muted/30"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="size-4 text-primary shrink-0" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4.5 pb-5 sm:px-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t bg-muted/10 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BOTTOM CONVERSION CTA */}
      <section className="py-16 bg-gradient-to-b from-primary/10 via-primary/5 to-background border-b">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-6">
          <div className="size-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto shadow-md">
            <School className="size-7" />
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Mulai Transformasi Digital Presensi Sekolah Hari Ini
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Daftarkan sekolah Anda dalam 3 langkah mudah. Tanpa komitmen, tanpa biaya alat mahal, langsung siap pakai untuk siswa dan guru.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => onNavigate("auth_daftar")}
              className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-primary text-primary-foreground shadow-md text-sm"
            >
              Daftarkan Sekolah Sekarang
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                const pricingEl = document.getElementById("pricing");
                if (pricingEl) pricingEl.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold bg-card hover:bg-muted text-sm gap-2 border-border"
            >
              <Layers className="size-4 text-primary" />
              Lihat Pilihan Paket
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t bg-card py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-2xs">
                <Fingerprint className="size-4" />
              </span>
              <div>
                <span className="font-bold text-foreground text-sm">Presensi.app</span>
                <span className="block text-[10px]">SaaS Presensi Multi-Tenant &amp; PWA Sekolah Terpadu</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs flex-wrap">
              <button onClick={() => onNavigate("auth_daftar")} className="hover:text-foreground">
                Pendaftaran Sekolah
              </button>
              <button onClick={() => onNavigate("absen")} className="hover:text-foreground">
                Portal Siswa
              </button>
              <button onClick={() => onNavigate("wali_kelas")} className="hover:text-foreground">
                Portal Wali Kelas
              </button>
              <button onClick={() => {
                const pricingEl = document.getElementById("pricing");
                if (pricingEl) pricingEl.scrollIntoView({ behavior: "smooth" });
              }} className="hover:text-foreground text-primary font-semibold">
                Pilihan Paket
              </button>
              <button onClick={() => onNavigate("auth")} className="hover:text-foreground">
                Masuk Akun
              </button>
            </div>
          </div>

          <div className="pt-4 border-t text-center text-[11px] text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} Presensi.app. Membantu kemajuan pendidikan di seluruh Indonesia.</p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="size-3.5" /> PWA Aktif &amp; Siap Digunakan
              </span>
              <span className="flex items-center gap-1 text-primary font-semibold">
                <ShieldCheck className="size-3.5" /> Standar Keamanan Data
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* QRIS CHECKOUT MODAL DIALOG */}
      <QrisCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        defaultPlan={selectedCheckoutPlan}
        onSuccessActivation={(tier, key) => {
          // Success callback
        }}
      />
    </div>
  );
}
