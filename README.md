# Northline Shop — Architecture Modernisation

Northline Shop is an online retailer in Riyadh. One legacy system from 2011, **NorthlineCore**, handles catalog, cart, checkout, stock, and shipping. This repo is the 5-day lab: we split that system apart, one boundary at a time.

| | |
|---|---|
| **Runtime** | Docker Desktop only. Node, Redis, nginx, PlantUML, and k6 run as containers. |
| **Days** | Day 0 Setup · Day 1 See the system · Day 2 Design the split · Day 3 Connect · Day 4 Scale and survive · Day 5 Modernise and govern |
| **OS** | Windows (PowerShell) · macOS (Terminal / zsh or bash) |

> Run **one block at a time**. Do not paste this whole file into a terminal.  
> Every command below assumes your current folder is `northline-arch`.  
> Put **one command on each line**. Do not join lines with `&&` — Windows PowerShell 5 rejects it.

---

## Table of contents

1. [Repository layout](#repository-layout)
2. [Security rule](#security-rule-we-never-break)
3. [How to read the commands](#how-to-read-the-commands)
4. [Day 0 — Setup](#day-0--setup)
5. [Day 1 — See the system](#day-1--see-the-system)
6. [Day 2 — Design the split](#day-2--design-the-split)
7. [Day 3 — Connect](#day-3--connect)
8. [Day 4 — Scale and survive](#day-4--scale-and-survive)
9. [Day 5 — Modernise and govern](#day-5--modernise-and-govern)
10. [Clean up](#clean-up)
11. [Friday checklist](#friday-checklist)

---

## Repository layout

| Path | Purpose | Day |
|------|---------|-----|
| `docs/` | Diagrams and written decisions | 1–2 |
| `docs/adr/` | Architecture Decision Records | 1, 3 |
| `docs/slo/` | Service level objective | 4 |
| `api/` | OpenAPI contract between teams | 3 |
| `services/catalog/` | Catalog service | 3–4 |
| `services/checkout/` | Checkout code and event publisher | 2–3 |
| `services/warehouse/` | Event consumer | 3 |
| `gateway/` | Strangler Fig routes (nginx) | 5 |
| `load/` | k6 load test | 4 |
| `fitness/` | Automated architecture rule | 5 |
| `docker-compose.yml` | Starts the whole system | 3–5 |

---

## Security rule we never break

No real password, key, or token is ever written in a file here. Always use a placeholder such as `${DB_PASSWORD}`.

```text
DATABASE_URL=postgres://admin:${DB_PASSWORD}@db.northline.local:5432/shop
```

---

## How to read the commands

| Label | Use this if… |
|-------|----------------|
| **Windows** | You are on Windows. Paste into **PowerShell**. |
| **macOS** | You are on a Mac. Paste into **Terminal**. |
| **Both** | The same Docker command works on Windows and macOS. |

On Windows, HTTP checks use `curl.exe`. PowerShell’s `curl` is a different command and will not behave the same way.

Wait until Docker Desktop shows a green **Engine running** status before any `docker` command. `docker version` must print both a **Client** section and a **Server** section.

---

## Day 0 — Setup

Skip the install steps if Docker Desktop is already running. Skip the folder steps if you already cloned this repo.

### 0.1 Install Docker Desktop

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
winget --version

winget install -e --id Docker.DockerDesktop --source winget
```

If `winget` is missing: Microsoft Store → **App Installer** → Install or Update, or open [aka.ms/getwinget](https://aka.ms/getwinget). Close PowerShell and open a new window, then run `winget --version` again.

If Docker asks for WSL, open PowerShell as Administrator:

```powershell
wsl --install
```

Restart the PC, then continue.

</td>
<td width="50%" valign="top">

#### macOS

```bash
brew --version

brew install --cask docker
```

If `brew` is missing, install Homebrew, open a **new** Terminal, then install Docker:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install --cask docker
```

Open Docker Desktop once from Applications and finish the first-run setup.

</td>
</tr>
</table>

### 0.2 Start the engine

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
Start-Sleep -Seconds 20
docker version
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
open -a Docker
sleep 20
docker version
```

</td>
</tr>
</table>

### 0.3 Prove Docker works

**Both**

```bash
docker --version
docker compose version
docker run --rm alpine echo "Docker works on this laptop"
```

`docker compose` has a space, not a hyphen.

### 0.4 Pull images

**Both.** Do this once so later days do not wait on downloads.

```bash
docker pull alpine
docker pull plantuml/plantuml
docker pull node:20-alpine
docker pull docker.redpanda.com/redpandadata/redpanda:latest
docker pull redis:7-alpine
docker pull nginx:alpine
docker pull grafana/k6
```

The image name is `alpine`, not `alpino`.

### 0.5 Create the folder tree

Only if you are building the tree from scratch. If you cloned this repo, `cd` into it and skip this step.

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
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
cd ~
pwd

mkdir -p northline-arch/docs/adr \
  northline-arch/docs/slo \
  northline-arch/api \
  northline-arch/services/catalog \
  northline-arch/services/checkout \
  northline-arch/services/warehouse \
  northline-arch/gateway \
  northline-arch/load \
  northline-arch/fitness
cd northline-arch
find . -type d
```

</td>
</tr>
</table>

### 0.6 Prove Docker can see the folder

**Both**

```bash
docker run --rm -v "${PWD}:/work" -w /work alpine ls -la
```

---

## Day 1 — See the system

Files: `docs/context.puml`, `docs/adr/adr-001-catalog-owns-data.md`.

Stay inside `northline-arch`.

### 1.1 Render the context diagram

**Both**

```bash
docker run --rm -v "${PWD}:/work" -w /work alpine ls docs
docker run --rm -v "${PWD}:/work" -w /work plantuml/plantuml -tpng docs/context.puml
docker run --rm -v "${PWD}:/work" -w /work alpine ls -la docs
```

You should see `docs/context.png`.

### 1.2 Open the picture

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
Invoke-Item docs\context.png
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
open docs/context.png
```

</td>
</tr>
</table>

### 1.3 List today’s files

**Both**

```bash
docker run --rm -v "${PWD}:/work" -w /work alpine find docs -type f
```

---

## Day 2 — Design the split

Files: `docs/containers.puml`, `docs/context-map.md`, `services/checkout/order-service-before.js`, `services/checkout/payment.js`, `services/checkout/order-service-after.js`.

### 2.1 Render the container diagram

**Both**

```bash
docker run --rm -v "${PWD}:/work" -w /work plantuml/plantuml -tpng docs/containers.puml
docker run --rm -v "${PWD}:/work" -w /work alpine ls -la docs
```

### 2.2 Open the picture

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
Invoke-Item docs\containers.png
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
open docs/containers.png
```

</td>
</tr>
</table>

### 2.3 Run the messy checkout, then the refactor

The seven output lines must match.

**Both**

```bash
docker run --rm -v "${PWD}:/work" -w /work alpine ls services/checkout
docker run --rm -v "${PWD}:/work" -w /work node:20-alpine node services/checkout/order-service-before.js
docker run --rm -v "${PWD}:/work" -w /work node:20-alpine node services/checkout/order-service-after.js
```

<details>
<summary>Windows only — use this if <code>-v</code> hangs and never returns</summary>

Do not use a folder mount. Copy the file into a container instead.

```powershell
docker rm -f nl-run 2>$null
docker version
docker pull node:20-alpine
Get-Location
Get-Item .\services\checkout\order-service-before.js | Format-List FullName, Length

docker create --name nl-run -w /work node:20-alpine node /work/order-service-before.js
docker cp .\services\checkout\order-service-before.js nl-run:/work/order-service-before.js
docker start -a nl-run
docker rm nl-run
```

Or pipe the file in:

```powershell
Get-Content -Raw -Encoding utf8 .\services\checkout\order-service-before.js | docker run --rm -i node:20-alpine node
```

Repeat with `order-service-after.js` when you compare the refactor.

</details>

---

## Day 3 — Connect

Files: `api/openapi.yaml`, `services/catalog/`, `services/checkout/publisher.js`, `services/warehouse/`, `docker-compose.yml`.

### 3.1 Check Compose, then start

**Both**

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail 20 catalog
```

### 3.2 Call the catalog API

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
curl.exe http://localhost:8080/health
curl.exe http://localhost:8080/v1/items/NL-LAMP-07
curl.exe -i http://localhost:8080/v1/items/NL-NOPE-99
```

The last call is a 404. `-i` prints the status line.

</td>
<td width="50%" valign="top">

#### macOS

```bash
curl http://localhost:8080/health
curl http://localhost:8080/v1/items/NL-LAMP-07
curl -i http://localhost:8080/v1/items/NL-NOPE-99
```

The last call is a 404. `-i` prints the status line.

</td>
</tr>
</table>

### 3.3 Publish an event and watch Warehouse

Checkout is in a Compose profile, so it is not started by `up`. Build it, run it once, then read the warehouse log.

**Both**

```bash
docker compose up -d --build
docker compose logs --tail 10 warehouse
docker compose build checkout
docker compose run --rm checkout
docker compose logs --tail 10 warehouse
```

### 3.4 Catch-up: listener off, then on

**Both**

```bash
docker compose stop warehouse
docker compose run --rm checkout
docker compose run --rm checkout
docker compose logs --tail 5 warehouse
docker compose start warehouse
docker compose logs --tail 20 warehouse
```

The warehouse log after the restart should show the events that arrived while it was stopped.

---

## Day 4 — Scale and survive

Files: catalog cart code, Redis in `docker-compose.yml`, `load/checkout-load.js`, `docs/slo/checkout-slo.md`.

### 4.1 Three catalog copies

**Both**

```bash
docker compose down
docker compose up -d --build --scale catalog=3
docker compose ps
```

You should see three catalog rows.

### 4.2 Shared session in Redis

After the catalog containers are set to use Redis:

**Both**

```bash
docker compose up -d --scale catalog=3
docker compose logs --tail 6 catalog
```

### 4.3 Scale down, keep the cart, scale up

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
docker compose up -d --scale catalog=1
curl.exe http://localhost:8080/v1/cart/sara
docker compose up -d --scale catalog=3
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
docker compose up -d --scale catalog=1
curl http://localhost:8080/v1/cart/sara
docker compose up -d --scale catalog=3
```

</td>
</tr>
</table>

The cart is still there because Redis kept it.

### 4.4 Liveness and readiness

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
curl.exe http://localhost:8080/health
curl.exe http://localhost:8080/ready

docker compose stop redis
curl.exe http://localhost:8080/health
curl.exe -i http://localhost:8080/ready

docker compose start redis
```

`/health` stays OK. `/ready` fails while Redis is stopped, then recovers after `start`.

</td>
<td width="50%" valign="top">

#### macOS

```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready

docker compose stop redis
curl http://localhost:8080/health
curl -i http://localhost:8080/ready

docker compose start redis
```

`/health` stays OK. `/ready` fails while Redis is stopped, then recovers after `start`.

</td>
</tr>
</table>

### 4.5 Timeout and circuit breaker

Call shipping four times, quickly. The fourth call fails immediately.

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
curl.exe http://localhost:8080/v1/items/NL-LAMP-07/shipping
curl.exe http://localhost:8080/v1/items/NL-LAMP-07/shipping
curl.exe http://localhost:8080/v1/items/NL-LAMP-07/shipping
curl.exe http://localhost:8080/v1/items/NL-LAMP-07/shipping
docker compose logs --tail 12 catalog
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
curl http://localhost:8080/v1/items/NL-LAMP-07/shipping
curl http://localhost:8080/v1/items/NL-LAMP-07/shipping
curl http://localhost:8080/v1/items/NL-LAMP-07/shipping
curl http://localhost:8080/v1/items/NL-LAMP-07/shipping
docker compose logs --tail 12 catalog
```

</td>
</tr>
</table>

### 4.6 Load test with k6

**Both**

```bash
docker network ls
docker run --rm -i --network northline-arch_default -v "${PWD}/load:/scripts" grafana/k6 run /scripts/checkout-load.js
```

This takes about 60 seconds. The network name ends with `_default`. If `docker network ls` shows a different name, use that name after `--network`.

---

## Day 5 — Modernise and govern

Files: `gateway/nginx.conf`, `gateway/legacy.conf`, `fitness/no-shared-db.js`.

### 5.1 Start the gateway and prove the route

**Both**

```bash
docker compose up -d --scale catalog=3
docker compose ps
```

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
curl.exe -i http://localhost:8000/v1/items/NL-LAMP-07
curl.exe -i http://localhost:8000/cart
```

`/v1/items/...` is the new catalog. `/cart` is still the old system. The response headers show which route answered.

</td>
<td width="50%" valign="top">

#### macOS

```bash
curl -i http://localhost:8000/v1/items/NL-LAMP-07
curl -i http://localhost:8000/cart
```

`/v1/items/...` is the new catalog. `/cart` is still the old system. The response headers show which route answered.

</td>
</tr>
</table>

### 5.2 Undo in one reload

After you point the product route back at the old system in `gateway/nginx.conf`:

**Both**

```bash
docker compose exec gateway nginx -t
docker compose exec gateway nginx -s reload
```

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
curl.exe -i http://localhost:8000/v1/items/NL-LAMP-07
```

</td>
<td width="50%" valign="top">

#### macOS

```bash
curl -i http://localhost:8000/v1/items/NL-LAMP-07
```

</td>
</tr>
</table>

`nginx -t` must say the config is ok before `reload`. The product path now answers from the old system.

### 5.3 Fitness function: fail, fix, pass

The first run is expected to fail while the bad import is still in the warehouse file.

**Both**

```bash
docker run --rm -v "${PWD}:/work" -w /work node:20-alpine node fitness/no-shared-db.js
```

<table>
<tr>
<td width="50%" valign="top">

#### Windows

```powershell
echo $LASTEXITCODE
```

`1` means fail. After you replace the bad import with the good version, run the test again and read the code immediately:

```powershell
docker run --rm -v "${PWD}:/work" -w /work node:20-alpine node fitness/no-shared-db.js
echo $LASTEXITCODE
```

`0` means pass.

</td>
<td width="50%" valign="top">

#### macOS

```bash
echo $?
```

`1` means fail. Read `$?` immediately — the next command replaces it. After you replace the bad import with the good version:

```bash
docker run --rm -v "${PWD}:/work" -w /work node:20-alpine node fitness/no-shared-db.js
echo $?
```

`0` means pass.

</td>
</tr>
</table>

---

## Clean up

**Both.** Your project files stay on disk.

```bash
docker compose down
```

To delete unused images as well (nothing in this folder is deleted):

```bash
docker system prune -a -f
```

---

## Friday checklist

- [ ] `docs/context.puml` and `docs/context.png`
- [ ] `docs/adr/adr-001-catalog-owns-data.md`
- [ ] `docs/containers.puml` and `docs/containers.png`
- [ ] `docs/context-map.md`
- [ ] `api/openapi.yaml`
- [ ] Catalog, checkout, and warehouse services running with Compose
- [ ] `docs/adr/adr-002-events-for-stock.md`
- [ ] Three catalog copies, Redis session, k6 load test
- [ ] `docs/slo/checkout-slo.md`
- [ ] `gateway/nginx.conf` routes new traffic and can roll back in one reload
- [ ] `fitness/no-shared-db.js` exits `0`
