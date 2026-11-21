import { get, set, del } from "idb-keyval";
import type {
  Attachment,
  ClaimEvent,
  Notice,
  Preferences,
  Snapshot,
} from "../domain";
import {
  deliveryTime,
  distanceKm,
  normalizePlate,
  parkingPrice,
  validateClaim,
  validateFiles,
} from "../rules";
import { seed } from "../seed";
import type { Repository } from "./contracts";

const KEY = "sf-conecta:v1";
const citizen = {
  id: "demo",
  email: "vecino@demo.local",
  name: "Vecino de San Francisco",
};
export class MockRepository implements Repository {
  readonly mode = "demo" as const;
  private listeners = new Set<() => void>();
  private data: Snapshot;
  constructor() {
    const saved = localStorage.getItem(KEY);
    this.data = saved ? (JSON.parse(saved) as Snapshot) : seed();
  }
  async getUser() {
    return citizen;
  }
  async signIn() {
    /* Sesión académica local, sin contraseñas. */
  }
  async signUp() {
    return "El modo demo ya tiene una sesión local. Usá Supabase para registrar cuentas.";
  }
  async signOut() {
    /* No hay sesión remota en modo demo. */
  }
  async load() {
    return structuredClone(this.data);
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    const storage = (event: StorageEvent) => {
      if (event.key === KEY && event.newValue) {
        this.data = JSON.parse(event.newValue);
        fn();
      }
    };
    window.addEventListener("storage", storage);
    return () => {
      this.listeners.delete(fn);
      window.removeEventListener("storage", storage);
    };
  }
  private commit(mutator: () => void) {
    const previous = structuredClone(this.data);
    try {
      mutator();
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (error) {
      this.data = previous;
      throw error;
    }
    this.listeners.forEach((fn) => fn());
  }
  private notice(
    title: string,
    body: string,
    category: Notice["category"],
    link: string,
    zone: string | null = null,
    dedupe_key?: string,
  ) {
    if (
      dedupe_key &&
      this.data.notifications.some((n) => n.dedupe_key === dedupe_key)
    )
      return;
    const visible_at = deliveryTime(this.data.preferences, { category, zone });
    if (visible_at)
      this.data.notifications.unshift({
        id: crypto.randomUUID(),
        title,
        body,
        category,
        link,
        zone,
        visible_at,
        dedupe_key,
        read: false,
        created_at: new Date().toISOString(),
      });
  }
  async payBill(id: string) {
    this.commit(() => {
      const bill = this.data.bills.find((b) => b.id === id);
      if (!bill || bill.status !== "pending")
        throw new Error("Este cedulón ya fue pagado o no existe.");
      bill.status = "paid";
      this.data.payments.unshift({
        id: crypto.randomUUID(),
        bill_id: id,
        amount: bill.amount,
        description: `${bill.concept} · ${bill.period}`,
        created_at: new Date().toISOString(),
        reference: `DEMO-${crypto.randomUUID().slice(0, 8)}`,
        simulated: true,
      });
      this.notice(
        "Pago simulado registrado",
        bill.concept,
        "tributos",
        "/tributaria",
      );
    });
  }
  async reportBike(station_id: string, description: string) {
    if (description.trim().length < 10 || description.length > 2000)
      throw new Error("Describí el problema en 10 a 2000 caracteres.");
    this.commit(() => {
      if (!this.data.stations.some((s) => s.id === station_id))
        throw new Error("Estación inexistente.");
      this.data.bike_reports.unshift({
        id: crypto.randomUUID(),
        station_id,
        description: description.trim(),
        created_at: new Date().toISOString(),
      });
    });
  }
  async createClaim(
    category: string,
    description: string,
    address: string,
    files: File[],
  ) {
    validateClaim(description, address);
    validateFiles(files);
    const attachments: Attachment[] = [];
    try {
      for (const file of files) {
        const path = `demo/${crypto.randomUUID()}`;
        await set(path, file);
        attachments.push({
          path,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      }
      this.commit(() => {
        const at = new Date().toISOString();
        this.data.claims.unshift({
          id: crypto.randomUUID(),
          category,
          description: description.trim(),
          address: address.trim(),
          status: "recibido",
          attachments,
          events: [
            {
              status: "recibido",
              detail: "Reclamo recibido. Conservá el número de seguimiento.",
              at,
            },
          ],
          created_at: at,
        });
        this.notice(
          "Recibimos tu reclamo",
          description.trim(),
          "reclamos",
          "/reclamos",
        );
      });
    } catch (error) {
      await Promise.all(attachments.map((a) => del(a.path)));
      throw error;
    }
  }
  async attachmentUrl(file: Attachment) {
    const blob = await get<Blob>(file.path);
    if (!blob) throw new Error("El archivo no está en este navegador.");
    return URL.createObjectURL(blob);
  }
  async savePreferences(preferences: Preferences) {
    this.commit(() => {
      this.data.preferences = preferences;
    });
  }
  async readNotice(id: string) {
    this.commit(() => {
      const n = this.data.notifications.find((n) => n.id === id);
      if (n) n.read = true;
    });
  }
  async startParking(zoneId: string, plate: string, minutes: number) {
    const normalized = normalizePlate(plate);
    this.commit(() => {
      const zone = this.data.zones.find((z) => z.id === zoneId);
      if (!zone) throw new Error("Zona inexistente.");
      if (
        this.data.parking.some(
          (p) =>
            p.status === "active" && new Date(p.ends_at).getTime() > Date.now(),
        )
      )
        throw new Error("Ya tenés un estacionamiento activo.");
      const amount = parkingPrice(zone, minutes);
      const id = crypto.randomUUID();
      this.data.parking.unshift({
        id,
        zone_id: zoneId,
        plate: normalized,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + minutes * 60000).toISOString(),
        amount,
        status: "active",
      });
      this.parkingPayment(amount, `Estacionamiento ${normalized}`);
    });
  }
  private parkingPayment(amount: number, description: string) {
    this.data.payments.unshift({
      id: crypto.randomUUID(),
      bill_id: null,
      amount,
      description,
      created_at: new Date().toISOString(),
      reference: `DEMO-${crypto.randomUUID().slice(0, 8)}`,
      simulated: true,
    });
  }
  async extendParking(id: string, minutes: number) {
    this.commit(() => {
      const p = this.data.parking.find(
        (p) => p.id === id && p.status === "active",
      );
      if (!p || new Date(p.ends_at).getTime() <= Date.now())
        throw new Error("El estacionamiento ya finalizó. Iniciá uno nuevo.");
      if (
        (new Date(p.ends_at).getTime() - new Date(p.starts_at).getTime()) /
          60000 +
          minutes >
        480
      )
        throw new Error("El máximo acumulado de la demo es 8 horas.");
      const zone = this.data.zones.find((z) => z.id === p.zone_id)!;
      const amount = parkingPrice(zone, minutes);
      p.ends_at = new Date(
        new Date(p.ends_at).getTime() + minutes * 60000,
      ).toISOString();
      p.amount += amount;
      this.parkingPayment(amount, `Extensión ${p.plate}`);
    });
  }
  async finishParking(id: string) {
    this.commit(() => {
      const p = this.data.parking.find((p) => p.id === id);
      if (p) p.status = "finished";
    });
  }
  async reminders() {
    this.commit(() => {
      for (const bill of this.data.bills) {
        const diff =
          new Date(`${bill.due_date}T23:59:59-03:00`).getTime() - Date.now();
        if (bill.status === "pending" && diff < 7 * 86400000)
          this.notice(
            "Recordatorio de vencimiento",
            `${bill.concept}: vence el ${bill.due_date}.`,
            "tributos",
            "/tributaria",
            null,
            `bill:${bill.id}`,
          );
      }
      for (const p of this.data.parking.filter((p) => p.status === "active")) {
        const left = new Date(p.ends_at).getTime() - Date.now();
        if (left <= 5 * 60000)
          this.notice(
            left > 0
              ? "Tu estacionamiento está por vencer"
              : "Finalizó tu estacionamiento",
            p.plate,
            "estacionamiento",
            "/estacionamiento",
            null,
            `parking:${p.id}:${p.ends_at}:${left > 0 ? "soon" : "end"}`,
          );
        if (left <= 0) p.status = "finished";
      }
    });
  }
  async simulate(kind: "bikes" | "alarm" | "claim" | "notice", id?: string) {
    this.commit(() => {
      const now = new Date().toISOString();
      if (kind === "bikes")
        this.data.stations.forEach((s) => {
          const total = s.bikes + s.docks;
          s.bikes = (s.bikes + 1) % (total + 1);
          s.docks = total - s.bikes;
          s.updated_at = now;
        });
      if (kind === "alarm") {
        const alarm = this.data.alarms.find((a) => a.id === id);
        if (!alarm) throw new Error("Alarma inexistente.");
        alarm.active = !alarm.active;
        alarm.updated_at = now;
        const pref = this.data.preferences;
        const nearby =
          pref.location && distanceKm(pref.location, alarm) <= pref.nearby_km;
        if (alarm.active)
          this.notice(
            "Alarma activada · Simulación",
            `${alarm.name}, zona ${alarm.zone}.`,
            "alarmas",
            "/alarmas",
            nearby ? null : alarm.zone,
          );
      }
      if (kind === "claim") {
        const claim = this.data.claims.find((c) => c.id === id);
        if (!claim || claim.status === "resuelto")
          throw new Error("El reclamo ya está resuelto.");
        const status: ClaimEvent["status"] =
          claim.status === "recibido" ? "en curso" : "resuelto";
        claim.status = status;
        claim.events.push({
          status,
          detail: "Actualización del operador simulado.",
          at: now,
        });
        this.notice(
          "Tu reclamo cambió de estado",
          `${claim.category}: ${status}.`,
          "reclamos",
          "/reclamos",
        );
      }
      if (kind === "notice")
        this.notice(
          "Obras de mejora en el Centro · Demo",
          "Corte ilustrativo en Bv. 9 de Julio, de 08:00 a 12:00. No es un aviso municipal real.",
          "obras",
          "/notificaciones",
          "Centro",
        );
    });
  }
  async savePush() {
    throw new Error(
      "La entrega push remota requiere Supabase y claves VAPID. Podés probar un aviso local.",
    );
  }
  async removePush() {
    /* No se registra push en modo demo. */
  }
}
