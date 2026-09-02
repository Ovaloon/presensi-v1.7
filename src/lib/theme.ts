import { useState, useEffect } from "react";
import { BrandThemePreset } from "@/types";

export interface BrandColorConfig {
  id: BrandThemePreset;
  name: string;
  label: string;
  desc: string;
  description: string;
  hex: string;
  primary: string;
  oklch: string;
  ring: string;
  bgClass: string;
}

export type BrandPreset = BrandColorConfig;

export const BRAND_COLOR_PRESETS: Record<BrandThemePreset, BrandColorConfig> = {
  blue: {
    id: "blue",
    name: "Royal Navy",
    label: "Royal Navy (Kemendikbud / Umum)",
    desc: "Standar resmi sekolah negeri & kementerian",
    description: "Standar resmi sekolah negeri & kementerian",
    hex: "#1e40af",
    primary: "#1e40af",
    oklch: "oklch(0.36 0.1 258)",
    ring: "oklch(0.55 0.09 210)",
    bgClass: "bg-blue-700",
  },
  emerald: {
    id: "emerald",
    name: "Emerald Green",
    label: "Emerald Green (Madrasah / Kemenag)",
    desc: "Khas Madrasah Aliyah, Tsanawiyah, & Pesantren",
    description: "Khas Madrasah Aliyah, Tsanawiyah, & Pesantren",
    hex: "#047857",
    primary: "#047857",
    oklch: "oklch(0.46 0.14 160)",
    ring: "oklch(0.60 0.12 155)",
    bgClass: "bg-emerald-700",
  },
  maroon: {
    id: "maroon",
    name: "Maroon Crimson",
    label: "Maroon Crimson (SMK / Vokasi Teknik)",
    desc: "Identitas ketegasan kejuruan & vokasi teknologi",
    description: "Identitas ketegasan kejuruan & vokasi teknologi",
    hex: "#991b1b",
    primary: "#991b1b",
    oklch: "oklch(0.44 0.18 28)",
    ring: "oklch(0.58 0.15 25)",
    bgClass: "bg-red-800",
  },
  indigo: {
    id: "indigo",
    name: "Royal Indigo",
    label: "Royal Indigo (Kampus & Bimbel Modern)",
    desc: "Kesan teknologi, modern, dan perguruan tinggi",
    description: "Kesan teknologi, modern, dan perguruan tinggi",
    hex: "#4338ca",
    primary: "#4338ca",
    oklch: "oklch(0.42 0.18 280)",
    ring: "oklch(0.58 0.14 275)",
    bgClass: "bg-indigo-700",
  },
  amber: {
    id: "amber",
    name: "Amber Gold",
    label: "Amber Gold (Yayasan & Islamic Boarding)",
    desc: "Hangat, elegan, dan bernuansa kepesantrenan",
    description: "Hangat, elegan, dan bernuansa kepesantrenan",
    hex: "#b45309",
    primary: "#b45309",
    oklch: "oklch(0.50 0.16 65)",
    ring: "oklch(0.68 0.14 70)",
    bgClass: "bg-amber-700",
  },
  teal: {
    id: "teal",
    name: "Teal Ocean",
    label: "Teal Ocean (Maritim & Kesehatan)",
    desc: "Segar, dinamis untuk bidang pelayaran & farmasi",
    description: "Segar, dinamis untuk bidang pelayaran & farmasi",
    hex: "#0f766e",
    primary: "#0f766e",
    oklch: "oklch(0.45 0.12 195)",
    ring: "oklch(0.60 0.10 195)",
    bgClass: "bg-teal-700",
  },
  custom: {
    id: "custom",
    name: "Warna Kustom",
    label: "Warna Kustom Institusi (HEX)",
    desc: "Kode warna spesifik sesuai brand identity almamater",
    description: "Kode warna spesifik sesuai brand identity almamater",
    hex: "#1e293b",
    primary: "#1e293b",
    oklch: "oklch(0.35 0.05 250)",
    ring: "oklch(0.55 0.08 250)",
    bgClass: "bg-slate-800",
  },
};

export const BRAND_COLOR_PRESET_LIST: BrandColorConfig[] = Object.values(BRAND_COLOR_PRESETS);

/**
 * Dynamically applies the school's theme color to CSS custom properties
 */
export function applySchoolBrandColor(themePreset?: BrandThemePreset, customHex?: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (customHex && customHex.startsWith("#")) {
    root.style.setProperty("--primary", customHex);
    root.style.setProperty("--ring", customHex);
    return;
  }

  const presetKey = themePreset && BRAND_COLOR_PRESETS[themePreset] ? themePreset : "blue";
  const preset = BRAND_COLOR_PRESETS[presetKey];

  if (preset) {
    root.style.setProperty("--primary", preset.oklch);
    root.style.setProperty("--ring", preset.ring);
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("presensi_theme");
      if (saved === "dark" || saved === "light") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("presensi_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return { theme, setTheme, toggleTheme, isDark: theme === "dark" };
}
