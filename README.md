# Sales Tracker — Field App (PWA)

Offline-first sales, stocktake, container tracking, and market survey app for
field sales teams. Runs entirely in the browser/device — no server, no
database, no internet connection required after the first load. Deployable
to Vercel as a static-ish Next.js app.

## What changed from the original native-Android spec

This is a **web app (PWA)**, not a native Android build, so it can be hosted
on Vercel. The architecture maps over directly:

| Original (Android) | This app (Web) |
|---|---|
| Room + SQLCipher | Dexie.js over IndexedDB (all data stays on-device, in the browser) |
| Wi-Fi Direct / Bluetooth transfer | Manual JSON export/import (Sync tab) — share the file via Bluetooth, USB, WhatsApp, email, anything |
| Kotlin / Jetpack Compose | Next.js 14 (App Router) + TypeScript + Tailwind |
| Installed APK | "Add to Home Screen" — installs like a native app, works offline, has its own icon |

Everything else — the 5 modules, the 10-table schema, the reorder/slow-moving
alert logic, the last-write-wins + manual conflict review sync strategy — is
implemented as specified.

**One real limitation to know about:** browsers cannot do true background
Wi-Fi Direct device-to-device sync the way a native Android app can. Sync
here is manual file export/import (a JSON file you export from one phone and
import on another). This is actually what the original spec's "manual
export/import" fallback already described — it's now the *only* sync path
rather than a fallback.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

**Option A — from your computer:**
```bash
npm install -g vercel
vercel
```
Follow the prompts. Vercel auto-detects Next.js — no config needed.

**Option B — from GitHub (recommended for ongoing updates):**
1. Push this folder to a new GitHub repo.
2. Go to vercel.com → New Project → import that repo.
3. Leave all settings at their defaults and click Deploy.

## Installing on a field device (Android)

1. Open the deployed Vercel URL in Chrome on the phone.
2. Tap the menu (⋮) → **Add to Home screen** / **Install app**.
3. Launch it from the home screen icon from then on — it opens full-screen
   and works with the phone in airplane mode.

## Using Sync across devices

1. Each Sales Officer / Warehouse Admin / Manager opens the app on their own
   phone and picks a name + role on first launch.
2. Work happens locally all day — orders, stocktake, container updates,
   surveys all save instantly to that device.
3. At day's end (or whenever devices are physically together), each person
   goes to the **Sync** tab → **Export & Download JSON**, then shares that
   file to the other devices (Bluetooth, USB cable + file manager, or any
   messaging app if signal is available).
4. Each recipient opens **Sync** → **Choose File to Import**. New records
   merge in automatically. If two people edited the *same* product price or
   customer detail differently, it's flagged under **Conflicts needing
   review** for the Manager to resolve — money-relevant data never
   silently overwrites.

## Project structure

```
app/
  page.tsx              first-run login (name + role)
  dashboard/             revenue/profit stats, top customers/products, alerts
  orders/                order list, new order (customer + cart + confirm)
  products/              product catalog management
  customers/              customer list
  stocktake/              monthly stocktake with reorder alerts
  containers/             container list + detail (contents, status, freight)
  survey/                 market survey form + price trend history
  sync/                   export / import / conflict review
lib/
  db.ts                  Dexie schema (mirrors the original Room tables)
  calculations.ts        reorder alerts, slow-moving containers, growth %, etc.
  sync.ts                export/import + last-write-wins conflict detection
public/
  manifest.json, sw.js   PWA install + offline caching
```

## Data safety

All data lives in the browser's IndexedDB on that specific device. Clearing
browser data / uninstalling the PWA erases it — there's no cloud backup.
Encourage frequent Sync exports as the backup mechanism (save the exported
JSON files to a USB drive periodically, matching the original spec's daily
backup requirement).
