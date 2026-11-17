import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "e2e@flowdent.local";
const SENHA = process.env.E2E_SENHA ?? "e2e-senha-forte-123";

async function entrar(page: Page) {
  await page.goto("/auth");
  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-password").fill(SENHA);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });
}

test.describe("fluxos críticos", () => {
  test("a guarda de rota barra quem não entrou", async ({ page }) => {
    // Regressão travada de propósito: o histórico do repositório registra um
    // link de recuperação que caía direto no painel de admin.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  });

  test("entrar leva ao painel", async ({ page }) => {
    await entrar(page);
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  });

  test("a agenda abre", async ({ page }) => {
    await entrar(page);
    await page.goto("/dashboard/agenda");
    await expect(page.locator("body")).not.toBeEmpty();
    await expect(page.getByText(/agenda/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("o prontuário abre e enxerga o paciente semeado", async ({ page }) => {
    await entrar(page);
    await page.goto("/dashboard/prontuario");
    await expect(page.getByText(/Paciente Semeado E2E/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("o financeiro abre", async ({ page }) => {
    await entrar(page);
    await page.goto("/dashboard/financeiro");
    await expect(page.getByText(/financeiro|receber|pagar/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("nenhuma tela crítica quebra no console", async ({ page }) => {
    const erros: string[] = [];
    page.on("pageerror", (e) => erros.push(e.message));
    await entrar(page);
    for (const rota of ["/dashboard", "/dashboard/agenda", "/dashboard/financeiro"]) {
      await page.goto(rota);
      await page.waitForTimeout(1200);
    }
    expect(erros, `erros de runtime: ${erros.join(" | ")}`).toHaveLength(0);
  });
});
