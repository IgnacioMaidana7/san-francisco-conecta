// Solo servidor. Desplegar con los secretos documentados; nunca importar en Vite.
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import webpush from "npm:web-push@3.6.7";

function allowedEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === "https:" &&
      !u.port &&
      !u.username &&
      !u.password &&
      (u.hostname === "fcm.googleapis.com" ||
        u.hostname === "updates.push.services.mozilla.com" ||
        u.hostname.endsWith(".push.services.mozilla.com") ||
        u.hostname === "web.push.apple.com" ||
        u.hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}
Deno.serve(async (request) => {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("PUSH_CRON_SECRET");
  if (!secret || request.headers.get("x-cron-secret") !== secret)
    return new Response("Unauthorized", { status: 401 });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!url || !serviceKey || !publicKey || !privateKey || !subject)
    return Response.json(
      { error: "Missing server configuration" },
      { status: 503 },
    );
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  webpush.setVapidDetails(subject, publicKey, privateKey);
  try {
    const reminder = await db.rpc("run_reminders");
    if (reminder.error) throw reminder.error;
    const { data: notices, error } = await db
      .from("notifications")
      .select("*")
      .is("pushed_at", null)
      .lte("visible_at", new Date().toISOString())
      .order("created_at")
      .limit(100);
    if (error) throw error;
    let sent = 0;
    let failed = 0;
    for (const notice of notices ?? []) {
      const { data: pref, error: prefError } = await db
        .from("preferences")
        .select("settings")
        .eq("user_id", notice.user_id)
        .single();
      if (prefError) throw prefError;
      // Revalidar pausas y categorías: un aviso pendiente no debe ignorar una baja posterior.
      if (
        pref.settings.frequency === "off" ||
        !pref.settings.categories.includes(notice.category) ||
        (notice.zone && !pref.settings.zones.includes(notice.zone))
      ) {
        const update = await db
          .from("notifications")
          .update({ pushed_at: new Date().toISOString() })
          .eq("id", notice.id);
        if (update.error) throw update.error;
        continue;
      }
      const { data: subscriptions, error: subError } = await db
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", notice.user_id);
      if (subError) throw subError;
      let retry = false;
      for (const sub of subscriptions ?? []) {
        const { data: delivered, error: deliveredError } = await db
          .from("push_deliveries")
          .select("notification_id")
          .eq("notification_id", notice.id)
          .eq("subscription_id", sub.id)
          .maybeSingle();
        if (deliveredError) throw deliveredError;
        if (delivered) continue;
        if (!allowedEndpoint(sub.endpoint)) {
          await db.from("push_subscriptions").delete().eq("id", sub.id);
          continue;
        }
        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title: notice.title,
              body: notice.body,
              link: notice.link,
            }),
            { TTL: 3600, timeout: 10000 },
          );
          const saved = await db
            .from("push_deliveries")
            .insert({ notification_id: notice.id, subscription_id: sub.id });
          if (saved.error) throw saved.error;
          sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await db.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
            retry = true;
            failed++;
          }
        }
      }
      if (!retry) {
        const update = await db
          .from("notifications")
          .update({ pushed_at: new Date().toISOString() })
          .eq("id", notice.id);
        if (update.error) throw update.error;
      }
    }
    return Response.json({ sent, failed });
  } catch {
    return Response.json(
      {
        error:
          "Delivery failed. Check server configuration and database availability.",
      },
      { status: 500 },
    );
  }
});
