# Northline Shop — Architecture Modernisation

Northline Shop is an online retailer in Riyadh. One legacy system from 2011, **NorthlineCore**, handles catalog, cart, checkout, stock, and shipping. This repo documents how we split that system apart — carefully, one boundary at a time.

| | |
|---|---|
| **Runtime** | Docker Desktop only — nothing else is installed on your machine |
| **Audience** | Engineers following Day 0 + Day 1 of the Northline lab |
| **OS** | Windows (PowerShell) · macOS (Terminal / zsh) |

> **Pick your OS for each section.**  
> Do not paste this entire file into a terminal. Run one block at a time, from top to bottom.

---

## Table of contents

1. [Repository layout](#repository-layout)
2. [Security rule](#security-rule-we-never-break)
3. [Day 0 + Day 1 commands](#day-0--day-1-commands)
   - [A — Install tools](#a--install-tools)
   - [B — Start Docker](#b--start-docker-and-prove-it-works)
   - [C — Pull images](#c--pull-images-early-optional)
   - [D — Create project folders](#d--create-project-folders)
   - [E — Create files](#e--create-files)
   - [F — Render and check](#f--day-1-render-and-check)
4. [Done checklist](#done-checklist)

---

## Repository layout

| Path | Purpose |
|------|---------|
| `docs/` | Diagrams and written decisions |
| `docs/adr/` | Architecture Decision Records |
| `docs/slo/` | Service level objectives |
| `api/` | Shared contracts between teams (OpenAPI) |
| `services/` | New small services — catalog, checkout, warehouse |
| `gateway/` | Routes traffic between old and new systems |
| `load/` | Load tests |
| `fitness/` | Automated checks for architecture rules |

---

## Security rule we never break

No real password, key, or token is ever written in a file here. Always use a placeholder such as `${DB_PASSWORD}`.

```text
DATABASE_URL=postgres://admin:${DB_PASSWORD}@db.northline.local:5432/shop
```

---

## Day 0 + Day 1 commands

Every section has **two tabs of commands**:

| Label | Use this if… |
|-------|----------------|
| **Windows** | You are on Windows — copy into **PowerShell** |
| **macOS** | You are on a Mac — copy into **Terminal** (zsh/bash) |

Docker commands that are identical on both platforms are shown once under **Both platforms**.

---

### A — Install tools

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
winget --version

winget install -e --id Docker.DockerDesktop --source winget
winget install --id Git.Git --accept-source-agreements --accept-package-agreements
winget install --id Microsoft.VisualStudioCode --accept-source-agreements --accept-package-agreements
winget install --id EclipseAdoptium.Temurin.21.JDK --accept-source-agreements --accept-package-agreements
winget install --id jqlang.jq --accept-source-agreements --accept-package-agreements
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
# Install Homebrew if you do not have it yet
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew --version

brew install --cask docker
brew install git
brew install --cask visual-studio-code
brew install --cask temurin@21
brew install jq
```

</td>
</tr>
</table>

<details>
<summary>Troubleshooting</summary>

**Windows**

- **winget missing** → Microsoft Store → *App Installer* → Install/Update, or open [aka.ms/getwinget](https://aka.ms/getwinget). Then close PowerShell and open a new one.
- **Docker asks for WSL** → run PowerShell as Administrator, then:

  ```powershell
  wsl --install
  ```

  Restart the PC afterwards.

**macOS**

- After installing Homebrew on Apple Silicon, follow the “Next steps” it prints (usually adding `brew` to your `PATH`), then open a **new** Terminal window.
- After installing Docker Desktop, open it once from Applications and finish the first-run setup.
- If `code` is not found after installing VS Code: open VS Code → Command Palette → **Shell Command: Install 'code' command in PATH**.

</details>

---

### B — Start Docker and prove it works

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
Start-Sleep -Seconds 20
docker version
docker --version
docker compose version
docker run --rm alpine echo "Docker works on this laptop"
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
open -a Docker
sleep 20
docker version
docker --version
docker compose version
docker run --rm alpine echo "Docker works on this laptop"
```

</td>
</tr>
</table>

Wait until Docker Desktop shows a green **Engine running** status before continuing.

---

### C — Pull images early (optional)

Recommended so later steps are faster. **Same commands on Windows and macOS.**

```bash
docker pull alpine
docker pull plantuml/plantuml
docker pull node:20-alpine
docker pull docker.redpanda.com/redpandadata/redpanda:latest
docker pull redis:7-alpine
docker pull nginx:alpine
docker pull grafana/k6
```

> Tip: the image name is `alpine` — not `alpino`.

---

### D — Create project folders

If you already cloned this repo, you can skip this section — the folders are already present.

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
cd $HOME
Get-Location

New-Item -ItemType Directory -Force -Path "northline-arch" | Out-Null
Set-Location "northline-arch"
New-Item -ItemType Directory -Force -Path "docs" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/adr" | Out-Null
New-Item -ItemType Directory -Force -Path "docs/slo" | Out-Null
New-Item -ItemType Directory -Force -Path "api" | Out-Null
New-Item -ItemType Directory -Force -Path "services/catalog" | Out-Null
New-Item -ItemType Directory -Force -Path "services/checkout" | Out-Null
New-Item -ItemType Directory -Force -Path "services/warehouse" | Out-Null
New-Item -ItemType Directory -Force -Path "gateway" | Out-Null
New-Item -ItemType Directory -Force -Path "load" | Out-Null
New-Item -ItemType Directory -Force -Path "fitness" | Out-Null
Get-ChildItem -Recurse -Directory | Select-Object -ExpandProperty FullName

docker run --rm -v "${PWD}:/work" -w /work alpine ls -la
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
cd ~
pwd

mkdir -p northline-arch
cd northline-arch
mkdir -p docs/adr docs/slo api \
  services/catalog services/checkout services/warehouse \
  gateway load fitness
find "$(pwd)" -type d

docker run --rm -v "${PWD}:/work" -w /work alpine ls -la
```

</td>
</tr>
</table>

---

### E — Create files

Open the project in an editor, then create (or review) these three files:

| File | What it is |
|------|------------|
| `README.md` | This document |
| `docs/context.puml` | C4 Level 1 system context diagram |
| `docs/adr/adr-001-catalog-owns-data.md` | First architecture decision |

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
code .

notepad README.md
notepad docs\context.puml
notepad docs\adr\adr-001-catalog-owns-data.md
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
code .

# Or open with TextEdit / default editor:
open -e README.md
open -e docs/context.puml
open -e docs/adr/adr-001-catalog-owns-data.md
```

</td>
</tr>
</table>

<details>
<summary>File contents — context.puml</summary>

Paste into `docs/context.puml`:

```plantuml
' Everything after a single quote is a comment. PlantUML ignores it.
' A diagram always starts with @startuml and a name.
@startuml context

' Load the C4 shapes for a Level 1 context diagram.
' The angle brackets mean "take it from the library already inside PlantUML".
' So this works with no internet connection.
!include <C4/C4_Context>

' Give the picture a title that a manager can read.
title Northline Shop - System Context (C4 Level 1)

' Put a small legend at the bottom explaining the colours.
LAYOUT_WITH_LEGEND()

' A Person is a human being who uses the system.
' The three parts are: short id, name on the box, description under the name.
Person(shopper, "Shopper", "Buys home products on the Northline website")
Person(warehouse_staff, "Warehouse Staff", "Picks and packs the orders in Riyadh")

' A System is a thing we own and can change.
System(northline_core, "NorthlineCore", "The 2011 system. Does catalog, cart, checkout, stock and shipping, all in one program.")

' A System_Ext is a system somebody else owns. We cannot change it.
System_Ext(payment_gateway, "Payment Gateway", "Takes the card payment and confirms it")
System_Ext(shipping_partner, "Shipping Partner", "Delivers the box to the shopper's address")
System_Ext(erp, "Finance ERP", "The accounting system used by the finance department")

' Rel means relationship. It draws an arrow from the first id to the second id.
' The text is what the arrow does, written from the caller's point of view.
Rel(shopper, northline_core, "Browses products, adds to cart, pays")
Rel(warehouse_staff, northline_core, "Reads the pick list, marks items as packed")
Rel(northline_core, payment_gateway, "Asks to charge the card", "HTTPS")
Rel(northline_core, shipping_partner, "Sends the delivery request", "HTTPS")
Rel(northline_core, erp, "Sends the daily sales file", "SFTP, nightly")

' Every diagram must be closed with @enduml.
@enduml
```

</details>

<details>
<summary>File contents — ADR-001</summary>

Paste into `docs/adr/adr-001-catalog-owns-data.md`:

```markdown
# ADR-001: The Catalog service owns product data

Date: 2026-03-02
Deciders: Head of Engineering, Lead Architect, Catalog Team Lead

## Context

NorthlineCore is one program written in 2011. Every part of it reads and
writes the same database tables directly.

Four teams currently write to the `products` table: catalog, checkout,
warehouse and marketing. Nobody knows which team last changed a column.
Twice in the last year a change made by one team broke another team on
the same afternoon.

We want to split NorthlineCore into smaller services. The first candidate
is the catalog, because it is mostly read-only traffic and it has the
clearest boundary.

We cannot split anything while four teams write to the same table.

## Decision

The Catalog service is the only component allowed to read or write the
product tables. Every other component must ask the Catalog service through
its published API. No other service connects to the catalog database.

## Consequences

What gets better:

- One team owns the product data model. Changes are safe to review.
- The catalog database can be moved, resized or replaced without
  telling the other three teams.
- The boundary is now testable. We can write an automated check that
  fails the build if another service imports the catalog database.

What gets worse:

- Checkout can no longer join product rows to order rows in one query.
  It must call the Catalog API and hold the result. This is more code
  and it is slower.
- If the Catalog service is down, checkout cannot show product names.
  We must design a fallback and accept degraded pages.
- The migration is not free. Three call sites in NorthlineCore must be
  rewritten before we can enforce the rule.

## Status

Accepted.

Enforced from Day 5 by the automated check in `fitness/no-shared-db.js`.
```

</details>

---

### F — Day 1 render and check

Stay inside the `northline-arch` folder, then run:

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
docker run --rm -v "${PWD}:/work" -w /work alpine ls docs
docker run --rm -v "${PWD}:/work" -w /work plantuml/plantuml -tpng docs/context.puml
docker run --rm -v "${PWD}:/work" -w /work alpine ls -la docs
Invoke-Item docs\context.png
docker run --rm -v "${PWD}:/work" -w /work alpine find docs -type f
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
docker run --rm -v "${PWD}:/work" -w /work alpine ls docs
docker run --rm -v "${PWD}:/work" -w /work plantuml/plantuml -tpng docs/context.puml
docker run --rm -v "${PWD}:/work" -w /work alpine ls -la docs
open docs/context.png
docker run --rm -v "${PWD}:/work" -w /work alpine find docs -type f
```

</td>
</tr>
</table>

This renders `docs/context.puml` to `docs/context.png` and opens the image.

---

## Done checklist

You should have these files:

- [x] `docs/context.puml`
- [x] `docs/context.png`
- [x] `docs/adr/adr-001-catalog-owns-data.md`

Next: continue with Day 2 once the context diagram opens cleanly on your machine.
