import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  Fingerprint,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Settings,
  Users,
  QrCode,
  School as SchoolIcon,
  Shield,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Menu,
  X,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Search,
  Download,
  Camera,
  FileText,
  UserCheck,
  Calendar,
  CalendarDays,
  BookOpen,
  Layers,
  FolderKanban,
  UserCog,
  Briefcase,
  Grid,
  HelpCircle,
  Crown,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSchoolStore } from "@/lib/store";
import { RoleSwitcherModal } from "@/components/modals/RoleSwitcherModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme";
import { soundManager } from "@/lib/sound";
import { toast } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string, param?: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  desc?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

export function AppShell({ children, activeView, onNavigate }: AppShellProps) {
  const {
    activeSchool,
    schools,
    setActiveSchoolId,
    currentUser,
    role,
    isSuperAdmin,
    isHomeroomTeacher,
    homeroomClass,
    logout,
    terms,
  } = useSchoolStore();

  const { theme, toggleTheme, isDark } = useTheme();

  // Sidebar states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("presensi_sidebar_collapsed");
      return saved === "true";
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Search & auxiliary state
  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [currentTime, setCurrentTime] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [roleSwitchModalOpen, setRoleSwitchModalOpen] = useState(false);

  // Save sidebar preference
  const toggleSidebarCollapse = () => {
    soundManager.playBeep();
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("presensi_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Live WIB Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      toast.success("Aplikasi Presensiku berhasil diinstal ke perangkat!");
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("Memulai pemasangan aplikasi PWA...");
      }
      setDeferredPrompt(null);
    } else {
      toast.info("Untuk menginstal, buka menu browser lalu pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).");
    }
  };

  const handleToggleSound = () => {
    const newState = soundManager.toggleSound();
    setSoundEnabled(newState);
    if (newState) soundManager.playSuccess();
    toast.success(newState ? "Suara & notifikasi aktif" : "Suara dimatikan");
  };

  const handleNavClick = (viewId: string, param?: string) => {
    soundManager.playBeep();
    if (viewId === "saas_plan") {
      onNavigate("pengaturan", "saas_plan");
    } else {
      onNavigate(viewId, param);
    }
    setMobileSidebarOpen(false);
  };

  // Full Menu Catalog for Sidebar
  const navCategories: NavCategory[] = useMemo(() => {
    // 1. SISWA
    if (role === "student") {
      return [
        {
          id: "presensi_siswa",
          title: "Presensi Mandiri Siswa",
          icon: LayoutDashboard,
          items: [
            { id: "dashboard", label: "Dashboard Siswa", desc: "Status presensi hari ini & ringkasan kehadiran", icon: LayoutDashboard },
            { id: "absen", label: "Presensi Masuk & Pulang", desc: "Absen mandiri selfie kamera & validasi lokasi", icon: Camera },
          ],
        },
        {
          id: "riwayat_siswa",
          title: "Riwayat & Pengajuan Izin",
          icon: CalendarCheck,
          items: [
            { id: "riwayat", label: "Buku Presensi Siswa", desc: "Riwayat absensi harian dan rekap bulanan", icon: CalendarCheck },
            { id: "izin", label: "Pengajuan Surat Izin / Sakit", desc: "Kirim surat izin atau surat dokter ke wali kelas", icon: FileText },
          ],
        },
        {
          id: "akademik_siswa",
          title: "Jadwal & Kalender Sekolah",
          icon: BookOpen,
          items: [
            { id: "jadwal_mingguan", label: "Jadwal Pelajaran (KBM)", desc: "Jadwal mata pelajaran kelas mingguan", icon: Clock },
            { id: "kalender_akademik", label: "Kalender Sekolah", desc: "Agenda kegiatan sekolah, ujian & hari libur", icon: Calendar },
          ],
        },
      ];
    }

    // 2. GURU (Wali Kelas & Guru Mata Pelajaran)
    if (role === "teacher") {
      return [
        {
          id: "presensi_guru",
          title: "Presensi & Supervisi Rombel",
          icon: CalendarCheck,
          items: [
            { id: "dashboard", label: "Dashboard Guru", desc: "Ringkasan presensi kelas & agenda hari ini", icon: LayoutDashboard },
            { id: "presensi", label: "Presensi Harian Siswa", desc: "Lembar absensi masuk & pulang siswa kelas", icon: CalendarCheck },
            { id: "wali_kelas", label: "Portal Wali Kelas", desc: "Supervisi rombel, verifikasi izin, notifikasi WA wali", icon: GraduationCap, badge: homeroomClass?.name || "Binaan" },
            { id: "absen", label: "Kios Scanner QR Siswa", desc: "Tayangkan QR code presensi kelas di proyektor", icon: QrCode },
          ],
        },
        {
          id: "akademik_guru",
          title: "Data Siswa & KBM",
          icon: BookOpen,
          items: [
            { id: "siswa", label: "Data Siswa", desc: "Daftar peserta didik dan kontak orang tua", icon: Users },
            { id: "jadwal_mingguan", label: "Jadwal Pelajaran", desc: "Jadwal kegiatan belajar mengajar (KBM)", icon: Clock },
            { id: "kalender_akademik", label: "Kalender Sekolah", desc: "Agenda kegiatan sekolah & hari libur", icon: Calendar },
            { id: "laporan", label: "Rekap Laporan Presensi", desc: "Laporan kehadiran siswa bulanan & cetak", icon: LineChart },
          ],
        },
      ];
    }

    // 3. ADMIN SEKOLAH & PENGELOLA SISTEM
    return [
      {
        id: "presensi_admin",
        title: "Presensi & Kehadiran",
        icon: CalendarCheck,
        items: [
          { id: "dashboard", label: "Dashboard Presensi", desc: "Statistik kehadiran harian siswa real-time", icon: LayoutDashboard },
          { id: "presensi", label: "Presensi Harian Siswa", desc: "Kelola sesi presensi harian per kelas/sekolah", icon: CalendarCheck },
          { id: "wali_kelas", label: "Portal Wali Kelas", desc: "Pusat supervisi wali kelas & kirim WA wali murid", icon: GraduationCap },
          { id: "absen", label: "Kios Scanner QR & Kartu", desc: "Layar proyektor QR & pembaca kartu absensi", icon: QrCode },
        ],
      },
      {
        id: "master_admin",
        title: "Data Induk Sekolah (Master)",
        icon: FolderKanban,
        items: [
          { id: "siswa", label: "Data Siswa", desc: "Buku induk siswa, NISN, data orang tua & kartu", icon: Users },
          { id: "gtk", label: "Data Guru & Staf", desc: "Daftar guru pendidik dan staf tata usaha", icon: Briefcase },
          { id: "kelas", label: "Kelas & Rombel", desc: "Kelola rombongan belajar dan penetapan wali kelas", icon: Layers },
        ],
      },
      {
        id: "akademik_admin",
        title: "Akademik & Pengaturan",
        icon: Settings,
        items: [
          { id: "jadwal_mingguan", label: "Jadwal Pelajaran", desc: "Pengaturan KBM mingguan per kelas/rombel", icon: Clock },
          { id: "kalender_akademik", label: "Kalender Sekolah", desc: "Agenda pendidikan, ujian semester & libur", icon: Calendar },
          { id: "laporan", label: "Rekap Laporan Presensi", desc: "Cetak format buku presensi, PDF & Excel", icon: LineChart },
          { id: "saas_plan", label: "Paket & Lisensi SaaS", desc: "Status langganan, kuota rombel/siswa, tiering & aktivasi lisensi", icon: Crown, badge: activeSchool?.plan?.plan_tier ? `${activeSchool.plan.plan_tier.toUpperCase()}` : "Enterprise" },
          { id: "pengaturan", label: "Pengaturan Sekolah", desc: "Jam masuk/pulang, koordinat lokasi GPS, logo & WhatsApp", icon: Settings },
        ],
      },
    ];
  }, [role, isHomeroomTeacher, homeroomClass, terms, activeSchool]);

  // Filter items in sidebar based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return navCategories;
    const q = searchQuery.toLowerCase();
    return navCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (it) =>
            it.label.toLowerCase().includes(q) ||
            (it.desc && it.desc.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [navCategories, searchQuery]);

  // Role display label
  const roleDisplayLabel = useMemo(() => {
    if (role === "superadmin") return "Administrator Platform";
    if (role === "admin") return "Admin Sekolah";
    if (isHomeroomTeacher) return `Wali Kelas ${homeroomClass?.name || ""}`;
    if (role === "teacher") return "Guru Pengajar";
    return "Siswa";
  }, [role, isHomeroomTeacher, homeroomClass, terms]);

  // Active view title finder for header
  const activeViewTitle = useMemo(() => {
    for (const cat of navCategories) {
      for (const item of cat.items) {
        if (
          item.id === activeView ||
          (item.id === "presensi" && activeView === "presensi_detail")
        ) {
          return item.label;
        }
      }
    }
    if (activeView === "landing") return "Beranda Utama";
    return "Presensi.app";
  }, [navCategories, activeView]);

  // Render Sidebar Content (Shared between Desktop & Mobile)
  const renderSidebarContent = (isMobile = false) => {
    const isCollapsed = !isMobile && sidebarCollapsed;

    return (
      <div className="flex flex-col h-full bg-card select-none">
        {/* Sidebar Header / Brand */}
        <div className="h-16 px-4 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeSchool?.logo_url ? (
              <div className="size-9 rounded-xl overflow-hidden bg-white border border-border/80 p-1 shadow-2xs shrink-0 flex items-center justify-center">
                <img
                  src={activeSchool.logo_url}
                  alt={activeSchool.name}
                  className="size-full object-contain"
                />
              </div>
            ) : (
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-2xs shrink-0">
                <Fingerprint className="size-5" />
              </span>
            )}

            {!isCollapsed && (
              <div className="min-w-0">
                <button
                  onClick={() => onNavigate("landing")}
                  className="text-left group flex items-center gap-1 focus:outline-none"
                >
                  <span className="font-display text-sm font-black tracking-tight text-foreground leading-none">
                    Presensi<span className="text-primary font-black">.app</span>
                  </span>
                </button>
                <span className="block text-[10px] font-semibold text-muted-foreground truncate max-w-[140px] mt-0.5" title={activeSchool?.name}>
                  {activeSchool?.name || "PWA Smart Attendance"}
                </span>
              </div>
            )}
          </div>

          {/* Toggle Button */}
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="size-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hidden lg:flex"
              onClick={toggleSidebarCollapse}
              title={sidebarCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4 text-primary" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
          )}
        </div>

        {/* Institution & SaaS Plan Strip */}
        {!isCollapsed && (
          <div className="p-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border/70 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <SchoolIcon className="size-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate" title={activeSchool?.name}>
                    {activeSchool?.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {activeSchool?.address || "Sistem Presensi Sekolah"}
                  </p>
                </div>
              </div>
              {activeSchool?.plan?.plan_tier && (
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                    activeSchool.plan.plan_tier === "enterprise"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      : activeSchool.plan.plan_tier === "pro"
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                      : "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30"
                  }`}
                >
                  {activeSchool.plan.plan_tier}
                </span>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative mt-2.5">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu..."
                className="w-full pl-8 pr-3 py-1.5 bg-card border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-4 custom-scrollbar">
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="space-y-1">
              {!isCollapsed && (
                <h4 className="px-2.5 pt-1 pb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                  <cat.icon className="size-3.5 opacity-60" />
                  <span className="truncate">{cat.title}</span>
                </h4>
              )}

              <div className="space-y-0.5">
                {cat.items.map((item) => {
                  const active =
                    activeView === item.id ||
                    (item.id === "presensi" && activeView === "presensi_detail");
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all text-left relative group ${
                        active
                          ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                    >
                      <div
                        className={`size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors"
                        }`}
                      >
                        <Icon className="size-4" />
                      </div>

                      {!isCollapsed && (
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                          <span className="truncate leading-tight">{item.label}</span>
                          {item.badge && (
                            <Badge
                              variant="outline"
                              className={`text-[9px] py-0 px-1 font-bold ${
                                active
                                  ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                                  : "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10"
                              }`}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Active Indicator on Left border when collapsed */}
                      {isCollapsed && active && (
                        <span className="absolute left-1 size-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer / User & Actions */}
        <div className="p-3 border-t border-border/80 bg-muted/20 shrink-0 space-y-2">
          {/* User Profile Pill */}
          <button
            onClick={() => setRoleSwitchModalOpen(true)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border/70 hover:border-primary/40 hover:bg-muted/40 transition-all text-left group shadow-2xs ${
              isCollapsed ? "justify-center p-2" : ""
            }`}
            title="Klik untuk Beralih Hak Akses / Simulasi Peran"
          >
            <div className="size-7.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {currentUser?.full_name?.charAt(0) || "U"}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate leading-tight">
                  {currentUser?.full_name?.split(" ")[0] || "Pengguna"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">
                  {roleDisplayLabel}
                </p>
              </div>
            )}

            {!isCollapsed && (
              <UserCog className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            )}
          </button>

          {/* Action Row: Theme, Sound, Install & Logout */}
          <div className={`flex items-center gap-1 ${isCollapsed ? "flex-col" : "justify-between"}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleSound}
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={soundEnabled ? "Nonaktifkan suara" : "Aktifkan suara audio"}
            >
              {soundEnabled ? <Volume2 className="size-3.5 text-emerald-500" /> : <VolumeX className="size-3.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={isDark ? "Mode Terang" : "Mode Gelap"}
            >
              {isDark ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleInstallPwa}
              className="size-8 rounded-lg text-muted-foreground hover:text-primary"
              title="Pasang Aplikasi PWA"
            >
              <Download className="size-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                soundManager.playBeep();
                logout();
                onNavigate("auth");
              }}
              className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Keluar Sesi"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased selection:bg-primary/20">
      {/* 1. Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border/80 sticky top-0 h-screen transition-all duration-300 z-30 shadow-xs shrink-0 ${
          sidebarCollapsed ? "w-18" : "w-64"
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile Drawer Sidebar (Backdrop + Slide) */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-card border-r border-border shadow-2xl z-10 transition-transform duration-300 animate-in slide-in-from-left">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* 3. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar / Header */}
        <header className="sticky top-0 z-20 border-b border-border/80 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-2xs h-15 flex items-center justify-between px-3 sm:px-6 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden size-9 rounded-xl text-foreground hover:bg-muted"
              onClick={() => {
                soundManager.playBeep();
                setMobileSidebarOpen(true);
              }}
              title="Buka Menu Sidebar"
            >
              <Menu className="size-5" />
            </Button>

            {/* Desktop Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex size-9 rounded-xl text-foreground hover:bg-muted"
              onClick={toggleSidebarCollapse}
              title={sidebarCollapsed ? "Buka Sidebar Lengkap" : "Perkecil Sidebar"}
            >
              <PanelLeft className="size-4.5 text-foreground" />
            </Button>

            {/* Active View Title / Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-display font-extrabold text-sm sm:text-base text-foreground tracking-tight truncate">
                {activeViewTitle}
              </span>
              <span className="hidden sm:inline-block text-xs text-muted-foreground/60">•</span>
              <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground truncate max-w-[200px]" title={activeSchool?.name}>
                {activeSchool?.name}
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Live WIB Clock */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/70 text-[11px] font-mono text-muted-foreground">
              <Clock className="size-3 text-primary animate-pulse" />
              <span>{currentTime || "WIB"}</span>
            </div>

            {/* Role Switcher Pill */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoleSwitchModalOpen(true)}
              className="h-8.5 text-xs font-semibold rounded-xl border-border/80 gap-1.5 shadow-2xs"
              title="Beralih Simulasi Peran (Role)"
            >
              <div className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="hidden sm:inline">{roleDisplayLabel}</span>
              <span className="sm:hidden">Peran</span>
            </Button>

            {/* Home / Landing Page shortcut */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("landing")}
              className="h-8.5 text-xs font-medium rounded-xl text-muted-foreground hover:text-foreground hidden sm:inline-flex"
              title="Kembali ke Beranda Depan"
            >
              Beranda
            </Button>
          </div>
        </header>

        {/* View Main Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 md:py-6">
          {children}
        </main>
      </div>

      {/* Role Switcher Modal */}
      <RoleSwitcherModal
        open={roleSwitchModalOpen}
        onOpenChange={setRoleSwitchModalOpen}
        onNavigate={onNavigate}
      />
    </div>
  );
}

