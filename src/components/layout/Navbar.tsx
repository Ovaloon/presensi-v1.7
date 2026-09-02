import React from "react";
import { Fingerprint, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

interface NavbarProps {
  onNavigate: (view: string) => void;
  activeView: string;
}

export function Navbar({ onNavigate }: NavbarProps) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
            <Fingerprint className="size-5" />
          </span>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Presensi<span className="text-primary font-black">.app</span>
            </span>
            <span className="hidden sm:inline-block text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
              SD • SMP • SMA
            </span>
          </div>
        </button>

        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("auth")}
            className="text-foreground text-xs font-semibold rounded-xl h-9 px-3 inline-flex"
          >
            Masuk Akun
          </Button>

          <Button
            size="sm"
            onClick={() => onNavigate("auth_daftar")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs rounded-xl shadow-xs h-9 px-3.5 hidden sm:inline-flex"
          >
            Daftarkan Sekolah
          </Button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-0.5"
            title={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
          >
            {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </button>
        </nav>
      </div>
    </header>
  );
}
