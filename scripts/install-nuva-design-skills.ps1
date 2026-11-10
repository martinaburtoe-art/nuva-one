[CmdletBinding()]
param(
  [switch]$SkipImpeccableEngine
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
  throw "Run this installer from a Nüva One Git checkout."
}

$node = Get-Command node -ErrorAction SilentlyContinue
$npx = Get-Command npx -ErrorAction SilentlyContinue
if (-not $node -or -not $npx) {
  throw "Node.js and npx are required. Install/enable Node.js, then rerun this script."
}

$nodeVersion = (& node -p "process.versions.node").Trim()
$parts = $nodeVersion.Split(".")
$major = [int]$parts[0]
$minor = [int]$parts[1]
if ($major -lt 22 -or ($major -eq 22 -and $minor -lt 20)) {
  throw "The current skills CLI requires Node.js 22.20 or newer. Detected: $nodeVersion"
}

Push-Location $repoRoot
try {
  Write-Host "Installing Nüva One design skills into this project for Hermes..." -ForegroundColor Cyan

  if (-not $SkipImpeccableEngine) {
    Write-Host ""
    Write-Host "[1/8] Impeccable engine, Hermes integration and design checks" -ForegroundColor Yellow
    & npx --yes impeccable@latest install --providers=hermes --scope=project
    if ($LASTEXITCODE -ne 0) {
      throw "Impeccable installer failed with exit code $LASTEXITCODE. No other skills were installed by this script."
    }
  }

  $skills = @(
    @{ Repo = "Leonxlnx/taste-skill"; Name = "design-taste-frontend"; Label = "Taste Skill" },
    @{ Repo = "Nutlope/hallmark"; Name = "hallmark"; Label = "Hallmark" },
    @{ Repo = "nextlevelbuilder/ui-ux-pro-max-skill"; Name = "ui-ux-pro-max"; Label = "UI UX Pro Max" },
    @{ Repo = "dominikmartn/hue"; Name = "hue"; Label = "Hue" },
    @{ Repo = "google-labs-code/stitch-skills"; Name = "stitch::extract-design-md"; Label = "Extract DESIGN.md (Google Stitch)" },
    @{ Repo = "shadcn-ui/ui"; Name = "shadcn"; Label = "shadcn/ui" },
    @{ Repo = "dammyjay93/interface-design"; Name = "interface-design"; Label = "Interface Design" },
    @{ Repo = "jakubkrehel/skills"; Name = "better-typography"; Label = "Better Typography" }
  )

  $index = 1
  foreach ($skill in $skills) {
    Write-Host ""
    Write-Host ("[{0}/8] {1}" -f $index, $skill.Label) -ForegroundColor Yellow
    & npx --yes skills@latest add $skill.Repo --skill $skill.Name --agent hermes --yes
    if ($LASTEXITCODE -ne 0) {
      throw ("Install failed for {0} ({1}/{2}); inspect the output and rerun after correcting it." -f $skill.Label, $skill.Repo, $skill.Name)
    }
    $index++
  }

  $aliasDir = Join-Path $repoRoot ".hermes/skills/frontend-design"
  New-Item -ItemType Directory -Force -Path $aliasDir | Out-Null
  $aliasPath = Join-Path $aliasDir "SKILL.md"
  if (-not (Test-Path $aliasPath)) {
    @'
---
name: frontend-design
description: Compatibility entry point for Nüva One frontend design. The current canonical successor is impeccable.
---

# Frontend Design compatibility alias

Route all frontend design work through the Nüva One orchestration skill and the canonical impeccable skill. The older standalone frontend-design guidance has been consolidated into impeccable; do not install a second conflicting copy.
'@ | Set-Content -Path $aliasPath -Encoding utf8
  }

  Write-Host ""
  Write-Host "Installation commands completed." -ForegroundColor Green
  Write-Host "Next: run 'hermes skills trust' from this repository, restart Hermes in this checkout, and verify with 'hermes skills list'."
  Write-Host "Then run the extract-design-md skill to generate/update DESIGN.md from the actual source."
}
finally {
  Pop-Location
}
