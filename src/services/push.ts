import type { Repository } from "./contracts";

async function registration() {
  if (!("serviceWorker" in navigator) || !("Notification" in window))
    throw new Error(
      "Este navegador no admite notificaciones. Usá el historial de la aplicación.",
    );
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.active)
    throw new Error(
      "El servicio de notificaciones está disponible en la compilación de producción: npm run build y npm run preview.",
    );
  return reg;
}
export async function enablePush(repo: Repository) {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (repo.mode === "demo" || !key)
    throw new Error(
      "Para recibir push remoto configurá Supabase y la clave pública VAPID. La prueba local funciona sin servidor push.",
    );
  const reg = await registration();
  if (!("PushManager" in window))
    throw new Error(
      "Push no está disponible. En iPhone instalá la PWA desde Safari y abrila desde Inicio.",
    );
  if ((await Notification.requestPermission()) !== "granted")
    throw new Error(
      "Permiso no concedido. Podés habilitarlo en los ajustes del navegador.",
    );
  const bytes = Uint8Array.from(
    atob(key.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    }));
  await repo.savePush(subscription.toJSON());
}
export async function disablePush(repo: Repository) {
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await repo.removePush(sub.endpoint);
    await sub.unsubscribe();
  }
}
export async function testNotification() {
  const reg = await registration();
  if ((await Notification.requestPermission()) !== "granted")
    throw new Error("Permiso no concedido. Revisá los ajustes del navegador.");
  await reg.showNotification("San Francisco Conecta · Prueba local", {
    body: "Esta es una notificación de demostración enviada por este dispositivo.",
    icon: "/pwa-192.png",
    data: { link: "/notificaciones" },
  });
}
