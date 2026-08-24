import { DayOfWeek } from "@prisma/client";

const DAY_OF_WEEK_MAP: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

/**
 * Returns the Prisma DayOfWeek enum for a given Date object in Indian Standard Time (IST).
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  // IST is UTC + 5:30 (+330 minutes)
  const istDate = new Date(date.getTime() + 330 * 60 * 1000);
  const dayIndex = istDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  return DAY_OF_WEEK_MAP[dayIndex];
}

/**
 * Parses "HH:MM" 24hr string into hours and minutes numbers.
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(":").map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    throw new Error(`Invalid time format: "${timeStr}". Expected "HH:MM"`);
  }
  const [hours, minutes] = parts;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Time values out of range: "${timeStr}"`);
  }
  return { hours, minutes };
}

/**
 * Combines a date string ("YYYY-MM-DD") and a time string ("HH:MM") into an authoritative Date object
 * in Indian Standard Time (IST, UTC+05:30).
 */
export function createDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const { hours, minutes } = parseTimeString(timeStr);
  const y = year.toString().padStart(4, "0");
  const m = month.toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  const h = hours.toString().padStart(2, "0");
  const min = minutes.toString().padStart(2, "0");
  return new Date(`${y}-${m}-${d}T${h}:${min}:00+05:30`);
}

/**
 * Returns the minute of the day (0..1439) in Indian Standard Time (IST) for a given Date object.
 */
export function getTimeInMinutesIST(date: Date): number {
  const istDate = new Date(date.getTime() + 330 * 60 * 1000);
  return istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
}

/**
 * Formats a Date object to "HH:MM" (UTC 24-hour).
 */
export function formatTimeUTC(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Formats date to "YYYY-MM-DD" in UTC.
 */
export function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns tomorrow's date string YYYY-MM-DD in Indian Standard Time (IST).
 */
export function getTomorrowDateString(): string {
  const istDate = new Date(Date.now() + 330 * 60 * 1000);
  istDate.setUTCDate(istDate.getUTCDate() + 1);
  const year = istDate.getUTCFullYear();
  const month = (istDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = istDate.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Checks if two time intervals [startA, endA] and [startB, endB] overlap.
 */
export function areIntervalsOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

export const TIMEZONE_IST = "Asia/Kolkata";

/**
 * Formats a Date object or ISO string to readable Indian date (e.g., "Mon, 24 Aug 2026").
 */
export function formatDateIST(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return d.toLocaleDateString("en-IN", {
    timeZone: TIMEZONE_IST,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats a Date object or ISO string to readable Indian 12hr time (e.g., "09:30 AM").
 */
export function formatTimeIST(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return d.toLocaleTimeString("en-IN", {
    timeZone: TIMEZONE_IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats an interval in IST (e.g., "09:30 AM - 10:00 AM IST").
 */
export function formatIntervalIST(startInput: Date | string, endInput: Date | string): string {
  return `${formatTimeIST(startInput)} - ${formatTimeIST(endInput)} IST`;
}

/**
 * Formats full date and time in IST (e.g., "24 Aug 2026, 09:30 AM IST").
 */
export function formatDateTimeIST(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return `${formatDateIST(d)}, ${formatTimeIST(d)} IST`;
}
