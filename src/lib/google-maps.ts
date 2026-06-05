function stripWrappingQuotes(value: string) {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

export function getGoogleMapsApiKey() {
  const value = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return value ? stripWrappingQuotes(value).trim() : "";
}
