import React, { useState } from "react";
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  Trash2,
  Lock,
  Unlock,
  Settings,
  Sparkles,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchoolStore } from "@/lib/store";
import { formatDateId, todayIso } from "@/lib/attendance";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";

interface PresensiListViewProps {
  onNavigate: (view: string, param?: string) => void;
}

export function PresensiListView({ onNavigate }: PresensiListViewProps) {
  const {
    sessions,
    classes,
    students,
    records,
    createSession,
    deleteSession,
    toggleSessionStatus,
    activeSchool,
    terms,
    dailyConfig,
    updateDailyConfig,
    generateDailySessionsNow,
    isAdmin,
  } = useSchoolStore();

  const [openModal, setOpenModal] = useState(false);
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(todayIso());
  const [searchQuery, setSearchQuery] = useState("");

  // Automation settings local edit state
  const [cfgAutoEnabled, setCfgAutoEnabled] = useState(dailyConfig.auto_session_enabled ?? true);
  const [cfgCheckInStart, setCfgCheckInStart] = useState(dailyConfig.check_in_start || "06:00");
  const [cfgCheckInEnd, setCfgCheckInEnd] = useState(dailyConfig.check_in_end || "07:15");
  const [cfgLateAfter, setCfgLateAfter] = useState(dailyConfig.late_cutoff_time || "07:15");
  const [cfgCheckOutStart, setCfgCheckOutStart] = useState(dailyConfig.check_out_start || "14:00");
  const [cfgCheckOutEnd, setCfgCheckOutEnd] = useState(dailyConfig.check_out_end || "17:30");
  const [cfgRequireSelfie, setCfgRequireSelfie] = useState(dailyConfig.require_selfie ?? true);
  const [cfgRequireGps, setCfgRequireGps] = useState(dailyConfig.require_location ?? true);

  // Manual create form state
  const [formClassId, setFormClassId] = useState(classes[0]?.id || "all");
  const [formDate, setFormDate] = useState(todayIso());
  const [startTime, setStartTime] = useState(dailyConfig.check_in_start || "06:00");
  const [endTime, setEndTime] = useState(dailyConfig.check_out_end || "17:30");
  const [lateTolerance, setLateTolerance] = useState(15);
  const [requireSelfie, setRequireSelfie] = useState(dailyConfig.require_selfie ?? true);
  const [requireLocation, setRequireLocation] = useState(dailyConfig.require_location ?? true);

  const handleSaveAutomation = (e: React.FormEvent) => {
    e.preventDefault();
    updateDailyConfig({
      auto_session_enabled: cfgAutoEnabled,
      check_in_start: cfgCheckInStart,
      check_in_end: cfgCheckInEnd,
      late_cutoff_time: cfgLateAfter,
      check_out_start: cfgCheckOutStart,
      check_out_end: cfgCheckOutEnd,
      require_selfie: cfgRequireSelfie,
      require_location: cfgRequireGps,
    });
    toast.success("Pengaturan presensi harian otomatis berhasil disimpan.");
    setOpenConfigModal(false);
  };

  const handleGenerateNow = () => {
    const count = generateDailySessionsNow(todayIso());
    if (count > 0) {
      toast.success(`Berhasil membuat ${count} lembar presensi harian untuk hari ini!`);
    } else {
      toast.info("Presensi harian untuk seluruh kelas hari ini sudah aktif.");
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClass = classes.find((c) => c.id === formClassId);
    const title = formClassId === "all" ? "Presensi Harian Sekolah" : `Presensi Harian ${targetClass?.name || ""}`;

    const existing = sessions.find(
      (s) => (formClassId === "all" ? !s.class_id : s.class_id === formClassId) && s.date === formDate
    );

    const created = createSession({
      class_id: formClassId === "all" ? null : formClassId,
      date: formDate,
      subject: title,
      start_time: startTime,
      end_time: endTime,
      late_after_minutes: Number(lateTolerance),
      require_selfie: requireSelfie,
      require_location: requireLocation,
      status: "open",
    });

    if (existing) {
      toast.info(`Sesi presensi harian untuk ${targetClass?.name || "sekolah"} pada tanggal ini sudah aktif dan dibuka kembali.`);
    } else {
      toast.success("Lembar presensi harian berhasil dibuat!");
    }
    setOpenModal(false);
    onNavigate("presensi_detail", created.id);
  };

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesClass = selectedClass === "all" || s.class_id === selectedClass;
    const matchesDate = !selectedDate || s.date === selectedDate;
    const matchesSearch =
      !searchQuery ||
      s.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (classes.find((c) => c.id === s.class_id)?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesDate && matchesSearch;
  });

  return (
    <div className="space-y-6" id="presensi-harian-view">
      {/* Standardized Header */}
      <PageHeader
        icon={CalendarCheck}
        title={`Presensi Harian ${terms.student_label}`}
        subtitle={`Sistem presensi harian otomatis berbasis tanggal, rombel kelas, selfie wajah, dan radius GPS.`}
        badge="Presensi Harian"
        kpiCards={[
          {
            label: "Sesi Hari Ini",
            value: sessions.filter((s) => s.date === todayIso()).length,
            helper: `${sessions.filter((s) => s.date === todayIso() && s.status === "open").length} sesi berstatus terbuka`,
            icon: CalendarCheck,
            color: "primary",
          },
          {
            label: `Total ${terms.student_label}`,
            value: students.length,
            helper: `Terdaftar di ${classes.length} ${terms.class_label.toLowerCase()}`,
            icon: CheckCircle2,
            color: "emerald",
          },
          {
            label: "Otomatisasi Sistem",
            value: dailyConfig.auto_session_enabled ? "Aktif" : "Manual",
            helper: `${dailyConfig.check_in_start} - ${dailyConfig.check_in_end}`,
            icon: Clock,
            color: "amber",
          },
          {
            label: "Validasi Kehadiran",
            value: dailyConfig.require_selfie && dailyConfig.require_location ? "Selfie + GPS" : "Standar",
            helper: "Proteksi kecurangan",
            icon: ShieldCheck,
            color: "blue",
          },
        ]}
      >
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCfgAutoEnabled(dailyConfig.auto_session_enabled ?? true);
              setCfgCheckInStart(dailyConfig.check_in_start || "06:00");
              setCfgCheckInEnd(dailyConfig.check_in_end || "07:15");
              setCfgLateAfter(dailyConfig.late_cutoff_time || "07:15");
              setCfgCheckOutStart(dailyConfig.check_out_start || "14:00");
              setCfgCheckOutEnd(dailyConfig.check_out_end || "17:30");
              setCfgRequireSelfie(dailyConfig.require_selfie ?? true);
              setCfgRequireGps(dailyConfig.require_location ?? true);
              setOpenConfigModal(true);
            }}
            className="text-xs font-semibold gap-1.5 rounded-xl h-9"
            id="btn-atur-otomatisasi"
          >
            <Sliders className="size-3.5" />
            Atur Otomatisasi
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerateNow}
          className="text-xs font-semibold gap-1.5 rounded-xl h-9"
          id="btn-generate-hari-ini"
        >
          <Zap className="size-3.5 text-amber-500 fill-amber-500" />
          Generate Hari Ini
        </Button>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-bold text-xs shadow-xs gap-1.5 rounded-xl h-9 px-3.5 bg-primary text-primary-foreground" id="btn-tambah-presensi-manual">
              <Plus className="size-3.5" /> Buka Presensi
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Buka Lembar Presensi Harian</DialogTitle>
              <DialogDescription className="text-xs">
                Buka presensi harian untuk tanggal atau {terms.class_label} tertentu secara mandiri.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{terms.class_label}</Label>
                  <Select value={formClassId} onValueChange={setFormClassId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder={`Pilih ${terms.class_label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua {terms.class_label}</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tanggal</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mulai Masuk</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Selesai Pulang</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Toleransi (Mnt)</Label>
                  <Input
                    type="number"
                    value={lateTolerance}
                    onChange={(e) => setLateTolerance(Number(e.target.value))}
                    className="text-xs"
                    min={0}
                    max={120}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t text-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-semibold">Wajib Foto Selfie Wajah</div>
                    <div className="text-muted-foreground text-[11px]">Siswa harus mengambil foto saat scan</div>
                  </div>
                  <Switch checked={requireSelfie} onCheckedChange={setRequireSelfie} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-semibold">Wajib Validasi Radius GPS</div>
                    <div className="text-muted-foreground text-[11px]">Siswa harus berada di area sekolah</div>
                  </div>
                  <Switch checked={requireLocation} onCheckedChange={setRequireLocation} />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpenModal(false)} className="text-xs">
                  Batal
                </Button>
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-semibold text-xs">
                  Buka Lembar Presensi
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Admin Automation Quick Status Banner */}
      <Card className="border bg-card/60 backdrop-blur-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-foreground">
                Konfigurasi Jadwal Otomatisasi Harian
              </h3>
              <Badge variant="outline" className="text-[11px] font-medium">
                {dailyConfig.auto_session_enabled ? "Auto-Generate Aktif" : "Manual"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                <strong className="text-foreground">Masuk:</strong> {dailyConfig.check_in_start || "06:00"} - {dailyConfig.check_in_end || "07:15"}
              </span>
              <span>
                <strong className="text-foreground">Batas Telat:</strong> {dailyConfig.late_cutoff_time || "07:15"}
              </span>
              <span>
                <strong className="text-foreground">Pulang:</strong> {dailyConfig.check_out_start || "14:00"} - {dailyConfig.check_out_end || "17:30"}
              </span>
              <span>
                <strong className="text-foreground">Validasi:</strong> {dailyConfig.require_selfie ? "Selfie ✓" : "Tanpa Selfie"} • {dailyConfig.require_location ? "GPS ✓" : "Tanpa GPS"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate("pengaturan")}
              className="text-xs h-8"
            >
              <Settings className="size-3.5 mr-1 text-muted-foreground" />
              Pengaturan Lengkap
            </Button>
          </div>
        </div>
      </Card>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3.5 rounded-2xl border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder={`Cari nama ${terms.class_label} atau tanggal presensi...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-9 text-xs w-full sm:w-[160px]">
              <SelectValue placeholder={`Pilih ${terms.class_label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua {terms.class_label}</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 text-xs w-full sm:w-[145px]"
          />
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate("")}
              className="text-xs h-9 px-2 text-muted-foreground"
              title="Tampilkan Semua Tanggal"
            >
              Semua
            </Button>
          )}
        </div>
      </div>

      {/* Session Cards List */}
      {filteredSessions.length === 0 ? (
        <Card className="border-dashed p-10 text-center bg-card/40">
          <CalendarCheck className="size-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="font-bold text-foreground">Tidak Ada Lembar Presensi Harian</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Belum ada data presensi pada filter ini. Klik tombol di bawah untuk membuat presensi harian sekarang.
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Button size="sm" onClick={handleGenerateNow} variant="secondary">
              <Zap className="mr-1.5 size-4 text-amber-500" /> Generate Hari Ini ({formatDateId(todayIso())})
            </Button>
            <Button size="sm" onClick={() => setOpenModal(true)}>
              <Plus className="mr-1.5 size-4" /> Buka Presensi
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSessions.map((ses) => {
            const cls = classes.find((c) => c.id === ses.class_id);
            const classStudents = students.filter((s) => !ses.class_id || s.class_id === ses.class_id);
            const sessionRecs = records.filter((r) => r.session_id === ses.id);
            const hadir = sessionRecs.filter((r) => r.status === "hadir").length;
            const terlambat = sessionRecs.filter((r) => r.status === "terlambat").length;
            const izinSakit = sessionRecs.filter((r) => r.status === "sakit" || r.status === "izin").length;
            const alpa = sessionRecs.filter((r) => r.status === "alpa").length;
            const sudahPulang = sessionRecs.filter((r) => !!r.check_out_time).length;

            return (
              <Card
                key={ses.id}
                className="border shadow-sm hover:shadow-md transition-all overflow-hidden bg-card"
                id={`card-session-${ses.id}`}
              >
                <div className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-semibold">
                            {cls?.name || `Semua ${terms.class_label}`}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {classStudents.length} {terms.student_label}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-foreground line-clamp-1">
                          {ses.subject || `Presensi Harian ${cls?.name || ""}`}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateId(ses.date)} • Masuk: {ses.start_time} - Pulang: {ses.end_time || "Selesai"}
                        </p>
                      </div>

                      <Badge
                        className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                          ses.status === "open"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ses.status === "open" ? "● Aktif" : "Terkunci"}
                      </Badge>
                    </div>

                    {/* Feature tags */}
                    <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-muted-foreground">
                      {ses.require_location && (
                        <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 rounded text-foreground font-medium">
                          <MapPin className="size-3 text-primary" /> Radius GPS
                        </span>
                      )}
                      {ses.require_selfie && (
                        <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 rounded text-foreground font-medium">
                          <Camera className="size-3 text-primary" /> Wajib Selfie
                        </span>
                      )}
                      {sudahPulang > 0 && (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded font-medium">
                          <CheckCircle2 className="size-3" /> {sudahPulang} Check-Out Pulang
                        </span>
                      )}
                    </div>

                    {/* Stats pill counter */}
                    <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3 border-t text-center text-xs">
                      <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 py-1 rounded">
                        <strong className="block text-sm">{hadir}</strong> Hadir
                      </div>
                      <div className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 py-1 rounded">
                        <strong className="block text-sm">{terlambat}</strong> Telat
                      </div>
                      <div className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 py-1 rounded">
                        <strong className="block text-sm">{izinSakit}</strong> Izin/Skt
                      </div>
                      <div className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 py-1 rounded">
                        <strong className="block text-sm">{alpa}</strong> Alpa
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-2 border-t gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSessionStatus(ses.id)}
                        title={ses.status === "open" ? "Kunci Lembar Presensi" : "Buka Lembar Presensi"}
                        className="size-8 text-muted-foreground hover:text-foreground"
                      >
                        {ses.status === "open" ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Hapus lembar presensi harian ini beserta seluruh catatannya?")) {
                            deleteSession(ses.id);
                            toast.success("Lembar presensi berhasil dihapus.");
                          }
                        }}
                        title="Hapus Lembar Presensi"
                        className="size-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => onNavigate("presensi_detail", ses.id)}
                      className="text-xs font-semibold"
                    >
                      Buka Lembar Presensi
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Quick Config Automation */}
      <Dialog open={openConfigModal} onOpenChange={setOpenConfigModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Atur Presensi Harian Otomatis</DialogTitle>
            <DialogDescription className="text-xs">
              Konfigurasi jam operasional harian sekolah. Sistem akan secara otomatis mengaktifkan presensi setiap hari sekolah.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAutomation} className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/40">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground">Aktifkan Presensi Harian Otomatis</Label>
                <p className="text-[11px] text-muted-foreground">
                  Buat lembar kehadiran harian secara otomatis setiap hari aktif.
                </p>
              </div>
              <Switch checked={cfgAutoEnabled} onCheckedChange={setCfgAutoEnabled} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jam Buka Masuk</Label>
                <Input
                  type="time"
                  value={cfgCheckInStart}
                  onChange={(e) => setCfgCheckInStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Batas Akhir Masuk</Label>
                <Input
                  type="time"
                  value={cfgCheckInEnd}
                  onChange={(e) => setCfgCheckInEnd(e.target.value)}
                  required
                />
              </div>
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
                Siswa yang check-in setelah jam ini otomatis berstatus Terlambat.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jam Mulai Pulang (Check-Out)</Label>
                <Input
                  type="time"
                  value={cfgCheckOutStart}
                  onChange={(e) => setCfgCheckOutStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jam Selesai Pulang</Label>
                <Input
                  type="time"
                  value={cfgCheckOutEnd}
                  onChange={(e) => setCfgCheckOutEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="rounded-xl border p-3.5 space-y-3 bg-secondary/30">
              <p className="text-xs font-bold text-foreground">Validasi Kehadiran</p>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Wajib Selfie Wajah</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Siswa wajib memotret foto selfie langsung.
                  </p>
                </div>
                <Switch checked={cfgRequireSelfie} onCheckedChange={setCfgRequireSelfie} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Wajib Radius GPS Sekolah</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Siswa harus berada dalam radius {activeSchool?.radius_meters || 200}m.
                  </p>
                </div>
                <Switch checked={cfgRequireGps} onCheckedChange={setCfgRequireGps} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenConfigModal(false)}
              >
                Batal
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                Simpan Pengaturan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
