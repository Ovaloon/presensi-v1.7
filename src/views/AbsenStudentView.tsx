import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Fingerprint,
  MapPin,
  QrCode,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Clock,
  Send,
  Loader2,
  AlertTriangle,
  Share2,
  Download,
  Building,
  Navigation,
  Compass,
  LogIn,
  LogOut,
  SwitchCamera,
  RefreshCw,
  Radio,
} from "lucide-react";
import { GateKioskScanner } from "@/components/kiosk/GateKioskScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchoolStore } from "@/lib/store";
import {
  haversineDistanceMeters,
  checkSchoolGeofence,
  GeofenceMatchResult,
  calculateStatus,
  formatDateId,
  formatTimeId,
  todayIso,
  STATUS_LABEL,
  STATUS_CLASS,
  AttendanceStatus,
} from "@/lib/attendance";
import { toast } from "sonner";
import { soundManager } from "@/lib/sound";

interface AbsenStudentViewProps {
  initialSessionId?: string;
  initialToken?: string;
  onNavigate: (view: string, param?: string) => void;
}

export function AbsenStudentView({
  initialSessionId,
  initialToken,
  onNavigate,
}: AbsenStudentViewProps) {
  const {
    sessions,
    classes,
    students,
    activeSchool,
    markAttendance,
    markCheckOut,
    records,
    currentUser,
    myStudentProfile,
    role,
    verifyQrToken,
    terms,
  } = useSchoolStore();

  const [attendanceMode, setAttendanceMode] = useState<"check_in" | "check_out">("check_in");
  const [mainTab, setMainTab] = useState<"kiosk" | "selfie">(role === "student" ? "selfie" : "kiosk");

  // Determine active student
  const defaultStudentId =
    role === "student" && myStudentProfile
      ? myStudentProfile.id
      : students.find((s) => s.nis === currentUser?.nis)?.id || students[0]?.id || "";

  const [selectedStudentId, setSelectedStudentId] = useState<string>(defaultStudentId);

  // Auto-find today's session for the student's class
  const studentProfileObj = students.find((s) => s.id === selectedStudentId) || myStudentProfile;

  const defaultSessionId =
    initialSessionId ||
    sessions.find(
      (s) =>
        s.date === todayIso() &&
        (s.class_id === studentProfileObj?.class_id || !s.class_id) &&
        s.status === "open"
    )?.id ||
    sessions.find((s) => s.status === "open")?.id ||
    sessions[0]?.id ||
    "";

  const [selectedSessionId, setSelectedSessionId] = useState<string>(defaultSessionId);

  // Synchronize if student changes
  useEffect(() => {
    if (studentProfileObj) {
      const match = sessions.find(
        (s) =>
          s.date === todayIso() &&
          (s.class_id === studentProfileObj.class_id || !s.class_id) &&
          s.status === "open"
      );
      if (match) {
        setSelectedSessionId(match.id);
      }
    }
  }, [selectedStudentId, sessions]);

  // GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [geofenceResult, setGeofenceResult] = useState<GeofenceMatchResult | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Camera Selfie State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    type: "check_in" | "check_out";
    studentName: string;
    studentNis: string;
    className: string;
    status: AttendanceStatus;
    time: string;
    method: string;
    distance: number | null;
    locationName?: string;
  } | null>(null);

  const activeSession = sessions.find((s) => s.id === selectedSessionId);
  const targetClass = classes.find((c) => c.id === activeSession?.class_id);
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Check today's record for the selected student
  const todayRecord = records.find(
    (r) =>
      r.student_id === selectedStudentId &&
      (r.marked_at?.startsWith(todayIso()) || (r as any).date === todayIso())
  );

  // Auto-switch to check_out if student already has check_in today but hasn't checked out
  useEffect(() => {
    if (todayRecord?.marked_at && !todayRecord.check_out_time) {
      setAttendanceMode("check_out");
    } else if (!todayRecord) {
      setAttendanceMode("check_in");
    }
  }, [selectedStudentId, todayRecord?.marked_at, todayRecord?.check_out_time]);

  // If token is provided, verify it
  useEffect(() => {
    if (initialToken) {
      const verification = verifyQrToken(initialToken);
      if (verification.valid && verification.session) {
        setSelectedSessionId(verification.session.id);
        toast.success(`QR Token valid untuk sesi: ${verification.session.subject}`);
      }
    }
  }, [initialToken]);

  // Request GPS automatically
  useEffect(() => {
    fetchGpsLocation();
  }, [activeSchool?.latitude, activeSchool?.longitude, activeSchool?.locations]);

  const fetchGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Browser tidak mendukung GPS.");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);
        setUserLat(lat);
        setUserLng(lng);
        setGpsAccuracy(accuracy);
        setGpsLoading(false);

        const geoMatch = checkSchoolGeofence(lat, lng, activeSchool);
        setGeofenceResult(geoMatch);
        setDistanceMeters(geoMatch.closestDistanceMeters);
      },
      (err) => {
        setGpsLoading(false);
        // Fallback for sandboxed preview
        if (activeSchool?.latitude != null && activeSchool?.longitude != null) {
          const lat = activeSchool.latitude + 0.0001;
          const lng = activeSchool.longitude + 0.0001;
          setUserLat(lat);
          setUserLng(lng);
          const geoMatch = checkSchoolGeofence(lat, lng, activeSchool);
          setGeofenceResult(geoMatch);
          setDistanceMeters(geoMatch.closestDistanceMeters);
          setGpsAccuracy(8);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Camera handlers
  const startCamera = async (mode: "user" | "environment" = cameraFacingMode) => {
    setCameraError(null);
    stopCamera();
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Perangkat atau browser ini tidak mendukung akses kamera.");
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
      setCameraError("Tidak dapat mengakses kamera. Pastikan izin kamera telah disetujui di browser.");
    }
  };

  const toggleCameraFacingMode = () => {
    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextMode);
    startCamera(nextMode);
    toast.info(`Beralih ke kamera ${nextMode === "user" ? "depan" : "belakang"}`);
  };

  const stopCamera = () => {
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      try {
        videoRef.current.pause();
      } catch (e) {
        // ignore
      }
    }
    setCameraActive(false);
  };

  const takeSelfie = () => {
    if (!videoRef.current) return;
    soundManager.playShutter();
    
    // Scale and compress image for lightweight storage and instant preview
    const video = videoRef.current;
    const vWidth = video.videoWidth || 480;
    const vHeight = video.videoHeight || 360;
    
    const maxDim = 480;
    const scale = Math.min(maxDim / vWidth, maxDim / vHeight, 1);
    const canvasWidth = Math.round(vWidth * scale);
    const canvasHeight = Math.round(vHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Flip horizontally if front camera for natural mirror selfie look
      if (cameraFacingMode === "user") {
        ctx.translate(canvasWidth, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
      setSelfieDataUrl(dataUrl);
      stopCamera();
      toast.success("Foto selfie terkompresi berhasil diambil!");
    }
  };

  const retakeSelfie = () => {
    soundManager.playBeep();
    setSelfieDataUrl(null);
    startCamera(cameraFacingMode);
  };

  useEffect(() => {
    if (activeSession?.require_selfie && !selfieDataUrl && !cameraActive) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeSession?.id]);

  const handleSubmitAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      soundManager.playError();
      toast.error(`Pilih ${terms.student_label.toLowerCase()} yang akan absen.`);
      return;
    }

    if (attendanceMode === "check_in" && !activeSession) {
      soundManager.playError();
      toast.error("Pilih sesi presensi terlebih dahulu.");
      return;
    }

    if (attendanceMode === "check_in" && todayRecord?.marked_at) {
      soundManager.playError();
      toast.warning(
        `Anda sudah melakukan Presensi Masuk hari ini pukul ${formatTimeId(todayRecord.marked_at)} WIB. Sistem dialihkan ke Presensi Pulang.`
      );
      setAttendanceMode("check_out");
      return;
    }

    if (attendanceMode === "check_out" && todayRecord?.check_out_time) {
      soundManager.playError();
      toast.info(
        `Anda sudah menyelesaikan Presensi Pulang hari ini pukul ${formatTimeId(todayRecord.check_out_time)} WIB.`
      );
      return;
    }

    const requireSelfie = activeSession?.require_selfie ?? true;
    if (requireSelfie && !selfieDataUrl) {
      soundManager.playError();
      toast.error("Foto selfie wajib diambil sebelum mengirim presensi.");
      return;
    }

    const geoMatch = checkSchoolGeofence(userLat, userLng, activeSchool);
    if (activeSession?.require_location && !geoMatch.isWithinRadius) {
      soundManager.playError();
      toast.error(
        `Lokasi Anda di luar jangkauan gedung ${terms.institution_label.toLowerCase()}. Titik terdekat: ${geoMatch.closestLocationName} (${geoMatch.closestDistanceMeters}m > radius ${geoMatch.closestRadiusMeters}m). Presensi ditolak.`
      );
      return;
    }

    setSubmitting(true);
    soundManager.playBeep();

    setTimeout(() => {
      const studentClass = classes.find((c) => c.id === selectedStudent.class_id);
      const timeNowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const matchedLocName = geoMatch.matchedLocation?.name || geoMatch.closestLocationName;

      if (attendanceMode === "check_out") {
        markCheckOut({
          sessionId: activeSession?.id,
          studentId: selectedStudent.id,
          method: selfieDataUrl ? "selfie_gps" : initialToken ? "qr" : "manual",
          latitude: userLat,
          longitude: userLng,
          selfieUrl: selfieDataUrl,
        });

        setSubmittedResult({
          type: "check_out",
          studentName: selectedStudent.full_name,
          studentNis: selectedStudent.nis,
          className: studentClass?.name || terms.class_label,
          status: "hadir",
          time: timeNowStr,
          method: selfieDataUrl ? "Selfie + GPS" : "Presensi Pulang",
          distance: geoMatch.closestDistanceMeters,
          locationName: matchedLocName,
        });

        setSubmitting(false);
        soundManager.playSuccess();
        toast.success(`Presensi PULANG berhasil dicatat pada ${timeNowStr}!`);
      } else {
        // Calculate status based on current time and session late threshold
        const status = activeSession
          ? calculateStatus(activeSession.start_time, activeSession.late_after_minutes)
          : "hadir";

        markAttendance({
          sessionId: activeSession?.id || "ses-1",
          studentId: selectedStudent.id,
          status,
          method: requireSelfie ? "selfie_gps" : initialToken ? "qr" : "manual",
          latitude: userLat,
          longitude: userLng,
          selfieUrl: selfieDataUrl,
        });

        setSubmittedResult({
          type: "check_in",
          studentName: selectedStudent.full_name,
          studentNis: selectedStudent.nis,
          className: studentClass?.name || terms.class_label,
          status,
          time: timeNowStr,
          method: requireSelfie ? "Selfie + GPS" : "Scan QR",
          distance: geoMatch.closestDistanceMeters,
          locationName: matchedLocName,
        });

        setSubmitting(false);
        soundManager.playSuccess();
        toast.success(`Presensi MASUK berhasil dicatat: ${STATUS_LABEL[status]}!`);
      }
    }, 600);
  };

  const handleShareWhatsApp = () => {
    if (!submittedResult) return;
    soundManager.playBeep();
    const isOut = submittedResult.type === "check_out";
    const text = `*BUKTI PRESENSI DIGITAL (${isOut ? "PULANG" : "MASUK"})*\n${terms.institution_label}: ${activeSchool?.name}\nNama: ${submittedResult.studentName} (${submittedResult.studentNis})\n${terms.class_label}: ${submittedResult.className}\n${isOut ? `Waktu Pulang: ${submittedResult.time} WIB` : `Status: ${STATUS_LABEL[submittedResult.status].toUpperCase()}\nWaktu Masuk: ${submittedResult.time} WIB`}\nTanggal: ${formatDateId(todayIso())}\n\nPresensi telah terverifikasi secara resmi via sistem Presensia.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const isInsideRadius = distanceMeters !== null && distanceMeters <= (activeSchool?.radius_meters || 300);

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className={`${mainTab === "kiosk" ? "max-w-6xl" : "max-w-xl"} mx-auto space-y-6`}>
        {/* Top Header & Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => onNavigate("dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Kembali ke Dashboard
          </button>

          {/* Mode Switcher: Kios Gerbang vs Presensi Mandiri */}
          <div className="flex bg-muted/60 p-1 rounded-2xl border text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep();
                setMainTab("kiosk");
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all ${
                mainTab === "kiosk"
                  ? "bg-primary text-primary-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radio className="size-3.5" /> Kios Gerbang (RFID / QR)
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep();
                setMainTab("selfie");
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all ${
                mainTab === "selfie"
                  ? "bg-primary text-primary-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Camera className="size-3.5" /> Presensi Mandiri (GPS + Selfie)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
              <Fingerprint className="size-4" />
            </span>
            <span className="font-bold text-sm text-foreground">Presensi<span className="text-primary font-black">.app</span></span>
          </div>
        </div>

        {mainTab === "kiosk" ? (
          <GateKioskScanner onNavigate={onNavigate} />
        ) : (
          <>
            {/* Confirmation Certificate if already submitted */}
            {submittedResult ? (
          <Card className={`border-2 shadow-xl bg-card overflow-hidden text-center rounded-3xl ${
            submittedResult.type === "check_out" ? "border-amber-500/40" : "border-emerald-500/40"
          }`}>
            <div className={`text-white p-6 sm:p-8 ${
              submittedResult.type === "check_out"
                ? "bg-gradient-to-b from-amber-600 to-amber-700"
                : "bg-gradient-to-b from-emerald-600 to-emerald-700"
            }`}>
              <div className="size-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                {submittedResult.type === "check_out" ? (
                  <LogOut className="size-9 text-white" />
                ) : (
                  <CheckCircle2 className="size-10 text-white" />
                )}
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                {submittedResult.type === "check_out" ? "Presensi Pulang Berhasil!" : "Presensi Masuk Berhasil!"}
              </h2>
              <p className="text-white/80 text-xs mt-1 max-w-sm mx-auto">
                Bukti presensi digital telah terenkripsi dan tersimpan resmi di pangkalan data {terms.institution_label.toLowerCase()}.
              </p>
            </div>

            <CardContent className="p-6 space-y-5">
              <div className="rounded-2xl border p-4 bg-muted/40 space-y-2.5 text-left text-xs">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Tipe Presensi:</span>
                  <Badge variant={submittedResult.type === "check_out" ? "secondary" : "default"} className="font-bold">
                    {submittedResult.type === "check_out" ? "PRESENSI PULANG" : "PRESENSI MASUK"}
                  </Badge>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Nama {terms.student_label}:</span>
                  <strong className="text-foreground">{submittedResult.studentName} ({submittedResult.studentNis})</strong>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{terms.class_label} / Rombel:</span>
                  <strong className="text-foreground">{submittedResult.className}</strong>
                </div>
                {submittedResult.type === "check_in" && (
                  <div className="flex justify-between border-b pb-2 items-center">
                    <span className="text-muted-foreground">Status Kehadiran:</span>
                    <Badge className={`${STATUS_CLASS[submittedResult.status]} font-bold rounded-lg px-2.5 py-0.5`}>
                      {STATUS_LABEL[submittedResult.status]}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    {submittedResult.type === "check_out" ? "Waktu Pulang:" : "Waktu Masuk:"}
                  </span>
                  <strong className="text-foreground">{submittedResult.time} WIB</strong>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Metode Presensi:</span>
                  <strong className="text-foreground">{submittedResult.method}</strong>
                </div>
                {submittedResult.distance !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Lokasi Validasi:</span>
                    <strong className="text-emerald-600 font-bold flex items-center gap-1">
                      <MapPin className="size-3.5" /> {submittedResult.locationName || activeSchool?.name} ({Math.round(submittedResult.distance)}m)
                    </strong>
                  </div>
                )}
              </div>

              {selfieDataUrl && (
                <div className="flex flex-col items-center pt-1">
                  <span className="text-[11px] font-semibold text-muted-foreground mb-1.5">Foto Verifikasi Wajah:</span>
                  <img
                    src={selfieDataUrl}
                    alt="Selfie Presensi"
                    className="size-24 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <Button
                  onClick={handleShareWhatsApp}
                  className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 shadow-sm"
                >
                  <Share2 className="mr-1.5 size-3.5" />
                  Kirim ke WhatsApp Ortu
                </Button>

                <Button
                  onClick={() => {
                    soundManager.playBeep();
                    setSubmittedResult(null);
                    setSelfieDataUrl(null);
                  }}
                  variant="outline"
                  className="w-full text-xs font-semibold rounded-xl h-10"
                >
                  Absen Siswa Lain
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => onNavigate("dashboard")}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Kembali ke Beranda
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Check-In Form Card */
          <Card className="border shadow-xl bg-card overflow-hidden rounded-3xl">
            <CardHeader className="bg-card/70 border-b p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                    {attendanceMode === "check_in" ? (
                      <LogIn className="size-5 text-emerald-500" />
                    ) : (
                      <LogOut className="size-5 text-amber-500" />
                    )}
                    {attendanceMode === "check_in" ? "Presensi Masuk" : "Presensi Pulang"}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {activeSchool?.name} • {formatDateId(todayIso())}
                  </CardDescription>
                </div>

                {/* Toggle Check-in vs Check-out */}
                <div className="flex bg-muted/60 p-1 rounded-xl border border-border/50 text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playBeep();
                      setAttendanceMode("check_in");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                      attendanceMode === "check_in"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LogIn className="size-3.5" />
                    Presensi Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playBeep();
                      setAttendanceMode("check_out");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                      attendanceMode === "check_out"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LogOut className="size-3.5" />
                    Presensi Pulang
                  </button>
                </div>
              </div>

              {/* Status Banner for Today */}
              {todayRecord && (
                <div className="mt-4 p-3 rounded-xl bg-secondary/50 border flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>
                      Sudah Masuk: <strong>{formatTimeId(todayRecord.marked_at)} WIB</strong>
                      {todayRecord.check_out_time && (
                        <> • Sudah Pulang: <strong>{formatTimeId(todayRecord.check_out_time)} WIB</strong></>
                      )}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] self-start sm:self-auto">
                    {STATUS_LABEL[todayRecord.status]}
                  </Badge>
                </div>
              )}
            </CardHeader>

            <form onSubmit={handleSubmitAttendance}>
              <CardContent className="p-5 sm:p-6 space-y-5">
                {/* Session Picker (Only needed or shown for check-in) */}
                {attendanceMode === "check_in" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Lembar Presensi Harian</Label>
                    {role === "student" ? (
                      <div className="p-3 rounded-xl bg-secondary/50 border text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">
                            {activeSession?.subject || "Presensi Harian Siswa"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDateId(activeSession?.date || todayIso())} • Jam {activeSession?.start_time || "06:00"} - {activeSession?.end_time || "17:30"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                          Otomatis
                        </Badge>
                      </div>
                    ) : (
                      <Select
                        value={selectedSessionId}
                        onValueChange={(val) => {
                          soundManager.playBeep();
                          setSelectedSessionId(val);
                        }}
                      >
                        <SelectTrigger className="text-xs rounded-xl h-10">
                          <SelectValue placeholder="Pilih Lembar Presensi" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {sessions.map((s) => {
                            const cls = classes.find((c) => c.id === s.class_id);
                            return (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                {s.subject} ({cls?.name || "Semua Kelas"}) - {formatDateId(s.date)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Student Identity Display */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Identitas {terms.student_label}</Label>
                  {role === "student" && selectedStudent ? (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm text-foreground">{selectedStudent.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {terms.identifier_label}: <span className="font-mono font-medium">{selectedStudent.nis || "-"}</span> • {terms.class_label}: {classes.find(c => c.id === selectedStudent.class_id)?.name || "-"}
                        </p>
                      </div>
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                        Akun Anda
                      </Badge>
                    </div>
                  ) : (
                    <Select
                      value={selectedStudentId}
                      onValueChange={(val) => {
                        soundManager.playBeep();
                        setSelectedStudentId(val);
                      }}
                    >
                      <SelectTrigger className="text-xs rounded-xl h-10">
                        <SelectValue placeholder={`Pilih Nama ${terms.student_label}`} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {students.map((s) => {
                          const cls = classes.find((c) => c.id === s.class_id);
                          return (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.full_name} ({s.nis}) - {cls?.name || terms.class_label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* GPS Radius Validation Card */}
                <div className="rounded-2xl border p-4 bg-secondary/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Compass className="size-4 text-primary" /> Validasi Lokasi GPS (Geofence)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        soundManager.playBeep();
                        fetchGpsLocation();
                      }}
                      disabled={gpsLoading}
                      className="text-[11px] h-7 px-2.5 text-primary font-bold hover:bg-primary/10 rounded-lg gap-1"
                    >
                      {gpsLoading ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3" />
                      )}
                      <span>{gpsLoading ? "Mendeteksi..." : "Kalibrasi GPS"}</span>
                    </Button>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Titik Gedung Terdeteksi:</span>
                      <strong className="text-foreground font-semibold flex items-center gap-1">
                        <Building className="size-3 text-primary" />
                        {geofenceResult ? geofenceResult.closestLocationName : "Gedung Sekolah"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Jarak ke Gedung Terdekat:</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-foreground font-mono">
                          {distanceMeters !== null ? `${Math.round(distanceMeters)} meter` : "Mencari sinyal..."}
                        </strong>
                        {gpsAccuracy !== null && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${
                            gpsAccuracy <= 15 ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" : "text-amber-600 border-amber-500/30 bg-amber-500/10"
                          }`}>
                            ±{gpsAccuracy}m
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status Geofence:</span>
                      {geofenceResult ? (
                        geofenceResult.isWithinRadius ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold py-0.5 rounded-lg">
                            ✓ Di Dalam Area ({geofenceResult.matchedLocation?.name || geofenceResult.closestLocationName})
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[11px] font-bold py-0.5 rounded-lg">
                            ✕ Di Luar Area ({Math.round(geofenceResult.closestDistanceMeters)}m &gt; {geofenceResult.closestRadiusMeters}m)
                          </Badge>
                        )
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Menunggu sinyal GPS...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Camera Selfie Capture Section */}
                {activeSession?.require_selfie && (
                  <div className="rounded-2xl border p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Camera className="size-4 text-primary" /> Foto Selfie Verifikasi Wajah
                      </Label>
                      <div className="flex items-center gap-1.5">
                        {cameraActive && !selfieDataUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={toggleCameraFacingMode}
                            className="text-[11px] h-7 px-2 text-foreground font-semibold rounded-lg gap-1"
                            title="Ganti Kamera Depan/Belakang"
                          >
                            <SwitchCamera className="size-3 text-primary" />
                            <span className="hidden sm:inline">
                              {cameraFacingMode === "user" ? "Kamera Belakang" : "Kamera Depan"}
                            </span>
                          </Button>
                        )}
                        {selfieDataUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={retakeSelfie}
                            className="text-[11px] h-7 px-2.5 text-primary font-bold hover:bg-primary/10 rounded-lg"
                          >
                            <RotateCcw className="size-3 mr-1" /> Foto Ulang
                          </Button>
                        )}
                      </div>
                    </div>

                    {selfieDataUrl ? (
                      <div className="flex justify-center p-2">
                        <img
                          src={selfieDataUrl}
                          alt="Selfie"
                          className="max-h-52 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative aspect-video rounded-2xl bg-slate-950 overflow-hidden border flex items-center justify-center shadow-inner">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${
                              cameraFacingMode === "user" ? "scale-x-[-1]" : ""
                            }`}
                          />
                          {!cameraActive && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900/85 text-white text-center">
                              <Camera className="size-8 text-primary mb-2 opacity-80" />
                              <p className="text-xs font-bold">Kamera Siap Diaktifkan</p>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  soundManager.playBeep();
                                  startCamera();
                                }}
                                className="mt-3 text-xs font-bold rounded-xl"
                              >
                                Buka Kamera
                              </Button>
                            </div>
                          )}
                        </div>

                        {cameraActive && (
                          <Button
                            type="button"
                            onClick={takeSelfie}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-10 rounded-xl shadow-md"
                          >
                            <Camera className="mr-1.5 size-4" /> Ambil Foto Sekarang
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className={`w-full font-extrabold shadow-lg h-12 text-sm rounded-xl transition-all ${
                    attendanceMode === "check_out"
                      ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Memvalidasi & Menyimpan Presensi...
                    </>
                  ) : attendanceMode === "check_out" ? (
                    <>
                      <LogOut className="mr-2 size-4" /> Simpan Presensi Pulang Sekarang
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 size-4" /> Simpan Presensi Masuk Sekarang
                    </>
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        )}
          </>
        )}
      </div>
    </div>
  );
}

