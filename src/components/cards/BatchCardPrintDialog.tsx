import React, { useState, useMemo, useRef } from "react";
import {
  CreditCard,
  Printer,
  School as SchoolIcon,
  CheckSquare,
  Square,
  Search,
  Filter,
  Layers,
  Sparkles,
  UserCheck,
  CheckCircle2,
  FileDown,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchoolStore } from "@/lib/store";
import { QRCodeSVG } from "qrcode.react";
import { Student } from "@/types";

interface BatchCardPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClassId?: string;
}

export function BatchCardPrintDialog({
  open,
  onOpenChange,
  defaultClassId = "all",
}: BatchCardPrintDialogProps) {
  const { students, classes, activeSchool, terms } = useSchoolStore();

  const [selectedClass, setSelectedClass] = useState<string>(defaultClassId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [layoutMode, setLayoutMode] = useState<"a4_grid_9" | "a4_grid_6">("a4_grid_9");
  const [includeBackSide, setIncludeBackSide] = useState(false);
  const [includePrincipalSign, setIncludePrincipalSign] = useState(true);

  // Filter students based on class and search
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClass === "all" || s.class_id === selectedClass;
      const matchSearch =
        !searchQuery ||
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nis && s.nis.includes(searchQuery)) ||
        (s.card_uid && s.card_uid.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, searchQuery]);

  // Initial selection when opening or changing class
  React.useEffect(() => {
    if (open) {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  }, [open, selectedClass]);

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const studentsToPrint = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                Cetak Massal Kartu {terms.student_label} (A4 Batch Print)
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Cetak lembar kartu pelajar lengkap dengan QR Code, RFID UID, dan identitas resmi untuk seluruh siswa.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerPrint}
                disabled={studentsToPrint.length === 0}
                className="font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Printer className="mr-1.5 size-4" /> Cetak Lembar A4 ({studentsToPrint.length})
              </Button>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Filter {terms.class_label}</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua {terms.class_label} ({students.length})</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({students.filter((s) => s.class_id === c.id).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Cari {terms.student_label}</Label>
              <div className="relative mt-1">
                <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nama / NIS..."
                  className="h-8 text-xs pl-8"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Tata Letak Cetak</Label>
              <Select value={layoutMode} onValueChange={(v) => setLayoutMode(v as any)}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4_grid_9">Grid A4 (9 Kartu / Lembar: 3x3)</SelectItem>
                  <SelectItem value="a4_grid_6">Grid A4 (6 Kartu / Lembar: 2x3 Besar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end space-y-1">
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] font-bold text-muted-foreground">Sisi Belakang</span>
                <Switch
                  checked={includeBackSide}
                  onCheckedChange={setIncludeBackSide}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-muted-foreground">TTD Kepala Sekolah</span>
                <Switch
                  checked={includePrincipalSign}
                  onCheckedChange={setIncludePrincipalSign}
                  className="scale-75"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body: Selection Ticker & Printable Preview */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quick selection status */}
          <div className="flex items-center justify-between bg-muted/40 p-2.5 px-4 rounded-xl border text-xs">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors"
            >
              {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                <CheckSquare className="size-4 text-primary" />
              ) : (
                <Square className="size-4 text-muted-foreground" />
              )}
              Pilih Semua ({filteredStudents.length} Siswa)
            </button>

            <Badge variant="secondary" className="font-mono text-xs">
              {selectedStudentIds.length} kartu dipilih untuk dicetak
            </Badge>
          </div>

          {/* A4 Printable Sheet Preview Container */}
          <div id="printable-a4-cards-sheet" className="printable-cards-container space-y-8">
            <div
              className={`grid ${
                layoutMode === "a4_grid_9"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "grid-cols-1 sm:grid-cols-2 gap-6"
              }`}
            >
              {studentsToPrint.map((student) => {
                const cls = classes.find((c) => c.id === student.class_id);
                const isSelected = selectedStudentIds.includes(student.id);

                return (
                  <div
                    key={student.id}
                    onClick={() => toggleSelectStudent(student.id)}
                    className="cursor-pointer group relative transition-transform hover:scale-[1.01]"
                  >
                    {/* Checkbox indicator overlay on screen */}
                    <div className="no-print absolute top-2 right-2 z-10">
                      {isSelected ? (
                        <span className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                          <CheckCircle2 className="size-4" />
                        </span>
                      ) : (
                        <span className="size-6 rounded-full bg-black/40 text-white flex items-center justify-center">
                          <Square className="size-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Front Card Design */}
                    <div
                      className="card-id-front rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 border border-slate-700 shadow-md relative overflow-hidden flex flex-col justify-between"
                      style={{
                        minHeight: layoutMode === "a4_grid_9" ? "210px" : "240px",
                        pageBreakInside: "avoid",
                      }}
                    >
                      {/* Decorative Background Accents */}
                      <div className="absolute -right-8 -bottom-8 size-28 rounded-full bg-primary/20 blur-xl pointer-events-none" />
                      <div className="absolute -left-8 -top-8 size-24 rounded-full bg-blue-500/10 blur-lg pointer-events-none" />

                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary-foreground border border-white/20">
                            <SchoolIcon className="size-3.5" />
                          </div>
                          <div>
                            <h4 className="font-black text-[10px] sm:text-[11px] uppercase tracking-tight text-white line-clamp-1">
                              {activeSchool?.name || "Sekolah Indonesia"}
                            </h4>
                            <p className="text-[7.5px] font-semibold text-white/60 tracking-wider">
                              KARTU TANDA {terms.student_label.toUpperCase()} DIGITAL
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-primary/90 text-white font-mono text-[8px] px-1.5 py-0 h-4 border-none">
                          RFID
                        </Badge>
                      </div>

                      {/* Card Center Content */}
                      <div className="grid grid-cols-12 gap-2 items-center relative z-10 my-1">
                        {/* Student Details (8 cols) */}
                        <div className="col-span-8 space-y-1">
                          <div>
                            <span className="text-[7px] uppercase font-bold text-white/50 block">Nama Siswa</span>
                            <p className="font-extrabold text-xs sm:text-[13px] text-white leading-tight line-clamp-1">
                              {student.full_name}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[9px] pt-0.5">
                            <div>
                              <span className="text-[7px] uppercase font-bold text-white/50 block">{terms.identifier_label}</span>
                              <span className="font-mono font-bold text-white text-[10px]">{student.nis || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[7px] uppercase font-bold text-white/50 block">{terms.class_label}</span>
                              <span className="font-bold text-white text-[10px]">{cls?.name || "-"}</span>
                            </div>
                          </div>

                          <div className="pt-0.5">
                            <span className="text-[7px] uppercase font-bold text-white/50 block">RFID Card UID</span>
                            <span className="font-mono text-[8.5px] text-white/80 bg-white/10 px-1.5 py-0.5 rounded">
                              {student.card_uid || `UID-${student.nis || "9901"}`}
                            </span>
                          </div>
                        </div>

                        {/* QR Code Barcode (4 cols) */}
                        <div className="col-span-4 flex flex-col items-center justify-center bg-white p-1.5 rounded-xl border shadow-sm">
                          <QRCodeSVG
                            value={`STUDENT:${student.school_id}:${student.nis || student.id}`}
                            size={layoutMode === "a4_grid_9" ? 56 : 64}
                            level="M"
                          />
                          <span className="text-[6.5px] font-mono font-black text-slate-900 mt-0.5 tracking-tighter">
                            SCAN GERBANG
                          </span>
                        </div>
                      </div>

                      {/* Footer Note */}
                      <div className="border-t border-white/10 pt-1 text-[7px] text-white/60 flex items-center justify-between relative z-10 mt-1">
                        <span>Resmi • Kemendikbud</span>
                        <span className="font-mono">{terms.student_label} Aktif</span>
                      </div>
                    </div>

                    {/* Optional Back Side */}
                    {includeBackSide && (
                      <div
                        className="card-id-back mt-2 rounded-2xl bg-white text-slate-800 p-3.5 border border-slate-300 shadow-sm relative flex flex-col justify-between"
                        style={{
                          minHeight: layoutMode === "a4_grid_9" ? "190px" : "220px",
                          pageBreakInside: "avoid",
                        }}
                      >
                        <div className="space-y-1 text-[8px] text-slate-700">
                          <p className="font-bold text-[9px] uppercase border-b pb-1 text-slate-900">
                            Ketentuan Penggunaan Kartu:
                          </p>
                          <ol className="list-decimal list-inside space-y-0.5 text-[7.5px] leading-tight text-slate-600">
                            <li>Kartu wajib dibawa setiap hari saat presensi di gerbang sekolah.</li>
                            <li>Dilarang meminjamkan atau menduplikasi kartu kepada pihak lain.</li>
                            <li>Apabila kartu hilang/rusak, segera lapor ke bagian Tata Usaha.</li>
                          </ol>
                        </div>

                        {includePrincipalSign && (
                          <div className="mt-2 text-right text-[8px]">
                            <p className="text-slate-500 text-[7px]">Mengetahui,</p>
                            <p className="font-bold text-slate-900 text-[8px]">Kepala Sekolah</p>
                            <div className="h-6 flex items-center justify-end">
                              <span className="text-[7px] text-primary italic font-serif opacity-70">[Digital Signature]</span>
                            </div>
                            <p className="font-bold text-slate-900 underline text-[8px]">
                              {activeSchool?.principal_name || "Drs. H. Ahmad Fauzi, M.Pd."}
                            </p>
                            <p className="text-[7px] font-mono text-slate-500">
                              NIP. {activeSchool?.principal_nip || "19750812 199903 1 002"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Tips: Gunakan opsi cetak browser <strong>"Save as PDF"</strong> atau cetak ke kertas stiker / PVC card A4.
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
            <Button
              size="sm"
              onClick={handleTriggerPrint}
              disabled={studentsToPrint.length === 0}
              className="font-bold"
            >
              <Printer className="mr-1.5 size-4" /> Cetak Sekarang ({studentsToPrint.length})
            </Button>
          </div>
        </DialogFooter>

        {/* Global Print Styles for Clean A4 Sheet */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-a4-cards-sheet, #printable-a4-cards-sheet * {
              visibility: visible;
            }
            #printable-a4-cards-sheet {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 10mm;
              margin: 0;
              background: transparent !important;
            }
            .no-print {
              display: none !important;
            }
            .card-id-front {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .card-id-back {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
}
