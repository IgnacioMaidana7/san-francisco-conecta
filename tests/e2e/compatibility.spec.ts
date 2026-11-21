import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("pantallas, menú móvil y accesibilidad de servicios", async ({ page }) => {
  for (const [path, title] of [
    ["/", "Tu ciudad."],
    ["/bicicletas", "Bicicletas públicas"],
    ["/tributaria", "Mis impuestos"],
    ["/reclamos", "Centro de reclamos"],
    ["/contactos", "Atención al vecino"],
    ["/alarmas", "Alarmas comunitarias"],
    ["/estacionamiento", "Estacionamiento medido"],
    ["/notificaciones", "Notificaciones"],
  ]) {
    await page.goto(path);
    await expect(
      page
        .getByRole("heading", { name: new RegExp(title.replace(".", "\\.")) })
        .first(),
    ).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page.getByRole("button", { name: "Servicios", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Todos los servicios" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Mis impuestos" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mis impuestos", exact: true }),
  ).toBeVisible();
});
