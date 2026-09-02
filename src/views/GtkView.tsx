import React, { useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  CreditCard,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Briefcase,
  GraduationCap,
  Building2,
  ShieldCheck,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Printer,
  CalendarCheck,
  AlertCircle,
  X,
  School as SchoolIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { GtkProfile, GtkRole } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { downloadCsv, toCsv } from "@/lib/attendance";
import { soundManager } from "@/lib/sound";
import { PageHeader } from "@/components/layout/PageHeader";

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

export const GTK_ROLE_COLORS: Record<GtkRole, { bg: string; text: string; border: string }> = {
  guru_pns: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  guru_pppk: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
  guru_honorer: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  kepala_sekolah: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  tata_usaha: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  laboran: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20" },
  pustakawan: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/20" },
  satpam: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  kebersihan: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
};

interface GtkViewProps {
  onNavigate: (view: string, param?: string) => void;
}

export function GtkView({ onNavigate }: GtkViewProps) {
  const {
    gtkProfiles,
    activeSchool,
    addGtkProfile,
    updateGtkProfile,
    deleteGtkProfile,
    terms,
    role,
  } = useSchoolStore();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingGtk, setEditingGtk] = useState<GtkProfile | null>(null);
  const [cardModalGtk, setCardModalGtk] = useState<GtkProfile | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<GtkProfile, "id" | "school_id">>({
    nip_or_nik: "",
    full_name: "",
    email: "",
    phone: "",
    gtk_role: "guru_pns",
    subject_specialty: "",
    gender: "L",
    status: "aktif",
  });

  // Filtered GTK list
  const filteredGtk = useMemo(() => {
    return gtkProfiles.filter((g) => {
      const matchSearch =
        !search ||
        g.full_name.toLowerCase().includes(search.toLowerCase()) ||
        g.nip_or_nik.toLowerCase().includes(search.toLowerCase()) ||
        (g.subject_specialty && g.subject_specialty.toLowerCase().includes(search.toLowerCase())) ||
        (g.phone && g.phone.includes(search)) ||
        (g.email && g.email.toLowerCase().includes(search.toLowerCase()));

      const matchRole = roleFilter === "all" || g.gtk_role === roleFilter;
      const matchStatus = statusFilter === "all" || g.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [gtkProfiles, search, roleFilter, statusFilter]);

  // Statistics
  const totalGtk = gtkProfiles.length;
  const totalGuru = gtkProfiles.filter((g) =>
    ["guru_pns", "guru_pppk", "guru_honorer", "kepala_sekolah"].includes(g.gtk_role)
  ).length;
  const totalTendik = totalGtk - totalGuru;
  const totalAktif = gtkProfiles.filter((g) => g.status === "aktif").length;

  const handleOpenAdd = () => {
    setEditingGtk(null);
    setFormData({
      nip_or_nik: "",
      full_name: "",
      email: "",
      phone: "",
      gtk_role: "guru_pns",
      subject_specialty: "",
      gender: "L",
      status: "aktif",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (gtk: GtkProfile) => {
    setEditingGtk(gtk);
    setFormData({
      nip_or_nik: gtk.nip_or_nik,
      full_name: gtk.full_name,
      email: gtk.email || "",
      phone: gtk.phone || "",
      gtk_role: gtk.gtk_role,
      subject_specialty: gtk.subject_specialty || "",
      gender: gtk.gender,
      status: gtk.status,
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error("Nama lengkap GTK wajib diisi!");
      return;
    }
    if (!formData.nip_or_nik.trim()) {
      toast.error("NIP / NIK / No. Induk wajib diisi!");
      return;
    }

    if (editingGtk) {
      updateGtkProfile(editingGtk.id, formData);
      toast.success(`Data GTK "${formData.full_name}" berhasil diperbarui!`);
    } else {
      addGtkProfile(formData);
      toast.success(`GTK baru "${formData.full_name}" berhasil ditambahkan!`);
    }

    soundManager.playSuccess();
    setIsAddModalOpen(false);
  };

  const handleDelete = (gtk: GtkProfile) => {
    if (window.confirm(`Yakin ingin menghapus data GTK "${gtk.full_name}"? Riwayat presensi terkait juga akan dihapus.`)) {
      deleteGtkProfile(gtk.id);
      toast.success(`Data GTK "${gtk.full_name}" berhasil dihapus.`);
    }
  };

  const handleExportCsv = () => {
    const data = filteredGtk.map((g, idx) => ({
      No: idx + 1,
      "NIP / NIK": g.nip_or_nik,
      "Nama Lengkap": g.full_name,
      "Jabatan / Role": GTK_ROLE_LABELS[g.gtk_role] || g.gtk_role,
      "Mata Pelajaran / Tugas": g.subject_specialty || "-",
      "Jenis Kelamin": g.gender === "L" ? "Laki-laki" : "Perempuan",
      "No. Telepon / WhatsApp": g.phone || "-",
      Email: g.email || "-",
      Status: g.status.toUpperCase(),
    }));

    const csvContent = toCsv(data);
    downloadCsv(csvContent, `Data_GTK_${activeSchool?.name || "Sekolah"}_${new Date().toISOString().split("T")[0]}.csv`);
    toast.success("File CSV Data GTK berhasil diunduh!");
  };

  const [importCsvText, setImportCsvText] = useState("");
  const handleProcessImportCsv = () => {
    if (!importCsvText.trim()) {
      toast.error("Silakan tempel atau pilih file CSV terlebih dahulu.");
      return;
    }

    const lines = importCsvText.trim().split("\n");
    if (lines.length <= 1) {
      toast.error("Format data CSV tidak valid.");
      return;
    }

    let addedCount = 0;
    // Format: NIP,Nama,Role,Mapel,Gender,Phone,Email,Status
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts.length >= 2) {
        const [nip, name, rawRole, mapel, gender, phone, email, status] = parts;
        const validRoles: GtkRole[] = [
          "guru_pns",
          "guru_pppk",
          "guru_honorer",
          "kepala_sekolah",
          "tata_usaha",
          "laboran",
          "pustakawan",
          "satpam",
          "kebersihan",
        ];
        const assignedRole: GtkRole = validRoles.includes(rawRole as any) ? (rawRole as any) : "guru_pns";

        addGtkProfile({
          nip_or_nik: nip || `NIP-${Date.now()}_${i}`,
          full_name: name,
          gtk_role: assignedRole,
          subject_specialty: mapel || "",
          gender: gender?.toUpperCase() === "P" ? "P" : "L",
          phone: phone || "",
          email: email || "",
          status: status === "cuti" ? "cuti" : status === "mutasi" ? "mutasi" : "aktif",
        });
        addedCount++;
      }
    }

    toast.success(`Berhasil mengimpor ${addedCount} data GTK.`);
    soundManager.playSuccess();
    setImportCsvText("");
    setIsImportModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <PageHeader
        icon={Briefcase}
        title="Data Guru & Tenaga Kependidikan (GTK)"
        subtitle={`Kelola profil pendidik, tenaga administrasi, pustakawan, dan staf sekolah ${activeSchool?.name || ""}`}
        badge="Data GTK"
        kpiCards={[
          {
            label: "Total GTK",
            value: totalGtk,
            helper: "Pegawai terdaftar",
            icon: Users,
            color: "primary",
          },
          {
            label: "Guru & Pengajar",
            value: totalGuru,
            helper: "PNS / PPPK / Honorer",
            icon: GraduationCap,
            color: "blue",
          },
          {
            label: "Tenaga Kependidikan",
            value: totalTendik,
            helper: "TU, Perpus, Satpam, Sarpras",
            icon: Building2,
            color: "amber",
          },
          {
            label: "Status Aktif",
            value: totalAktif,
            helper: "Siap bertugas",
            icon: CheckCircle2,
            color: "emerald",
          },
        ]}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("presensi_gtk")}
          className="text-xs font-bold rounded-xl h-9"
        >
          <CalendarCheck className="mr-1.5 size-4 text-emerald-600" /> Presensi GTK Hari Ini
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsImportModalOpen(true)}
          className="text-xs font-bold rounded-xl h-9"
        >
          <Upload className="mr-1.5 size-4" /> Import CSV
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="text-xs font-bold rounded-xl h-9"
        >
          <Download className="mr-1.5 size-4" /> Ekspor CSV
        </Button>

        <Button
          size="sm"
          onClick={handleOpenAdd}
          className="text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 rounded-xl h-9 px-3.5"
        >
          <Plus className="mr-1.5 size-4" /> Tambah GTK
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <Card className="p-4 rounded-2xl border shadow-sm bg-card">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari nama, NIP/NIK, mata pelajaran, email, no HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs rounded-xl h-9"
            />
          </div>

          <div className="sm:col-span-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="text-xs h-9 rounded-xl">
                <SelectValue placeholder="Semua Jabatan / Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jabatan / Role ({totalGtk})</SelectItem>
                <SelectItem value="guru_pns">Guru PNS</SelectItem>
                <SelectItem value="guru_pppk">Guru PPPK</SelectItem>
                <SelectItem value="guru_honorer">Guru Honorer</SelectItem>
                <SelectItem value="kepala_sekolah">Kepala Sekolah</SelectItem>
                <SelectItem value="tata_usaha">Tenaga Administrasi (TU)</SelectItem>
                <SelectItem value="laboran">Laboran</SelectItem>
                <SelectItem value="pustakawan">Pustakawan</SelectItem>
                <SelectItem value="satpam">Satpam / Keamanan</SelectItem>
                <SelectItem value="kebersihan">Kebersihan & Sarpras</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-xs h-9 rounded-xl">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="cuti">Cuti</SelectItem>
                <SelectItem value="mutasi">Mutasi / Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main GTK Data Table */}
      <Card className="border shadow-sm rounded-3xl overflow-hidden bg-card">
        <CardHeader className="p-4 sm:p-5 border-b bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="size-4 text-primary" /> Daftar Pegawai & Tenaga Pendidik
            </CardTitle>
            <CardDescription className="text-xs">
              Menampilkan {filteredGtk.length} dari total {gtkProfiles.length} GTK terdaftar
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {filteredGtk.length} Data
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {filteredGtk.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Users className="size-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-muted-foreground">Tidak ada data GTK yang cocok.</p>
              <Button size="sm" variant="outline" onClick={handleOpenAdd} className="text-xs font-bold">
                <Plus className="mr-1 size-3.5" /> Tambah GTK Sekarang
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Lengkap & NIP</th>
                    <th className="py-3 px-4">Jabatan / Role</th>
                    <th className="py-3 px-4">Tugas / Mata Pelajaran</th>
                    <th className="py-3 px-4">Kontak (WA & Email)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredGtk.map((gtk, idx) => {
                    const roleColor = GTK_ROLE_COLORS[gtk.gtk_role] || {
                      bg: "bg-muted",
                      text: "text-foreground",
                      border: "border-border",
                    };

                    return (
                      <tr key={gtk.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-muted-foreground">
                          {idx + 1}
                        </td>

                        {/* Name & NIP */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 text-xs shadow-sm">
                              {gtk.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-foreground text-xs leading-tight">
                                {gtk.full_name}
                              </p>
                              <p className="text-[10.5px] font-mono text-muted-foreground mt-0.5">
                                NIP/NIK: <span className="font-bold text-foreground">{gtk.nip_or_nik}</span> •{" "}
                                {gtk.gender === "L" ? "L" : "P"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}
                          >
                            {GTK_ROLE_LABELS[gtk.gtk_role]}
                          </span>
                        </td>

                        {/* Subject Specialty */}
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-foreground text-[11px] line-clamp-1">
                            {gtk.subject_specialty || "-"}
                          </p>
                        </td>

                        {/* Contact info */}
                        <td className="py-3.5 px-4 space-y-0.5">
                          {gtk.phone ? (
                            <a
                              href={`https://wa.me/${gtk.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10.5px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <Phone className="size-3" /> {gtk.phone}
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                          {gtk.email && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate max-w-[150px]">
                              <Mail className="size-3" /> {gtk.email}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            className={`text-[10px] font-bold uppercase ${
                              gtk.status === "aktif"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : gtk.status === "cuti"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                            }`}
                          >
                            {gtk.status}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setCardModalGtk(gtk)}
                              className="size-7 rounded-lg text-primary hover:bg-primary/10"
                              title="Cetak Kartu Pegawai"
                            >
                              <CreditCard className="size-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(gtk)}
                              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Edit Data GTK"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(gtk)}
                              className="size-7 rounded-lg text-destructive hover:bg-destructive/10"
                              title="Hapus Data GTK"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit GTK Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-0 overflow-hidden">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="p-5 border-b bg-muted/20">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase className="size-5 text-primary" />
                {editingGtk ? "Edit Data Guru & GTK" : "Tambah Guru & GTK Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Masukkan identitas kepegawaian, jabatan, kontak, dan tugas pendidik / tenaga kependidikan.
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nama Lengkap & Gelar *</Label>
                <Input
                  required
                  placeholder="Contoh: Drs. H. Bambang Sudarsono, M.Pd"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">NIP / NIK / No. Induk *</Label>
                  <Input
                    required
                    placeholder="Contoh: 198506202010012008"
                    value={formData.nip_or_nik}
                    onChange={(e) => setFormData({ ...formData, nip_or_nik: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Jenis Kelamin</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val: "L" | "P") => setFormData({ ...formData, gender: val })}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki (L)</SelectItem>
                      <SelectItem value="P">Perempuan (P)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Jabatan / Role GTK *</Label>
                  <Select
                    value={formData.gtk_role}
                    onValueChange={(val: GtkRole) => setFormData({ ...formData, gtk_role: val })}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guru_pns">Guru PNS</SelectItem>
                      <SelectItem value="guru_pppk">Guru PPPK</SelectItem>
                      <SelectItem value="guru_honorer">Guru Honorer</SelectItem>
                      <SelectItem value="kepala_sekolah">Kepala Sekolah</SelectItem>
                      <SelectItem value="tata_usaha">Tenaga Administrasi (TU)</SelectItem>
                      <SelectItem value="laboran">Laboran</SelectItem>
                      <SelectItem value="pustakawan">Pustakawan</SelectItem>
                      <SelectItem value="satpam">Satpam / Keamanan</SelectItem>
                      <SelectItem value="kebersihan">Kebersihan & Sarpras</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Status Keaktifan</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val: "aktif" | "cuti" | "mutasi") =>
                      setFormData({ ...formData, status: val })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="cuti">Cuti</SelectItem>
                      <SelectItem value="mutasi">Mutasi / Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Mata Pelajaran / Tugas Tambahan</Label>
                <Input
                  placeholder="Contoh: Matematika Peminatan & Pembina OSIS"
                  value={formData.subject_specialty || ""}
                  onChange={(e) => setFormData({ ...formData, subject_specialty: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">No. HP / WhatsApp</Label>
                  <Input
                    placeholder="Contoh: 081234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Alamat Email</Label>
                  <Input
                    type="email"
                    placeholder="Contoh: guru@sekolah.sch.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                {editingGtk ? "Simpan Perubahan" : "Simpan GTK Baru"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import CSV Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b bg-muted/20">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Upload className="size-5 text-primary" /> Import Data GTK via CSV
            </DialogTitle>
            <DialogDescription className="text-xs">
              Unggah atau tempel data guru & tenaga kependidikan secara massal.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            <div className="p-3 bg-muted/50 rounded-xl border text-[11px] space-y-1">
              <p className="font-bold text-foreground">Urutan Format Kolom CSV:</p>
              <p className="font-mono text-muted-foreground">
                NIP,Nama Lengkap,Role,Mata Pelajaran,Gender (L/P),No HP,Email,Status
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Pilihan Role: guru_pns, guru_pppk, guru_honorer, kepala_sekolah, tata_usaha, laboran, pustakawan, satpam, kebersihan.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Tempel Isi CSV di Sini:</Label>
              <textarea
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                placeholder={`NIP,Nama Lengkap,Role,Mata Pelajaran,Gender,No HP,Email,Status\n198501012010011001,Budi Santoso S.Pd,guru_pns,Matematika,L,08123456789,budi@sch.id,aktif\n199002022015012002,Siti Aminah S.Kom,guru_honorer,Informatika,P,08129876543,siti@sch.id,aktif`}
                rows={7}
                className="w-full text-xs font-mono p-3 rounded-xl border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleProcessImportCsv} className="font-bold">
              Impor Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GTK ID Card Single Print Modal */}
      {cardModalGtk && (
        <Dialog open={!!cardModalGtk} onOpenChange={() => setCardModalGtk(null)}>
          <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden">
            <DialogHeader className="p-5 border-b bg-muted/20">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="size-5 text-primary" /> Kartu Pegawai & GTK Digital
              </DialogTitle>
              <DialogDescription className="text-xs">
                Kartu identitas resmi GTK dengan QR Code presensi terintegrasi.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 flex flex-col items-center justify-center">
              <div
                id="gtk-id-card-element"
                className="w-full max-w-[340px] rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 border border-slate-700 shadow-xl relative overflow-hidden space-y-4"
              >
                {/* Background glow */}
                <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-primary/20 blur-xl pointer-events-none" />

                {/* Card Top */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary-foreground border border-white/20">
                      <SchoolIcon className="size-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-tight text-white line-clamp-1">
                        {activeSchool?.name || "Sekolah Indonesia"}
                      </h4>
                      <p className="text-[8px] font-semibold text-white/60 tracking-wider">
                        KARTU PEGAWAI & GTK
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-primary text-white font-mono text-[8.5px] px-2 py-0.5 border-none">
                    GTK
                  </Badge>
                </div>

                {/* Card Center */}
                <div className="grid grid-cols-12 gap-3 items-center relative z-10">
                  <div className="col-span-8 space-y-1.5">
                    <div>
                      <span className="text-[7.5px] uppercase font-bold text-white/50 block">Nama Pegawai</span>
                      <p className="font-black text-sm text-white leading-tight line-clamp-1">
                        {cardModalGtk.full_name}
                      </p>
                    </div>

                    <div className="text-[9px] space-y-0.5 pt-0.5">
                      <div>
                        <span className="text-[7.5px] uppercase font-bold text-white/50 block">NIP / NIK</span>
                        <span className="font-mono font-bold text-white text-[10.5px]">{cardModalGtk.nip_or_nik}</span>
                      </div>
                      <div>
                        <span className="text-[7.5px] uppercase font-bold text-white/50 block">Jabatan</span>
                        <span className="font-bold text-white text-[10px]">
                          {GTK_ROLE_LABELS[cardModalGtk.gtk_role]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-4 flex flex-col items-center justify-center bg-white p-2 rounded-2xl border shadow-sm">
                    <QRCodeSVG
                      value={`GTK:${cardModalGtk.school_id}:${cardModalGtk.nip_or_nik}`}
                      size={68}
                      level="M"
                    />
                    <span className="text-[7px] font-mono font-black text-slate-900 mt-1">
                      SCAN GTK
                    </span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="border-t border-white/10 pt-2 text-[8px] text-white/60 flex items-center justify-between relative z-10">
                  <span>{activeSchool?.npsn ? `NPSN: ${activeSchool.npsn}` : "Resmi Kemendikbud"}</span>
                  <span className="font-mono">{cardModalGtk.status.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setCardModalGtk(null)}>
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  window.print();
                }}
                className="font-bold"
              >
                <Printer className="mr-1.5 size-4" /> Cetak Kartu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
