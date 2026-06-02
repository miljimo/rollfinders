import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

export function formatMoney(value: unknown) {
  const numberValue = Number(value);
  if (numberValue === 0) return "Free";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(numberValue);
}

export function directionsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
