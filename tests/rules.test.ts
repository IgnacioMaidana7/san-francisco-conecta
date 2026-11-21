import { describe, expect, it } from "vitest";
import {
  deliveryTime,
  distanceKm,
  normalizePlate,
  parkingPrice,
  remainingTime,
  safeLink,
  validateClaim,
  validateFiles,
} from "../src/rules";
import { seed } from "../src/seed";
describe("Reglas de servicios municipales", () => {
  it("calcula distancias y conserva cero en la misma ubicación", () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(
      111.19,
      1,
    );
  });
  it("calcula tarifas por minutos y rechaza tiempos fuera del rango", () => {
    expect(parkingPrice({ hourly_rate: 600 }, 15)).toBe(150);
    expect(() => parkingPrice({ hourly_rate: 600 }, 0)).toThrow();
    expect(() => parkingPrice({ hourly_rate: 600 }, NaN)).toThrow();
  });
  it("valida patentes de autos y motos", () => {
    for (const plate of ["AB123CD", "ABC123", "A123BCD", "123ABC"])
      expect(normalizePlate(plate.toLowerCase())).toBe(plate);
    expect(() => normalizePlate("12")).toThrow();
    expect(normalizePlate("ab 123 cd")).toBe("AB123CD");
  });
  it("no muestra tiempos negativos", () => {
    expect(remainingTime(new Date(0).toISOString(), 1)).toBe("00:00:00");
    expect(remainingTime(new Date(3661000).toISOString(), 0)).toBe("01:01:01");
  });
  it("respeta categoría, zona, pausa y entrega diferida", () => {
    const p = seed().preferences;
    const n = { category: "obras" as const, zone: "Centro" };
    const now = new Date("2026-11-21T12:00:00Z");
    expect(deliveryTime(p, n, now)).toBe(now.toISOString());
    expect(deliveryTime({ ...p, frequency: "off" }, n, now)).toBeNull();
    expect(deliveryTime({ ...p, categories: [] }, n, now)).toBeNull();
    expect(deliveryTime(p, { ...n, zone: "Norte" }, now)).toBeNull();
    expect(deliveryTime({ ...p, frequency: "daily" }, n, now)).toBe(
      "2026-11-22T12:00:00.000Z",
    );
  });
  it("rechaza adjuntos peligrosos, excesivos o vacíos", () => {
    const pdf = new File(["test"], "foto.pdf", { type: "application/pdf" });
    expect(() => validateFiles([pdf])).not.toThrow();
    expect(() =>
      validateFiles([
        new File(["<script>"], "bad.html", { type: "text/html" }),
      ]),
    ).toThrow();
    expect(() => validateFiles([pdf, pdf, pdf, pdf])).toThrow();
    expect(() =>
      validateFiles([new File([], "vacio.pdf", { type: "application/pdf" })]),
    ).toThrow();
  });
  it("valida reclamos y restringe enlaces a rutas internas", () => {
    expect(() => validateClaim("breve", "a")).toThrow();
    expect(safeLink("https://evil.test")).toBe("/notificaciones");
    expect(safeLink("//evil.test")).toBe("/notificaciones");
    expect(safeLink("/reclamos")).toBe("/reclamos");
  });
});
