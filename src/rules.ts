import type { Notice, Point, Preferences, Zone } from "./domain";

export function distanceKm(a: Point, b: Point) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) *
      Math.cos(b.lat * r) *
      Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function parkingPrice(zone: Pick<Zone, "hourly_rate">, minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 240)
    throw new Error("Elegí entre 15 y 240 minutos.");
  return Math.round(((zone.hourly_rate * minutes) / 60) * 100) / 100;
}
export function normalizePlate(input: string) {
  const plate = input.toUpperCase().replace(/[\s-]/g, "");
  if (
    !/^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2}|[A-Z]\d{3}[A-Z]{3}|\d{3}[A-Z]{3})$/.test(
      plate,
    )
  )
    throw new Error(
      "Ingresá una patente argentina válida, por ejemplo AB123CD o ABC123.",
    );
  return plate;
}
export function validateClaim(description: string, address: string) {
  if (description.trim().length < 10 || description.length > 2000)
    throw new Error("Describí el problema en 10 a 2000 caracteres.");
  if (address.trim().length < 5 || address.length > 200)
    throw new Error("Ingresá una dirección de 5 a 200 caracteres.");
}
export function validateFiles(files: File[]) {
  if (files.length > 3) throw new Error("Podés adjuntar hasta 3 archivos.");
  for (const f of files) {
    if (
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        f.type,
      )
    )
      throw new Error("Solo se admiten JPG, PNG, WebP y PDF.");
    if (f.size > 5 * 1024 * 1024 || !f.size)
      throw new Error("Cada archivo debe pesar entre 1 byte y 5 MB.");
  }
}
export function deliveryTime(
  preferences: Preferences,
  notice: Pick<Notice, "category" | "zone">,
  now = new Date(),
): string | null {
  if (
    preferences.frequency === "off" ||
    !preferences.categories.includes(notice.category)
  )
    return null;
  if (notice.zone && !preferences.zones.includes(notice.zone)) return null;
  if (preferences.frequency === "daily") {
    // Un resumen se entrega 24 h después; no depende del huso del servidor.
    return new Date(now.getTime() + 86400000).toISOString();
  }
  return now.toISOString();
}
export function remainingTime(endsAt: string, now = Date.now()) {
  const seconds = Math.max(
    0,
    Math.ceil((new Date(endsAt).getTime() - now) / 1000),
  );
  return `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((seconds / 60) % 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
export function safeLink(link: string) {
  return link.startsWith("/") &&
    !link.startsWith("//") &&
    !/[\\\u0000-\u001f]/.test(link)
    ? link
    : "/notificaciones";
}
