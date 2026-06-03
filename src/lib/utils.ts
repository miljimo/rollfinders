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

export function distanceMiles(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const earthRadiusMiles = 3958.8;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceMiles(value: number) {
  return `${value.toFixed(value < 10 ? 1 : 0)} miles away`;
}
