# Bootstrap del harness independiente de auditoría Nüva One
# Ejecutar desde PowerShell donde Hermes tenga GitHub CLI autenticado.
# No modifica el repositorio principal ni instala dependencias en Nüva One.
[CmdletBinding()]
param(
  [string]$AuditPath = (Join-Path $HOME "Documents\nuva-one-product-audit"),
  [string]$GitHubRepo = "martinaburtoe-art/nuva-one-product-audit",
  [string]$NuvaRepoPath = (Join-Path $HOME "Documents\nuva-one")
)
$ErrorActionPreference = "Stop"
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "GitHub CLI no está instalado." }
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "Node.js y npm son necesarios." }
gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) { throw "GitHub CLI no tiene sesión autenticada." }
if (Test-Path $AuditPath) { throw "La ruta ya existe; no se sobrescribirá: $AuditPath" }
$skillPath = Join-Path $NuvaRepoPath ".hermes\skills\nuva-product-experience-audit\SKILL.md"
if (-not (Test-Path $skillPath)) { throw "Sincroniza primero la rama de auditoría y verifica la skill: $skillPath" }
New-Item -ItemType Directory -Path $AuditPath -Force | Out-Null
Push-Location $AuditPath
try {
  git init -b main
  if ($LASTEXITCODE -ne 0) { throw "git init falló." }
  npm init -y
  if ($LASTEXITCODE -ne 0) { throw "npm init falló." }
  npm install --save-dev @playwright/test @axe-core/playwright @lhci/cli typescript
  if ($LASTEXITCODE -ne 0) { throw "Instalación de herramientas falló." }
  npm pkg set "scripts.test=playwright test" "scripts.report=playwright show-report" "scripts.lighthouse=lhci autorun"
  New-Item -ItemType Directory -Path "tests","artifacts\playwright-report","artifacts\lighthouse","skills\nuva-product-experience-audit" -Force | Out-Null
  Copy-Item $skillPath "skills\nuva-product-experience-audit\SKILL.md"

  @'
import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.NUVA_BASE_URL;
if (!baseURL) throw new Error("Define NUVA_BASE_URL con la URL de preview autorizada.");
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { outputFolder: "artifacts/playwright-report", open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", video: "retain-on-failure" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["iPhone 13"] } },
  ],
});
'@ | Set-Content -Encoding utf8 "playwright.config.ts"

  @'
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("landing pública carga y muestra CTA", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("link", { name: /Empezar gratis/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /Navegación principal/i })).toBeVisible();
});
test("landing no presenta violaciones críticas o serias de axe", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""));
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
'@ | Set-Content -Encoding utf8 "tests\public-smoke.spec.ts"

  @'
# Nüva One Product Audit Harness
Repositorio independiente para experiencia, accesibilidad y rendimiento. No contiene código de producto ni credenciales.
## Requisitos
Node.js LTS, Git, GitHub CLI autenticado y URL de preview autorizada.
## Uso
$env:NUVA_BASE_URL="https://preview-autorizada"
npm ci
npx playwright install chromium
npm test
npm run report
npm run lighthouse
Las pruebas iniciales son read-only. No automatizar ventas, pagos, invitaciones ni mutaciones reales sin tenant demo aislado.
'@ | Set-Content -Encoding utf8 "README.md"

  @'
module.exports = {
  ci: {
    collect: { url: [process.env.NUVA_BASE_URL], numberOfRuns: 3, settings: { preset: "desktop" } },
    assert: { preset: "lighthouse:recommended" },
    upload: { target: "filesystem", outputDir: "artifacts/lighthouse" },
  },
};
'@ | Set-Content -Encoding utf8 "lighthouserc.cjs"

  git add .
  git commit -m "chore: bootstrap isolated Nüva One product audit harness"
  if ($LASTEXITCODE -ne 0) { throw "Commit inicial falló." }
  gh repo create $GitHubRepo --private --source . --remote origin --push
  if ($LASTEXITCODE -ne 0) { throw "No se pudo crear/publicar el repositorio privado. Verifica si ya existe y revisa gh auth." }
  Write-Host "Harness creado: https://github.com/$GitHubRepo"
  Write-Host "Ruta local: $AuditPath"
}
finally { Pop-Location }
