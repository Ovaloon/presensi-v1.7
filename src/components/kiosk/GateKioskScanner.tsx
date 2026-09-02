import React, { useState, useEffect, useRef } from "react";
import {
  QrCode,
  CreditCard,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  UserCheck,
  Zap,
  Radio,
  Layers,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  Sparkles,
  ShieldCheck,
  School,
  Focus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSchoolStore } from "@/lib/store";
import {
  calculateStatus,
  formatDateId,
  formatTimeId,
  todayIso,
  STATUS_LABEL,
  STATUS_CLASS,
  AttendanceStatus,
} from "@/lib/attendance";
import { soundManager } from "@/lib/sound";
import { toast } from "sonner";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface GateKioskScannerProps {
  onNavigate?: (view: string, param?: string) => void;
}

export function GateKioskScanner({ onNavigate }: GateKioskScannerProps) {
  const {
    students,
    classes,
    sessions,
    records,
    activeSchool,
    markAttendance,
    markCheckOut,
    terms,
    dailyConfig,
  } = useSchoolStore();

  const [kioskMode, setKioskMode] = useState<"check_in" | "check_out">("check_in");
  const [rfidInput, setRfidInput] = useState("");
  const [autoFocusLock, setAutoFocusLock] = useState(true);
  const [voiceAnnounce, setVoiceAnnounce] = useState(true);
  const [cameraScannerActive, setCameraScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Last scanned student for visual banner
  const [lastScanned, setLastScanned] = useState<{
    studentName: string;
    studentNis: string;
    className: string;
    status: AttendanceStatus;
    time: string;
    type: "check_in" | "check_out";
    success: boolean;
    message?: string;
  } | null>(null);

  const rfidInputRef = useRef<HTMLInputElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep auto-focus lock on RFID input if enabled
  useEffect(() => {
    if (!autoFocusLock) return;

    const focusInput = () => {
      if (rfidInputRef.current && document.activeElement !== rfidInputRef.current) {
        rfidInputRef.current.focus();
      }
    };

    focusInput();
    const interval = setInterval(focusInput, 1500);

    const handleWindowClick = () => {
      if (autoFocusLock) {
        setTimeout(focusInput, 100);
      }
    };

    window.addEventListener("click", handleWindowClick);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", handleWindowClick);
    };
  }, [autoFocusLock]);

  // Current real-time clock
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's active sessions
  const todaySessions = sessions.filter(
    (s) => s.date === todayIso() && s.status === "open"
  );
  const defaultTodaySession = todaySessions[0] || sessions[0];

  // Process raw scan code (either from RFID reader, Barcode Gun, or Camera QR)
  const processRawScan = (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    // Clear input
    setRfidInput("");

    // Find student by NIS, card_uid (RFID), or QR format: "STUDENT:schoolId:nis"
    let targetNis = trimmed;
    let targetRfid = trimmed;

    if (trimmed.startsWith("STUDENT:")) {
      const parts = trimmed.split(":");
      if (parts.length >= 3) {
        targetNis = parts[2];
      }
    }

    const student = students.find(
      (s) =>
        s.nis?.toLowerCase() === targetNis.toLowerCase() ||
        s.card_uid?.toLowerCase() === targetRfid.toLowerCase() ||
        s.id === trimmed
    );

    if (!student) {
      soundManager.playError();
      if (voiceAnnounce) {
        soundManager.speakIndonesian("Kartu tidak terdaftar dalam sistem.");
      }
      setLastScanned({
        studentName: "Kartu / Barcode Tidak Dikenal",
        studentNis: trimmed,
        className: "-",
        status: "alpa",
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        type: kioskMode,
        success: false,
        message: "Nomor kartu atau NIS tidak ditemukan di database sekolah.",
      });
      toast.error(`Kartu/Kode '${trimmed}' tidak terdaftar.`);
      return;
    }

    const studentClass = classes.find((c) => c.id === student.class_id);
    const className = studentClass?.name || terms.class_label;
    const timeNowStr = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Determine session for this student
    const studentSession =
      sessions.find(
        (s) =>
          s.date === todayIso() &&
          (s.class_id === student.class_id || !s.class_id) &&
          s.status === "open"
      ) || defaultTodaySession;

    if (kioskMode === "check_out") {
      // Mark Check-Out
      markCheckOut({
        sessionId: studentSession?.id,
        studentId: student.id,
        method: "rfid",
      });

      soundManager.playSuccess();
      if (voiceAnnounce) {
        soundManager.speakIndonesian(`Selamat jalan ${student.full_name}, presensi pulang berhasil.`);
      }

      setLastScanned({
        studentName: student.full_name,
        studentNis: student.nis || "-",
        className,
        status: "hadir",
        time: timeNowStr,
        type: "check_out",
        success: true,
        message: "Presensi PULANG tercatat resmi.",
      });

      toast.success(`Pulang: ${student.full_name} (${className})`);
    } else {
      // Calculate status (Hadir vs Terlambat)
      const status: AttendanceStatus = studentSession
        ? calculateStatus(studentSession.start_time, studentSession.late_after_minutes)
        : "hadir";

      markAttendance({
        sessionId: studentSession?.id || "ses-kiosk",
        studentId: student.id,
        status,
        method: "rfid",
      });

      soundManager.playSuccess();
      if (voiceAnnounce) {
        if (status === "terlambat") {
          soundManager.speakIndonesian(`Selamat pagi ${student.full_name}, Anda tercatat terlambat.`);
        } else {
          soundManager.speakIndonesian(`Selamat pagi ${student.full_name}, presensi berhasil.`);
        }
      }

      setLastScanned({
        studentName: student.full_name,
        studentNis: student.nis || "-",
        className,
        status,
        time: timeNowStr,
        type: "check_in",
        success: true,
        message: status === "terlambat" ? "Presensi MASUK (Terlambat)." : "Presensi MASUK (Tepat Waktu).",
      });

      toast.success(`Masuk: ${student.full_name} [${STATUS_LABEL[status]}]`);
    }

    // Auto-dismiss banner after 4.5 seconds
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      // keep last record visible but soften state
    }, 4500);
  };

  const handleRfidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processRawScan(rfidInput);
  };

  // Camera QR Code Scanner start/stop
  const startCameraScanner = async () => {
    setScannerError(null);
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop().catch(() => {});
      }

      const html5QrCode = new Html5Qrcode("kiosk-qr-reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
        ],
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
        },
        (decodedText) => {
          processRawScan(decodedText);
        },
        () => {
          // ignore frame decode errors
        }
      );

      setCameraScannerActive(true);
      toast.success("Kamera pemindai QR aktif.");
    } catch (err: any) {
      setScannerError("Gagal membuka kamera pemindai. Pastikan izin kamera telah diberikan.");
      setCameraScannerActive(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    setCameraScannerActive(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
    };
  }, []);

  // Today's records
  const todayRecords = records.filter(
    (r) => r.marked_at?.startsWith(todayIso()) || (r as any).date === todayIso()
  );
  const totalHadirToday = todayRecords.filter((r) => r.status === "hadir").length;
  const totalTelatToday = todayRecords.filter((r) => r.status === "terlambat").length;
  const totalPulangToday = todayRecords.filter((r) => !!r.check_out_time).length;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Kiosk Header Bar */}
      <div className="bg-gradient-to-r from-primary/90 via-primary to-primary/80 text-primary-foreground p-5 sm:p-6 rounded-3xl shadow-lg border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-center md:text-left">
          <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
            <Radio className="size-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Kios Presensi Gerbang</h2>
              <Badge className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold border-none">
                LIVE KIOSK
              </Badge>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              {activeSchool?.name || "Sekolah"} • {formatDateId(todayIso())}
            </p>
          </div>
        </div>

        {/* Real-time Clock & Fullscreen */}
        <div className="flex items-center gap-3">
          <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-center">
            <div className="font-mono text-xl sm:text-2xl font-black text-white tracking-widest">
              {currentTime} <span className="text-xs font-sans font-normal text-white/70">WIB</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20 rounded-xl size-10"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mode Switcher & Quick Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Toggle Mode: Masuk vs Pulang */}
        <div className="md:col-span-2 flex bg-card p-1.5 rounded-2xl border shadow-sm gap-1.5">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep();
              setKioskMode("check_in");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
              kioskMode === "check_in"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.01]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <LogIn className="size-4" />
            MODE PRESENSI MASUK (Pagi)
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playBeep();
              setKioskMode("check_out");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
              kioskMode === "check_out"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20 scale-[1.01]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <LogOut className="size-4" />
            MODE PRESENSI PULANG (Sore)
          </button>
        </div>

        {/* Toggles: Auto-Focus Lock & Audio Speech */}
        <div className="flex items-center justify-between sm:justify-end gap-4 bg-card p-2.5 px-4 rounded-2xl border shadow-sm text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Switch
              id="autofocus-toggle"
              checked={autoFocusLock}
              onCheckedChange={setAutoFocusLock}
            />
            <Label htmlFor="autofocus-toggle" className="cursor-pointer text-xs flex items-center gap-1">
              <Focus className="size-3.5 text-primary" /> Auto-Focus Lock
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="voice-toggle"
              checked={voiceAnnounce}
              onCheckedChange={setVoiceAnnounce}
            />
            <Label htmlFor="voice-toggle" className="cursor-pointer text-xs flex items-center gap-1">
              {voiceAnnounce ? <Volume2 className="size-3.5 text-emerald-600" /> : <VolumeX className="size-3.5 text-muted-foreground" />}
              Suara
            </Label>
          </div>
        </div>
      </div>

      {/* Main Kiosk Interaction Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): RFID Scanner Input & Live Camera */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hands-Free RFID & Barcode Scanner Input */}
          <Card className="border shadow-md bg-card overflow-hidden rounded-3xl">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="size-5 text-primary" />
                  Pemindai Kartu RFID / Barcode Scanner
                </span>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
                  READY TO TAP
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Tempelkan kartu RFID atau scan barcode/QR kartu {terms.student_label.toLowerCase()} dengan scanner scanner gun.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <form onSubmit={handleRfidSubmit} className="space-y-3">
                <div className="relative">
                  <Input
                    ref={rfidInputRef}
                    type="text"
                    value={rfidInput}
                    onChange={(e) => setRfidInput(e.target.value)}
                    placeholder="Tempelkan kartu RFID / ketik NIS lalu Enter..."
                    className="h-14 text-base font-mono pl-11 pr-24 rounded-2xl border-2 border-primary/40 focus-visible:border-primary focus-visible:ring-primary shadow-inner"
                    autoComplete="off"
                    autoFocus
                  />
                  <Zap className="size-5 text-primary absolute left-3.5 top-1/2 -translate-y-1/2 animate-bounce" />
                  <Button
                    type="submit"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 rounded-xl font-bold text-xs"
                  >
                    Proses
                  </Button>
                </div>

                {autoFocusLock && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    Auto-Focus aktif: Sistem siap menerima tap kartu secara beruntun tanpa perlu klik mouse.
                  </p>
                )}
              </form>

              {/* Camera QR Code Scanner Embedded */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Camera className="size-4 text-primary" /> Pemindai Kamera Web (QR & Barcode)
                  </span>

                  {cameraScannerActive ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={stopCameraScanner}
                      className="text-xs h-8 rounded-xl font-bold"
                    >
                      Matikan Kamera
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startCameraScanner}
                      className="text-xs h-8 rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary/20 border-primary/30"
                    >
                      Nyalakan Kamera Kios
                    </Button>
                  )}
                </div>

                {cameraScannerActive && (
                  <div className="relative rounded-2xl overflow-hidden border bg-black shadow-inner">
                    <div id="kiosk-qr-reader" className="w-full h-64 overflow-hidden rounded-2xl" />
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm">
                      Arahkan QR Siswa ke Kotak
                    </div>
                  </div>
                )}

                {scannerError && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    {scannerError}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Real-time Banner of Last Scanned Student */}
          {lastScanned && (
            <Card
              className={`border-2 shadow-xl overflow-hidden rounded-3xl transition-all animate-in fade-in zoom-in-95 ${
                !lastScanned.success
                  ? "border-destructive/50 bg-destructive/5"
                  : lastScanned.type === "check_out"
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-emerald-500/50 bg-emerald-500/5"
              }`}
            >
              <div
                className={`p-4 text-white flex items-center justify-between ${
                  !lastScanned.success
                    ? "bg-destructive"
                    : lastScanned.type === "check_out"
                    ? "bg-amber-600"
                    : "bg-emerald-600"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-white/20 flex items-center justify-center">
                    {lastScanned.success ? (
                      <CheckCircle2 className="size-5 text-white" />
                    ) : (
                      <AlertTriangle className="size-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm uppercase tracking-wide">
                      {lastScanned.success
                        ? lastScanned.type === "check_out"
                          ? "PRESENSI PULANG BERHASIL"
                          : "PRESENSI MASUK BERHASIL"
                        : "PRESENSI DITOLAK"}
                    </h4>
                    <p className="text-[11px] text-white/80">{lastScanned.message}</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs bg-white/20 px-2.5 py-1 rounded-lg">
                  {lastScanned.time} WIB
                </span>
              </div>

              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div
                    className={`size-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md ${
                      lastScanned.success
                        ? "bg-primary text-primary-foreground"
                        : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    {lastScanned.studentName.charAt(0)}
                  </div>

                  <div className="space-y-1 flex-1">
                    <h3 className="font-black text-lg text-foreground leading-tight">
                      {lastScanned.studentName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {terms.identifier_label}: <span className="font-mono font-bold text-foreground">{lastScanned.studentNis}</span> • {terms.class_label}: <strong className="text-foreground">{lastScanned.className}</strong>
                    </p>
                    {lastScanned.success && lastScanned.type === "check_in" && (
                      <Badge className={`${STATUS_CLASS[lastScanned.status]} text-xs font-bold mt-1`}>
                        {STATUS_LABEL[lastScanned.status].toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (5 cols): Live Stats & Today's Stream */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Counter Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center rounded-2xl border shadow-sm bg-emerald-500/5 border-emerald-500/20">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">Tepat Waktu</span>
              <p className="text-2xl font-black text-emerald-700 font-mono mt-0.5">{totalHadirToday}</p>
            </Card>

            <Card className="p-3 text-center rounded-2xl border shadow-sm bg-amber-500/5 border-amber-500/20">
              <span className="text-[11px] font-bold text-amber-600 uppercase">Terlambat</span>
              <p className="text-2xl font-black text-amber-700 font-mono mt-0.5">{totalTelatToday}</p>
            </Card>

            <Card className="p-3 text-center rounded-2xl border shadow-sm bg-blue-500/5 border-blue-500/20">
              <span className="text-[11px] font-bold text-blue-600 uppercase">Sudah Pulang</span>
              <p className="text-2xl font-black text-blue-700 font-mono mt-0.5">{totalPulangToday}</p>
            </Card>
          </div>

          {/* Live Recent Scan Feed */}
          <Card className="border shadow-md bg-card rounded-3xl overflow-hidden flex flex-col h-[460px]">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  Aktivitas Presensi Hari Ini
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Total: {todayRecords.length} {terms.student_label.toLowerCase()}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-y-auto divide-y divide-border">
              {todayRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <UserCheck className="size-8 mx-auto text-muted-foreground/50" />
                  <p>Belum ada aktivitas presensi di kios hari ini.</p>
                  <p className="text-[11px]">Silakan tap kartu RFID atau scan barcode untuk memulai.</p>
                </div>
              ) : (
                todayRecords
                  .slice()
                  .reverse()
                  .map((rec) => {
                    const stu = students.find((s) => s.id === rec.student_id);
                    const cls = classes.find((c) => c.id === stu?.class_id);

                    return (
                      <div
                        key={rec.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                            {stu?.full_name?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{stu?.full_name || "Siswa"}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {stu?.nis} • {cls?.name || terms.class_label}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-0.5">
                          <Badge className={`${STATUS_CLASS[rec.status]} text-[10px] font-bold`}>
                            {STATUS_LABEL[rec.status]}
                          </Badge>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {formatTimeId(rec.marked_at)} WIB
                          </p>
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
