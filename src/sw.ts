/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { safeLink } from "./rules";
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//],
  }),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});
self.addEventListener("push", (event) => {
  let payload = {
    title: "San Francisco Conecta",
    body: "Tenés una nueva notificación.",
    link: "/notificaciones",
  };
  try {
    payload = { ...payload, ...event.data?.json() };
  } catch {
    /* Un mensaje sin JSON usa el texto genérico. */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      data: { link: payload.link },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = String(event.notification.data?.link ?? "/notificaciones");
  const target = new URL(safeLink(link), self.location.origin);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const client = windows[0] as WindowClient | undefined;
      if (client) {
        await client.navigate(target.href);
        await client.focus();
      } else await self.clients.openWindow(target.href);
    })(),
  );
});
