import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Attachment, Preferences, Snapshot } from "../domain";
import { normalizePlate, validateClaim, validateFiles } from "../rules";
import { seed } from "../seed";
import type { Repository } from "./contracts";

export class SupabaseRepository implements Repository {
  readonly mode = "supabase" as const;
  readonly client: SupabaseClient;
  constructor(url: string, key: string) {
    this.client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  private async userId() {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error("Iniciá sesión para continuar.");
    return data.user.id;
  }
  async getUser() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    const user = data.session?.user;
    return user
      ? {
          id: user.id,
          email: user.email ?? "",
          name: String(user.user_metadata.name ?? "Vecino"),
        }
      : null;
  }
  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }
  async signUp(email: string, password: string, name: string) {
    const { error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    return "Cuenta creada. Revisá tu correo para confirmar el acceso si la confirmación está activada.";
  }
  async signOut() {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await this.client
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }
  async load(): Promise<Snapshot> {
    const id = await this.userId();
    const keys = [
      "stations",
      "alarms",
      "zones",
      "contacts",
      "bills",
      "payments",
      "claims",
      "bike_reports",
      "notifications",
      "parking",
    ] as const;
    const privateTables = [
      "bills",
      "payments",
      "claims",
      "bike_reports",
      "notifications",
      "parking",
    ];
    const results = await Promise.all(
      keys.map((key) => {
        const query = this.client.from(key).select("*");
        return privateTables.includes(key) ? query.eq("user_id", id) : query;
      }),
    );
    results.forEach((r) => {
      if (r.error) throw r.error;
    });
    const { data, error } = await this.client
      .from("preferences")
      .select("settings")
      .eq("user_id", id)
      .single();
    if (error) throw error;
    return {
      ...Object.fromEntries(keys.map((key, i) => [key, results[i].data ?? []])),
      preferences: data?.settings ?? seed().preferences,
    } as Snapshot;
  }
  subscribe(fn: () => void) {
    const channel = this.client.channel(`municipal-${crypto.randomUUID()}`);
    for (const table of [
      "stations",
      "alarms",
      "zones",
      "contacts",
      "bills",
      "payments",
      "claims",
      "bike_reports",
      "notifications",
      "parking",
      "preferences",
    ]) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        fn,
      );
    }
    channel.subscribe();
    const { data } = this.client.auth.onAuthStateChange(() =>
      queueMicrotask(fn),
    );
    return () => {
      void this.client.removeChannel(channel);
      data.subscription.unsubscribe();
    };
  }
  private async rpc(name: string, args: Record<string, unknown> = {}) {
    const { error } = await this.client.rpc(name, args);
    if (error) throw error;
  }
  async payBill(id: string) {
    await this.rpc("pay_bill_demo", { bill: id });
  }
  async reportBike(station_id: string, description: string) {
    if (description.trim().length < 10 || description.length > 2000)
      throw new Error("Describí el problema en 10 a 2000 caracteres.");
    const { error } = await this.client
      .from("bike_reports")
      .insert({
        station_id,
        description: description.trim(),
        user_id: await this.userId(),
      });
    if (error) throw error;
  }
  async createClaim(
    category: string,
    description: string,
    address: string,
    files: File[],
  ) {
    validateClaim(description, address);
    validateFiles(files);
    const user = await this.userId();
    const attachments: Attachment[] = [];
    try {
      for (const file of files) {
        const path = `${user}/${crypto.randomUUID()}.${file.type === "application/pdf" ? "pdf" : file.type.split("/")[1]}`;
        const { error } = await this.client.storage
          .from("claim-attachments")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        attachments.push({
          path,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      }
      const { error } = await this.client
        .from("claims")
        .insert({
          category,
          description: description.trim(),
          address: address.trim(),
          attachments,
          user_id: user,
        });
      if (error) throw error;
    } catch (error) {
      if (attachments.length)
        await this.client.storage
          .from("claim-attachments")
          .remove(attachments.map((a) => a.path));
      throw error;
    }
  }
  async attachmentUrl(file: Attachment) {
    const { data, error } = await this.client.storage
      .from("claim-attachments")
      .createSignedUrl(file.path, 60);
    if (error) throw error;
    return data.signedUrl;
  }
  async savePreferences(settings: Preferences) {
    const { error } = await this.client
      .from("preferences")
      .update({ settings })
      .eq("user_id", await this.userId())
      .select()
      .single();
    if (error) throw error;
  }
  async readNotice(id: string) {
    await this.rpc("read_notice", { notice: id });
  }
  async startParking(zoneId: string, plate: string, minutes: number) {
    await this.rpc("start_parking_demo", {
      zone: zoneId,
      vehicle: normalizePlate(plate),
      minutes,
    });
  }
  async extendParking(id: string, minutes: number) {
    await this.rpc("extend_parking_demo", { parking_id: id, minutes });
  }
  async finishParking(id: string) {
    await this.rpc("finish_parking", { parking_id: id });
  }
  async reminders() {
    await this.rpc("check_reminders");
  }
  async simulate() {
    throw new Error(
      "El simulador interactivo está disponible en el modo demo local. En Supabase, un operador autorizado actualiza los datos.",
    );
  }
  async savePush(subscription: PushSubscriptionJSON) {
    const { error } = await this.client
      .from("push_subscriptions")
      .upsert(
        {
          user_id: await this.userId(),
          endpoint: subscription.endpoint,
          subscription,
        },
        { onConflict: "endpoint" },
      );
    if (error) throw error;
  }
  async removePush(endpoint: string) {
    const { error } = await this.client
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (error) throw error;
  }
}
