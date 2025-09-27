import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Attempts to parse a date string in common formats. Returns a Date object or null if parsing fails.
 * Supports ISO, US (MM/DD/YY), and common written formats (e.g., 'Mar 24, 2025').
 */
export function parseDateFlexible(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try native Date parsing first (handles ISO and some written formats)
  const native = new Date(dateStr);
  if (!isNaN(native.getTime())) return native;

  // Try MM/DD/YY or MM/DD/YYYY
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{2}:\d{2}))?$/);
  if (usMatch) {
    const [, month, day, year, time] = usMatch;
    const fullYear = year.length === 2 ? '20' + year : year;
    const dateStrIso = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}${time ? 'T' + time + ':00' : ''}`;
    const d = new Date(dateStrIso);
    if (!isNaN(d.getTime())) return d;
  }

  // Try written format: 'MMM DD, YYYY' (e.g., 'Mar 24, 2025')
  const writtenMatch = dateStr.match(/^(\w{3,})\s+(\d{1,2}),\s*(\d{4})$/);
  if (writtenMatch) {
    const [, month, day, year] = writtenMatch;
    const d = new Date(`${month} ${day}, ${year}`);
    if (!isNaN(d.getTime())) return d;
  }

  // Add more formats as needed

  return null;
}

/**
 * Parses a funding amount string like "$1,000,000" or "Dependent" to an integer.
 * Returns 0 if the value is not a valid number.
 */
export function parseFundingAmount(amount: string): number {
  if (!amount) return 0;
  // Remove $, commas, and whitespace
  const cleaned = amount.replace(/[$,\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Converts a string to smart title case (AP style).
 * Small words (like 'of', 'the', etc.) are lowercase unless first or last.
 */
export function toSmartTitleCase(str: string): string {
  if (!str) return '';
  const smallWords = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'with', 'within', 'from', 'over', 'into', 'onto', 'upon', 'off', 'out', 'per', 'via'
  ]);
  const words = str.toLowerCase().split(/([\s-]+)/); // keep spaces and hyphens as tokens
  let result = '';
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // If it's a separator (space, hyphen), just add it
    if (/^[\s-]+$/.test(word)) {
      result += word;
      continue;
    }
    // Always capitalize first and last word, or if not a small word
    if (
      i === 0 ||
      i === words.length - 1 ||
      !smallWords.has(word)
    ) {
      result += word.charAt(0).toUpperCase() + word.slice(1);
    } else {
      result += word;
    }
  }
  return result;
}
