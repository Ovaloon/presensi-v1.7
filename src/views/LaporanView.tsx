import React, { useState, useMemo } from "react";
import {
  LineChart as LineChartIcon,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  School,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSchoolStore } from "@/lib/store";
import {
  STATUS_LABEL,
  STATUS_CLASS,
  downloadCsv,
  formatDateId,
  toCsv,
  todayIso,
} from "@/lib/attendance";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";

interface LaporanViewProps {
  onNavigate: (view: string, param?: string) => void;
}

const COLORS = {
  hadir: "#10b981", // emerald
  terlambat: "#f59e0b", // amber
  sakit: "#3b82f6", // blue
  izin: "#6366f1", // indigo
  alpa: "#ef4444", // rose
};

export function LaporanView({ onNavigate }: LaporanViewProps) {
  const { students, classes, sessions, records, activeSchool, terms } = useSchoolStore();

  const [selectedClass, setSelectedClass] = useState("all");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [showFormalPrintPreview, setShowFormalPrintPreview] = useState(false);

  // Filter students based on class
  const filteredStudents = useMemo(() => {
    return students.filter((s) => selectedClass === "all" || s.class_id === selectedClass);
  }, [students, selectedClass]);

  // Filter sessions in date range
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchClass = selectedClass === "all" || s.class_id === selectedClass;
      const matchDate = s.date >= startDate && s.date <= endDate;
      return matchClass && matchDate;
    });
  }, [sessions, selectedClass, startDate, endDate]);

  const filteredSessionIds = useMemo(() => {
    return new Set(filteredSessions.map((s) => s.id));
  }, [filteredSessions]);

  // Aggregate student metrics
  const studentMetrics = useMemo(() => {
    return filteredStudents.map((stu) => {
      const stuRecs = records.filter(
        (r) => r.student_id === stu.id && filteredSessionIds.has(r.session_id)
      );

      const hadir = stuRecs.filter((r) => r.status === "hadir").length;
      const terlambat = stuRecs.filter((r) => r.status === "terlambat").length;
      const sakit = stuRecs.filter((r) => r.status === "sakit").length;
      const izin = stuRecs.filter((r) => r.status === "izin").length;
      const alpa = stuRecs.filter((r) => r.status === "alpa").length;
      const totalSessions = filteredSessions.length || 1;
      const percent = Math.round(((hadir + terlambat) / totalSessions) * 100);

      return {
        student: stu,
        hadir,
        terlambat,
        sakit,
        izin,
        alpa,
        percent,
      };
    });
  }, [filteredStudents, records, filteredSessionIds, filteredSessions]);

  // Overall counts
  const totalHadir = studentMetrics.reduce((acc, m) => acc + m.hadir, 0);
  const totalTerlambat = studentMetrics.reduce((acc, m) => acc + m.terlambat, 0);
  const totalSakit = studentMetrics.reduce((acc, m) => acc + m.sakit, 0);
  const totalIzin = studentMetrics.reduce((acc, m) => acc + m.izin, 0);
  const totalAlpa = studentMetrics.reduce((acc, m) => acc + m.alpa, 0);

  const pieData = [
    { name: "Hadir", value: totalHadir || 1, color: COLORS.hadir },
    { name: "Terlambat", value: totalTerlambat, color: COLORS.terlambat },
    { name: "Sakit", value: totalSakit, color: COLORS.sakit },
    { name: "Izin", value: totalIzin, color: COLORS.izin },
    { name: "Alpa", value: totalAlpa, color: COLORS.alpa },
  ].filter((d) => d.value > 0);

  // Daily trend data for bar chart
  const dailyTrends = useMemo(() => {
    const map = new Map<string, { date: string; hadir: number; terlambat: number; izinSakit: number; alpa: number }>();

    filteredSessions.forEach((ses) => {
      if (!map.has(ses.date)) {
        map.set(ses.date, { date: ses.date, hadir: 0, terlambat: 0, izinSakit: 0, alpa: 0 });
      }
      const item = map.get(ses.date)!;
      const recs = records.filter((r) => r.session_id === ses.id);
      recs.forEach((r) => {
        if (r.status === "hadir") item.hadir += 1;
        else if (r.status === "terlambat") item.terlambat += 1;
        else if (r.status === "sakit" || r.status === "izin") item.izinSakit += 1;
        else if (r.status === "alpa") item.alpa += 1;
      });
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSessions, records]);

  const handleExportCsv = () => {
    const headers = [
      terms.identifier_label,
      `Nama ${terms.student_label}`,
      terms.class_label,
      "Hadir",
      "Terlambat",
      "Sakit",
      "Izin",
      "Alpa",
      "Persentase Kehadiran",
    ];

    const rows = studentMetrics.map((m) => {
      const cls = classes.find((c) => c.id === m.student.class_id);
      return [
        m.student.nis || "-",
        m.student.full_name,
        cls?.name || "-",
        m.hadir,
        m.terlambat,
        m.sakit,
        m.izin,
        m.alpa,
        `${m.percent}%`,
      ];
    });

    const csv = toCsv([headers, ...rows]);
    downloadCsv(`Laporan_Presensi_${activeSchool?.name}_${startDate}_sd_${endDate}.csv`, csv);
    toast.success("Laporan presensi berhasil diunduh.");
  };

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <PageHeader
        icon={LineChartIcon}
        title="Laporan & Rekapitulasi Presensi"
        subtitle={`Analisis tren kehadiran ${terms.student_label.toLowerCase()}, grafik komparasi, dan format cetak resmi ber-KOP surat.`}
        badge={selectedClass === "all" ? "Semua Kelas" : classes.find((c) => c.id === selectedClass)?.name || "Laporan"}
        kpiCards={[
          {
            label: "Total Hadir",
            value: totalHadir,
            helper: "Rekap sesi terpilih",
            icon: CheckCircle2,
            color: "emerald",
          },
          {
            label: "Terlambat",
            value: totalTerlambat,
            helper: "Di luar batas toleransi",
            icon: Clock,
            color: "amber",
          },
          {
            label: "Izin & Sakit",
            value: totalIzin + totalSakit,
            helper: "Dengan surat keterangan",
            icon: AlertCircle,
            color: "blue",
          },
          {
            label: "Alpa / Tanpa Keterangan",
            value: totalAlpa,
            helper: "Perlu ditindaklanjuti",
            icon: Users,
            color: "rose",
          },
        ]}
      >
        <Button
          variant={showFormalPrintPreview ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFormalPrintPreview(!showFormalPrintPreview)}
          className="text-xs gap-1.5 h-9 font-semibold rounded-xl"
        >
          {showFormalPrintPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {showFormalPrintPreview ? "Mode Analitik" : "Format Resmi (KOP)"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="rounded-xl text-xs h-9 gap-1.5 font-semibold"
        >
          <Printer className="size-3.5" /> Cetak
        </Button>

        <Button
          size="sm"
          onClick={handleExportCsv}
          className="bg-primary text-primary-foreground font-bold shadow-xs text-xs h-9 gap-1.5 rounded-xl px-3.5"
        >
          <Download className="size-3.5" /> Export Excel CSV
        </Button>
      </PageHeader>

      {/* Formal Official Printable Document Mode */}
      {showFormalPrintPreview ? (
        <div className="bg-card border rounded-2xl p-6 sm:p-10 shadow-lg space-y-6 text-foreground max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
          {/* Official KOP SURAT */}
          <div className="border-b-4 border-double border-foreground/80 pb-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-3">
              <School className="size-8 text-primary" />
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-foreground">
                  {activeSchool?.name || "PEMERINTAH DAERAH PROVINSI / KABUPATEN"}
                </h2>
                <p className="text-xs font-semibold text-muted-foreground">
                  DINAS PENDIDIKAN & KEBUDAYAAN • REKAPITULASI PRESENSI RESMI
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              NPSN: <span className="font-mono font-bold">{activeSchool?.npsn || "20109988"}</span> • Alamat: {activeSchool?.address || "Jl. Pendidikan Nasional No. 1"} • Telp: {activeSchool?.phone || "(021) 7890123"}
            </p>
          </div>

          {/* Document Title & Meta */}
          <div className="text-center space-y-1">
            <h3 className="text-base sm:text-lg font-extrabold uppercase underline tracking-wide">
              REKAPITULASI DAFTAR HADIR {terms.student_label.toUpperCase()}
            </h3>
            <p className="text-xs text-muted-foreground">
              Periode: <strong>{formatDateId(startDate)}</strong> s/d <strong>{formatDateId(endDate)}</strong> • {terms.class_label}: <strong>{selectedClass === "all" ? `Semua ${terms.class_label}` : classes.find(c => c.id === selectedClass)?.name}</strong>
            </p>
          </div>

          {/* Formal Clean Table */}
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/70 text-foreground border-b text-[11px] font-bold">
                  <th className="p-2.5 text-center border-r w-10">No</th>
                  <th className="p-2.5 border-r">{terms.identifier_label}</th>
                  <th className="p-2.5 border-r">Nama Lengkap {terms.student_label}</th>
                  <th className="p-2.5 border-r">{terms.class_label}</th>
                  <th className="p-2.5 border-r text-center">Hadir</th>
                  <th className="p-2.5 border-r text-center">Telat</th>
                  <th className="p-2.5 border-r text-center">Sakit</th>
                  <th className="p-2.5 border-r text-center">Izin</th>
                  <th className="p-2.5 border-r text-center">Alpa</th>
                  <th className="p-2.5 text-center">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {studentMetrics.map((m, idx) => {
                  const cls = classes.find((c) => c.id === m.student.class_id);
                  return (
                    <tr key={m.student.id} className="hover:bg-muted/20">
                      <td className="p-2 text-center border-r font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2 border-r font-mono font-medium">{m.student.nis || "-"}</td>
                      <td className="p-2 border-r font-semibold">{m.student.full_name}</td>
                      <td className="p-2 border-r">{cls?.name || "-"}</td>
                      <td className="p-2 border-r text-center font-bold text-emerald-600">{m.hadir}</td>
                      <td className="p-2 border-r text-center font-bold text-amber-600">{m.terlambat}</td>
                      <td className="p-2 border-r text-center font-bold text-blue-600">{m.sakit}</td>
                      <td className="p-2 border-r text-center font-bold text-indigo-600">{m.izin}</td>
                      <td className="p-2 border-r text-center font-bold text-rose-600">{m.alpa}</td>
                      <td className="p-2 text-center font-bold font-mono">{m.percent}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Official Signature Blocks */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center">
            <div className="space-y-16">
              <div>
                <p className="text-muted-foreground">Mengetahui,</p>
                <p className="font-bold text-foreground">Kepala {terms.institution_label}</p>
              </div>
              <div>
                <p className="font-bold underline text-foreground uppercase">{activeSchool?.principal_name || "Drs. H. Ahmad Dahlan, M.Pd"}</p>
                <p className="text-[11px] text-muted-foreground font-mono">NIP. {activeSchool?.principal_nip || "19750510 200003 1 002"}</p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p className="text-muted-foreground">Dicetak pada {formatDateId(todayIso())}</p>
                <p className="font-bold text-foreground">Wali Kelas / Petugas Presensi</p>
              </div>
              <div>
                <p className="font-bold underline text-foreground uppercase">Budi Santoso, S.Pd</p>
                <p className="text-[11px] text-muted-foreground font-mono">NIP. 19820412 200801 1 015</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3.5 rounded-2xl border shadow-sm">
            <div className="w-full sm:w-[200px]">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-9 text-xs">
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

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rentang:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs w-[135px]"
              />
              <span className="text-xs text-muted-foreground">s/d</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs w-[135px]"
              />
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Daily Trend Bar Chart (2 columns) */}
            <Card className="lg:col-span-2 border shadow-sm bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  Tren Kehadiran Harian
                </CardTitle>
                <CardDescription className="text-xs">
                  Jumlah kehadiran terdistribusi per tanggal pelaksanaan sesi presensi.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 pt-2">
                {dailyTrends.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Tidak ada data sesi pada rentang tanggal yang dipilih.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => v.substring(5)}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="hadir" name="Hadir" fill={COLORS.hadir} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="terlambat" name="Telat" fill={COLORS.terlambat} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="izinSakit" name="Izin/Sakit" fill={COLORS.sakit} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="alpa" name="Alpa" fill={COLORS.alpa} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution Donut Chart (1 column) */}
            <Card className="border shadow-sm bg-card flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Distribusi Status</CardTitle>
                <CardDescription className="text-xs">Persentase total catatan kehadiran</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex flex-col items-center justify-center pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground pb-2">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="size-2 rounded-full bg-emerald-500" /> Hadir: {totalHadir}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="size-2 rounded-full bg-amber-500" /> Telat: {totalTerlambat}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="size-2 rounded-full bg-blue-500" /> Sakit/Izin: {totalSakit + totalIzin}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="size-2 rounded-full bg-rose-500" /> Alpa: {totalAlpa}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Matrix Table */}
          <Card className="border shadow-sm bg-card overflow-hidden">
            <CardHeader className="p-4 border-b bg-card/60">
              <CardTitle className="text-base font-bold">
                Rekapitulasi Kehadiran per {terms.student_label} ({filteredStudents.length} {terms.student_label})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="text-xs font-bold">{terms.identifier_label} & Nama {terms.student_label}</TableHead>
                    <TableHead className="text-xs font-bold">{terms.class_label}</TableHead>
                    <TableHead className="text-xs font-bold text-center text-emerald-600">Hadir</TableHead>
                    <TableHead className="text-xs font-bold text-center text-amber-600">Telat</TableHead>
                    <TableHead className="text-xs font-bold text-center text-blue-600">Sakit</TableHead>
                    <TableHead className="text-xs font-bold text-center text-indigo-600">Izin</TableHead>
                    <TableHead className="text-xs font-bold text-center text-rose-600">Alpa</TableHead>
                    <TableHead className="text-xs font-bold text-center">Persentase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentMetrics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-xs text-muted-foreground">
                        Tidak ada data {terms.student_label.toLowerCase()} untuk kriteria ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentMetrics.map((m, index) => {
                      const cls = classes.find((c) => c.id === m.student.class_id);

                      return (
                        <TableRow key={m.student.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-center text-xs font-mono text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-bold text-foreground">{m.student.full_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{terms.identifier_label}: {m.student.nis}</p>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{cls?.name || "-"}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-emerald-600">{m.hadir}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-amber-600">{m.terlambat}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-blue-600">{m.sakit}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-indigo-600">{m.izin}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-rose-600">{m.alpa}</TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">{m.percent}%</span>
                              <div className="w-12 bg-secondary h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-primary h-full rounded-full"
                                  style={{ width: `${Math.min(m.percent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
