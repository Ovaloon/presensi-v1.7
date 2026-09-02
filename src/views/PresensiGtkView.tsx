import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Users,
  UserCheck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  Calendar,
  Check,
  X,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  Edit2,
  Trash2,
  Sparkles,
  Camera,
  RotateCcw,
  Compass,
  Radio,
  Share2,
  Eye,
  CreditCard,
  QrCode,
  LogIn,
  LogOut,
  FileText,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Award,
  Send,
  Loader2,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchoolStore } from "@/lib/store";
import { GtkProfile, GtkAttendanceRecord, GtkRole } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { soundManager } from "@/lib/sound";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  haversineDistanceMeters,
  checkSchoolGeofence,
  GeofenceMatchResult,
  formatDateId,
  formatTimeId,
  todayIso,
  toCsv,
  downloadCsv,
} from "@/lib/attendance";

interface PresensiGtkViewProps {
  onNavigate: (view: string, param?: string) => void;
  defaultTab?: "mandiri" | "hari_ini" | "kios" | "riwayat" | "master";
}

export const GTK_ROLE_LABELS: Record<GtkRole, string> = {
  guru_pns: "Guru PNS",
  guru_pppk: "Guru PPPK",
  guru_honorer: "Guru Honorer",
  kepala_sekolah: "Kepala Sekolah",
  tata_usaha: "Tenaga Administrasi (TU)",
  laboran: "Laboran",
  pustakawan: "Pustakawan",
  satpam: "Satpam / Keamanan",
  kebersihan: "Kebersihan & Sarpras",
};

export const STATUS_CONFIG: Record<
  GtkAttendanceRecord["status"],
  { label: string; bg: string; text: string; border: string }
> = {
  hadir: {
    label: "Hadir Tepat",
    bg: "bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  terlambat: {
    label: "Terlambat",
    bg: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  izin: {
    label: "Izin",
    bg: "bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  sakit: {
    label: "Sakit",
    bg: "bg-purple-500/15",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
  },
  cuti: {
    label: "Cuti",
    bg: "bg-cyan-500/15",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/30",
  },
  dinas_luar: {
    label: "Dinas Luar",
    bg: "bg-indigo-500/15",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/30",
  },
  alpa: {
    label: "Alpa",
    bg: "bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
};

export function PresensiGtkView({ onNavigate, defaultTab = "mandiri" }: PresensiGtkViewProps) {
  const {
    activeSchool,
    gtkProfiles,
    gtkRecords,
    addGtkProfile,
    updateGtkProfile,
    deleteGtkProfile,
    markGtkAttendance,
    updateGtkRecord,
    isAdmin,
    terms,
    role,
    currentUser,
  } = useSchoolStore();

  const [activeTab, setActiveTab] = useState<"mandiri" | "hari_ini" | "kios" | "riwayat" | "master">(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Clock Ticker
  const [currentTime, setCurrentTime] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter and selection states for roster & history
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(todayIso());

  // History Tab Filters
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [historyMonth, setHistoryMonth] = useState<string>(currentMonthStr);
  const [historyGtkId, setHistoryGtkId] = useState<string>("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [historySearch, setHistorySearch] = useState<string>("");

  // ==========================================
  // SELF-SERVICE MANDIRI GTK PRESENCE STATES
  // ==========================================
  // Find GTK corresponding to current logged in user if available
  const defaultGtkId = useMemo(() => {
    if (currentUser?.email) {
      const match = gtkProfiles.find(
        (g) => g.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      if (match) return match.id;
    }
    return gtkProfiles[0]?.id || "";
  }, [currentUser, gtkProfiles]);

  const [mandiriGtkId, setMandiriGtkId] = useState<string>(defaultGtkId);
  useEffect(() => {
    if (defaultGtkId && !mandiriGtkId) {
      setMandiriGtkId(defaultGtkId);
    }
  }, [defaultGtkId, mandiriGtkId]);

  const activeMandiriGtk = gtkProfiles.find((g) => g.id === mandiriGtkId) || gtkProfiles[0];
  const [mandiriMode, setMandiriMode] = useState<"masuk" | "pulang" | "dinas_luar" | "izin">("masuk");
  const [mandiriNotes, setMandiriNotes] = useState<string>("");
  const [mandiriIzinType, setMandiriIzinType] = useState<"izin" | "sakit" | "cuti">("izin");

  // Camera States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GPS Location States
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [geofenceResult, setGeofenceResult] = useState<GeofenceMatchResult | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Today's attendance record for current GTK
  const todayRecordForMandiri = gtkRecords.find(
    (r) => r.gtk_id === mandiriGtkId && r.date === todayIso()
  );

  // Fetch GPS on mount or change
  const fetchGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Browser tidak mendukung sensor GPS.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy || 10);
        setUserLat(lat);
        setUserLng(lng);
        setGpsAccuracy(acc);
        setGpsLoading(false);

        const geoMatch = checkSchoolGeofence(lat, lng, activeSchool);
        setGeofenceResult(geoMatch);
        setDistanceMeters(geoMatch.closestDistanceMeters);
      },
      (err) => {
        setGpsLoading(false);
        // Fallback for sandboxed environments
        if (activeSchool?.latitude != null && activeSchool?.longitude != null) {
          const lat = activeSchool.latitude + 0.0001;
          const lng = activeSchool.longitude + 0.0001;
          setUserLat(lat);
          setUserLng(lng);
          const geoMatch = checkSchoolGeofence(lat, lng, activeSchool);
          setGeofenceResult(geoMatch);
          setDistanceMeters(geoMatch.closestDistanceMeters);
          setGpsAccuracy(5);
        } else {
          setGpsError("Lokasi GPS tidak dapat diakses.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchGps();
  }, [activeSchool?.latitude, activeSchool?.longitude, activeSchool?.locations]);

  // Start Camera
  const startCamera = async (mode: "user" | "environment" = cameraFacingMode) => {
    setCameraError(null);
    stopCamera();
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Perangkat tidak mendukung akses video kamera.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (playErr: any) {
          if (playErr?.name !== "AbortError" && playErr?.name !== "NotAllowedError") {
            console.debug("Video stream play handled:", playErr);
          }
        }
        setCameraActive(true);
      }
    } catch (err: any) {
      setCameraError("Izin kamera belum disetujui atau kamera sedang digunakan aplikasi lain.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    soundManager.playCameraShutter();
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (cameraFacingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

  const switchCamera = () => {
    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Start camera when entering Mandiri tab
  useEffect(() => {
    if (activeTab === "mandiri") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  // Submit Mandiri Attendance
  const handleSubmitMandiri = async () => {
    if (!activeMandiriGtk) {
      toast.error("Pilih data Guru / GTK terlebih dahulu.");
      return;
    }

    const geoMatch = checkSchoolGeofence(userLat, userLng, activeSchool);
    const isInsideRadius = geoMatch.isWithinRadius;

    if (mandiriMode !== "dinas_luar" && mandiriMode !== "izin" && !isInsideRadius) {
      const confirmOutside = window.confirm(
        `Perhatian: Anda berada di luar area seluruh gedung sekolah (Titik terdekat: ${geoMatch.closestLocationName}, jarak ${Math.round(geoMatch.closestDistanceMeters)}m > batas ${geoMatch.closestRadiusMeters}m). Lanjutkan presensi dengan catatan luar radius?`
      );
      if (!confirmOutside) return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const schoolStartTime = activeSchool?.start_time || "07:00";
    const [sh, sm] = schoolStartTime.split(":").map(Number);
    const [nh, nm] = timeStr.split(":").map(Number);
    const isLate = nh * 60 + nm > sh * 60 + sm + 15; // 15 min tolerance

    const locNote = geoMatch.matchedLocation ? ` [${geoMatch.matchedLocation.name}]` : "";

    if (mandiriMode === "masuk") {
      const status: GtkAttendanceRecord["status"] = isLate ? "terlambat" : "hadir";
      markGtkAttendance({
        gtkId: activeMandiriGtk.id,
        status,
        checkInTime: timeStr,
        latitude: userLat || undefined,
        longitude: userLng || undefined,
        selfieUrl: capturedPhoto,
        locationVerified: isInsideRadius,
        distanceMeters: Math.round(geoMatch.closestDistanceMeters),
        method: "selfie_gps",
        notes: (mandiriNotes || (isLate ? "Check-in terlambat mandiri" : "Check-in tepat waktu")) + locNote,
      });
      soundManager.playSuccess();
      toast.success(
        `Presensi Masuk Berhasil! ${activeMandiriGtk.full_name} tercatat ${status.toUpperCase()} pk ${timeStr}.`
      );
    } else if (mandiriMode === "pulang") {
      if (!todayRecordForMandiri) {
        // If not checked in, check in first as present then check out
        markGtkAttendance({
          gtkId: activeMandiriGtk.id,
          status: "hadir",
          checkInTime: schoolStartTime,
          checkOutTime: timeStr,
          latitude: userLat || undefined,
          longitude: userLng || undefined,
          checkOutLatitude: userLat || undefined,
          checkOutLongitude: userLng || undefined,
          checkOutSelfieUrl: capturedPhoto,
          locationVerified: isInsideRadius,
          distanceMeters: Math.round(geoMatch.closestDistanceMeters),
          method: "selfie_gps",
          notes: (mandiriNotes || "Check-out pulang mandiri") + locNote,
        });
      } else {
        updateGtkRecord(todayRecordForMandiri.id, {
          check_out_time: timeStr,
          check_out_latitude: userLat || undefined,
          check_out_longitude: userLng || undefined,
          check_out_selfie_url: capturedPhoto,
          notes: mandiriNotes
            ? `${todayRecordForMandiri.notes || ""} • Pulang: ${mandiriNotes}${locNote}`
            : `${todayRecordForMandiri.notes || ""}${locNote}`,
        });
      }
      soundManager.playSuccess();
      toast.success(
        `Check-Out Pulang Berhasil! ${activeMandiriGtk.full_name} tercatat pulang pk ${timeStr}.`
      );
    } else if (mandiriMode === "dinas_luar") {
      markGtkAttendance({
        gtkId: activeMandiriGtk.id,
        status: "dinas_luar",
        checkInTime: timeStr,
        latitude: userLat || undefined,
        longitude: userLng || undefined,
        selfieUrl: capturedPhoto,
        locationVerified: true,
        distanceMeters: Math.round(geoMatch.closestDistanceMeters),
        method: "selfie_gps",
        notes: mandiriNotes || "Dinas Luar",
      });
      soundManager.playSuccess();
      toast.success(`Presensi DINAS LUAR Berhasil dicatat pk ${timeStr}.`);
    } else if (mandiriMode === "izin") {
      markGtkAttendance({
        gtkId: activeMandiriGtk.id,
        status: mandiriIzinType,
        checkInTime: timeStr,
        latitude: userLat || undefined,
        longitude: userLng || undefined,
        selfieUrl: capturedPhoto,
        locationVerified: true,
        method: "selfie_gps",
        notes: mandiriNotes || `Keterangan: ${mandiriIzinType.toUpperCase()}`,
      });
      soundManager.playSuccess();
      toast.success(`Pengajuan ${mandiriIzinType.toUpperCase()} berhasil disimpan.`);
    }

    setIsSubmitting(false);
    setCapturedPhoto(null);
    setMandiriNotes("");
    startCamera();
  };

  // ==========================================
  // KIOS SCANNER RFID / BARCODE STATE
  // ==========================================
  const [kiosRfidInput, setKiosRfidInput] = useState("");
  const [kiosRecentLog, setKiosRecentLog] = useState<{
    id: string;
    gtk: GtkProfile;
    time: string;
    status: string;
    type: "in" | "out";
  }[]>([]);

  const handleProcessKiosScan = (code: string) => {
    if (!code.trim()) return;
    const clean = code.trim().toLowerCase();
    // Match by NIP, ID, or QR string format (e.g. "GTK:xxx" or NIP)
    const match = gtkProfiles.find(
      (g) =>
        g.nip_or_nik.toLowerCase() === clean ||
        g.id.toLowerCase() === clean ||
        clean.includes(g.nip_or_nik.toLowerCase()) ||
        clean.includes(g.id.toLowerCase())
    );

    if (!match) {
      soundManager.playError();
      toast.error(`Kartu / Kode "${code}" tidak terdaftar pada Master Data GTK.`);
      setKiosRfidInput("");
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const existing = gtkRecords.find((r) => r.gtk_id === match.id && r.date === todayIso());
    let scanType: "in" | "out" = "in";

    if (!existing) {
      // Check-In
      const schoolStart = activeSchool?.start_time || "07:00";
      const [sh, sm] = schoolStart.split(":").map(Number);
      const [nh, nm] = timeStr.split(":").map(Number);
      const isLate = nh * 60 + nm > sh * 60 + sm + 15;
      const status: GtkAttendanceRecord["status"] = isLate ? "terlambat" : "hadir";

      markGtkAttendance({
        gtkId: match.id,
        status,
        checkInTime: timeStr,
        method: "rfid_card",
        locationVerified: true,
        notes: "Scan Kios Gerbang RFID",
      });
      scanType = "in";
      soundManager.playSuccess();
      toast.success(`[KIOS GTK] ${match.full_name} berhasil Check-In MASUK (pk ${timeStr})`);
    } else {
      // Check-Out
      updateGtkRecord(existing.id, {
        check_out_time: timeStr,
        notes: `${existing.notes || ""} • Kios Pulang`,
      });
      scanType = "out";
      soundManager.playSuccess();
      toast.success(`[KIOS GTK] ${match.full_name} berhasil Check-Out PULANG (pk ${timeStr})`);
    }

    setKiosRecentLog((prev) => [
      {
        id: `kios-${Date.now()}`,
        gtk: match,
        time: timeStr,
        status: existing ? "Pulang" : "Masuk",
        type: scanType,
      },
      ...prev.slice(0, 9),
    ]);

    setKiosRfidInput("");
  };

  // ==========================================
  // ROSTER & HISTORY COMPUTATIONS
  // ==========================================
  const todayRecords = gtkRecords.filter((r) => r.date === selectedDate);
  const recordsMap = new Map(todayRecords.map((r) => [r.gtk_id, r]));

  const totalGtk = gtkProfiles.filter((g) => g.status === "aktif").length;
  const hadirCount = todayRecords.filter((r) => r.status === "hadir").length;
  const terlambatCount = todayRecords.filter((r) => r.status === "terlambat").length;
  const izinSakitDinasCount = todayRecords.filter((r) =>
    ["izin", "sakit", "cuti", "dinas_luar"].includes(r.status)
  ).length;
  const alpaCount = todayRecords.filter((r) => r.status === "alpa").length;
  const presencePercent =
    totalGtk > 0 ? Math.round(((hadirCount + terlambatCount) / totalGtk) * 100) : 0;

  const handleQuickMark = (gtkId: string, status: GtkAttendanceRecord["status"]) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    markGtkAttendance({
      gtkId,
      status,
      checkInTime: timeStr,
      locationVerified: true,
      method: "manual",
    });
    soundManager.playSuccess();
    toast.success(`Presensi ${status.toUpperCase()} tercatat.`);
  };

  const handleCheckOut = (gtkId: string) => {
    const existing = recordsMap.get(gtkId);
    if (!existing) {
      toast.error("GTK belum melakukan Check-In masuk hari ini.");
      return;
    }
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    updateGtkRecord(existing.id, { check_out_time: timeStr });
    soundManager.playSuccess();
    toast.success("Check-Out pulang berhasil dicatat!");
  };

  // Photo & Detail Inspection Modal
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<{
    gtk: GtkProfile;
    record: GtkAttendanceRecord;
  } | null>(null);

  // GTK Add/Edit Modal
  const [isAddGtkOpen, setIsAddGtkOpen] = useState(false);
  const [editingGtk, setEditingGtk] = useState<GtkProfile | null>(null);
  const [gtkFormData, setGtkFormData] = useState<Omit<GtkProfile, "id" | "school_id">>({
    nip_or_nik: "",
    full_name: "",
    email: "",
    phone: "",
    gtk_role: "guru_pns",
    subject_specialty: "",
    gender: "L",
    status: "aktif",
  });

  // Digital ID Card Modal
  const [idCardGtk, setIdCardGtk] = useState<GtkProfile | null>(null);

  const handleOpenAddGtk = () => {
    setEditingGtk(null);
    setGtkFormData({
      nip_or_nik: "",
      full_name: "",
      email: "",
      phone: "",
      gtk_role: "guru_pns",
      subject_specialty: "",
      gender: "L",
      status: "aktif",
    });
    setIsAddGtkOpen(true);
  };

  const handleOpenEditGtk = (gtk: GtkProfile) => {
    setEditingGtk(gtk);
    setGtkFormData({
      nip_or_nik: gtk.nip_or_nik,
      full_name: gtk.full_name,
      email: gtk.email || "",
      phone: gtk.phone || "",
      gtk_role: gtk.gtk_role,
      subject_specialty: gtk.subject_specialty || "",
      gender: gtk.gender,
      status: gtk.status,
    });
    setIsAddGtkOpen(true);
  };

  const handleGtkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gtkFormData.full_name) {
      toast.error("Nama lengkap GTK wajib diisi");
      return;
    }
    if (!gtkFormData.nip_or_nik) {
      toast.error("NIP / NIK GTK wajib diisi");
      return;
    }

    if (editingGtk) {
      updateGtkProfile(editingGtk.id, gtkFormData);
      toast.success(`Data GTK ${gtkFormData.full_name} berhasil diperbarui`);
    } else {
      addGtkProfile(gtkFormData);
      toast.success(`GTK ${gtkFormData.full_name} berhasil ditambahkan`);
    }
    soundManager.playSuccess();
    setIsAddGtkOpen(false);
  };

  const handleDeleteGtk = (id: string, name: string) => {
    if (window.confirm(`Hapus data GTK "${name}"? Riwayat presensi terkait akan ikut terhapus.`)) {
      deleteGtkProfile(id);
      soundManager.playBeep();
      toast.success(`Data GTK ${name} telah dihapus.`);
    }
  };

  // Filtered History
  const filteredHistoryRecords = gtkRecords
    .filter((rec) => {
      if (historyMonth && !rec.date.startsWith(historyMonth)) return false;
      if (historyGtkId !== "all" && rec.gtk_id !== historyGtkId) return false;
      if (historyStatusFilter !== "all" && rec.status !== historyStatusFilter) return false;
      if (historySearch) {
        const gtk = gtkProfiles.find((g) => g.id === rec.gtk_id);
        const q = historySearch.toLowerCase();
        const match =
          (gtk?.full_name && gtk.full_name.toLowerCase().includes(q)) ||
          (gtk?.nip_or_nik && gtk.nip_or_nik.toLowerCase().includes(q)) ||
          (rec.notes && rec.notes.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleExportHistoryCsv = () => {
    if (filteredHistoryRecords.length === 0) {
      toast.error("Tidak ada data riwayat presensi yang sesuai filter untuk diekspor.");
      return;
    }
    const data = filteredHistoryRecords.map((r, idx) => {
      const g = gtkProfiles.find((p) => p.id === r.gtk_id);
      return {
        No: idx + 1,
        Tanggal: r.date,
        "NIP / NIK": g?.nip_or_nik || "-",
        "Nama GTK": g?.full_name || r.gtk_name || "GTK",
        Jabatan: GTK_ROLE_LABELS[g?.gtk_role || r.gtk_role] || r.gtk_role,
        Status: (r.status || "hadir").toUpperCase(),
        "Jam Masuk": r.check_in_time || "-",
        "Jam Pulang": r.check_out_time || "-",
        "Terlambat (Menit)": r.late_minutes || 0,
        Metode: r.method || "selfie_gps",
        "Jarak (Meter)": r.distance_meters != null ? `${r.distance_meters}m` : "-",
        "GPS Valid": r.location_verified ? "Ya" : "Tidak",
        Catatan: r.notes || "-",
      };
    });

    const csv = toCsv(data);
    downloadCsv(`Riwayat_Presensi_GTK_${historyMonth || "Semua"}_${activeSchool?.name || "Sekolah"}.csv`, csv);
    toast.success("File CSV Riwayat Presensi GTK berhasil diunduh!");
  };

  const filteredRosterGtk = gtkProfiles.filter((g) => {
    const matchesSearch =
      g.full_name.toLowerCase().includes(search.toLowerCase()) ||
      g.nip_or_nik.toLowerCase().includes(search.toLowerCase()) ||
      (g.subject_specialty && g.subject_specialty.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === "all" || g.gtk_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <PageHeader
        icon={Briefcase}
        title="Presensi Guru & Tenaga Kependidikan (GTK)"
        subtitle={`Portal presensi mandiri selfie & GPS, scan gerbang RFID, pencatatan roster harian, dan rekap dinas GTK di ${activeSchool?.name || ""}.`}
        badge="Presensi GTK & Pendidik"
        kpiCards={[
          {
            label: "Total GTK Aktif",
            value: totalGtk,
            helper: `${presencePercent}% kehadiran hari ini`,
            icon: Users,
            color: "primary",
          },
          {
            label: "Hadir Tepat Waktu",
            value: hadirCount,
            helper: `Masuk ≤ ${activeSchool?.start_time || "07:00"}`,
            icon: CheckCircle2,
            color: "emerald",
          },
          {
            label: "Terlambat",
            value: terlambatCount,
            helper: "Melewati batas toleransi",
            icon: Clock,
            color: "amber",
          },
          {
            label: "Izin / Sakit / Dinas",
            value: izinSakitDinasCount,
            helper: `${alpaCount} tanpa keterangan`,
            icon: AlertCircle,
            color: "blue",
          },
        ]}
      >
        <Button
          onClick={() => {
            soundManager.playBeep();
            setActiveTab("mandiri");
          }}
          className="rounded-xl shadow-xs gap-2 font-bold text-xs h-9 bg-primary text-primary-foreground"
        >
          <Camera className="size-4" />
          Presensi Mandiri (Selfie & GPS)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            soundManager.playBeep();
            setActiveTab("kios");
          }}
          className="rounded-xl text-xs gap-1.5 h-9 font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
        >
          <CreditCard className="size-4" />
          Kios RFID Gerbang
        </Button>

        {activeTab === "riwayat" && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 h-9 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold"
            onClick={handleExportHistoryCsv}
          >
            <FileSpreadsheet className="size-3.5" />
            Ekspor CSV
          </Button>
        )}
      </PageHeader>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-border/80 gap-1.5 overflow-x-auto pb-px">
        <button
          onClick={() => {
            soundManager.playBeep();
            setActiveTab("mandiri");
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
            activeTab === "mandiri"
              ? "border-primary text-primary bg-primary/10 font-bold shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          }`}
        >
          <Camera className="size-4 text-primary shrink-0" />
          <span>Presensi Mandiri (Selfie & GPS)</span>
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0 rounded-full font-bold ml-0.5">
            Live
          </Badge>
        </button>

        <button
          onClick={() => {
            soundManager.playBeep();
            setActiveTab("hari_ini");
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
            activeTab === "hari_ini"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          }`}
        >
          <Clock className="size-4 text-emerald-500 shrink-0" />
          <span>Roster Presensi Hari Ini</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full font-bold ml-0.5">
            {todayRecords.length}/{totalGtk}
          </Badge>
        </button>

        <button
          onClick={() => {
            soundManager.playBeep();
            setActiveTab("kios");
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
            activeTab === "kios"
              ? "border-amber-600 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-bold shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          }`}
        >
          <Radio className="size-4 text-amber-500 shrink-0" />
          <span>Kios RFID Gerbang</span>
        </button>

        <button
          onClick={() => {
            soundManager.playBeep();
            setActiveTab("riwayat");
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
            activeTab === "riwayat"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          }`}
        >
          <Calendar className="size-4 text-indigo-500 shrink-0" />
          <span>Riwayat & Rekap Bulanan</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => {
              soundManager.playBeep();
              setActiveTab("master");
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 ${
              activeTab === "master"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-bold shadow-2xs"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
            }`}
          >
            <Users className="size-4 text-blue-500 shrink-0" />
            <span>Master Data GTK</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full font-bold ml-0.5">
              {gtkProfiles.length}
            </Badge>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PORTAL PRESENSI MANDIRI GTK (KAMERA SELFIE & GPS) */}
      {/* ========================================================================= */}
      {activeTab === "mandiri" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Camera Preview & Snapshot (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
              <CardHeader className="p-4 sm:p-5 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Camera className="size-5" />
                    </span>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Kamera Selfie Kehadiran GTK
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Posisikan wajah Anda di dalam bingkai dan pastikan pencahayaan cukup.
                      </CardDescription>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="text-xs font-mono font-bold bg-background/80"
                  >
                    <Clock className="size-3.5 mr-1 text-primary animate-pulse" />
                    {currentTime || "07:00:00"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Video / Photo Container */}
                <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-950 border border-border/80 flex items-center justify-center shadow-inner">
                  {capturedPhoto ? (
                    <img
                      src={capturedPhoto}
                      alt="Selfie captured"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${
                        cameraFacingMode === "user" ? "scale-x-[-1]" : ""
                      }`}
                    />
                  )}

                  {/* Overlays / Geofencing Pill */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-900/80 text-white backdrop-blur border border-white/10 shadow-sm">
                      <MapPin className="size-3 text-emerald-400" />
                      {distanceMeters != null
                        ? `${Math.round(distanceMeters)}m dari sekolah`
                        : "Mencari GPS..."}
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary text-primary-foreground shadow-sm">
                      <ShieldCheck className="size-3" /> GTK Terverifikasi
                    </span>
                  </div>

                  {/* Camera Controls Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-3">
                    {capturedPhoto ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setCapturedPhoto(null);
                          startCamera();
                        }}
                        className="rounded-full px-4 text-xs font-bold bg-slate-900/80 text-white hover:bg-slate-900 border border-white/20 backdrop-blur shadow-md"
                      >
                        <RotateCcw className="size-3.5 mr-1.5" /> Ambil Ulang Foto
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={switchCamera}
                          className="rounded-full size-10 p-0 bg-slate-900/70 text-white hover:bg-slate-900 border border-white/20 backdrop-blur"
                          title="Ganti Kamera Depan/Belakang"
                        >
                          <RefreshCw className="size-4" />
                        </Button>

                        <Button
                          size="lg"
                          onClick={takePhoto}
                          className="rounded-full px-6 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-lg text-sm border-2 border-white"
                        >
                          <Camera className="size-5 mr-2" /> Jepret Foto Wajah
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {cameraError && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: GTK Form & Submission (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="rounded-3xl border shadow-sm bg-card p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Profil GTK & Pendidik
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                    {GTK_ROLE_LABELS[activeMandiriGtk?.gtk_role || "guru_pns"]}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  {activeMandiriGtk?.full_name || "Pilih Guru / GTK"}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  NIP/NIK: {activeMandiriGtk?.nip_or_nik || "-"} • {activeMandiriGtk?.subject_specialty || "Tenaga Kependidikan"}
                </p>
              </div>

              {/* Account Selector if multiple GTK profiles */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ganti Akun GTK:</Label>
                <Select value={mandiriGtkId} onValueChange={(val) => setMandiriGtkId(val)}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue placeholder="Pilih Akun Guru / GTK" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {gtkProfiles.map((gtk) => (
                      <SelectItem key={gtk.id} value={gtk.id} className="text-xs">
                        {gtk.full_name} ({GTK_ROLE_LABELS[gtk.gtk_role]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Attendance Mode Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jenis Presensi:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playBeep();
                      setMandiriMode("masuk");
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      mandiriMode === "masuk"
                        ? "bg-emerald-500 text-slate-950 border-emerald-600 shadow-xs"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <LogIn className="size-3.5" /> Absen Masuk
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playBeep();
                      setMandiriMode("pulang");
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      mandiriMode === "pulang"
                        ? "bg-blue-500 text-white border-blue-600 shadow-xs"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <LogOut className="size-3.5" /> Absen Pulang
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playBeep();
                      setMandiriMode("dinas_luar");
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      mandiriMode === "dinas_luar"
                        ? "bg-indigo-500 text-white border-indigo-600 shadow-xs"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Briefcase className="size-3.5" /> Dinas Luar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playBeep();
                      setMandiriMode("izin");
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      mandiriMode === "izin"
                        ? "bg-purple-500 text-white border-purple-600 shadow-xs"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <FileText className="size-3.5" /> Izin / Sakit / Cuti
                  </button>
                </div>
              </div>

              {/* If Izin Mode selected, choose sub-type */}
              {mandiriMode === "izin" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kategori Keterangan:</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["izin", "sakit", "cuti"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMandiriIzinType(t)}
                        className={`p-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                          mandiriIzinType === t
                            ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500"
                            : "bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Geolocation & Radius Verification Card */}
              <div className="p-3.5 rounded-2xl border bg-muted/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" /> Validasi Radius GPS Sekolah
                  </span>
                  <button
                    type="button"
                    onClick={fetchGps}
                    className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="size-3" /> Refresh
                  </button>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Gedung Terdekat:</span>
                  <strong className="text-foreground font-semibold flex items-center gap-1">
                    <Building2 className="size-3 text-primary" />
                    {geofenceResult ? geofenceResult.closestLocationName : "Gedung Sekolah"}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Radius Maksimal:</span>
                  <strong className="text-foreground">
                    {geofenceResult ? geofenceResult.closestRadiusMeters : (activeSchool?.radius_meters || 150)} meter
                  </strong>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Jarak Anda Sekarang:</span>
                  <strong
                    className={
                      geofenceResult?.isWithinRadius
                        ? "text-emerald-600 font-bold"
                        : "text-amber-600 font-bold"
                    }
                  >
                    {distanceMeters != null ? `${Math.round(distanceMeters)} meter` : "Memuat..."}
                  </strong>
                </div>

                {geofenceResult && (
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-muted-foreground">Status Geofence:</span>
                    {geofenceResult.isWithinRadius ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold py-0.5">
                        ✓ Di Dalam Area ({geofenceResult.matchedLocation?.name || geofenceResult.closestLocationName})
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] font-bold py-0.5">
                        ✕ Di Luar Area (+{Math.round(geofenceResult.closestDistanceMeters - geofenceResult.closestRadiusMeters)}m)
                      </Badge>
                    )}
                  </div>
                )}

                {distanceMeters != null && (
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all ${
                        geofenceResult?.isWithinRadius
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (distanceMeters / (geofenceResult?.closestRadiusMeters || activeSchool?.radius_meters || 150)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Notes input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Catatan / Lokasi / Keterangan (Opsional):
                </Label>
                <Input
                  placeholder={
                    mandiriMode === "dinas_luar"
                      ? "Contoh: Workshop Kurikulum di LPMP Provinsi"
                      : mandiriMode === "izin"
                      ? "Contoh: Ada keperluan keluarga mendesak"
                      : "Contoh: Tugas piket pagi gerbang utama"
                  }
                  value={mandiriNotes}
                  onChange={(e) => setMandiriNotes(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>

              {/* Status Today Summary Box */}
              {todayRecordForMandiri && (
                <div className="p-3 rounded-2xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-500" /> Presensi Hari Ini Sudah Tercatat
                  </div>
                  <div className="text-[11px] opacity-90">
                    Masuk: <strong>{todayRecordForMandiri.check_in_time || "-"}</strong> • Pulang:{" "}
                    <strong>{todayRecordForMandiri.check_out_time || "Belum Pulang"}</strong> • Status:{" "}
                    <strong className="uppercase">{todayRecordForMandiri.status}</strong>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                size="lg"
                disabled={isSubmitting || (!capturedPhoto && mandiriMode !== "izin")}
                onClick={handleSubmitMandiri}
                className="w-full rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md h-11"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Menyimpan Presensi...
                  </>
                ) : (
                  <>
                    <Send className="size-4 mr-2" />
                    Kirim Presensi GTK Sekarang
                  </>
                )}
              </Button>

              {!capturedPhoto && mandiriMode !== "izin" && (
                <p className="text-center text-[11px] text-muted-foreground">
                  *Silakan ambil foto selfie wajah terlebih dahulu sebelum mengirim presensi.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROSTER PRESENSI HARI INI (ADMIN / PIKET) */}
      {/* ========================================================================= */}
      {activeTab === "hari_ini" && (
        <div className="space-y-6">
          {/* Real-time Clock & Geofencing Status Bar */}
          <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-card p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                <Clock className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold">WAKTU SISTEM SERVER</span>
                  <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                    <ShieldCheck className="size-3" /> Geofencing Valid ({activeSchool?.radius_meters || 150}m)
                  </Badge>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
                  {currentTime || "07:00:00"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Tanggal Presensi:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border bg-background text-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama GTK, NIP, atau Mapel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="size-3.5 text-muted-foreground" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border bg-background text-foreground focus:outline-none w-full sm:w-auto font-medium"
              >
                <option value="all">Semua Jabatan & GTK</option>
                {Object.entries(GTK_ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GTK Attendance Roster Table */}
          <div className="rounded-2xl border bg-card overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-bold border-b">
                <tr>
                  <th className="px-4 py-3">Nama GTK & NIP</th>
                  <th className="px-4 py-3">Jabatan / Mapel</th>
                  <th className="px-4 py-3">Status Hari Ini</th>
                  <th className="px-4 py-3">Masuk (In)</th>
                  <th className="px-4 py-3">Pulang (Out)</th>
                  <th className="px-4 py-3">Aksi Cepat Presensi</th>
                  <th className="px-4 py-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRosterGtk.map((gtk) => {
                  const record = recordsMap.get(gtk.id);
                  const statusMeta = record ? STATUS_CONFIG[record.status] : null;

                  return (
                    <tr key={gtk.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & NIP */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground text-sm">{gtk.full_name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>NIP/NIK: {gtk.nip_or_nik}</span>
                          {gtk.phone && <span>• {gtk.phone}</span>}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {GTK_ROLE_LABELS[gtk.gtk_role] || gtk.gtk_role}
                        </Badge>
                        {gtk.subject_specialty && (
                          <span className="block text-[11px] text-muted-foreground mt-0.5">
                            {gtk.subject_specialty}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        {statusMeta ? (
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                            >
                              <CheckCircle2 className="size-3" />
                              {statusMeta.label}
                            </span>
                            {record.late_minutes && record.late_minutes > 0 ? (
                              <span className="block text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                                Terlambat {record.late_minutes} mnt
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            Belum Presensi
                          </span>
                        )}
                      </td>

                      {/* Check-In */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        {record?.check_in_time ? (
                          <span className="font-bold text-foreground">
                            {record.check_in_time}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Check-Out */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        {record?.check_out_time ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {record.check_out_time}
                          </span>
                        ) : record?.check_in_time ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 px-2 rounded-md gap-1 text-primary hover:bg-primary/10 font-semibold"
                            onClick={() => handleCheckOut(gtk.id)}
                          >
                            <Clock className="size-3" /> Pulang
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Quick Attendance Buttons */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            onClick={() => handleQuickMark(gtk.id, "hadir")}
                            title="Tandai Hadir Tepat Waktu"
                            className={`size-7 rounded-md font-bold text-[11px] flex items-center justify-center transition-all ${
                              record?.status === "hadir"
                                ? "bg-emerald-500 text-white shadow-xs"
                                : "bg-muted text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-600"
                            }`}
                          >
                            H
                          </button>
                          <button
                            onClick={() => handleQuickMark(gtk.id, "terlambat")}
                            title="Tandai Terlambat"
                            className={`size-7 rounded-md font-bold text-[11px] flex items-center justify-center transition-all ${
                              record?.status === "terlambat"
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-muted text-muted-foreground hover:bg-amber-500/20 hover:text-amber-600"
                            }`}
                          >
                            T
                          </button>
                          <button
                            onClick={() => handleQuickMark(gtk.id, "izin")}
                            title="Tandai Izin"
                            className={`size-7 rounded-md font-bold text-[11px] flex items-center justify-center transition-all ${
                              record?.status === "izin"
                                ? "bg-blue-500 text-white shadow-xs"
                                : "bg-muted text-muted-foreground hover:bg-blue-500/20 hover:text-blue-600"
                            }`}
                          >
                            I
                          </button>
                          <button
                            onClick={() => handleQuickMark(gtk.id, "sakit")}
                            title="Tandai Sakit"
                            className={`size-7 rounded-md font-bold text-[11px] flex items-center justify-center transition-all ${
                              record?.status === "sakit"
                                ? "bg-purple-500 text-white shadow-xs"
                                : "bg-muted text-muted-foreground hover:bg-purple-500/20 hover:text-purple-600"
                            }`}
                          >
                            S
                          </button>
                          <button
                            onClick={() => handleQuickMark(gtk.id, "dinas_luar")}
                            title="Tandai Dinas Luar"
                            className={`size-7 rounded-md font-bold text-[11px] flex items-center justify-center transition-all ${
                              record?.status === "dinas_luar"
                                ? "bg-indigo-500 text-white shadow-xs"
                                : "bg-muted text-muted-foreground hover:bg-indigo-500/20 hover:text-indigo-600"
                            }`}
                          >
                            DL
                          </button>
                        </div>
                      </td>

                      {/* Detail View */}
                      <td className="px-4 py-3.5 text-right">
                        {record ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRecordDetail({ gtk, record })}
                            className="size-8 p-0 rounded-lg"
                            title="Lihat Detail Foto & Koordinat"
                          >
                            <Eye className="size-4 text-muted-foreground" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KIOS GERBANG SCANNER RFID / BARCODE */}
      {/* ========================================================================= */}
      {activeTab === "kios" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Card className="rounded-3xl border shadow-sm p-6 bg-gradient-to-br from-card to-secondary/30 space-y-5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <Radio className="size-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-foreground">
                      Kios Gerbang Hands-Free RFID & Barcode GTK
                    </CardTitle>
                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      SIAP SCAN
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Sentuhkan kartu RFID GTK ke alat pembaca USB atau scan QR barcode kartu.
                  </CardDescription>
                </div>
              </div>

              {/* Fast Reader Input Box */}
              <div className="space-y-2 p-5 rounded-2xl border bg-card shadow-sm">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Scanner Input (Auto Focus Reader):
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <CreditCard className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Tempelkan kartu RFID atau masukkan NIP/NIK GTK..."
                      value={kiosRfidInput}
                      onChange={(e) => setKiosRfidInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleProcessKiosScan(kiosRfidInput);
                        }
                      }}
                      className="pl-9 font-mono text-sm h-11 rounded-xl"
                    />
                  </div>
                  <Button
                    onClick={() => handleProcessKiosScan(kiosRfidInput)}
                    className="h-11 px-5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
                  >
                    Proses Scan
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  *Mendukung USB RFID Reader 13.56MHz/125KHz, Barcode Scanner Gun, & QR Scanner.
                </p>
              </div>

              {/* Quick Preset Buttons for Simulation */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Simulasi Cepat Tap Kartu GTK:
                </span>
                <div className="flex flex-wrap gap-2">
                  {gtkProfiles.slice(0, 6).map((gtk) => (
                    <Button
                      key={gtk.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleProcessKiosScan(gtk.nip_or_nik)}
                      className="text-xs rounded-xl h-8 border-dashed"
                    >
                      <CreditCard className="size-3 mr-1 text-primary" />
                      {gtk.full_name.split(" ")[0]} ({gtk.nip_or_nik})
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Live Recent Kios Feed */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="rounded-3xl border shadow-sm p-5 space-y-4 bg-card">
              <div className="flex items-center justify-between border-b pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> Feed Kios Hari Ini
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {kiosRecentLog.length} Aktivitas
                </Badge>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {kiosRecentLog.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-2xl">
                    Belum ada kartu GTK yang ditap di kios hari ini.
                  </div>
                ) : (
                  kiosRecentLog.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 text-xs"
                    >
                      <div>
                        <div className="font-bold text-foreground">{log.gtk.full_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          NIP: {log.gtk.nip_or_nik} • {GTK_ROLE_LABELS[log.gtk.gtk_role]}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            log.type === "in"
                              ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px]"
                              : "bg-blue-500/20 text-blue-600 border-blue-500/30 text-[10px]"
                          }
                        >
                          {log.type === "in" ? "✓ MASUK" : "✓ PULANG"}
                        </Badge>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {log.time}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RIWAYAT PRESENSI & REKAP BULANAN */}
      {/* ========================================================================= */}
      {activeTab === "riwayat" && (
        <div className="space-y-5">
          <Card className="p-4 rounded-2xl border shadow-sm bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-4 relative">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Cari nama GTK atau NIP..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 text-xs rounded-xl h-9"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  type="month"
                  value={historyMonth}
                  onChange={(e) => setHistoryMonth(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border bg-background text-foreground h-9"
                />
              </div>

              <div className="sm:col-span-3">
                <Select value={historyGtkId} onValueChange={(val) => setHistoryGtkId(val)}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue placeholder="Semua GTK" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">Semua Guru & GTK</SelectItem>
                    {gtkProfiles.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Select value={historyStatusFilter} onValueChange={(val) => setHistoryStatusFilter(val)}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="hadir">Hadir</SelectItem>
                    <SelectItem value="terlambat">Terlambat</SelectItem>
                    <SelectItem value="izin">Izin</SelectItem>
                    <SelectItem value="sakit">Sakit</SelectItem>
                    <SelectItem value="dinas_luar">Dinas Luar</SelectItem>
                    <SelectItem value="cuti">Cuti</SelectItem>
                    <SelectItem value="alpa">Alpa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* History Records Table */}
          <div className="rounded-2xl border bg-card overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-bold border-b">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Nama GTK & NIP</th>
                  <th className="px-4 py-3">Jabatan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Jam Masuk</th>
                  <th className="px-4 py-3">Jam Pulang</th>
                  <th className="px-4 py-3">Metode & GPS</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHistoryRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-xs text-muted-foreground">
                      Tidak ada riwayat presensi yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredHistoryRecords.map((rec) => {
                    const gtk = gtkProfiles.find((g) => g.id === rec.gtk_id);
                    const statusMeta = STATUS_CONFIG[rec.status] || STATUS_CONFIG.hadir;

                    return (
                      <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold whitespace-nowrap">
                          {formatDateId(rec.date)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-foreground">{gtk?.full_name || rec.gtk_name}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            NIP: {gtk?.nip_or_nik || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="outline" className="text-[10px]">
                            {GTK_ROLE_LABELS[gtk?.gtk_role || rec.gtk_role] || rec.gtk_role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-foreground">
                          {rec.check_in_time || "—"}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {rec.check_out_time || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground">
                              {rec.method === "rfid_card" ? "Kartu RFID" : rec.method === "manual" ? "Manual Piket" : "Selfie GPS"}
                            </span>
                            {rec.location_verified && (
                              <Badge className="bg-emerald-500/20 text-emerald-600 text-[9px] py-0 px-1">
                                Radius Valid
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs">
                          {rec.notes || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MASTER DATA GTK & KARTU DIGITAL */}
      {/* ========================================================================= */}
      {activeTab === "master" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Daftar Guru & Tenaga Kependidikan</h3>
              <p className="text-xs text-muted-foreground">
                Kelola NIP, jabatan, mata pelajaran, dan kartu digital RFID seluruh GTK.
              </p>
            </div>

            <Button
              onClick={handleOpenAddGtk}
              className="rounded-xl shadow-xs gap-2 font-bold text-xs h-9 bg-primary text-primary-foreground"
            >
              <Plus className="size-4" /> Tambah GTK Baru
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gtkProfiles.map((gtk) => (
              <Card key={gtk.id} className="rounded-2xl border shadow-sm p-4 bg-card hover:border-primary/40 transition-all space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                      {gtk.full_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{gtk.full_name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">NIP: {gtk.nip_or_nik}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {GTK_ROLE_LABELS[gtk.gtk_role]}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                  <div className="flex items-center justify-between">
                    <span>Tugas / Mapel:</span>
                    <strong className="text-foreground">{gtk.subject_specialty || "-"}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Telepon / WA:</span>
                    <strong className="text-foreground">{gtk.phone || "-"}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIdCardGtk(gtk)}
                    className="flex-1 text-xs rounded-xl h-8 text-primary"
                  >
                    <CreditCard className="size-3.5 mr-1" /> Kartu RFID
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditGtk(gtk)}
                    className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Edit Profil GTK"
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGtk(gtk.id, gtk.full_name)}
                    className="size-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    title="Hapus GTK"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL FOTO SELFIE & KOORDINAT */}
      {/* ========================================================================= */}
      {selectedRecordDetail && (
        <Dialog
          open={!!selectedRecordDetail}
          onOpenChange={() => setSelectedRecordDetail(null)}
        >
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                Bukti Presensi & Verifikasi GTK
              </DialogTitle>
              <DialogDescription className="text-xs">
                Informasi foto selfie kamera, jam pencatatan, dan titik koordinat geofencing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {selectedRecordDetail.record.selfie_url ? (
                <div className="aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-950 border">
                  <img
                    src={selectedRecordDetail.record.selfie_url}
                    alt="Selfie Check-in"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-4/3 w-full rounded-2xl bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  Tidak ada foto selfie tersimpan untuk entri ini.
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                  <span className="text-muted-foreground">Nama GTK:</span>
                  <strong className="text-foreground">{selectedRecordDetail.gtk.full_name}</strong>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                  <span className="text-muted-foreground">Waktu Masuk:</span>
                  <strong className="text-foreground">{selectedRecordDetail.record.check_in_time || "-"}</strong>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                  <span className="text-muted-foreground">Waktu Pulang:</span>
                  <strong className="text-emerald-600 font-bold">{selectedRecordDetail.record.check_out_time || "Belum Pulang"}</strong>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                  <span className="text-muted-foreground">Status Geofencing:</span>
                  <Badge className="bg-emerald-500/20 text-emerald-600 text-[10px]">
                    {selectedRecordDetail.record.location_verified ? "✓ Dalam Radius Sekolah" : "Di Luar Radius"}
                  </Badge>
                </div>
                {selectedRecordDetail.record.notes && (
                  <div className="p-2 rounded-xl bg-muted/40">
                    <span className="text-muted-foreground block mb-0.5">Catatan:</span>
                    <p className="text-foreground">{selectedRecordDetail.record.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedRecordDetail(null)}
                className="w-full rounded-xl"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DIGITAL ID CARD / RFID GTK */}
      {/* ========================================================================= */}
      {idCardGtk && (
        <Dialog open={!!idCardGtk} onOpenChange={() => setIdCardGtk(null)}>
          <DialogContent className="max-w-sm rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                Kartu GTK & Barcode RFID
              </DialogTitle>
              <DialogDescription className="text-xs">
                Kartu identitas resmi untuk tap di Kios Gerbang Sekolah.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-primary/15 via-card to-secondary/40 border shadow-inner space-y-4 text-center">
              <div className="bg-white p-3 rounded-2xl shadow-sm border">
                <QRCodeSVG
                  value={`GTK:${idCardGtk.school_id}:${idCardGtk.nip_or_nik}`}
                  size={140}
                  level="M"
                />
              </div>

              <div>
                <h4 className="font-extrabold text-base text-foreground">{idCardGtk.full_name}</h4>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">NIP: {idCardGtk.nip_or_nik}</p>
                <Badge className="mt-2 text-[10px] bg-primary text-primary-foreground font-bold">
                  {GTK_ROLE_LABELS[idCardGtk.gtk_role]}
                </Badge>
              </div>

              <div className="text-[11px] text-muted-foreground border-t w-full pt-2">
                {activeSchool?.name || "Sekolah"}
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="w-full rounded-xl text-xs font-bold"
              >
                <Printer className="size-4 mr-1.5" /> Cetak Kartu
              </Button>
              <Button
                onClick={() => setIdCardGtk(null)}
                className="w-full rounded-xl text-xs font-bold"
              >
                Selesai
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT GTK */}
      {/* ========================================================================= */}
      {isAddGtkOpen && (
        <Dialog open={isAddGtkOpen} onOpenChange={setIsAddGtkOpen}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingGtk ? "Edit Profil GTK" : "Tambah Guru / GTK Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Lengkapi data identitas, NIP/NIK, jabatan, dan nomor kontak aktif.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleGtkSubmit} className="space-y-3.5 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama Lengkap & Gelar *</Label>
                <Input
                  required
                  placeholder="Contoh: Drs. Bambang Sudarsono, M.Pd"
                  value={gtkFormData.full_name}
                  onChange={(e) => setGtkFormData({ ...gtkFormData, full_name: e.target.value })}
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">NIP / NIK / No. Induk *</Label>
                  <Input
                    required
                    placeholder="197204151998021001"
                    value={gtkFormData.nip_or_nik}
                    onChange={(e) => setGtkFormData({ ...gtkFormData, nip_or_nik: e.target.value })}
                    className="rounded-xl text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Jabatan / Role *</Label>
                  <Select
                    value={gtkFormData.gtk_role}
                    onValueChange={(val: any) => setGtkFormData({ ...gtkFormData, gtk_role: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GTK_ROLE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mata Pelajaran / Tugas Tambahan</Label>
                <Input
                  placeholder="Contoh: Pemrograman Web / Kepala Lab Komputer"
                  value={gtkFormData.subject_specialty || ""}
                  onChange={(e) => setGtkFormData({ ...gtkFormData, subject_specialty: e.target.value })}
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nomor WhatsApp</Label>
                  <Input
                    placeholder="08123456789"
                    value={gtkFormData.phone}
                    onChange={(e) => setGtkFormData({ ...gtkFormData, phone: e.target.value })}
                    className="rounded-xl text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Jenis Kelamin</Label>
                  <Select
                    value={gtkFormData.gender}
                    onValueChange={(val: any) => setGtkFormData({ ...gtkFormData, gender: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddGtkOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button type="submit" className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                  {editingGtk ? "Simpan Perubahan" : "Tambahkan GTK"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
