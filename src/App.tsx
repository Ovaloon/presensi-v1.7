import React, { useState, useEffect } from "react";
import { SchoolProvider, useSchoolStore } from "@/lib/store";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { LandingView } from "@/views/LandingView";
import { AuthView } from "@/views/AuthView";
import { RegisterView } from "@/views/RegisterView";
import { DashboardView } from "@/views/DashboardView";
import { PresensiListView } from "@/views/PresensiListView";
import { PresensiDetailView } from "@/views/PresensiDetailView";
import { SiswaView } from "@/views/SiswaView";
import { KelasView } from "@/views/KelasView";
import { LaporanView } from "@/views/LaporanView";
import { PengaturanView } from "@/views/PengaturanView";
import { AbsenStudentView } from "@/views/AbsenStudentView";
import { RiwayatSiswaView } from "@/views/RiwayatSiswaView";
import { TahunAjaranView } from "@/views/TahunAjaranView";
import { KalenderAkademikView } from "@/views/KalenderAkademikView";
import { JadwalMingguanView } from "@/views/JadwalMingguanView";
import { BuatJadwalView } from "@/views/BuatJadwalView";
import { GtkView } from "@/views/GtkView";
import { WaliKelasView } from "@/views/WaliKelasView";
import { Toaster, toast } from "sonner";

function AppContent() {
  const { currentUser, role } = useSchoolStore();
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== "undefined" && window.location.hostname.includes("presensiku")) {
      return "auth";
    }
    return "landing";
  });
  const [viewParam, setViewParam] = useState<string | undefined>(undefined);

  // Check URL parameters on mount (e.g. ?view=absen&token=xyz or /absen)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const sessionId = params.get("sessionId");
      const view = params.get("view");

      if (token || view === "absen" || window.location.pathname.includes("/absen")) {
        setCurrentView("absen");
        setViewParam(token || sessionId || undefined);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleNavigate = (view: string, param?: string) => {
    const isMarketingDomain =
      typeof window !== "undefined" && window.location.hostname.includes("presensi.app");

    if (isMarketingDomain && ["auth", "auth_siswa", "auth_guru"].includes(view)) {
      window.location.href = "https://presensiku.app/";
      return;
    }

    if (!isMarketingDomain && view === "landing") {
      setCurrentView("auth");
      return;
    }

    // Role-based view guards
    if (role === "student") {
      const forbiddenForStudents = ["siswa", "gtk", "kelas", "laporan", "pengaturan", "presensi", "presensi_detail"];
      if (forbiddenForStudents.includes(view)) {
        toast.error("Akses dibatasi. Akun siswa hanya dapat mengakses Portal Mandiri & Riwayat Kehadiran.");
        setCurrentView("dashboard");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    if (role === "teacher") {
      const forbiddenForTeachers = ["pengaturan", "backend"];
      if (forbiddenForTeachers.includes(view)) {
        toast.error("Akses pengaturan sekolah hanya dapat diakses oleh Administrator / Kepala Sekolah.");
        setCurrentView("dashboard");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    if (view === "backend" && role !== "superadmin") {
      toast.error("Akses dibatasi. Konfigurasi database server hanya dapat dilihat oleh Administrator Platform.");
      setCurrentView("dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setCurrentView(view);
    setViewParam(param);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Marketing domain: public product and pricing page.
  if (currentView === "landing") {
    return (
      <div className="landing-page min-h-screen flex flex-col">
        <Navbar onNavigate={handleNavigate} activeView={currentView} />
        <LandingView onNavigate={handleNavigate} />
      </div>
    );
  }

  if (currentView === "auth_daftar" || currentView === "register") {
    return <RegisterView onNavigate={handleNavigate} />;
  }

  if (currentView === "auth" || currentView === "auth_siswa" || currentView === "auth_guru") {
    const initialTab =
      currentView === "auth_siswa"
        ? "siswa"
        : currentView === "auth_guru"
        ? "guru"
        : "admin";
    return <AuthView initialTab={initialTab} onNavigate={handleNavigate} />;
  }

  if (currentView === "absen") {
    return (
      <AbsenStudentView
        initialSessionId={viewParam}
        initialToken={viewParam}
        onNavigate={handleNavigate}
      />
    );
  }

  // Dashboard / App Shell Protected Views
  return (
    <AppShell activeView={currentView} onNavigate={handleNavigate}>
      {currentView === "dashboard" && <DashboardView onNavigate={handleNavigate} />}
      {currentView === "presensi" && <PresensiListView onNavigate={handleNavigate} />}
      {currentView === "presensi_detail" && viewParam && (
        <PresensiDetailView sessionId={viewParam} onNavigate={handleNavigate} />
      )}
      {currentView === "siswa" && <SiswaView onNavigate={handleNavigate} />}
      {currentView === "gtk" && <GtkView onNavigate={handleNavigate} />}
      {currentView === "kelas" && <KelasView onNavigate={handleNavigate} />}
      {currentView === "tahun_ajaran" && <TahunAjaranView onNavigate={handleNavigate} />}
      {currentView === "kalender_akademik" && <KalenderAkademikView onNavigate={handleNavigate} />}
      {currentView === "jadwal_mingguan" && <JadwalMingguanView onNavigate={handleNavigate} />}
      {currentView === "buat_jadwal" && <BuatJadwalView onNavigate={handleNavigate} />}
      {currentView === "wali_kelas" && <WaliKelasView />}
      {currentView === "laporan" && <LaporanView onNavigate={handleNavigate} />}
      {currentView === "pengaturan" && <PengaturanView onNavigate={handleNavigate} />}
      {currentView === "backend" && <PengaturanView defaultTab="backend" onNavigate={handleNavigate} />}
      {currentView === "riwayat" && <RiwayatSiswaView onNavigate={handleNavigate} defaultTab="riwayat" />}
      {currentView === "izin" && <RiwayatSiswaView onNavigate={handleNavigate} defaultTab="izin" />}
    </AppShell>
  );
}

export default function App() {
  return (
    <SchoolProvider>
      <AppContent />
      <Toaster position="top-right" richColors />
    </SchoolProvider>
  );
}
