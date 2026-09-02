import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  QrCode,
  CheckCircle2,
  Copy,
  Clock,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRight,
  Download,
  Printer,
  FileText,
  AlertCircle,
  HelpCircle,
  CreditCard,
  Wallet,
  Smartphone,
  Check,
  RefreshCw,
  Crown,
  Key,
  School as SchoolIcon,
} from "lucide-react";
import { useSchoolStore, SAAS_PLAN_CONFIGS } from "@/lib/store";
import { SaaSPlanTier } from "@/types";
import { toast } from "sonner";

interface QrisCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: SaaSPlanTier;
  onSuccessActivation?: (planTier: SaaSPlanTier, licenseKey: string) => void;
}

export function QrisCheckoutModal({
  isOpen,
  onClose,
  defaultPlan = "pro",
  onSuccessActivation,
}: QrisCheckoutModalProps) {
  const { activeSchool, updateSchoolPlan } = useSchoolStore();

  const [selectedPlan, setSelectedPlan] = useState<SaaSPlanTier>(defaultPlan);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [schoolNameInput, setSchoolNameInput] = useState(activeSchool?.name || "");
  const [picEmail, setPicEmail] = useState("admin@" + (activeSchool?.subdomain || "sekolah") + ".sch.id");
  const [picWhatsapp, setPicWhatsapp] = useState("081234567890");

  const [step, setStep] = useState<"select" | "qris_payment" | "success_receipt">("select");
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "va_bca" | "va_mandiri" | "va_bri">("qris");
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [isVerifying, setIsVerifying] = useState(false);
  const [uniqueCode] = useState(() => Math.floor(100 + Math.random() * 899));
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [generatedLicense, setGeneratedLicense] = useState("");

  // Sync default plan on open
  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(defaultPlan);
      setStep("select");
      setTimeLeft(900);
      setIsVerifying(false);
      if (activeSchool?.name) {
        setSchoolNameInput(activeSchool.name);
      }
    }
  }, [isOpen, defaultPlan, activeSchool]);

  // Timer countdown for QRIS
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "qris_payment" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Pricing definitions
  const pricing = {
    starter: {
      name: "Starter",
      monthly: 0,
      annual: 0,
      desc: "Hingga 6 Rombel • 250 Siswa",
      features: ["Presensi QR & RFID", "Mode Offline PWA", "Rekap CSV & Excel"],
    },
    pro: {
      name: "Pro",
      monthly: 199000,
      annual: 1890000, // 20% disc (~Rp 157rb/bln)
      desc: "Hingga 24 Rombel • 1.200 Siswa",
      features: [
        "Semua fitur Starter",
        "Multi-Campus (3 Titik GPS)",
        "Subdomain Khusus Tenant",
        "Notifikasi WhatsApp Otomatis",
        "Presensi Guru Mandiri GPS",
      ],
    },
    enterprise: {
      name: "Enterprise",
      monthly: 399000,
      annual: 3790000, // ~Rp 315rb/bln
      desc: "Hingga 120 Rombel • 5.000 Siswa • Unlimited GTK",
      features: [
        "Semua fitur Pro",
        "Full White-Label (Logo & Warna Mandiri)",
        "Kapasitas Rombel Besar (72+ Rombel)",
        "Multi-Campus 15 Titik GPS",
        "Sinkronisasi Cloud Database",
        "Prioritas Dedicated Support 24/7",
      ],
    },
  };

  const currentPricing = pricing[selectedPlan];
  const basePrice = billingCycle === "annual" ? currentPricing.annual : currentPricing.monthly;
  const isFreeStarter = selectedPlan === "starter";
  const totalPrice = isFreeStarter ? 0 : basePrice + (billingCycle === "annual" ? uniqueCode : 0);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProceedToPayment = () => {
    if (isFreeStarter) {
      // Free Starter Instant Activation
      const freeKey = `PRE-STR-${new Date().getFullYear()}-FREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setGeneratedLicense(freeKey);
      if (activeSchool) {
        updateSchoolPlan(activeSchool.id, "starter", "2026-12-31", freeKey);
      }
      toast.success("Paket Starter Aktif Gratis!");
      if (onSuccessActivation) onSuccessActivation("starter", freeKey);
      setStep("success_receipt");
      return;
    }

    const inv = `INV-PRE-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(10000 + Math.random() * 90000)}`;
    setInvoiceNumber(inv);
    setStep("qris_payment");
    setTimeLeft(900);
  };

  const handleSimulateSuccessfulPayment = () => {
    setIsVerifying(true);
    toast.info("Memverifikasi mutasi pembayaran QRIS...");

    setTimeout(() => {
      setIsVerifying(false);
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const newLicense = `PRE-${selectedPlan.toUpperCase()}-${new Date().getFullYear() + (billingCycle === "annual" ? 1 : 0)}-${randomSuffix}-QRIS`;
      setGeneratedLicense(newLicense);

      const activeUntil = billingCycle === "annual" ? "2027-12-31" : "2026-12-31";
      if (activeSchool) {
        updateSchoolPlan(activeSchool.id, selectedPlan, activeUntil, newLicense);
      }

      toast.success("Pembayaran QRIS Terverifikasi LUNAS! Lisensi telah aktif.", {
        duration: 4000,
      });

      if (onSuccessActivation) {
        onSuccessActivation(selectedPlan, newLicense);
      }
      setStep("success_receipt");
    }, 1200);
  };

  // QRIS standard simulation string
  const qrisPayload = `00020101021226670016ID.CO.QRIS.WWW011893600998${invoiceNumber || "INV01"}0215ID1020260902999520458125303360540${totalPrice}5802ID5921PRESENSI SAAS INDONESIA6007JAKARTA61051011062070703A016304`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 border rounded-2xl shadow-2xl bg-card">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-primary/10 via-card to-amber-500/10 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-foreground">
                  {step === "select" && "Konfirmasi Paket & Langganan"}
                  {step === "qris_payment" && "Scan QR Pembayaran"}
                  {step === "success_receipt" && "Aktivasi Berhasil & Lisensi Aktif"}
                </DialogTitle>
                <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold">
                  SaaS Presensi
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Proses aktivasi instan untuk lisensi dan kapasitas rombel sekolah
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* STEP 1: SELECT PLAN & BILLING */}
        {step === "select" && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center p-1 rounded-xl bg-muted border text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    billingCycle === "monthly"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Bayar Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("annual")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    billingCycle === "annual"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>Bayar Tahunan</span>
                  <Badge className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0 font-black uppercase">
                    Hemat 20%
                  </Badge>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid sm:grid-cols-3 gap-3">
              {(["starter", "pro", "enterprise"] as SaaSPlanTier[]).map((tier) => {
                const plan = pricing[tier];
                const isSelected = selectedPlan === tier;
                const isEnterprise = tier === "enterprise";
                const isPro = tier === "pro";
                const price = billingCycle === "annual" ? plan.annual : plan.monthly;

                return (
                  <div
                    key={tier}
                    onClick={() => setSelectedPlan(tier)}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? isEnterprise
                          ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20"
                          : isPro
                          ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
                          : "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-muted-foreground/40 bg-card"
                    }`}
                  >
                    {isEnterprise && (
                      <div className="absolute -top-2.5 right-2">
                        <Badge className="bg-amber-500 text-slate-950 text-[9px] font-black uppercase">
                          Rekomendasi
                        </Badge>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{plan.name}</span>
                        {isSelected && <CheckCircle2 className="size-4 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{plan.desc}</p>
                      <div className="mt-3">
                        <div className="text-base font-black text-foreground">
                          {tier === "starter" ? "Gratis" : formatRupiah(price)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {tier === "starter" ? "Selamanya" : billingCycle === "annual" ? "/ tahun" : "/ bulan"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* School / PIC Information */}
            <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <SchoolIcon className="size-3.5 text-primary" /> Data Sekolah & Penanggung Jawab
              </span>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Nama Sekolah / Instansi</Label>
                  <Input
                    value={schoolNameInput}
                    onChange={(e) => setSchoolNameInput(e.target.value)}
                    placeholder="Contoh: SMA Negeri 1 Bangsa"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">WhatsApp Konfirmasi</Label>
                  <Input
                    value={picWhatsapp}
                    onChange={(e) => setPicWhatsapp(e.target.value)}
                    placeholder="0812xxxx"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="p-4 rounded-xl bg-card border shadow-xs space-y-2.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Paket Layanan:</span>
                <span className="font-semibold text-foreground">
                  Presensi {currentPricing.name} ({billingCycle === "annual" ? "1 Tahun" : "1 Bulan"})
                </span>
              </div>
              {!isFreeStarter && billingCycle === "annual" && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Kode Unik Verifikasi:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    +{uniqueCode}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between items-center text-sm font-bold">
                <span>Total Pembayaran:</span>
                <span className="text-lg text-primary font-black">
                  {isFreeStarter ? "Rp 0 (Gratis)" : formatRupiah(totalPrice)}
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="text-xs">
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleProceedToPayment}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-md h-10 px-5"
              >
                {isFreeStarter ? (
                  <>
                    <Check className="size-4" /> Aktifkan Starter Gratis
                  </>
                ) : (
                  <>
                    <span>Lanjutkan Pembayaran</span> <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: QRIS PAYMENT SCREEN */}
        {step === "qris_payment" && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Countdown & Instructions */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                <Clock className="size-4 animate-spin text-amber-600" />
                <span>Selesaikan pembayaran dalam:</span>
              </div>
              <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-md">
                {formatTimer(timeLeft)}
              </span>
            </div>

            <div className="grid md:grid-cols-12 gap-6 items-center">
              {/* QRIS Graphic Frame */}
              <div className="md:col-span-6 flex flex-col items-center justify-center p-5 rounded-2xl bg-white text-slate-900 border-2 border-slate-300 shadow-md">
                {/* QRIS Header */}
                <div className="w-full flex items-center justify-between border-b pb-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs tracking-tighter text-red-600">QRIS</span>
                    <span className="text-[9px] text-slate-500 font-semibold uppercase">
                      Standar Pembayaran Nasional
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[8px] text-slate-600 border-slate-300 font-mono">
                    NMID: ID1020260902999
                  </Badge>
                </div>

                {/* QR Code */}
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-inner">
                  <QRCodeSVG
                    value={qrisPayload}
                    size={180}
                    level="M"
                    includeMargin={false}
                    className="rounded-lg"
                  />
                </div>

                <div className="mt-3 text-center">
                  <span className="text-xs font-black text-slate-900 uppercase block tracking-wide">
                    PRESENSI SAAS INDONESIA
                  </span>
                  <span className="text-[10px] text-slate-500">
                    No. Invoice: <strong className="font-mono">{invoiceNumber}</strong>
                  </span>
                </div>
              </div>

              {/* Payment Details & Steps */}
              <div className="md:col-span-6 space-y-4">
                <div className="p-4 rounded-xl bg-muted/40 border space-y-2">
                  <span className="text-[11px] text-muted-foreground font-semibold">Total Nominal Pembayaran:</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl sm:text-2xl font-black text-primary font-mono select-all">
                      {formatRupiah(totalPrice)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(totalPrice.toString());
                        toast.success("Nominal disalin!");
                      }}
                      className="text-xs h-7 gap-1"
                    >
                      <Copy className="size-3" /> Salin
                    </Button>
                  </div>
                  <span className="text-[10px] text-muted-foreground block leading-tight">
                    *Pastikan nominal transfer sesuai persis hingga 3 digit terakhir agar lisensi aktif otomatis.
                  </span>
                </div>

                {/* Supported Apps List */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    Dapat di-scan menggunakan aplikasi:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["BCA Mobile", "Livin' Mandiri", "BRImo", "BNI Mobile", "GoPay", "OVO", "DANA", "ShopeePay"].map(
                      (app) => (
                        <span
                          key={app}
                          className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold border text-foreground"
                        >
                          {app}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Simulation / Verification Button */}
                <div className="pt-2 space-y-2">
                  <Button
                    type="button"
                    onClick={handleSimulateSuccessfulPayment}
                    disabled={isVerifying}
                    className="w-full h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" /> Memeriksa Mutasi QRIS...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" /> ⚡ Simulasi Scan Bayar Berhasil (Instant Check)
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Tekan tombol simulasi di atas untuk menguji proses verifikasi instan & perolehan lisensi otomatis.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t text-xs">
              <Button type="button" variant="ghost" onClick={() => setStep("select")} className="text-xs">
                ← Kembali Pilih Paket
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS & INVOICE RECEIPT */}
        {step === "success_receipt" && (
          <div className="p-5 sm:p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="size-14 rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Pembayaran QRIS Berhasil!</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Lisensi langganan paket <strong>{currentPricing.name}</strong> telah diterbitkan dan aktif untuk sekolah Anda.
              </p>
            </div>

            {/* License Key Display Card */}
            <div className="p-4 rounded-xl bg-card border-2 border-primary/30 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Key className="size-3.5 text-amber-500" /> Kunci Lisensi Resmi (License Key):
                </span>
                <Badge className="bg-emerald-500 text-white text-[10px] font-mono">AKTIF</Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted font-mono text-xs font-bold text-foreground tracking-wider flex items-center justify-between">
                <span className="select-all">{generatedLicense}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLicense);
                    toast.success("Kunci lisensi disalin!");
                  }}
                  className="text-xs h-7"
                >
                  <Copy className="size-3 mr-1" /> Salin
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground pt-1">
                <div>
                  <span>No. Invoice:</span>
                  <strong className="block text-foreground font-mono">{invoiceNumber || "INV-FREE-2026"}</strong>
                </div>
                <div>
                  <span>Masa Berlaku:</span>
                  <strong className="block text-foreground">
                    {billingCycle === "annual" ? "1 Tahun (s/d 2027)" : "1 Bulan (s/d 2026)"}
                  </strong>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span>Status:</span>
                  <strong className="block text-emerald-600 dark:text-emerald-400 font-bold">LUNAS (QRIS)</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  window.print();
                }}
                className="w-full sm:w-auto text-xs gap-1.5"
              >
                <Printer className="size-3.5" /> Cetak Bukti Pembayaran
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto text-xs font-bold bg-primary text-primary-foreground shadow-md px-6"
              >
                Selesai & Buka Dashboard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
