import { expect, test } from "@playwright/test";

test("inicio móvil, navegación de los siete servicios y contactos oficiales", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Tu ciudad/ })).toBeVisible();
  for (const [path, title] of [
    ["bicicletas", "Bicicletas públicas"],
    ["tributaria", "Mis impuestos"],
    ["reclamos", "Centro de reclamos"],
    ["contactos", "Atención al vecino"],
    ["alarmas", "Alarmas comunitarias"],
    ["estacionamiento", "Estacionamiento medido"],
    ["notificaciones", "Notificaciones"],
  ]) {
    await page.goto(`/${path}`);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflow).toBe(false);
  }
  await page.goto("/contactos");
  await expect(page.locator('a[href="tel:+543564439145"]')).toBeVisible();
  await expect(
    page.locator('a[href="https://wa.me/5493564200275"]'),
  ).toBeVisible();
  await expect(
    page.locator('a[href="mailto:prensa@sanfrancisco.gov.ar"]'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("cedulón PDF y pago simulado persistente", async ({ page }) => {
  await page.goto("/tributaria");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Cedulón PDF" }).first().click();
  const pdf = await download;
  expect(pdf.suggestedFilename()).toMatch(/^cedulon-DEMO-.*\.pdf$/);
  await pdf.saveAs("docs/ejemplos/cedulon-demo.pdf");
  await page
    .getByRole("button", { name: "Simular pago", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText("No se te cobrará dinero.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar pago simulado", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Simular pago", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("tab", { name: "Historial de pagos" }).click();
  await expect(page.getByText(/DEMO-/).first()).toBeVisible();
});

test("reclamo con adjunto, búsqueda y seguimiento persistente", async ({
  page,
}) => {
  await page.goto("/reclamos");
  await page.getByRole("button", { name: "Nuevo reclamo" }).click();
  await page.getByLabel("Dirección o referencia").fill("Belgrano 555");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("La luminaria de la esquina está apagada hace tres días.");
  await page.locator("input[type=file]").setInputFiles({
    name: "evidencia.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n evidencia de prueba"),
  });
  await page.getByRole("button", { name: "Registrar reclamo" }).click();
  await page
    .getByRole("textbox", { name: "Buscar reclamos" })
    .fill("Belgrano 555");
  const claim = page.locator("article.claim").first();
  await expect(claim).toContainText("recibido");
  await expect(claim).toContainText("evidencia.pdf");
  await claim
    .getByRole("button", { name: "Simular avance del reclamo" })
    .click();
  await expect(claim).toContainText("en curso");
  await page.reload();
  await page
    .getByRole("textbox", { name: "Buscar reclamos" })
    .fill("Belgrano 555");
  await expect(page.locator("article.claim")).toHaveCount(1);
  await page.locator("article.claim summary").click();
  await expect(
    page.getByText("Actualización del operador simulado."),
  ).toBeVisible();
});

test("estacionamiento con extensión, reloj y bloqueo de una patente inválida", async ({
  page,
}) => {
  await page.goto("/estacionamiento");
  await page.getByLabel("Patente", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Simular pago e iniciar" }).click();
  await page
    .getByRole("button", { name: "Confirmar pago simulado", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "patente argentina válida",
  );
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Patente", { exact: true }).fill("AB123CD");
  await page.getByRole("button", { name: "Simular pago e iniciar" }).click();
  await page
    .getByRole("button", { name: "Confirmar pago simulado", exact: true })
    .click();
  await expect(page.getByText("Sesión demo activa · AB123CD")).toBeVisible();
  await expect(page.getByLabel("Tiempo restante")).toContainText("00:59:");
  await page.getByLabel("Minutos para extender").selectOption("30");
  await page
    .getByRole("button", { name: "Extender tiempo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar pago simulado", exact: true })
    .click();
  await expect(page.getByLabel("Tiempo restante")).toContainText("01:29:");
  await page.reload();
  await expect(page.getByText("Sesión demo activa · AB123CD")).toBeVisible();
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Simular pago e iniciar" }),
  ).toBeVisible();
});

test("alarmas por zona, disponibilidad de bicicletas y preferencias", async ({
  page,
}) => {
  await page.goto("/bicicletas");
  await page.getByRole("button", { name: "Simular disponibilidad" }).click();
  await page.getByRole("button", { name: /Plaza Cívica/ }).click();
  await page
    .getByLabel("¿Qué ocurrió?")
    .fill("El anclaje número tres no libera la bicicleta.");
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(
    page.getByText("El anclaje número tres no libera la bicicleta."),
  ).toBeVisible();
  await page.goto("/alarmas");
  await page
    .getByRole("button", { name: "Simular activación", exact: true })
    .first()
    .click();
  await page.goto("/notificaciones");
  await expect(
    page.getByRole("heading", { name: "Alarma activada · Simulación" }),
  ).toBeVisible();
  await page.getByLabel("Obras públicas", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Generar aviso de obras demo" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Obras de mejora en el Centro · Demo" }),
  ).toHaveCount(0);
  await page.getByLabel("Obras públicas", { exact: true }).check();
  await page
    .getByRole("button", { name: "Generar aviso de obras demo" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Obras de mejora en el Centro · Demo" }),
  ).toBeVisible();
});

test("PWA, mapa con atribución y recarga offline después de instalar el caché", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["notifications"], {
    origin: "http://127.0.0.1:4173",
  });
  await page.goto("/bicicletas");
  await expect(page.locator(".leaflet-control-attribution")).toContainText(
    "OpenStreetMap",
  );
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) throw new Error("Sin worker activo");
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).display).toBe("standalone");
  expect((await page.request.get("/pwa-192.png")).ok()).toBe(true);
  await page.goto("/notificaciones");
  await page.getByRole("button", { name: "Probar aviso local" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Notificación local enviada",
  );
  expect(
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return (await reg.getNotifications()).length;
    }),
  ).toBe(1);
  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Tu ciudad/ })).toBeVisible();
  await expect(page.getByText("Sin conexión.", { exact: false })).toBeVisible();
});

test("capturas móvil y escritorio", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Tu ciudad/ })).toBeVisible();
  await page.screenshot({
    path: "docs/capturas/inicio-movil.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "docs/capturas/inicio-escritorio.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/estacionamiento");
  await expect(
    page.getByRole("heading", { name: "Estacionamiento medido" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/capturas/estacionamiento-movil.png",
    fullPage: true,
  });
});
