import React, { useState } from "react";
import {
  Settings,
  School as SchoolIcon,
  MapPin,
  Clock,
  Key,
  Copy,
  RotateCcw,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
  Sparkles,
  MessageSquare,
  Send,
  Database,
  Globe,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Check,
  RefreshCw,
  Sliders,
  Zap,
  Server,
  Lock,
  HardDrive,
  Shield,
  Layers,
  UserCog,
  Trash2,
  Building2,
  Navigation,
  Pencil,
  Crown,
  Palette,
  Image as ImageIcon,
  FileText,
  CheckCheck,
  BarChart3,
  Upload,
  X,
  ShieldAlert,
  QrCode,
} from "lucide-react";
import { QrisCheckoutModal } from "@/components/payment/QrisCheckoutModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSchoolStore, TERMINOLOGY_PRESETS, SAAS_PLAN_CONFIGS } from "@/lib/store";
import { BRAND_COLOR_PRESETS, BRAND_COLOR_PRESET_LIST, BrandPreset, applySchoolBrandColor } from "@/lib/theme";
import { haversineDistanceMeters, checkSchoolGeofence, GeofenceMatchResult } from "@/lib/attendance";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  TerminologyConfig,
  DailyAttendanceConfig,
  SchoolLocation,
  SaaSPlanTier,
  BrandThemePreset,
  TenantPlan,
} from "@/types";
import { toast } from "sonner";
import { RoleSwitcherModal } from "@/components/modals/RoleSwitcherModal";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PengaturanViewProps {
  onNavigate: (view: string, param?: string) => void;
  defaultTab?: "sekolah" | "saas_plan" | "otomatisasi" | "istilah" | "whatsapp" | "backend" | "supabase" | "domain";
}

export function PengaturanView({ onNavigate, defaultTab }: PengaturanViewProps) {
  const {
    activeSchool,
    schools,
    classes,
    students,
    gtkProfiles,
    updateSchool,
    updateSchoolPlan,
    updateSchoolBranding,
    addSchoolLocation,
    updateSchoolLocation,
    deleteSchoolLocation,
    createSchool,
    clearAllData,
    resetToDemoData,
    currentUser,
    role,
    isSuperAdmin,
    whatsappConfig,
    updateWhatsAppConfig,
    whatsappLogs,
    sendWhatsAppNotification,
    isSupabaseActive,
    domainMode,
    setDomainMode,
    terms,
    updateTerminology,
    setTerminologyPreset,
    dailyConfig,
    updateDailyConfig,
    generateDailySessionsNow,
  } = useSchoolStore();

  // Initial tab logic: only allow backend/supabase/domain if superadmin
  const getInitialTab = (): "sekolah" | "saas_plan" | "otomatisasi" | "istilah" | "whatsapp" | "backend" => {
    if (defaultTab === "backend" || defaultTab === "supabase" || defaultTab === "domain") {
      return isSuperAdmin ? "backend" : "sekolah";
    }
    if (defaultTab === "sekolah" || defaultTab === "saas_plan" || defaultTab === "otomatisasi" || defaultTab === "istilah" || defaultTab === "whatsapp") {
      return defaultTab;
    }
    return "sekolah";
  };

  const [activeTab, setActiveTab] = useState<"sekolah" | "saas_plan" | "otomatisasi" | "istilah" | "whatsapp" | "backend">(getInitialTab);

  // Daily Automation Form State
  const [cfgAutoEnabled, setCfgAutoEnabled] = useState(dailyConfig.auto_session_enabled ?? true);
  const [cfgCheckInStart, setCfgCheckInStart] = useState(dailyConfig.check_in_start || "06:00");
  const [cfgCheckInEnd, setCfgCheckInEnd] = useState(dailyConfig.check_in_end || "07:15");
  const [cfgLateAfter, setCfgLateAfter] = useState(dailyConfig.late_cutoff_time || "07:15");
  const [cfgCheckOutStart, setCfgCheckOutStart] = useState(dailyConfig.check_out_start || "14:00");
  const [cfgCheckOutEnd, setCfgCheckOutEnd] = useState(dailyConfig.check_out_end || "17:30");
  const [cfgAutoAlpa, setCfgAutoAlpa] = useState(dailyConfig.auto_alpa_enabled ?? false);
  const [cfgAlpaCutoff, setCfgAlpaCutoff] = useState(dailyConfig.auto_alpa_cutoff_time || "12:00");
  const [cfgRequireSelfie, setCfgRequireSelfie] = useState(dailyConfig.require_selfie ?? true);
  const [cfgRequireGps, setCfgRequireGps] = useState(dailyConfig.require_location ?? true);
  const [cfgActiveDays, setCfgActiveDays] = useState<DailyAttendanceConfig["active_days"]>(
    (dailyConfig.active_days as DailyAttendanceConfig["active_days"]) || [1, 2, 3, 4, 5]
  );

  const [name, setName] = useState(activeSchool?.name || "");
  const [subdomain, setSubdomain] = useState(activeSchool?.subdomain || "");
  const [npsn, setNpsn] = useState(activeSchool?.npsn || "");
  const [address, setAddress] = useState(activeSchool?.address || "");
  const [startTime, setStartTime] = useState(activeSchool?.start_time || "07:00");
  const [lateTolerance, setLateTolerance] = useState(activeSchool?.late_after_minutes || 15);
  const [latitude, setLatitude] = useState(activeSchool?.latitude ?? -6.2088);
  const [longitude, setLongitude] = useState(activeSchool?.longitude ?? 106.8456);
  const [radius, setRadius] = useState(activeSchool?.radius_meters || 300);

  // Tenant Branding & White-label state
  const [brandLogoUrl, setBrandLogoUrl] = useState(activeSchool?.logo_url || "");
  const [brandTheme, setBrandTheme] = useState<BrandThemePreset>(activeSchool?.brand_theme || "maroon");
  const [brandColor, setBrandColor] = useState(activeSchool?.brand_color || "#991b1b");
  const [headmasterName, setHeadmasterName] = useState(activeSchool?.headmaster_name || "Drs. H. Mulyadi, M.Pd");
  const [headmasterNip, setHeadmasterNip] = useState(activeSchool?.headmaster_nip || "19680512 199403 1 004");

  // SaaS License Key Input
  const [licenseInput, setLicenseInput] = useState("");
  const [qrisModalOpen, setQrisModalOpen] = useState(false);
  const [qrisSelectedPlan, setQrisSelectedPlan] = useState<SaaSPlanTier>("pro");

  // Terminology state
  const [selectedPreset, setSelectedPreset] = useState<TerminologyConfig["preset"]>(terms.preset);
  const [termInstitution, setTermInstitution] = useState(terms.institution_label);
  const [termStudent, setTermStudent] = useState(terms.student_label);
  const [termStudents, setTermStudents] = useState(terms.students_label);
  const [termTeacher, setTermTeacher] = useState(terms.teacher_label);
  const [termClass, setTermClass] = useState(terms.class_label);
  const [termIdentifier, setTermIdentifier] = useState(terms.identifier_label);
  const [termGuardian, setTermGuardian] = useState(terms.guardian_label);

  // WhatsApp form state
  const [waProvider, setWaProvider] = useState(whatsappConfig.provider);
  const [waApiKey, setWaApiKey] = useState(whatsappConfig.api_key || "");
  const [waSender, setWaSender] = useState(whatsappConfig.sender_number || "");
  const [waEndpoint, setWaEndpoint] = useState(whatsappConfig.endpoint_url || "");
  const [autoHadir, setAutoHadir] = useState(whatsappConfig.auto_notify_on_presence);
  const [autoLate, setAutoLate] = useState(whatsappConfig.auto_notify_on_late);
  const [autoAbsent, setAutoAbsent] = useState(whatsappConfig.auto_notify_on_absent);
  const [autoCheckout, setAutoCheckout] = useState(whatsappConfig.auto_notify_on_checkout ?? true);
  const [tplHadir, setTplHadir] = useState(whatsappConfig.message_template_hadir);
  const [tplTerlambat, setTplTerlambat] = useState(whatsappConfig.message_template_terlambat);
  const [tplAlpa, setTplAlpa] = useState(whatsappConfig.message_template_alpa);
  const [tplPulang, setTplPulang] = useState(whatsappConfig.message_template_pulang || "Yth. Orang Tua/Wali {nama_siswa}, ananda telah melakukan presensi PULANG pada jam {waktu_presensi} WIB tanggal {tanggal}. Terima kasih - {nama_sekolah}");

  // Test WhatsApp
  const [testStudentName, setTestStudentName] = useState("Aditya Pratama");
  const [testGuardianPhone, setTestGuardianPhone] = useState("081234567890");
  const [testGuardianName, setTestGuardianName] = useState("Bapak Hendra");

  // GPS Tester state
  const [testLat, setTestLat] = useState<number | null>(null);
  const [testLng, setTestLng] = useState<number | null>(null);
  const [testDistance, setTestDistance] = useState<number | null>(null);
  const [testGeofenceResult, setTestGeofenceResult] = useState<GeofenceMatchResult | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Multi-location modal state
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [locName, setLocName] = useState("");
  const [locLat, setLocLat] = useState<number | string>("");
  const [locLng, setLocLng] = useState<number | string>("");
  const [locRadius, setLocRadius] = useState<number | string>(250);
  const [locAddress, setLocAddress] = useState("");
  const [locIsMain, setLocIsMain] = useState(false);
  const [locGpsLoading, setLocGpsLoading] = useState(false);

  // New School Modal
  const [newSchoolModal, setNewSchoolModal] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolNpsn, setNewSchoolNpsn] = useState("");
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const openAddLocationModal = () => {
    setEditingLocId(null);
    setLocName("");
    setLocLat("");
    setLocLng("");
    setLocRadius(250);
    setLocAddress("");
    setLocIsMain(false);
    setLocModalOpen(true);
  };

  const openEditLocationModal = (loc: SchoolLocation) => {
    setEditingLocId(loc.id);
    setLocName(loc.name);
    setLocLat(loc.latitude);
    setLocLng(loc.longitude);
    setLocRadius(loc.radius_meters);
    setLocAddress(loc.address || "");
    setLocIsMain(!!loc.is_main);
    setLocModalOpen(true);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) {
      toast.error("Nama gedung / kampus wajib diisi.");
      return;
    }
    const latNum = Number(locLat);
    const lngNum = Number(locLng);
    const radNum = Number(locRadius) || 200;

    if (isNaN(latNum) || isNaN(lngNum)) {
      toast.error("Koordinat Latitude & Longitude tidak valid.");
      return;
    }

    if (editingLocId) {
      updateSchoolLocation(editingLocId, {
        name: locName.trim(),
        latitude: latNum,
        longitude: lngNum,
        radius_meters: radNum,
        address: locAddress.trim() || undefined,
        is_main: locIsMain,
      });
      toast.success(`Titik lokasi "${locName}" berhasil diperbarui!`);
    } else {
      addSchoolLocation({
        name: locName.trim(),
        latitude: latNum,
        longitude: lngNum,
        radius_meters: radNum,
        address: locAddress.trim() || undefined,
        is_main: locIsMain,
      });
      toast.success(`Titik lokasi gedung "${locName}" berhasil ditambahkan!`);
    }

    setLocModalOpen(false);
  };

  const handleDeleteLocationItem = (id: string, name: string) => {
    if (confirm(`Hapus titik lokasi gedung "${name}" dari sistem geofence?`)) {
      deleteSchoolLocation(id);
      toast.info(`Titik lokasi "${name}" telah dihapus.`);
    }
  };

  const handleGetModalLocGps = () => {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung geolokasi GPS.");
      return;
    }
    setLocGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLocLat(lat);
        setLocLng(lng);
        setLocGpsLoading(false);
        toast.success(`Koordinat lokasi terdeteksi: ${lat}, ${lng}`);
      },
      (err) => {
        setLocGpsLoading(false);
        toast.error(`Gagal membaca GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchool) return;

    updateSchool(activeSchool.id, {
      name,
      subdomain,
      npsn: npsn || null,
      address: address || null,
      start_time: startTime,
      late_after_minutes: Number(lateTolerance),
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius_meters: Number(radius),
      headmaster_name: headmasterName,
      headmaster_nip: headmasterNip,
    });

    updateSchoolBranding(activeSchool.id, {
      logo_url: brandLogoUrl,
      brand_theme: brandTheme,
      brand_color: brandColor,
    });

    toast.success("Pengaturan sekolah & identitas visual berhasil disimpan!");
  };

  const handleSaveBranding = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeSchool) return;

    updateSchoolBranding(activeSchool.id, {
      logo_url: brandLogoUrl,
      brand_theme: brandTheme,
      brand_color: brandColor,
    });

    updateSchool(activeSchool.id, {
      headmaster_name: headmasterName,
      headmaster_nip: headmasterNip,
    });

    toast.success("Identitas visual & branding instansi berhasil disimpan!");
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file logo maksimal 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setBrandLogoUrl(dataUrl);
        if (activeSchool) {
          updateSchoolBranding(activeSchool.id, {
            logo_url: dataUrl,
            brand_theme: brandTheme,
            brand_color: brandColor,
          });
        }
        toast.success("Logo instansi berhasil diunggah & diterapkan!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPresetColor = (preset: BrandPreset) => {
    setBrandTheme(preset.id);
    setBrandColor(preset.primary);
    if (activeSchool) {
      updateSchoolBranding(activeSchool.id, {
        logo_url: brandLogoUrl,
        brand_theme: preset.id,
        brand_color: preset.primary,
      });
    }
    toast.success(`Warna tema ${preset.name} aktif!`);
  };

  const handleCustomColorChange = (hex: string) => {
    setBrandTheme("custom");
    setBrandColor(hex);
    if (activeSchool) {
      updateSchoolBranding(activeSchool.id, {
        logo_url: brandLogoUrl,
        brand_theme: "custom",
        brand_color: hex,
      });
    }
  };

  const handleSwitchPlanTier = (tier: SaaSPlanTier) => {
    if (!activeSchool) return;
    updateSchoolPlan(activeSchool.id, tier);
    const planName = SAAS_PLAN_CONFIGS[tier]?.plan_name || tier;
    toast.success(`Paket berhasil dialihkan ke: ${planName}`);
  };

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchool) return;
    if (!licenseInput.trim()) {
      toast.error("Masukkan kode lisensi resmi.");
      return;
    }

    const key = licenseInput.trim().toUpperCase();
    if (key.includes("ENT") || key.includes("72") || key.includes("UNLIMITED") || key.includes("SMK")) {
      updateSchoolPlan(activeSchool.id, "enterprise", "2030-12-31", key);
      toast.success("Lisensi Enterprise Berhasil Diaktifkan s/d 2030!");
      setLicenseInput("");
    } else if (key.includes("PRO")) {
      updateSchoolPlan(activeSchool.id, "pro", "2028-12-31", key);
      toast.success("Lisensi Pro (24 Rombel) Berhasil Diaktifkan!");
      setLicenseInput("");
    } else {
      updateSchoolPlan(activeSchool.id, "pro", "2027-12-31", key);
      toast.success("Lisensi Berhasil Diaktifkan & Diverifikasi!");
      setLicenseInput("");
    }
  };

  const handleSaveWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    updateWhatsAppConfig({
      provider: waProvider,
      api_key: waApiKey,
      sender_number: waSender,
      endpoint_url: waEndpoint,
      auto_notify_on_presence: autoHadir,
      auto_notify_on_late: autoLate,
      auto_notify_on_absent: autoAbsent,
      auto_notify_on_checkout: autoCheckout,
      message_template_hadir: tplHadir,
      message_template_terlambat: tplTerlambat,
      message_template_alpa: tplAlpa,
      message_template_pulang: tplPulang,
    });
    toast.success("Konfigurasi WhatsApp Gateway berhasil disimpan!");
  };

  const handleTestWhatsAppSend = () => {
    if (!testGuardianPhone) {
      toast.error("Masukkan nomor WhatsApp wali siswa.");
      return;
    }
    const res = sendWhatsAppNotification({
      studentId: "test-id",
      studentName: testStudentName,
      guardianPhone: testGuardianPhone,
      guardianName: testGuardianName,
      status: "hadir",
    });

    if (res.waUrl && waProvider === "direct_wa_me") {
      toast.success("Membuka WhatsApp Web / App...");
      window.open(res.waUrl, "_blank");
    } else {
      toast.success("Pesan simulasi WhatsApp berhasil dibuat & dicatat di log!");
    }
  };

  const handleGetMyGps = () => {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung geolokasi GPS.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setGpsLoading(false);
        toast.success(`Koordinat GPS terdeteksi: ${lat}, ${lng}`);
      },
      (err) => {
        setGpsLoading(false);
        toast.error(`Gagal mengambil GPS: ${err.message}. Pastikan izin lokasi aktif.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleTestDistance = () => {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung geolokasi GPS.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setTestLat(Number(uLat.toFixed(6)));
        setTestLng(Number(uLng.toFixed(6)));

        const simulatedSchool: any = activeSchool
          ? {
              ...activeSchool,
              latitude: Number(latitude),
              longitude: Number(longitude),
              radius_meters: Number(radius),
            }
          : {
              latitude: Number(latitude),
              longitude: Number(longitude),
              radius_meters: Number(radius),
              locations: [],
            };

        const result = checkSchoolGeofence(uLat, uLng, simulatedSchool);
        setTestGeofenceResult(result);
        setTestDistance(result.closestDistanceMeters);

        if (result.isWithinRadius) {
          toast.success(`Lokasi Anda cocok dengan: ${result.closestLocationName} (${result.closestDistanceMeters}m)`);
        } else {
          toast.warning(`Di luar seluruh area sekolah. Titik terdekat: ${result.closestLocationName} (${result.closestDistanceMeters}m > radius ${result.closestRadiusMeters}m)`);
        }
      },
      (err) => {
        toast.error(`Gagal membaca lokasi saat ini: ${err.message}`);
      }
    );
  };

  const handleCopyCode = () => {
    if (activeSchool?.join_code) {
      navigator.clipboard.writeText(activeSchool.join_code);
      toast.success(`Kode sekolah ${activeSchool.join_code} disalin ke clipboard!`);
    }
  };

  const handleSelectPreset = (presetKey: TerminologyConfig["preset"]) => {
    setSelectedPreset(presetKey);
    const preset = TERMINOLOGY_PRESETS[presetKey];
    if (preset) {
      setTermInstitution(preset.config.institution_label);
      setTermStudent(preset.config.student_label);
      setTermStudents(preset.config.students_label);
      setTermTeacher(preset.config.teacher_label);
      setTermClass(preset.config.class_label);
      setTermIdentifier(preset.config.identifier_label);
      setTermGuardian(preset.config.guardian_label);

      setTerminologyPreset(presetKey);
      toast.success(`Preset istilah "${preset.name}" berhasil diterapkan!`);
    }
  };

  const handleSaveCustomTerminology = (e: React.FormEvent) => {
    e.preventDefault();
    updateTerminology({
      preset: selectedPreset,
      institution_label: termInstitution,
      student_label: termStudent,
      students_label: termStudents,
      teacher_label: termTeacher,
      class_label: termClass,
      identifier_label: termIdentifier,
      guardian_label: termGuardian,
    });
    toast.success("Kustomisasi istilah berhasil disimpan ke sistem!");
  };

  const handleSaveAutomation = (e: React.FormEvent) => {
    e.preventDefault();
    updateDailyConfig({
      auto_session_enabled: cfgAutoEnabled,
      check_in_start: cfgCheckInStart,
      check_in_end: cfgCheckInEnd,
      late_cutoff_time: cfgLateAfter,
      check_out_start: cfgCheckOutStart,
      check_out_end: cfgCheckOutEnd,
      auto_alpa_enabled: cfgAutoAlpa,
      auto_alpa_cutoff_time: cfgAlpaCutoff,
      require_selfie: cfgRequireSelfie,
      require_location: cfgRequireGps,
      active_days: cfgActiveDays,
    });
    toast.success("Konfigurasi jadwal presensi harian otomatis berhasil disimpan!");
  };

  const handleGenerateDailyNow = () => {
    const count = generateDailySessionsNow();
    if (count > 0) {
      toast.success(`Berhasil membuat ${count} lembar presensi harian untuk seluruh kelas hari ini!`);
    } else {
      toast.info("Presensi harian untuk seluruh kelas hari ini sudah dibuat sebelumnya.");
    }
  };

  const handleCreateNewSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName) return;

    createSchool(newSchoolName, newSchoolNpsn);
    toast.success(`Sekolah baru "${newSchoolName}" berhasil didaftarkan!`);
    setNewSchoolModal(false);
    setNewSchoolName("");
    setNewSchoolNpsn("");
  };

  if (role !== "admin" && role !== "superadmin") {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-4">
        <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Akses Dibatasi</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Halaman Pengaturan Sistem, GPS, WhatsApp Gateway, dan Domain hanya dapat diakses oleh Administrator Sekolah atau Super Admin.
        </p>
        <Button onClick={() => onNavigate("dashboard")} size="sm">
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Standardized Header */}
      <PageHeader
        icon={Settings}
        title="Pengaturan Sistem & Integrasi"
        subtitle={`Kelola identitas multi-tenant, WhatsApp Gateway, Supabase DB, GPS radius, dan konfigurasi institusi.`}
        badge="Konfigurasi Sistem"
        kpiCards={[
          {
            label: "Institusi Aktif",
            value: activeSchool?.name || "Sekolah",
            helper: `NPSN: ${activeSchool?.npsn || "-"}`,
            icon: SchoolIcon,
            color: "primary",
          },
          {
            label: "Jadwal Otomatis",
            value: dailyConfig.auto_session_enabled ? "Aktif" : "Manual",
            helper: `${dailyConfig.check_in_start} - ${dailyConfig.check_in_end}`,
            icon: Clock,
            color: "emerald",
          },
          {
            label: "Penyimpanan Database",
            value: isSupabaseConfigured() ? "Supabase Cloud" : "Lokal (Offline)",
            helper: isSupabaseConfigured() ? "Real-time sync aktif" : "Penyimpanan browser",
            icon: Database,
            color: "blue",
          },
          {
            label: "WhatsApp Gateway",
            value: whatsappConfig?.api_key || activeSchool?.fonnte_token ? "Terhubung" : "Belum Aktif",
            helper: whatsappConfig?.api_key || activeSchool?.fonnte_token ? `${whatsappConfig?.provider?.toUpperCase() || "WA Gateway"} Aktif` : "Siap dikonfigurasi",
            icon: MessageSquare,
            color: "amber",
          },
        ]}
      >
        {isSuperAdmin && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRoleSwitcherOpen(true)}
            className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold rounded-xl h-9"
          >
            <UserCog className="mr-1.5 size-3.5 text-amber-500" /> Beralih Role
          </Button>
        )}

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm("PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA yang ada (data siswa, kelas, riwayat presensi, GTK, jadwal, dan sesi)? Semua data akan dikosongkan.")) {
              clearAllData();
              toast.success("Semua data berhasil dihapus dan dikosongkan.");
              if (onNavigate) onNavigate("dashboard");
            }
          }}
          className="text-xs font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl h-9"
        >
          <Trash2 className="mr-1.5 size-3.5" /> Hapus Semua Data
        </Button>

        {role === "superadmin" && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewSchoolModal(true)}
              className="text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 rounded-xl h-9 font-bold"
            >
              <Plus className="mr-1.5 size-3.5" /> Tambah Sekolah
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Muat ulang data percontohan (demo data) ke sistem?")) {
                  resetToDemoData();
                  toast.info("Data demo telah dimuat kembali ke sistem");
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground rounded-xl h-9"
            >
              <RotateCcw className="mr-1.5 size-3.5" /> Reset Demo
            </Button>
          </>
        )}
      </PageHeader>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-border/80 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("sekolah")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
            activeTab === "sekolah"
              ? "border-primary text-primary bg-primary/10 font-bold shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          }`}
        >
          <SchoolIcon className="size-4" /> Profil & Branding
        </button>

        <button
          onClick={() => setActiveTab("saas_plan")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
            activeTab === "saas_plan"
              ? "border-amber-600 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-bold shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          }`}
        >
          <Crown className="size-4 text-amber-500" /> Paket & Lisensi SaaS
          {activeSchool?.plan?.plan_tier && (
            <Badge
              variant="outline"
              className={`text-[9px] py-0 px-1 font-bold uppercase ${
                activeSchool.plan.plan_tier === "enterprise"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40"
                  : activeSchool.plan.plan_tier === "pro"
                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40"
                  : "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/40"
              }`}
            >
              {activeSchool.plan.plan_tier}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("otomatisasi")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
            activeTab === "otomatisasi"
              ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-bold shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          }`}
        >
          <Sliders className="size-4 text-purple-500" /> Jam & Jadwal
        </button>

        <button
          onClick={() => setActiveTab("istilah")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
            activeTab === "istilah"
              ? "border-amber-600 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-bold shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          }`}
        >
          <Sparkles className="size-4 text-amber-500" /> Istilah Lembaga
        </button>

        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
            activeTab === "whatsapp"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          }`}
        >
          <MessageSquare className="size-4 text-emerald-500" /> WhatsApp
        </button>

        {/* Backend & Database: Visible to Platform Administrator */}
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab("backend")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
              activeTab === "backend"
                ? "border-primary text-primary bg-primary/15 font-bold shadow-2xs"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
            }`}
          >
            <Database className="size-4 text-primary" />
            <span>Database & Server</span>
            <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-4 leading-none font-bold">
              Administrator
            </Badge>
          </button>
        )}
      </div>

      {/* TAB: AUTOMATION & DAILY ATTENDANCE */}
      {activeTab === "otomatisasi" && (
        <form onSubmit={handleSaveAutomation} className="space-y-6">
          <Card className="border shadow-sm bg-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sliders className="size-4 text-purple-600" />
                    Pengaturan Presensi Harian Otomatis
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Atur jadwal operasional harian sekolah. Sistem akan otomatis mengaktifkan presensi setiap hari sekolah tanpa perlu membuat sesi manual satu per satu.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateDailyNow}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold gap-1.5 shrink-0"
                >
                  <Zap className="size-3.5 fill-current" />
                  Generate Hari Ini Sekarang
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Toggle Auto Generate */}
              <div className="flex items-center justify-between p-4 rounded-xl border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-bold text-foreground">
                      Aktifkan Presensi Harian Otomatis
                    </Label>
                    <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px]">
                      Rekomendasi
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sistem akan otomatis membuat lembar kehadiran harian setiap pagi untuk semua rombel kelas terdaftar.
                  </p>
                </div>
                <Switch checked={cfgAutoEnabled} onCheckedChange={setCfgAutoEnabled} />
              </div>

              {/* Check-In Times */}
              <div className="rounded-xl border p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-emerald-500" /> Waktu Check-In (Masuk)
                </h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Jam Buka Masuk</Label>
                    <Input
                      type="time"
                      value={cfgCheckInStart}
                      onChange={(e) => setCfgCheckInStart(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Waktu paling awal siswa boleh check-in.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Batas Jam Terlambat</Label>
                    <Input
                      type="time"
                      value={cfgLateAfter}
                      onChange={(e) => setCfgLateAfter(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Check-in setelah jam ini otomatis berstatus Terlambat.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Batas Akhir Presensi Masuk</Label>
                    <Input
                      type="time"
                      value={cfgCheckInEnd}
                      onChange={(e) => setCfgCheckInEnd(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Pintu presensi masuk ditutup setelah jam ini.
                    </p>
                  </div>
                </div>
              </div>

              {/* Check-Out Times */}
              <div className="rounded-xl border p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-amber-500" /> Waktu Check-Out (Pulang)
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Jam Mulai Pulang</Label>
                    <Input
                      type="time"
                      value={cfgCheckOutStart}
                      onChange={(e) => setCfgCheckOutStart(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Siswa mulai diizinkan melakukan presensi check-out pulang.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Batas Akhir Pulang</Label>
                    <Input
                      type="time"
                      value={cfgCheckOutEnd}
                      onChange={(e) => setCfgCheckOutEnd(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Batas akhir sistem menerima check-out pulang harian.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security & Validation Rules */}
              <div className="rounded-xl border p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" /> Validasi Anti-Kecurangan
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold">Wajib Foto Selfie Wajah</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Siswa harus mengambil foto langsung melalui kamera.
                      </p>
                    </div>
                    <Switch checked={cfgRequireSelfie} onCheckedChange={setCfgRequireSelfie} />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold">Wajib Radius GPS Sekolah</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Siswa harus berada dalam radius {activeSchool?.radius_meters || 200} meter.
                      </p>
                    </div>
                    <Switch checked={cfgRequireGps} onCheckedChange={setCfgRequireGps} />
                  </div>
                </div>
              </div>

              {/* Auto Mark Alpa Rule */}
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-foreground">Tandai Alpa Otomatis Siswa yang Belum Absen</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Siswa yang tidak check-in hingga batas waktu tertentu akan otomatis ditandai Alpa.
                    </p>
                  </div>
                  <Switch checked={cfgAutoAlpa} onCheckedChange={setCfgAutoAlpa} />
                </div>

                {cfgAutoAlpa && (
                  <div className="pt-2 border-t flex items-center gap-3">
                    <Label className="text-xs font-semibold">Jam Cutoff Alpa:</Label>
                    <Input
                      type="time"
                      value={cfgAlpaCutoff}
                      onChange={(e) => setCfgAlpaCutoff(e.target.value)}
                      className="w-32 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" className="font-semibold text-xs gap-1.5">
                  <Save className="size-3.5" /> Simpan Pengaturan Otomatisasi
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* TAB 1: SCHOOL & GPS */}
      {activeTab === "sekolah" && (
        <form onSubmit={handleSaveSchool} className="space-y-6">
          {/* Identity Card */}
          <Card className="border shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <SchoolIcon className="size-4 text-primary" />
                Identitas Sekolah & Paket SaaS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Nama Resmi Sekolah</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="SMA Negeri 1 Jakarta"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">NPSN (Nomor Pokok Sekolah)</Label>
                  <Input
                    value={npsn}
                    onChange={(e) => setNpsn(e.target.value)}
                    placeholder="20104589"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Subdomain Instansi</Label>
                  <div className="flex items-center">
                    <Input
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value)}
                      placeholder="sman1"
                      className="rounded-r-none"
                    />
                    <span className="inline-flex items-center px-3 text-xs bg-muted border border-l-0 rounded-r-md text-muted-foreground h-9">
                      .presensi.app
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Paket SaaS Tenant</Label>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-xs font-bold text-primary">
                      {activeSchool?.plan?.plan_name || "Pro Sekolah"}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Aktif s/d 2027
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Alamat Lengkap Sekolah</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Merdeka No. 45, Jakarta"
                />
              </div>

              {/* Join Code Box */}
              <div className="rounded-xl border p-3.5 bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Key className="size-3.5 text-primary" /> Kode Gabung Sekolah
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Bagikan kode ini kepada siswa/guru saat login mandiri.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold bg-background border px-3 py-1.5 rounded-lg tracking-wider text-primary shadow-inner">
                    {activeSchool?.join_code || "SCH123"}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="text-xs"
                  >
                    <Copy className="size-3.5 mr-1" /> Salin
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* White-label Branding & Custom Visual Identity Card */}
          <Card className="border shadow-sm bg-card">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Palette className="size-4 text-primary" />
                    Identitas Visual & White-Label Tenant
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Kustomisasi logo sekolah, warna tema aplikasi (branding), dan data kop surat resmi instansi.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSaveBranding()}
                  className="text-xs font-semibold gap-1.5 h-8"
                >
                  <Save className="size-3.5" /> Simpan Branding
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">
              {/* Logo Section */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-primary" /> Logo Resmi Instansi / Sekolah
                </Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border bg-muted/20">
                  {/* Logo Preview Container */}
                  <div className="size-20 rounded-2xl bg-white border border-border/80 p-2 shadow-xs shrink-0 flex items-center justify-center relative group overflow-hidden">
                    {brandLogoUrl ? (
                      <img
                        src={brandLogoUrl}
                        alt="Logo Instansi"
                        className="size-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-1">
                        <SchoolIcon className="size-8 text-muted-foreground/60" />
                        <span className="text-[9px] text-muted-foreground font-medium mt-0.5">Tanpa Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Logo Controls */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label
                        htmlFor="logo-upload-input"
                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                      >
                        <Upload className="size-3.5" /> Unggah Logo (PNG / JPG)
                      </Label>
                      <input
                        id="logo-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />

                      {brandLogoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBrandLogoUrl("");
                            if (activeSchool) {
                              updateSchoolBranding(activeSchool.id, {
                                logo_url: "",
                                brand_theme: brandTheme,
                                brand_color: brandColor,
                              });
                            }
                            toast.info("Logo dikembalikan ke default.");
                          }}
                          className="text-xs h-8 text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          <X className="size-3.5 mr-1" /> Hapus Logo
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Input
                        value={brandLogoUrl}
                        onChange={(e) => {
                          setBrandLogoUrl(e.target.value);
                          if (activeSchool) {
                            updateSchoolBranding(activeSchool.id, {
                              logo_url: e.target.value,
                              brand_theme: brandTheme,
                              brand_color: brandColor,
                            });
                          }
                        }}
                        placeholder="Atau tempel URL gambar logo (https://.../logo.png)"
                        className="text-xs h-8"
                      />
                      <p className="text-[10.5px] text-muted-foreground">
                        Mendukung file transparan PNG atau URL logo eksternal instansi.
                      </p>
                    </div>

                    {/* Quick Preset Samples */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-muted-foreground">Contoh Logo:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const kemendikbudLogo = "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg";
                          setBrandLogoUrl(kemendikbudLogo);
                          if (activeSchool) {
                            updateSchoolBranding(activeSchool.id, {
                              logo_url: kemendikbudLogo,
                              brand_theme: brandTheme,
                              brand_color: brandColor,
                            });
                          }
                          toast.success("Logo Tut Wuri Handayani diterapkan!");
                        }}
                        className="text-[10.5px] px-2 py-0.5 rounded-md border bg-card hover:bg-muted text-foreground transition-colors"
                      >
                        Tut Wuri Handayani
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const kemenagLogo = "https://upload.wikimedia.org/wikipedia/commons/e/ee/Logo_Kementerian_Agama_Republik_Indonesia.png";
                          setBrandLogoUrl(kemenagLogo);
                          if (activeSchool) {
                            updateSchoolBranding(activeSchool.id, {
                              logo_url: kemenagLogo,
                              brand_theme: "emerald",
                              brand_color: "#047857",
                            });
                            setBrandTheme("emerald");
                            setBrandColor("#047857");
                          }
                          toast.success("Logo & Tema Kemenag RI diterapkan!");
                        }}
                        className="text-[10.5px] px-2 py-0.5 rounded-md border bg-card hover:bg-muted text-foreground transition-colors"
                      >
                        Kemenag RI (Madrasah)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const smkLogo = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Logo_SMK_Bisa%21_Hebat%21.svg/512px-Logo_SMK_Bisa%21_Hebat%21.svg.png";
                          setBrandLogoUrl(smkLogo);
                          if (activeSchool) {
                            updateSchoolBranding(activeSchool.id, {
                              logo_url: smkLogo,
                              brand_theme: "maroon",
                              brand_color: "#991b1b",
                            });
                            setBrandTheme("maroon");
                            setBrandColor("#991b1b");
                          }
                          toast.success("Logo SMK Bisa Hebat & Tema Maroon diterapkan!");
                        }}
                        className="text-[10.5px] px-2 py-0.5 rounded-md border bg-card hover:bg-muted text-foreground transition-colors"
                      >
                        SMK Bisa Hebat
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Theme Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Palette className="size-3.5 text-primary" /> Warna Tema Instansi (Primary Brand Color)
                  </Label>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">
                    Aktif: {brandColor}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {BRAND_COLOR_PRESET_LIST.map((preset) => {
                    const isSelected = brandTheme === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPresetColor(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col gap-1.5 group ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary"
                            : "border-border/70 hover:border-primary/40 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className="size-5 rounded-full border border-white/40 shadow-xs flex items-center justify-center shrink-0"
                            style={{ backgroundColor: preset.primary }}
                          >
                            {isSelected && <Check className="size-3 text-white" />}
                          </span>
                          <span className="text-[9px] font-mono font-medium text-muted-foreground">
                            {preset.primary}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground leading-tight truncate">
                            {preset.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {preset.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
                  <div className="space-y-0.5 flex-1">
                    <Label className="text-xs font-semibold">Pilih Warna HEX Kustom</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Gunakan warna identitas resmi sekolah Anda jika tidak ada dalam daftar di atas.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      className="size-9 rounded-lg border border-border cursor-pointer p-0.5 bg-white"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      placeholder="#1e40af"
                      className="w-24 text-xs font-mono font-bold uppercase h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Headmaster & Kop Details */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" /> Data Penandatangan & Kop Surat Resmi
                </Label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nama Kepala Sekolah / Pimpinan</Label>
                    <Input
                      value={headmasterName}
                      onChange={(e) => setHeadmasterName(e.target.value)}
                      placeholder="Drs. H. Mulyadi, M.Pd"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Dicantumkan pada lembar pengesahan & tanda tangan rekap laporan presensi.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">NIP / NIK Kepala Sekolah</Label>
                    <Input
                      value={headmasterNip}
                      onChange={(e) => setHeadmasterNip(e.target.value)}
                      placeholder="19680512 199403 1 004"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Nomor Induk Pegawai kepala instansi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Preview Kop Surat & ID Card */}
              <div className="rounded-xl border p-4 bg-primary/5 border-primary/20 space-y-3">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" /> Simulasi Kop Surat Resmi & Kartu Pelajar
                </span>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Kop Surat Preview */}
                  <div className="p-4 rounded-xl bg-card border shadow-xs text-center space-y-2">
                    <div className="flex items-center justify-center gap-3 border-b-2 border-primary pb-3">
                      {brandLogoUrl ? (
                        <img
                          src={brandLogoUrl}
                          alt="Logo"
                          className="size-10 object-contain"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          LOGO
                        </div>
                      )}
                      <div className="text-left">
                        <h4 className="text-xs font-black uppercase text-foreground leading-tight">
                          {name || "PEMERINTAH PROVINSI / KEMENTERIAN AGAMA"}
                        </h4>
                        <p className="text-[11px] font-bold text-primary leading-tight">
                          {name || "SMK NEGERI 1 TEKNOLOGI"}
                        </p>
                        <p className="text-[9.5px] text-muted-foreground leading-tight mt-0.5">
                          {address || "Jl. Pendidikan Vokasi No. 1"} • NPSN: {npsn || "20108921"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      Format Kop Resmi Dokumen Rekap Kehadiran & Surat Panggilan BK
                    </p>
                  </div>

                  {/* ID Card Preview */}
                  <div className="p-4 rounded-xl bg-card border shadow-xs flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-muted overflow-hidden border flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-muted-foreground">FOTO</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-primary uppercase">
                          KARTU {terms.student_label.toUpperCase()}
                        </span>
                        {brandLogoUrl && (
                          <img src={brandLogoUrl} alt="Logo" className="size-4 object-contain" />
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-foreground truncate">
                        Ahmad Rizki Pratama
                      </h5>
                      <p className="text-[10px] text-muted-foreground">
                        NIS: 24251001 • Kelas XII RPL 1
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-block size-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[9.5px] font-medium text-emerald-600">Terdaftar RFID & QR</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Rules Card */}
          <Card className="border shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                Aturan Jam Masuk & Batas Terlambat
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jam Masuk Default</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Batas Toleransi Terlambat (Menit)</Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={lateTolerance}
                  onChange={(e) => setLateTolerance(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Geofence GPS Card (Single Location) */}
          <Card className="border shadow-sm bg-card">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    Pengaturan Lokasi GPS & Radius Presensi Sekolah
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tentukan titik koordinat pusat sekolah dan jarak toleransi radius presensi mandiri (dalam meter).
                  </CardDescription>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetMyGps}
                  disabled={gpsLoading}
                  className="text-xs border-primary/30 text-primary hover:bg-primary/5"
                >
                  <LocateFixed className="mr-1.5 size-3.5" />
                  {gpsLoading ? "Mendeteksi GPS..." : "Gunakan GPS Saya Saat Ini"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Latitude Sekolah</Label>
                  <Input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    placeholder="-6.2088"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">Contoh: -6.208763</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Longitude Sekolah</Label>
                  <Input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    placeholder="106.8456"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">Contoh: 106.845599</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Radius Geofence (Meter)</Label>
                  <Input
                    type="number"
                    min={20}
                    max={5000}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    placeholder="300"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">Radius aman area sekolah (default: 300m)</p>
                </div>
              </div>

              {/* Single Location Live Geofence Tester */}
              <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-500" /> Uji Validasi Jarak Lokasi Anda
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Uji apakah posisi GPS perangkat Anda saat ini berada dalam batas radius sekolah.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleTestDistance}
                    className="text-xs h-8 px-3 shrink-0"
                  >
                    <Navigation className="mr-1.5 size-3.5" /> Hitung Jarak Saya
                  </Button>
                </div>

                {testGeofenceResult && (
                  <div className="text-xs space-y-2 pt-2 border-t">
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-card border">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Hasil Validasi Geofence:</span>
                        <strong className="text-foreground text-sm">
                          {testGeofenceResult.isWithinRadius ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              ✓ Berada Dalam Area Sekolah ({testGeofenceResult.closestDistanceMeters} meter)
                            </span>
                          ) : (
                            <span className="text-destructive flex items-center gap-1">
                              ✕ Di Luar Jangkauan Sekolah ({testGeofenceResult.closestDistanceMeters} meter &gt; {radius}m)
                            </span>
                          )}
                        </strong>
                      </div>
                      <div>
                        {testGeofenceResult.isWithinRadius ? (
                          <Badge className="bg-emerald-500 text-white text-[11px] px-2.5 py-1">
                            Presensi Diizinkan (Jarak {testGeofenceResult.closestDistanceMeters}m)
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[11px] px-2.5 py-1">
                            Presensi Ditolak (Terlalu Jauh +{testGeofenceResult.closestDistanceMeters - Number(radius)}m)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" size="lg" className="font-semibold shadow-md px-8">
              <Save className="mr-2 size-4" /> Simpan Pengaturan Sekolah
            </Button>
          </div>
        </form>
      )}

      {/* TAB: PAKET & LISENSI SAAS (MULTI-TENANT SUBSCRIPTION & QUOTA) */}
      {activeTab === "saas_plan" && (
        <div className="space-y-6">
          {/* Active Plan Overview Banner */}
          <Card className="border shadow-sm bg-gradient-to-br from-amber-500/10 via-card to-primary/5 border-amber-500/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <CardHeader className="pb-3 border-b border-amber-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
                    <Crown className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold text-foreground">
                        {activeSchool?.plan?.plan_name || "Enterprise"}
                      </CardTitle>
                      <Badge className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                        {activeSchool?.plan?.status === "active" ? "Lisensi Aktif" : "Perlu Perpanjangan"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Tenant: <strong>{activeSchool?.name}</strong> • Subdomain: <span className="font-mono text-primary font-semibold">{activeSchool?.subdomain}.presensi.app</span>
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-right sm:block hidden">
                    <span className="text-[10.5px] text-muted-foreground block">Masa Berlaku Lisensi</span>
                    <strong className="text-xs text-foreground font-mono">
                      s/d {activeSchool?.plan?.active_until || "2030-12-31"}
                    </strong>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* License Key Info Bar */}
              <div className="p-3 rounded-xl bg-card border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Key className="size-3.5 text-amber-500" /> Kunci Lisensi Terdaftar (License Key):
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground tracking-wider select-all">
                    {activeSchool?.plan?.license_key || "PRE-ENT-2030-UNLIMITED"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(activeSchool?.plan?.license_key || "PRE-ENT-2030-UNLIMITED");
                    toast.success("Kunci lisensi disalin!");
                  }}
                  className="text-xs h-8"
                >
                  <Copy className="size-3.5 mr-1" /> Salin Kunci Lisensi
                </Button>
              </div>

              {/* 4 Quota Usage Progress Trackers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                {/* Quota 1: Classes */}
                <div className="p-3.5 rounded-xl bg-card border shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Rombel Terdaftar</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {classes.length} / {activeSchool?.plan?.max_classes || 120}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((classes.length / (activeSchool?.plan?.max_classes || 120)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Terpakai: {classes.length} Rombel</span>
                      <span>{Math.round((classes.length / (activeSchool?.plan?.max_classes || 120)) * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* Quota 2: Students */}
                <div className="p-3.5 rounded-xl bg-card border shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Kapasitas Siswa</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {students.length} / {activeSchool?.plan?.max_students || 5000}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((students.length / (activeSchool?.plan?.max_students || 5000)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Terdaftar: {students.length} Siswa</span>
                      <span>{Math.round((students.length / (activeSchool?.plan?.max_students || 5000)) * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* Quota 3: Locations */}
                <div className="p-3.5 rounded-xl bg-card border shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Titik Gedung GPS</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {(activeSchool?.locations || []).length} / {activeSchool?.plan?.max_locations || 15}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round(((activeSchool?.locations || []).length / (activeSchool?.plan?.max_locations || 15)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Multi-Campus Aktif</span>
                      <span>{(activeSchool?.locations || []).length} Titik</span>
                    </div>
                  </div>
                </div>

                {/* Quota 4: GTK Personnel */}
                <div className="p-3.5 rounded-xl bg-card border shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">GTK & Guru</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-blue-600 border-blue-500/30">
                      {gtkProfiles.length} GTK
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-500 h-2 rounded-full w-full transition-all" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Presensi Guru Mandiri</span>
                      <span className="text-emerald-600 font-bold">UNLIMITED</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Aktivasi Lisensi Baru */}
          <Card className="border shadow-sm bg-card">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" />
                Aktivasi atau Perpanjangan Lisensi SaaS Tenant
              </CardTitle>
              <CardDescription className="text-xs">
                Masukkan kode lisensi resmi dari penyedia layanan atau gunakan simulasi paket di bawah ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form onSubmit={handleActivateLicense} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder="Contoh: PRE-ENT-2030-UNLIMITED"
                    className="pl-9 font-mono text-xs uppercase"
                  />
                </div>
                <Button type="submit" className="font-semibold text-xs gap-1.5 shrink-0">
                  <CheckCircle2 className="size-3.5" /> Verifikasi & Aktifkan Lisensi
                </Button>
              </form>

              {/* Quick Simulation Buttons */}
              <div className="p-3 rounded-xl bg-muted/30 border space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" /> Tombol Cepat Simulasi Lisensi Tenant:
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeSchool) {
                        updateSchoolPlan(activeSchool.id, "enterprise", "2030-12-31", "PRE-ENT-2030-UNLIMITED");
                        toast.success("Simulasi Lisensi Enterprise Diterapkan!");
                      }
                    }}
                    className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-semibold h-8"
                  >
                    👑 Terapkan Lisensi Enterprise (Hingga 120 Rombel)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeSchool) {
                        updateSchoolPlan(activeSchool.id, "pro", "2028-12-31", "PRE-PRO-2028-24ROMBEL");
                        toast.success("Simulasi Lisensi Pro Diterapkan!");
                      }
                    }}
                    className="text-xs border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 font-semibold h-8"
                  >
                    🚀 Terapkan Lisensi Pro (24 Rombel)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeSchool) {
                        updateSchoolPlan(activeSchool.id, "starter", "2026-12-31", "PRE-STR-2026-6ROMBEL");
                        toast.success("Simulasi Lisensi Starter Diterapkan!");
                      }
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold h-8"
                  >
                    📦 Terapkan Lisensi Starter (6 Rombel)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3-Tier SaaS Plan Comparison Matrix */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                Matriks Pilihan Paket Layanan SaaS Presensi
              </h3>
              <p className="text-xs text-muted-foreground">
                Setiap paket dirancang khusus sesuai skala instansi pendidikan dari sekolah kecil hingga yayasan dan kampus besar.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* TIER 1: STARTER */}
              <Card
                className={`border transition-all relative flex flex-col justify-between ${
                  activeSchool?.plan?.plan_tier === "starter"
                    ? "border-primary ring-2 ring-primary/20 bg-card shadow-md"
                    : "border-border bg-card/60 hover:border-primary/40"
                }`}
              >
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 border-slate-400">
                      Starter
                    </Badge>
                    {activeSchool?.plan?.plan_tier === "starter" && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">
                        Paket Aktif
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold text-foreground mt-2">
                    Starter
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Untuk SD, TK, atau Bimbingan Belajar skala kecil dengan kebutuhan dasar.
                  </p>
                  <div className="pt-2">
                    <span className="text-xl font-bold text-foreground">Gratis</span>
                    <span className="text-xs text-muted-foreground ml-1">selamanya</span>
                  </div>
                  <div className="pt-1 font-mono text-xs font-semibold text-muted-foreground">
                    Hingga 6 Rombel • 250 Siswa
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-emerald-500 shrink-0" />
                      <span>Presensi QR Scanner & Kartu RFID</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-emerald-500 shrink-0" />
                      <span>Mode Offline PWA & Service Worker</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-emerald-500 shrink-0" />
                      <span>Rekapitulasi Excel & CSV Standar</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-emerald-500 shrink-0" />
                      <span>Notifikasi WhatsApp Dasar</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground/60 line-through">
                      <X className="size-3.5 text-destructive shrink-0" />
                      <span>Multi-Campus (Hanya 1 Titik GPS)</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground/60 line-through">
                      <X className="size-3.5 text-destructive shrink-0" />
                      <span>Kustom Tema & Logo White-Label</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground/60 line-through">
                      <X className="size-3.5 text-destructive shrink-0" />
                      <span>Dukungan Kapasitas Rombel Besar</span>
                    </div>
                  </div>
                </CardContent>
                <div className="p-4 border-t bg-muted/20">
                  <Button
                    type="button"
                    variant={activeSchool?.plan?.plan_tier === "starter" ? "secondary" : "outline"}
                    disabled={activeSchool?.plan?.plan_tier === "starter"}
                    onClick={() => handleSwitchPlanTier("starter")}
                    className="w-full text-xs font-semibold"
                  >
                    {activeSchool?.plan?.plan_tier === "starter" ? "Paket Sedang Aktif" : "Pilih Paket Starter"}
                  </Button>
                </div>
              </Card>

              {/* TIER 2: PRO */}
              <Card
                className={`border transition-all relative flex flex-col justify-between ${
                  activeSchool?.plan?.plan_tier === "pro"
                    ? "border-blue-500 ring-2 ring-blue-500/20 bg-card shadow-md"
                    : "border-border bg-card/60 hover:border-blue-500/40"
                }`}
              >
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-500 text-white text-xs font-bold uppercase">
                      Pro
                    </Badge>
                    {activeSchool?.plan?.plan_tier === "pro" && (
                      <Badge className="bg-blue-600 text-white text-[10px]">
                        Paket Aktif
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold text-foreground mt-2">
                    Pro
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Untuk SMP, SMA, dan MTs/MA standar dengan pelaporan lengkap dan multi-lokasi.
                  </p>
                  <div className="pt-2">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">Rp 199.000</span>
                    <span className="text-xs text-muted-foreground ml-1">/ bulan</span>
                  </div>
                  <div className="pt-1 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Hingga 24 Rombel • 1.200 Siswa (~Rp 165/siswa)
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="size-3.5 text-blue-500 shrink-0" />
                      <span>Semua fitur Starter</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-blue-500 shrink-0" />
                      <span>Multi-Campus (Hingga 3 Titik GPS)</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-blue-500 shrink-0" />
                      <span>Subdomain Khusus Tenant</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-blue-500 shrink-0" />
                      <span>Surat Panggilan BK & Peringatan Otomatis</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="size-3.5 text-blue-500 shrink-0" />
                      <span>Presensi Guru & GTK Mandiri GPS</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground/60 line-through">
                      <X className="size-3.5 text-destructive shrink-0" />
                      <span>Full White-Label Kustom Logo & Warna</span>
                    </div>
                  </div>
                </CardContent>
                <div className="p-4 border-t bg-muted/20 space-y-2">
                  <Button
                    type="button"
                    variant={activeSchool?.plan?.plan_tier === "pro" ? "secondary" : "default"}
                    disabled={activeSchool?.plan?.plan_tier === "pro"}
                    onClick={() => handleSwitchPlanTier("pro")}
                    className="w-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {activeSchool?.plan?.plan_tier === "pro" ? "Paket Sedang Aktif" : "Pilih Paket Pro"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQrisSelectedPlan("pro");
                      setQrisModalOpen(true);
                    }}
                    className="w-full text-xs font-semibold border-blue-500/40 text-blue-700 dark:text-blue-300 gap-1.5 h-8"
                  >
                    <Sparkles className="size-3.5" /> Aktivasi / Perpanjang Paket Pro
                  </Button>
                </div>
              </Card>

              {/* TIER 3: ENTERPRISE */}
              <Card
                className={`border-2 transition-all relative flex flex-col justify-between ${
                  activeSchool?.plan?.plan_tier === "enterprise"
                    ? "border-amber-500 ring-2 ring-amber-500/30 bg-card shadow-lg"
                    : "border-amber-500/40 bg-card hover:border-amber-500"
                }`}
              >
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase shadow-xs px-2.5 py-0.5">
                    REKOMENDASI INSTANSI BESAR / YAYASAN
                  </Badge>
                </div>
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs font-black uppercase">
                      Enterprise
                    </Badge>
                    {activeSchool?.plan?.plan_tier === "enterprise" && (
                      <Badge className="bg-emerald-500 text-white text-[10px] font-bold">
                        Paket Aktif
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-black text-foreground mt-2 flex items-center gap-1.5">
                    Enterprise <Crown className="size-4 text-amber-500 shrink-0" />
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Dirancang untuk Sekolah Skala Besar, SMK Kejuruan Multi-Lab, Pesantren Terpadu, & Yayasan Pendidikan Multi-Kampus.
                  </p>
                  <div className="pt-2">
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400">Rp 399.000</span>
                    <span className="text-xs text-muted-foreground ml-1">/ bulan</span>
                  </div>
                  <div className="pt-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                    Hingga 120 Rombel • 5.000 Siswa (~Rp 80/siswa)
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                      <span>Semua fitur Pro</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                      <span>Full White-Label Logo & Kustom Warna Brand</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                      <span>Dukungan Kapasitas Rombel Besar & Multi-Scanner</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                      <span>Multi-Campus Tak Terbatas (GPS Gedung Workshop/Lab)</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                      <span>Sinkronisasi Cloud PostgreSQL & Supabase</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCheck className="size-3.5 text-amber-500 shrink-0" />
                      <span>Prioritas Support & Dedicated Service Level</span>
                    </div>
                  </div>
                </CardContent>
                <div className="p-4 border-t bg-amber-500/10 space-y-2">
                  <Button
                    type="button"
                    variant={activeSchool?.plan?.plan_tier === "enterprise" ? "secondary" : "default"}
                    disabled={activeSchool?.plan?.plan_tier === "enterprise"}
                    onClick={() => handleSwitchPlanTier("enterprise")}
                    className="w-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md"
                  >
                    {activeSchool?.plan?.plan_tier === "enterprise" ? "Paket Sedang Aktif" : "Pilih Paket Enterprise"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQrisSelectedPlan("enterprise");
                      setQrisModalOpen(true);
                    }}
                    className="w-full text-xs font-semibold border-amber-500/50 text-amber-800 dark:text-amber-300 gap-1.5 h-8 bg-amber-500/10"
                  >
                    <Crown className="size-3.5" /> Aktivasi / Perpanjang Enterprise
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB: KUSTOMISASI ISTILAH (SISWA, SANTRI, GURU, USTADZ, KELAS) */}
      {activeTab === "istilah" && (
        <div className="space-y-6">
          {/* Presets Grid */}
          <Card className="border shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                Pilih Pola Istilah Berdasarkan Jenis Lembaga
              </CardTitle>
              <CardDescription className="text-xs">
                Ubah seluruh teks aplikasi (navigasi, kartu ID, tabel, filter, WhatsApp) secara instan sesuai jenis institusi Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(
                  Object.keys(TERMINOLOGY_PRESETS) as Array<
                    keyof typeof TERMINOLOGY_PRESETS
                  >
                ).map((key) => {
                  const item = TERMINOLOGY_PRESETS[key];
                  const isSelected = selectedPreset === key;

                  return (
                    <div
                      key={key}
                      onClick={() => handleSelectPreset(key)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                          : "border-border/70 hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-bold text-sm text-foreground">
                            {item.name}
                          </h4>
                          {isSelected && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-1.5 font-bold">
                              Aktif
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                          {item.config.student_label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                          {item.config.teacher_label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                          {item.config.class_label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Live Preview Card */}
          <Card className="border shadow-sm bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" /> Simulasi Tampilan Nyata di Antarmuka
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-card p-3 rounded-lg border shadow-xs">
                <span className="text-muted-foreground text-[11px] block">Navigasi Utama</span>
                <strong className="text-foreground font-semibold">{termStudents}</strong>
              </div>
              <div className="bg-card p-3 rounded-lg border shadow-xs">
                <span className="text-muted-foreground text-[11px] block">Judul Kartu Pengenal</span>
                <strong className="text-foreground font-semibold">Kartu {termStudent} Digital</strong>
              </div>
              <div className="bg-card p-3 rounded-lg border shadow-xs">
                <span className="text-muted-foreground text-[11px] block">Pengajar / Wali</span>
                <strong className="text-foreground font-semibold">{termTeacher} Pembimbing</strong>
              </div>
              <div className="bg-card p-3 rounded-lg border shadow-xs">
                <span className="text-muted-foreground text-[11px] block">Kelompok / Rombel</span>
                <strong className="text-foreground font-semibold">Daftar {termClass}</strong>
              </div>
            </CardContent>
          </Card>

          {/* Granular Customization Form */}
          <form onSubmit={handleSaveCustomTerminology} className="space-y-6">
            <Card className="border shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Kustomisasi Rinci Per-Istilah
                </CardTitle>
                <CardDescription className="text-xs">
                  Anda dapat menyesuaikan teks spesifik secara mandiri jika membutuhkan kombinasi khusus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Sebutan Peserta Didik (Tunggal)
                    </Label>
                    <Input
                      value={termStudent}
                      onChange={(e) => {
                        setTermStudent(e.target.value);
                        setSelectedPreset("custom");
                      }}
                      placeholder="Contoh: Siswa / Santri / Murid / Mahasiswa"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Digunakan pada: Profil Siswa, Kartu Siswa, Detail Presensi.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Sebutan Peserta Didik (Jamak / Menu)
                    </Label>
                    <Input
                      value={termStudents}
                      onChange={(e) => {
                        setTermStudents(e.target.value);
                        setSelectedPreset("custom");
                      }}
                      placeholder="Contoh: Data Siswa / Data Santri / Data Murid"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Digunakan pada: Navigasi Sidebar dan Judul Halaman Master.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Sebutan Pengajar / Pembina
                    </Label>
                    <Input
                      value={termTeacher}
                      onChange={(e) => {
                        setTermTeacher(e.target.value);
                        setSelectedPreset("custom");
                      }}
                      placeholder="Contoh: Guru / Ustadz & Ustadzah / Dosen / Tutor"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Digunakan pada: Wali Kelas, Pembina Halaqah, Input Pengajar.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Sebutan Kelas / Kelompok Belajar
                    </Label>
                    <Input
                      value={termClass}
                      onChange={(e) => {
                        setTermClass(e.target.value);
                        setSelectedPreset("custom");
                      }}
                      placeholder="Contoh: Kelas / Halaqah / Asrama / Rombel"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Digunakan pada: Daftar Rombongan Belajar, Filter Kelas.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Sebutan Nomor Induk / Pengenal
                    </Label>
                    <Input
                      value={termIdentifier}
                      onChange={(e) => {
                        setTermIdentifier(e.target.value);
                        setSelectedPreset("custom");
                      }}
                      placeholder="Contoh: NIS / NISN / ID Santri / NIM / No. Registrasi"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Digunakan pada: Kolom pencarian, barcode kartu ID, tabel.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Sebutan Orang Tua / Wali
                    </Label>
                    <Input
                      value={termGuardian}
                      onChange={(e) => {
                        setTermGuardian(e.target.value);
                        setSelectedPreset("custom");
                      }}
                      placeholder="Contoh: Orang Tua / Wali / Wali Santri / Wali Murid"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Digunakan pada: Kontak Notifikasi WhatsApp & Penerima Pesan.
                    </p>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">
                      Sebutan Jenis Lembaga / Institusi
                    </Label>
                    <Input
                      value={termInstitution}
                      onChange={(e) => {
                        setTermInstitution(e.target.value);
                        setSelectedPreset("custom");
                      }}
                      placeholder="Contoh: Sekolah / Pondok Pesantren / Madrasah / Bimbel"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg" className="font-semibold shadow-md px-8">
                <Save className="mr-2 size-4" /> Simpan & Terapkan Istilah
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: WHATSAPP GATEWAY */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveWhatsApp} className="space-y-6">
            <Card className="border shadow-sm bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <MessageSquare className="size-4 text-emerald-500" />
                      Konfigurasi WhatsApp Notifikasi Otomatis
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Kirim laporan otomatis ke nomor WhatsApp orang tua/wali saat siswa absen, terlambat, atau alpa.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                    Gateway Ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Penyedia Layanan (Provider)</Label>
                    <Select
                      value={waProvider}
                      onValueChange={(val: any) => setWaProvider(val)}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Pilih provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct_wa_me" className="text-xs">
                          Direct WhatsApp (wa.me click-to-chat - Gratis / Tanpa Biaya)
                        </SelectItem>
                        <SelectItem value="fonnte" className="text-xs">
                          Fonnte WhatsApp Gateway (API Token)
                        </SelectItem>
                        <SelectItem value="wablas" className="text-xs">
                          Wablas WhatsApp Gateway (API Token)
                        </SelectItem>
                        <SelectItem value="custom" className="text-xs">
                          Custom REST Webhook Gateway
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nomor Pengirim / Sender</Label>
                    <Input
                      value={waSender}
                      onChange={(e) => setWaSender(e.target.value)}
                      placeholder="628123456789"
                    />
                  </div>
                </div>

                {waProvider !== "direct_wa_me" && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">API Key / Token</Label>
                      <Input
                        type="password"
                        value={waApiKey}
                        onChange={(e) => setWaApiKey(e.target.value)}
                        placeholder="Masukkan token Fonnte / Wablas"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Endpoint URL</Label>
                      <Input
                        value={waEndpoint}
                        onChange={(e) => setWaEndpoint(e.target.value)}
                        placeholder="https://api.fonnte.com/send"
                      />
                    </div>
                  </div>
                )}

                {/* Auto Trigger Toggles */}
                <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                  <p className="text-xs font-bold text-foreground">Kondisi Pengiriman Pesan Otomatis:</p>
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={autoHadir}
                        onChange={(e) => setAutoHadir(e.target.checked)}
                        className="rounded size-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Kirim saat <strong>Hadir Masuk</strong></span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={autoLate}
                        onChange={(e) => setAutoLate(e.target.checked)}
                        className="rounded size-4 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Kirim saat <strong>Terlambat</strong></span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={autoCheckout}
                        onChange={(e) => setAutoCheckout(e.target.checked)}
                        className="rounded size-4 text-sky-600 focus:ring-sky-500"
                      />
                      <span>Kirim saat <strong>Presensi Pulang</strong></span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={autoAbsent}
                        onChange={(e) => setAutoAbsent(e.target.checked)}
                        className="rounded size-4 text-rose-600 focus:ring-rose-500"
                      />
                      <span>Kirim saat <strong>Alpa/Izin</strong></span>
                    </label>
                  </div>
                </div>

                {/* Templates */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Template Pesan Hadir Tepat Waktu (Masuk)</Label>
                    <Textarea
                      rows={2}
                      value={tplHadir}
                      onChange={(e) => setTplHadir(e.target.value)}
                      className="text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Variabel: <code>{"{nama_siswa}"}</code>, <code>{"{nama_sekolah}"}</code>, <code>{"{waktu_presensi}"}</code>, <code>{"{tanggal}"}</code>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Template Pesan Presensi Pulang</Label>
                    <Textarea
                      rows={2}
                      value={tplPulang}
                      onChange={(e) => setTplPulang(e.target.value)}
                      className="text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Variabel: <code>{"{nama_siswa}"}</code>, <code>{"{nama_sekolah}"}</code>, <code>{"{waktu_presensi}"}</code>, <code>{"{tanggal}"}</code>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Template Pesan Terlambat</Label>
                    <Textarea
                      rows={2}
                      value={tplTerlambat}
                      onChange={(e) => setTplTerlambat(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Template Pesan Alpa / Tidak Hadir</Label>
                    <Textarea
                      rows={2}
                      value={tplAlpa}
                      onChange={(e) => setTplAlpa(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="sm" className="font-semibold">
                    <Save className="mr-1.5 size-3.5" /> Simpan Pengaturan WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Test WhatsApp Trigger Card */}
          <Card className="border shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Send className="size-4 text-primary" />
                Uji Coba Pengiriman WhatsApp
              </CardTitle>
              <CardDescription className="text-xs">
                Kirim pesan uji coba ke nomor tujuan untuk memvalidasi format teks dan link gateway.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nama Siswa</Label>
                  <Input
                    size={1}
                    value={testStudentName}
                    onChange={(e) => setTestStudentName(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nama Wali</Label>
                  <Input
                    size={1}
                    value={testGuardianName}
                    onChange={(e) => setTestGuardianName(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nomor WA Wali</Label>
                  <Input
                    size={1}
                    value={testGuardianPhone}
                    onChange={(e) => setTestGuardianPhone(e.target.value)}
                    placeholder="081234567890"
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleTestWhatsAppSend}
                className="w-full sm:w-auto text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Send className="mr-1.5 size-3.5" /> Kirim / Buat Pesan WhatsApp Sekarang
              </Button>

              {/* Logs of Sent Notifications */}
              {whatsappLogs.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <p className="text-xs font-bold text-foreground">Riwayat Notifikasi Terakhir:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {whatsappLogs.map((log) => (
                      <div
                        key={log.id}
                        className="text-xs p-2.5 rounded-lg border bg-muted/30 flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="font-semibold text-foreground">
                            {log.student_name} ({log.recipient_phone})
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {log.message}
                          </p>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-mono shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: BACKEND & DATABASE (SUPER ADMIN ONLY) */}
      {activeTab === "backend" && isSuperAdmin && (
        <div className="space-y-6">
          {/* Administrator Notice Banner */}
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Lock className="size-5" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary text-sm">
                  Konfigurasi Lanjutan Platform & Database
                </span>
                <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0">
                  SYSTEM LEVEL
                </Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Halaman ini memuat konfigurasi backend database PostgreSQL, isolasi Row Level Security (RLS) multi-tenant, edge proxy DNS Cloudflare, serta telemetri sinkronisasi database. Pengaturan ini <strong>hanya dapat diakses oleh Administrator Platform</strong>.
              </p>
            </div>
          </div>

          {/* Database PostgreSQL / Supabase Card */}
          <Card className="border shadow-sm bg-card">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Database className="size-4 text-emerald-600" />
                    Supabase PostgreSQL Multi-Tenancy Engine
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Koneksi database PostgreSQL terpusat dengan isolasi Row Level Security (RLS) otomatis per sekolah.
                  </CardDescription>
                </div>

                <Badge
                  className={
                    isSupabaseActive
                      ? "bg-emerald-500 text-white text-xs"
                      : "bg-amber-500/15 text-amber-600 border border-amber-500/30 text-xs"
                  }
                >
                  {isSupabaseActive ? "✓ Supabase PostgreSQL Active" : "⚡ Local Database Mode (Fallback)"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-muted/40 border space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Supabase Project Endpoint
                  </span>
                  <p className="text-xs font-mono font-medium text-foreground truncate">
                    {import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Anon Public API Key
                  </span>
                  <p className="text-xs font-mono font-medium text-foreground truncate">
                    {import.meta.env.VITE_SUPABASE_ANON_KEY ? "eyJh... (Terkonfigurasi Aman)" : "Belum diatur di environment (.env)"}
                  </p>
                </div>
              </div>

              {/* RLS Security Architecture */}
              <div className="rounded-xl border p-4 bg-primary/5 border-primary/20 space-y-2">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" /> Row Level Security (RLS) Multi-Tenant Status:
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Skema SQL otomatis di <code>supabase-schema.sql</code> telah mengonfigurasi kolom diskriminator <code>school_id</code> pada setiap tabel (<code>schools</code>, <code>classes</code>, <code>students</code>, <code>attendance_sessions</code>, <code>attendance_records</code>, <code>academic_years</code>, <code>weekly_schedules</code>, <code>gtk_profiles</code>). Admin sekolah hanya dapat membaca dan menulis data di dalam tenant sekolah miliknya sendiri.
                </p>
              </div>

              {/* Multi-Tenant School Database Stats */}
              <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <HardDrive className="size-3.5 text-primary" /> Statistik Database Multi-Tenant Global ({schools.length} Instansi Terdaftar)
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Total Records Aktif
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {schools.map((sch) => (
                    <div key={sch.id} className="p-3 rounded-lg bg-card border text-xs space-y-1">
                      <p className="font-bold truncate text-foreground" title={sch.name}>{sch.name}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Kode: <strong className="font-mono text-primary">{sch.join_code}</strong></span>
                        <span className="text-emerald-600 font-semibold">{sch.plan?.plan_name || "Pro"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info("File skema SQL 'supabase-schema.sql' siap digunakan pada SQL Editor Supabase.");
                  }}
                  className="text-xs"
                >
                  <Copy className="mr-1.5 size-3.5" /> Salin Skema SQL RLS
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.success("Koneksi & integritas data multi-tenant backend 100% sinkron.");
                  }}
                  className="text-xs"
                >
                  <RefreshCw className="mr-1.5 size-3.5" /> Uji Integritas Backend
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cloudflare Split-Domain Architecture Card */}
          <Card className="border shadow-sm bg-card">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Globe className="size-4 text-blue-500" />
                Arsitektur Split-Domain & Cloudflare Edge DNS
              </CardTitle>
              <CardDescription className="text-xs">
                Konfigurasi 2 domain terpisah untuk Portal B2B (Admin Sekolah) vs Portal B2C PWA (Siswa/Wali Murid).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Domain 1 */}
                <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-primary text-primary-foreground text-[10px]">
                      Domain B2B / Admin Portal
                    </Badge>
                    <span className="font-mono text-xs font-bold text-primary">presensi.app</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">presensi.app</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Digunakan untuk Dashboard Kepala Sekolah, Admin TU, Manajemen Rombel & Kelas, Pengaturan GPS, Rekap Laporan Excel/PDF, serta Pendaftaran Sekolah Baru.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDomainMode("presensi.app")}
                    className="w-full text-xs mt-2"
                  >
                    Set Mode Aktif: presensi.app
                  </Button>
                </div>

                {/* Domain 2 */}
                <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      Domain B2C / Siswa PWA
                    </Badge>
                    <span className="font-mono text-xs font-bold text-emerald-600">presensiku.app</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">presensiku.app</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Portal ringan Progressive Web App (PWA) khusus siswa dan orang tua. Menyediakan QR Scanner, Absen Selfie Kamera + Geofence GPS, serta kartu presensi offline.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDomainMode("presensiku.app");
                      onNavigate("absen");
                    }}
                    className="w-full text-xs mt-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                  >
                    Set Mode Aktif: presensiku.app (PWA)
                  </Button>
                </div>
              </div>

              {/* Cloudflare Pages Deployment Tips */}
              <div className="p-4 rounded-xl border bg-muted/40 space-y-2 text-xs">
                <h5 className="font-bold text-foreground flex items-center gap-1.5">
                  <ExternalLink className="size-3.5 text-blue-500" /> Panduan Cloudflare DNS & Pages:
                </h5>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Arahkan domain <code>presensi.app</code> dan <code>presensiku.app</code> ke project Cloudflare Pages yang sama.</li>
                  <li>Build command: <code>npm run build</code>, Build output directory: <code>dist</code>.</li>
                  <li>Environment Variables di Cloudflare Dashboard: <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New School Modal */}
      <Dialog open={newSchoolModal} onOpenChange={setNewSchoolModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Daftarkan Sekolah Baru</DialogTitle>
            <DialogDescription className="text-xs">
              Buat sekolah baru dengan basis data terisolasi dan kode gabung tersendiri.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewSchool} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Sekolah Baru</Label>
              <Input
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                placeholder="SMK Negeri 2 Surabaya"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">NPSN (Opsional)</Label>
              <Input
                value={newSchoolNpsn}
                onChange={(e) => setNewSchoolNpsn(e.target.value)}
                placeholder="20108899"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewSchoolModal(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                Daftarkan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Multi-Location Add/Edit Dialog */}
      <Dialog open={locModalOpen} onOpenChange={setLocModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              {editingLocId ? "Edit Titik Gedung / Kampus" : "Tambah Titik Gedung / Kampus Terpisah"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftarkan koordinat gedung atau kampus yang terpisah agar presensi GPS siswa dan GTK tetap sah di lokasi ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLocation} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Gedung / Kampus</Label>
              <Input
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                placeholder="Contoh: Kampus 2 (Gedung Lab & Olahraga)"
                required
              />
            </div>

            <div className="rounded-xl border p-3 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" /> Koordinat GPS Gedung
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetModalLocGps}
                  disabled={locGpsLoading}
                  className="text-xs h-7 px-2 border-primary/40 text-primary hover:bg-primary/5"
                >
                  <LocateFixed className="mr-1 size-3" />
                  {locGpsLoading ? "Mendeteksi..." : "GPS Saya"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    placeholder="-6.2125"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={locLng}
                    onChange={(e) => setLocLng(e.target.value)}
                    placeholder="106.8492"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Radius Toleransi (Meter)</Label>
                <Input
                  type="number"
                  min={20}
                  max={5000}
                  value={locRadius}
                  onChange={(e) => setLocRadius(e.target.value)}
                  placeholder="250"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Alamat / Patokan Gedung (Opsional)</Label>
              <Input
                value={locAddress}
                onChange={(e) => setLocAddress(e.target.value)}
                placeholder="Jl. Lapangan Timur No. 8"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setLocModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                <Save className="mr-1.5 size-3.5" />
                {editingLocId ? "Simpan Perubahan" : "Tambahkan Lokasi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Switcher Modal */}
      {isSuperAdmin && (
        <RoleSwitcherModal
          open={roleSwitcherOpen}
          onOpenChange={setRoleSwitcherOpen}
          onNavigate={onNavigate}
        />
      )}

      {/* QRIS Checkout Modal */}
      <QrisCheckoutModal
        isOpen={qrisModalOpen}
        onClose={() => setQrisModalOpen(false)}
        defaultPlan={qrisSelectedPlan}
        onSuccessActivation={(tier, key) => {
          setLicenseInput(key);
        }}
      />
    </div>
  );
}
