export type Category =
  | "servicios"
  | "obras"
  | "eventos"
  | "alarmas"
  | "tributos"
  | "estacionamiento"
  | "reclamos";
export type Point = { lat: number; lng: number };
export type Station = Point & {
  id: string;
  name: string;
  address: string;
  bikes: number;
  docks: number;
  updated_at: string;
};
export type Alarm = Point & {
  id: string;
  name: string;
  zone: string;
  active: boolean;
  updated_at: string;
};
export type Zone = Point & {
  id: string;
  name: string;
  hourly_rate: number;
  hours: string;
  radius: number;
};
export type Contact = {
  id: string;
  name: string;
  description: string;
  hours: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
};
export type Bill = {
  id: string;
  concept: string;
  period: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid";
};
export type Payment = {
  id: string;
  bill_id: string | null;
  amount: number;
  description: string;
  created_at: string;
  reference: string;
  simulated: true;
};
export type Attachment = {
  path: string;
  name: string;
  type: string;
  size: number;
};
export type ClaimEvent = {
  status: "recibido" | "en curso" | "resuelto";
  detail: string;
  at: string;
};
export type Claim = {
  id: string;
  category: string;
  description: string;
  address: string;
  status: ClaimEvent["status"];
  attachments: Attachment[];
  events: ClaimEvent[];
  created_at: string;
};
export type BikeReport = {
  id: string;
  station_id: string;
  description: string;
  created_at: string;
};
export type Notice = {
  id: string;
  title: string;
  body: string;
  category: Category;
  zone: string | null;
  link: string;
  read: boolean;
  created_at: string;
  visible_at: string;
  dedupe_key?: string;
};
export type Preferences = {
  categories: Category[];
  zones: string[];
  frequency: "immediate" | "daily" | "off";
  nearby_km: number;
  location: Point | null;
};
export type Parking = {
  id: string;
  zone_id: string;
  plate: string;
  starts_at: string;
  ends_at: string;
  amount: number;
  status: "active" | "finished";
};
export type Snapshot = {
  stations: Station[];
  alarms: Alarm[];
  zones: Zone[];
  contacts: Contact[];
  bills: Bill[];
  payments: Payment[];
  claims: Claim[];
  bike_reports: BikeReport[];
  notifications: Notice[];
  parking: Parking[];
  preferences: Preferences;
};
export type Citizen = { id: string; email: string; name: string };
export const categories: Record<Category, string> = {
  servicios: "Cortes de servicios",
  obras: "Obras públicas",
  eventos: "Eventos",
  alarmas: "Alarmas comunitarias",
  tributos: "Vencimientos",
  estacionamiento: "Estacionamiento",
  reclamos: "Mis reclamos",
};
export const center: Point = { lat: -31.4276, lng: -62.0825 };
const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
export const money = (amount: number) => currencyFormatter.format(amount);
export const date = (value: string) =>
  new Date(
    value.length === 10 ? `${value}T12:00:00` : value,
  ).toLocaleDateString("es-AR");
