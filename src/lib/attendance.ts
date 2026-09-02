export type AttendanceStatus = "hadir" | "terlambat" | "sakit" | "izin" | "alpa";
export type AttendanceMethod = "manual" | "qr" | "selfie_gps" | "card";

export const STATUS_ORDER: AttendanceStatus[] = ["hadir", "terlambat", "sakit", "izin", "alpa"];

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  sakit: "Sakit",
  izin: "Izin",
  alpa: "Alpa",
};

export const STATUS_CLASS: Record<AttendanceStatus, string> = {
  hadir: "bg-status-hadir text-status-hadir-foreground",
  terlambat: "bg-status-terlambat text-status-terlambat-foreground",
  sakit: "bg-status-sakit text-status-sakit-foreground",
  izin: "bg-status-izin text-status-izin-foreground",
  alpa: "bg-status-alpa text-status-alpa-foreground",
};

export const METHOD_LABEL: Record<AttendanceMethod, string> = {
  manual: "Manual oleh guru",
  qr: "Scan QR code",
  selfie_gps: "Selfie + lokasi GPS",
  card: "Kartu / RFID",
};

/** Jarak dua titik koordinat dalam meter (Haversine formula). */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Alias untuk backward compatibility */
export const haversineDistanceMeters = distanceMeters;

import { School, SchoolLocation } from "@/types";

export interface GeofenceLocationEvaluation {
  id: string;
  name: string;
  distanceMeters: number;
  radiusMeters: number;
  isWithin: boolean;
  latitude: number;
  longitude: number;
  isMain?: boolean;
}

export interface GeofenceMatchResult {
  isWithinRadius: boolean;
  closestLocationName: string;
  closestDistanceMeters: number;
  closestRadiusMeters: number;
  allEvaluations: GeofenceLocationEvaluation[];
  matchedLocation?: GeofenceLocationEvaluation;
}

/** Evaluasi GPS geofence terhadap semua titik gedung / lokasi sekolah terdaftar */
export function checkSchoolGeofence(
  userLat: number,
  userLng: number,
  school?: School | null
): GeofenceMatchResult {
  if (!school) {
    return {
      isWithinRadius: true,
      closestLocationName: "Sekolah",
      closestDistanceMeters: 0,
      closestRadiusMeters: 300,
      allEvaluations: [],
    };
  }

  // Compile all location targets
  const locationTargets: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    radius: number;
    isMain: boolean;
  }> = [];

  // Primary school location
  if (school.latitude != null && school.longitude != null) {
    locationTargets.push({
      id: "main-loc",
      name: "Gedung Utama / Kampus Pusat",
      lat: school.latitude,
      lng: school.longitude,
      radius: school.radius_meters || 300,
      isMain: true,
    });
  }

  // Multi-campus / branch buildings
  if (school.locations && school.locations.length > 0) {
    school.locations.forEach((loc, idx) => {
      if (loc.latitude != null && loc.longitude != null) {
        locationTargets.push({
          id: loc.id || `loc-${idx}`,
          name: loc.name || `Gedung ${idx + 1}`,
          lat: loc.latitude,
          lng: loc.longitude,
          radius: loc.radius_meters || school.radius_meters || 300,
          isMain: !!loc.is_main,
        });
      }
    });
  }

  if (locationTargets.length === 0) {
    return {
      isWithinRadius: true,
      closestLocationName: school.name || "Sekolah",
      closestDistanceMeters: 0,
      closestRadiusMeters: school.radius_meters || 300,
      allEvaluations: [],
    };
  }

  const evaluations: GeofenceLocationEvaluation[] = locationTargets.map((target) => {
    const dist = distanceMeters(userLat, userLng, target.lat, target.lng);
    return {
      id: target.id,
      name: target.name,
      distanceMeters: Math.round(dist),
      radiusMeters: target.radius,
      isWithin: dist <= target.radius,
      latitude: target.lat,
      longitude: target.lng,
      isMain: target.isMain,
    };
  });

  // Sort by distance (closest first)
  evaluations.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Check if user is within ANY of the registered school buildings/locations
  const matched = evaluations.find((e) => e.isWithin);
  const closest = evaluations[0];

  return {
    isWithinRadius: Boolean(matched),
    closestLocationName: matched ? matched.name : closest.name,
    closestDistanceMeters: matched ? matched.distanceMeters : closest.distanceMeters,
    closestRadiusMeters: matched ? matched.radiusMeters : closest.radiusMeters,
    allEvaluations: evaluations,
    matchedLocation: matched || closest,
  };
}

export function calculateStatus(
  startTime: string,
  lateAfterMinutes: number,
  at: Date = new Date()
): AttendanceStatus {
  return isLate(startTime, lateAfterMinutes, at) ? "terlambat" : "hadir";
}

export function isLate(startTime: string, lateAfterMinutes: number, at: Date = new Date()): boolean {
  const [h, m] = startTime.split(":").map(Number);
  const limit = new Date(at);
  limit.setHours(h ?? 7, (m ?? 0) + lateAfterMinutes, 0, 0);
  return at.getTime() > limit.getTime();
}

export function toCsv(rows: (string | number)[][] | Record<string, any>[]): string {
  if (!rows || rows.length === 0) return "";
  
  // If array of objects
  if (typeof rows[0] === "object" && !Array.isArray(rows[0])) {
    const objRows = rows as Record<string, any>[];
    const headers = Object.keys(objRows[0] || {});
    const headerLine = headers
      .map((h) => (/[",\n;]/.test(h) ? `"${h.replace(/"/g, '""')}"` : h))
      .join(";");
    
    const bodyLines = objRows.map((row) =>
      headers
        .map((header) => {
          const cell = row[header];
          const value = String(cell ?? "");
          return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(";")
    );
    
    return [headerLine, ...bodyLines].join("\n");
  }

  const arrayRows = rows as (string | number)[][];
  return arrayRows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(";")
    )
    .join("\n");
}

export function downloadCsv(arg1: string, arg2?: string) {
  // Support both downloadCsv(filename, content) and downloadCsv(content, filename)
  let filename = "export.csv";
  let csv = "";
  
  if (arg2 !== undefined) {
    if (arg1.endsWith(".csv")) {
      filename = arg1;
      csv = arg2;
    } else if (arg2.endsWith(".csv")) {
      filename = arg2;
      csv = arg1;
    } else {
      filename = arg1;
      csv = arg2;
    }
  } else {
    csv = arg1;
  }

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatDateId(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatTimeId(isoStringOrTime?: string | null): string {
  if (!isoStringOrTime) return "-";
  if (isoStringOrTime.includes("T")) {
    try {
      const d = new Date(isoStringOrTime);
      return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoStringOrTime.slice(11, 16);
    }
  }
  return isoStringOrTime.slice(0, 5);
}

export function calculateDurationHoursMinutes(
  checkInIso?: string | null,
  checkOutIso?: string | null
): string {
  if (!checkInIso || !checkOutIso) return "-";
  try {
    const tIn = new Date(checkInIso.includes("T") ? checkInIso : `2026-01-01T${checkInIso}`).getTime();
    const tOut = new Date(checkOutIso.includes("T") ? checkOutIso : `2026-01-01T${checkOutIso}`).getTime();
    const diffMs = tOut - tIn;
    if (diffMs <= 0) return "0 jam 0 mnt";
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours} jam ${minutes} mnt`;
    }
    return `${minutes} mnt`;
  } catch {
    return "-";
  }
}

export function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
