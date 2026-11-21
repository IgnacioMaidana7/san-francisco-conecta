import type { Attachment, Citizen, Preferences, Snapshot } from "../domain";
export interface Repository {
  readonly mode: "demo" | "supabase";
  getUser(): Promise<Citizen | null>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, name: string): Promise<string>;
  signOut(): Promise<void>;
  load(): Promise<Snapshot>;
  subscribe(fn: () => void): () => void;
  payBill(id: string): Promise<void>;
  reportBike(stationId: string, description: string): Promise<void>;
  createClaim(
    category: string,
    description: string,
    address: string,
    files: File[],
  ): Promise<void>;
  attachmentUrl(file: Attachment): Promise<string>;
  savePreferences(preferences: Preferences): Promise<void>;
  readNotice(id: string): Promise<void>;
  startParking(zoneId: string, plate: string, minutes: number): Promise<void>;
  extendParking(id: string, minutes: number): Promise<void>;
  finishParking(id: string): Promise<void>;
  reminders(): Promise<void>;
  simulate(
    kind: "bikes" | "alarm" | "claim" | "notice",
    id?: string,
  ): Promise<void>;
  savePush(subscription: PushSubscriptionJSON): Promise<void>;
  removePush(endpoint: string): Promise<void>;
}
