import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number to Indonesian Rupiah (IDR)
 * Example: 1000000 -> "Rp1.000.000"
 */
export function formatRupiah(amount: number | string | bigint | null | undefined): string {
  if (amount === null || amount === undefined) return "Rp0";
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num).replace(/\s/g, "");
}

/**
 * Format number to compact Indonesian Rupiah
 * Example: 1500000 -> "Rp1,5Jt", 10000 -> "Rp10Rb"
 */
export function formatRupiahCompact(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "Rp0";
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return "Rp0";

  if (Math.abs(num) >= 1_000_000_000) {
    return `Rp${(num / 1_000_000_000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `Rp${(num / 1_000_000).toFixed(1)}Jt`;
  }
  if (Math.abs(num) >= 1_000) {
    return `Rp${(num / 1_000).toFixed(0)}Rb`;
  }
  return formatRupiah(num);
}

/**
 * Parse input string formatted with thousand separators
 */
export function parseRupiahInput(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}
