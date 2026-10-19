# Northline Shop — Architecture Modernisation

Northline Shop is an online retailer in Riyadh.
One old system from 2011, called NorthlineCore, does catalog, cart,
checkout, stock and shipping. We are splitting it apart, carefully.

## How to run anything here

The only tool you need is Docker Desktop.
Nothing else is installed on your machine.

## What lives where

- docs/      diagrams and written decisions
- api/       the written promise between teams (OpenAPI)
- services/  the new small services (catalog, checkout, warehouse)
- gateway/   the traffic policeman that routes old and new
- load/      the load test
- fitness/   automatic tests of our architecture rules

## Rule we never break

No real password, key or token is ever written in a file here.
We always write a placeholder such as ${DB_PASSWORD} instead.
DATABASE_URL=postgres://admin:${DB_PASSWORD}@db.northline.local:5432/shop

################################################################################
# NORTHLINE — Day 0 + Day 1 — ALL COMMANDS (Windows PowerShell)
# Copy blocks one section at a time into PowerShell. Run from top to bottom.
# Do NOT paste the whole file at once (file contents are not PowerShell).
################################################################################


#==============================================================================
# SECTION A — INSTALL TOOLS
#==============================================================================

winget --version

winget install -e --id Docker.DockerDesktop --source winget
winget install --id Git.Git --accept-source-agreements --accept-package-agreements
winget install --id Microsoft.VisualStudioCode --accept-source-agreements --accept-package-agreements
winget install --id EclipseAdoptium.Temurin.21.JDK --accept-source-agreements --accept-package-agreements
winget install --id jqlang.jq --accept-source-agreements --accept-package-agreements

# If winget is missing: Microsoft Store → App Installer → Install/Update
# Or open: https://aka.ms/getwinget
# Then CLOSE PowerShell and open a NEW one.

# If Docker asks for WSL (run PowerShell as Administrator):
# wsl --install
# Then restart the PC.


#==============================================================================
# SECTION B — START DOCKER AND PROVE IT WORKS
#==============================================================================

Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
Start-Sleep -Seconds 20
docker version
docker --version
docker compose version
docker run --rm alpine echo "Docker works on this laptop"

# Wait until Docker Desktop shows green "Engine running" before continuing.


#==============================================================================
# SECTION C — PULL IMAGES EARLY (optional but recommended)
#==============================================================================

docker pull alpine
docker pull plantuml/plantuml
docker pull node:20-alpine
docker pull docker.redpanda.com/redpandadata/redpanda:latest
docker pull redis:7-alpine
docker pull nginx:alpine
docker pull grafana/k6


#==============================================================================
# SECTION D — CREATE PROJECT FOLDERS
#==============================================================================

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


#==============================================================================
# SECTION E — CREATE FILES
# Run each notepad line, paste the matching content below, Save, close.
# Or open VS Code with:  code .
#==============================================================================

notepad README.md
notepad docs\context.puml
notepad docs\adr\adr-001-catalog-owns-data.md


# ----- FILE 1: README.md -----
# Paste everything between the lines into README.md
# ---------- START README.md ----------
# Northline Shop — Architecture Modernisation

Northline Shop is an online retailer in Riyadh.
One old system from 2011, called NorthlineCore, does catalog, cart,
checkout, stock and shipping. We are splitting it apart, carefully.

## How to run anything here

The only tool you need is Docker Desktop.
Nothing else is installed on your machine.

## What lives where

- docs/      diagrams and written decisions
- api/       the written promise between teams (OpenAPI)
- services/  the new small services (catalog, checkout, warehouse)
- gateway/   the traffic policeman that routes old and new
- load/      the load test
- fitness/   automatic tests of our architecture rules

## Rule we never break

No real password, key or token is ever written in a file here.
We always write a placeholder such as ${DB_PASSWORD} instead.
# ---------- END README.md ----------


# ----- FILE 2: docs/context.puml -----
# Paste everything between the lines into docs/context.puml
# ---------- START context.puml ----------
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
# ---------- END context.puml ----------


# ----- FILE 3: docs/adr/adr-001-catalog-owns-data.md -----
# Paste everything between the lines into docs/adr/adr-001-catalog-owns-data.md
# ---------- START adr-001-catalog-owns-data.md ----------
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
# ---------- END adr-001-catalog-owns-data.md ----------


#==============================================================================
# SECTION F — DAY 1 RENDER AND CHECK
# Make sure you are still inside the northline-arch folder.
#==============================================================================

docker run --rm -v "${PWD}:/work" -w /work alpine ls docs
docker run --rm -v "${PWD}:/work" -w /work plantuml/plantuml -tpng docs/context.puml
docker run --rm -v "${PWD}:/work" -w /work alpine ls -la docs
Invoke-Item docs\context.png
docker run --rm -v "${PWD}:/work" -w /work alpine find docs -type f


#==============================================================================
# DONE — you should see these files:
#   docs/context.puml
#   docs/context.png
#   docs/adr/adr-001-catalog-owns-data.md
#
# TIP: image name is alpine (NOT alpino)
#==============================================================================
