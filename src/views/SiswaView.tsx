import React, { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Upload,
  Download,
  CreditCard,
  Trash2,
  Edit2,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  Sparkles,
  School,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useSchoolStore } from "@/lib/store";
import { Student } from "@/types";
import { downloadCsv, toCsv } from "@/lib/attendance";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { BatchCardPrintDialog } from "@/components/cards/BatchCardPrintDialog";
import { PageHeader } from "@/components/layout/PageHeader";

interface SiswaViewProps {
  onNavigate: (view: string, param?: string) => void;
}

export function SiswaView({ onNavigate }: SiswaViewProps) {
  const {
    students,
    classes,
    activeSchool,
    addStudent,
    updateStudent,
    deleteStudent,
    importStudents,
    batchImportStudents,
    terms,
  } = useSchoolStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [cardModalStudent, setCardModalStudent] = useState<Student | null>(null);
  const [batchPrintModalOpen, setBatchPrintModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form states
  const [formNis, setFormNis] = useState("");
  const [formName, setFormName] = useState("");
  const [formClassId, setFormClassId] = useState(classes[0]?.id || "");
  const [formGender, setFormGender] = useState<"L" | "P">("L");
  const [formGuardianName, setFormGuardianName] = useState("");
  const [formGuardianPhone, setFormGuardianPhone] = useState("");
  const [formRfid, setFormRfid] = useState("");

  // Import state
  const [importMode, setImportMode] = useState<"multi_class" | "single_class">("multi_class");
  const [importClassId, setImportClassId] = useState(classes[0]?.id || "");
  const [importText, setImportText] = useState(
    "102410;Rian Hidayat;X RPL 1;L;081234567891;Bpk. Hidayat;RFID-001\n102411;Siti Nurhaliza;X RPL 2;P;081234567892;Ibu Nur;RFID-002\n102412;Zaki Ramadhan;XI TKR 1;L;081234567893;Bpk. Ramadhan;RFID-003"
  );

  const resetForm = () => {
    setFormNis("");
    setFormName("");
    setFormClassId(classes[0]?.id || "");
    setFormGender("L");
    setFormGuardianName("");
    setFormGuardianPhone("");
    setFormRfid("");
    setEditingStudent(null);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formNis) {
      toast.error("NIS dan Nama Siswa wajib diisi.");
      return;
    }

    if (editingStudent) {
      updateStudent(editingStudent.id, {
        nis: formNis,
        full_name: formName,
        class_id: formClassId || null,
        gender: formGender,
        guardian_name: formGuardianName || null,
        guardian_phone: formGuardianPhone || null,
        card_uid: formRfid || null,
      });
      toast.success("Data siswa berhasil diperbarui.");
    } else {
      addStudent({
        nis: formNis,
        full_name: formName,
        class_id: formClassId || null,
        gender: formGender,
        guardian_name: formGuardianName || null,
        guardian_phone: formGuardianPhone || null,
        card_uid: formRfid || `RFID-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        active: true,
        user_id: null,
      });
      toast.success("Siswa baru berhasil ditambahkan.");
    }

    setAddModalOpen(false);
    resetForm();
  };

  const handleOpenEdit = (stu: Student) => {
    setEditingStudent(stu);
    setFormNis(stu.nis || "");
    setFormName(stu.full_name);
    setFormClassId(stu.class_id || "");
    setFormGender(stu.gender === "P" || stu.gender === "Perempuan" ? "P" : "L");
    setFormGuardianName(stu.guardian_name || "");
    setFormGuardianPhone(stu.guardian_phone || "");
    setFormRfid(stu.card_uid || "");
    setAddModalOpen(true);
  };

  const handleDownloadTemplate = () => {
    const sample = [
      "NIS;Nama Lengkap;Kelas;Gender;No WA Wali;Nama Wali;RFID UID",
      "102401;Ahmad Fauzi;X RPL 1;L;081234567890;Bpk. Fauzi;RFID-101",
      "102402;Bunga Citra;X RPL 1;P;081234567891;Ibu Citra;RFID-102",
      "102403;Dimas Prakoso;X RPL 2;L;081234567892;Bpk. Prakoso;RFID-103",
      "102404;Eko Sulistyo;XI TKR 1;L;081234567893;Bpk. Sulistyo;RFID-104",
      "102405;Fitri Rahma;XI TKJ 1;P;081234567894;Ibu Rahma;RFID-105",
      "102406;Gilang Ramadhan;XII TBSM 1;L;081234567895;Bpk. Ramadhan;RFID-106",
    ].join("\n");

    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Format_Impor_Massal_Siswa_SMK.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template CSV berhasil diunduh.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setImportText(text);
        toast.info(`File ${file.name} berhasil dimuat.`);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      toast.error("Masukkan data CSV/teks siswa terlebih dahulu.");
      return;
    }

    if (importMode === "single_class") {
      const count = importStudents(importClassId, importText);
      toast.success(`Berhasil mengimpor ${count} siswa ke kelas terpilih!`);
      setImportModalOpen(false);
      return;
    }

    // Multi-class bulk import (SMK 72 Classes Scale)
    const lines = importText.split("\n").filter((l) => l.trim().length > 0);
    const studentsToImport: {
      nis: string;
      fullName: string;
      className?: string;
      gender?: "L" | "P";
      guardianPhone?: string;
      guardianName?: string;
      cardUid?: string;
    }[] = [];

    lines.forEach((line, index) => {
      if (index === 0 && (line.toLowerCase().includes("nis") || line.toLowerCase().includes("nama"))) {
        return;
      }
      const delimiter = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
      const parts = line.split(delimiter).map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const nis = parts[0];
        const fullName = parts[1];
        const className = parts[2] || undefined;
        const rawGender = parts[3]?.toUpperCase();
        const gender: "L" | "P" = rawGender === "P" || rawGender === "PEREMPUAN" ? "P" : "L";
        const guardianPhone = parts[4] || undefined;
        const guardianName = parts[5] || undefined;
        const cardUid = parts[6] || undefined;

        studentsToImport.push({
          nis,
          fullName,
          className,
          gender,
          guardianPhone,
          guardianName,
          cardUid,
        });
      }
    });

    if (studentsToImport.length === 0) {
      toast.error("Tidak ada baris data siswa yang valid ditemukan.");
      return;
    }

    const res = batchImportStudents(studentsToImport);
    toast.success(
      `Sukses mengimpor ${res.addedCount} siswa! (${res.createdClasses} kelas baru dibuat, ${res.matchedClasses} total rombel aktif).`
    );
    setImportModalOpen(false);
  };

  const handleExportCsv = () => {
    const headers = ["NIS", "Nama Lengkap", "Kelas", "Jenis Kelamin", "Nama Wali", "No WA Wali", "RFID UID"];
    const rows = students.map((s) => {
      const cls = classes.find((c) => c.id === s.class_id);
      return [
        s.nis || "-",
        s.full_name,
        cls?.name || "-",
        s.gender === "P" ? "Perempuan" : "Laki-laki",
        s.guardian_name || "-",
        s.guardian_phone || "-",
        s.card_uid || "-",
      ];
    });

    const csv = toCsv([headers, ...rows]);
    downloadCsv(`Daftar_Siswa_${activeSchool?.name || "Sekolah"}.csv`, csv);
    toast.success("Data siswa berhasil diekspor ke CSV.");
  };

  const filteredStudents = students.filter((s) => {
    const matchesClass = selectedClass === "all" || s.class_id === selectedClass;
    const matchesSearch =
      !searchQuery ||
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nis && s.nis.includes(searchQuery)) ||
      (s.card_uid && s.card_uid.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <PageHeader
        icon={Users}
        title={terms.students_label}
        subtitle={`Kelola data ${terms.student_label.toLowerCase()}, kartu ${terms.student_label.toLowerCase()} digital ber-QR, nomor WhatsApp ${terms.guardian_label.toLowerCase()}, dan kartu RFID.`}
        badge={selectedClass === "all" ? "Semua Kelas" : classes.find((c) => c.id === selectedClass)?.name || "Data Siswa"}
        kpiCards={[
          {
            label: `Total ${terms.students_label}`,
            value: students.length,
            helper: `Tersebar di ${classes.length} ${terms.class_label.toLowerCase()}`,
            icon: Users,
            color: "primary",
          },
          {
            label: "Siswa Laki-laki",
            value: students.filter((s) => s.gender === "L").length,
            helper: "Laki-laki (L)",
            icon: School,
            color: "blue",
          },
          {
            label: "Siswa Perempuan",
            value: students.filter((s) => s.gender === "P").length,
            helper: "Perempuan (P)",
            icon: Sparkles,
            color: "rose",
          },
          {
            label: "Kartu RFID / QR Terpasang",
            value: students.filter((s) => s.card_uid).length,
            helper: "Siap tap / scan kartu",
            icon: CreditCard,
            color: "emerald",
          },
        ]}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBatchPrintModalOpen(true)}
          className="rounded-xl text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 h-9"
        >
          <CreditCard className="mr-1.5 size-3.5" /> Cetak Massal Kartu (A4)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportModalOpen(true)}
          className="rounded-xl text-xs h-9 font-semibold"
        >
          <Upload className="mr-1.5 size-3.5" /> Impor CSV
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="rounded-xl text-xs h-9 font-semibold"
        >
          <Download className="mr-1.5 size-3.5" /> Ekspor Data
        </Button>

        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setAddModalOpen(true);
          }}
          className="bg-primary text-primary-foreground font-bold shadow-xs text-xs rounded-xl h-9 px-3.5"
        >
          <Plus className="mr-1.5 size-4" /> Tambah {terms.student_label}
        </Button>
      </PageHeader>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3.5 rounded-2xl border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder={`Cari ${terms.student_label.toLowerCase()} berdasarkan nama, ${terms.identifier_label}, atau kode RFID...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="w-full sm:w-[180px]">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={`Pilih ${terms.class_label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua {terms.class_label} ({students.length})</SelectItem>
              {classes.map((c) => {
                const count = students.filter((s) => s.class_id === c.id).length;
                return (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Students Table */}
      <Card className="border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-12 text-center text-xs">No</TableHead>
                <TableHead className="text-xs font-bold">{terms.identifier_label} & Nama {terms.student_label}</TableHead>
                <TableHead className="text-xs font-bold">{terms.class_label}</TableHead>
                <TableHead className="text-xs font-bold">{terms.guardian_label} & WhatsApp</TableHead>
                <TableHead className="text-xs font-bold">RFID Card UID</TableHead>
                <TableHead className="text-xs font-bold text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    Tidak ada siswa yang ditemukan. Tambahkan siswa baru atau impor dari file CSV.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((stu, index) => {
                  const cls = classes.find((c) => c.id === stu.class_id);

                  return (
                    <TableRow key={stu.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {stu.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{stu.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              NIS: <span className="font-mono">{stu.nis || "-"}</span> •{" "}
                              {stu.gender === "P" ? "Perempuan" : "Laki-laki"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {cls?.name || "Belum Ada Kelas"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-foreground">
                            {stu.guardian_name || "-"}
                          </p>
                          {stu.guardian_phone ? (
                            <p className="text-[10px] text-emerald-600 font-mono flex items-center gap-1">
                              <Phone className="size-2.5" /> {stu.guardian_phone}
                            </p>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">No WA belum ada</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[11px] bg-secondary px-2 py-0.5 rounded text-foreground">
                          {stu.card_uid || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Student ID Card */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-primary hover:bg-primary/10"
                            onClick={() => setCardModalStudent(stu)}
                            title="Lihat & Cetak Kartu Pelajar"
                          >
                            <CreditCard className="size-3.5" />
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(stu)}
                            title="Edit Data Siswa"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm(`Hapus data siswa ${stu.full_name}?`)) {
                                deleteStudent(stu.id);
                                toast.success("Siswa berhasil dihapus.");
                              }
                            }}
                            title="Hapus Siswa"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
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

      {/* Add / Edit Student Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingStudent ? `Edit Data ${terms.student_label}` : `Tambah ${terms.student_label} Baru`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lengkapi data profil {terms.student_label.toLowerCase()}, nomor induk ({terms.identifier_label}), nomor kontak {terms.guardian_label.toLowerCase()}, dan kartu RFID.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStudent} className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{terms.identifier_label}</Label>
                <Input
                  value={formNis}
                  onChange={(e) => setFormNis(e.target.value)}
                  placeholder={`Contoh: 102409`}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Jenis Kelamin</Label>
                <Select
                  value={formGender}
                  onValueChange={(v) => setFormGender(v as "L" | "P")}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki (L)</SelectItem>
                    <SelectItem value="P">Perempuan (P)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Lengkap {terms.student_label}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Muhammad Rizky Pratama"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{terms.class_label}</Label>
              <Select value={formClassId} onValueChange={setFormClassId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder={`Pilih ${terms.class_label}`} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama {terms.guardian_label}</Label>
                <Input
                  value={formGuardianName}
                  onChange={(e) => setFormGuardianName(e.target.value)}
                  placeholder="Bapak / Ibu ..."
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">No WA {terms.guardian_label}</Label>
                <Input
                  value={formGuardianPhone}
                  onChange={(e) => setFormGuardianPhone(e.target.value)}
                  placeholder="08123456789"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Kode Kartu RFID (Opsional)</Label>
              <Input
                value={formRfid}
                onChange={(e) => setFormRfid(e.target.value)}
                placeholder="RFID-9901-A"
                className="text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                {editingStudent ? "Simpan Perubahan" : "Tambahkan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Import CSV Dialog */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span>Impor Data {terms.students_label} Massal</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-8 text-xs font-semibold text-primary border-primary/30"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Unduh Format CSV
              </Button>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mendukung impor ribuan siswa sekaligus untuk seluruh 72 rombel SMK atau impor per kelas tertentu.
            </DialogDescription>
          </DialogHeader>

          {/* Import Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-xl">
            <button
              type="button"
              onClick={() => setImportMode("multi_class")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                importMode === "multi_class"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Impor Multi-Kelas (Seluruh 72 Rombel SMK)
            </button>
            <button
              type="button"
              onClick={() => setImportMode("single_class")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                importMode === "single_class"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Impor Khusus 1 Kelas
            </button>
          </div>

          <form onSubmit={handleImport} className="space-y-3.5 py-1">
            {importMode === "single_class" && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Pilih {terms.class_label} Sasaran</Label>
                <Select value={importClassId} onValueChange={setImportClassId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder={`Pilih ${terms.class_label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* File Upload Trigger */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-dashed bg-muted/30">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Upload file .csv / .txt</span> atau tempel data di bawah:
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-background hover:bg-muted text-foreground transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5" /> Pilih File CSV
                </span>
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <Label className="font-semibold">
                  {importMode === "multi_class"
                    ? "Format: NIS;Nama Siswa;Nama Kelas;L/P;No WA Wali;Nama Wali;RFID UID"
                    : "Format: NIS;Nama Siswa;L/P;No WA Wali"}
                </Label>
                <span className="text-[10px] text-muted-foreground">Pemisah (; atau koma)</span>
              </div>
              <Textarea
                rows={7}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="font-mono text-xs"
                placeholder={
                  importMode === "multi_class"
                    ? "102401;Ahmad Fauzi;X RPL 1;L;081234567890;Bpk. Fauzi;RFID-101\n102402;Bunga Citra;X RPL 1;P;081234567891;Ibu Citra;RFID-102"
                    : "102401;Ahmad Fauzi;L;081234567890\n102402;Bunga Citra;P;081234567891"
                }
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" size="sm" className="font-semibold px-5">
                Proses & Impor Siswa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Printable Digital Student ID Card Modal */}
      <Dialog open={!!cardModalStudent} onOpenChange={() => setCardModalStudent(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2">
              <CreditCard className="size-5 text-primary" />
              Kartu {terms.student_label} Digital & Barcode
            </DialogTitle>
          </DialogHeader>

          {cardModalStudent && (
            <div className="my-3 p-6 rounded-2xl bg-gradient-to-br from-sidebar to-sidebar/95 text-sidebar-foreground border shadow-xl text-left relative overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-sidebar-border/60 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <School className="size-5 text-sidebar-primary" />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-tight text-sidebar-foreground">
                      {activeSchool?.name}
                    </h4>
                    <p className="text-[9px] text-sidebar-foreground/70">KARTU TANDA {terms.student_label.toUpperCase()}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] border-sidebar-border text-sidebar-primary-foreground bg-sidebar-primary">
                  RFID ACTIVE
                </Badge>
              </div>

              {/* Card Body */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="col-span-2 space-y-1.5">
                  <div>
                    <span className="text-[9px] text-sidebar-foreground/60 uppercase">Nama {terms.student_label}</span>
                    <p className="font-bold text-sm text-sidebar-foreground leading-tight">
                      {cardModalStudent.full_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-sidebar-foreground/60 uppercase">{terms.identifier_label}</span>
                      <p className="font-mono font-bold text-sidebar-foreground">
                        {cardModalStudent.nis || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-sidebar-foreground/60 uppercase">{terms.class_label}</span>
                      <p className="font-bold text-sidebar-foreground">
                        {classes.find((c) => c.id === cardModalStudent.class_id)?.name || "-"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-sidebar-foreground/60 uppercase">RFID UID</span>
                    <p className="font-mono text-[10px] text-sidebar-foreground/80">
                      {cardModalStudent.card_uid || "-"}
                    </p>
                  </div>
                </div>

                {/* QR Barcode */}
                <div className="flex flex-col items-center bg-white p-2 rounded-xl border shadow-sm">
                  <QRCodeSVG
                    value={`STUDENT:${cardModalStudent.school_id}:${cardModalStudent.nis}`}
                    size={84}
                    level="M"
                  />
                  <span className="text-[8px] font-mono text-slate-800 font-bold mt-1">SCAN PRESENSI</span>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-sidebar-border/40 text-[9px] text-sidebar-foreground/60 text-center">
                Kartu ini berlaku selama menjadi {terms.student_label.toLowerCase()} aktif di {activeSchool?.name}.
              </div>
            </div>
          )}

          <div className="flex justify-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.print();
              }}
              className="text-xs"
            >
              <Printer className="mr-1.5 size-3.5" /> Cetak Kartu
            </Button>
            <Button
              size="sm"
              onClick={() => setCardModalStudent(null)}
              className="text-xs"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk A4 Student ID Card Print Modal */}
      <BatchCardPrintDialog
        open={batchPrintModalOpen}
        onOpenChange={setBatchPrintModalOpen}
        defaultClassId={selectedClass}
      />
    </div>
  );
}
