# MediCycle AI

> **Recognize the medicine. Activate better choices.**

MediCycle is a competition prototype that turns medication disposal into a clear, guided action. It combines private browser-side medication recognition, disposal guidance, nearby-pharmacy discovery, and ocean-impact learning to help users connect one household decision with a wider environmental outcome.

中文簡介：MediCycle 透過藥物處理引導、附近藥局搜尋與海洋教育，把正確回收行動轉化為容易理解且可持續的互動流程。

![MediCycle homepage with the hormone medication disposal hero and primary call to action](public/readme/hero.png)

## Product Walkthrough

### AI candidate and disposal guidance

The YOLO11 model analyzes the selected photo on-device and shows a medicine-name candidate with its confidence. Results are deliberately framed as candidates, never as diagnosis or treatment advice, and connect only to general medication-return education.

![Fixed Ethinyl Estradiol demonstration result and professional collection guidance](public/readme/demo-result.png)

### Marine Life collection

Completing the guided disposal simulation unlocks marine life cards, making the environmental consequence of a small household action visible and memorable.

![MediCycle Marine Life collection experience](public/readme/marine-collection.png)

## Features

- **Live browser inference** — runs the included YOLO11 ONNX model with WebGPU when available and automatically falls back to WASM.
- **Camera and upload** — supports camera capture, file selection, drag-and-drop, local preview, file-type validation, and a 10 MB size limit. Selected images are analyzed locally and are not uploaded or stored by MediCycle.
- **AI medication-name candidates** — decodes the image, letterboxes it to `640 × 640`, creates an RGB NCHW Float32 tensor normalized to `0–1`, parses the `1 × 17 × 8400` YOLO11 output, applies confidence filtering and class-aware NMS, restores boxes to original image coordinates, and draws the detections.
- **Disposal guidance** — explains the recommended action, why it matters, and the steps required for a safer medication hand-off.
- **Nearby pharmacies** — sends browser geolocation to a same-origin Cloudflare Pages Function, which validates coordinates and queries multiple OpenStreetMap Overpass providers before returning normalized nearest-first results to the Leaflet map.
- **Marine Life collection** — rewards simulated completion with six unlockable species cards and environmental impact stories.
- **Six-question Quiz** — checks understanding of pharmaceutical pollution, responsible disposal, aquatic impact, and AI's intended role.
- **Prototype account** — uses a phone number and six-digit PIN (not SMS verification) to restore progress across devices. Phone and PIN values are never stored in plaintext; D1 stores a keyed phone hash and a salted PBKDF2 PIN derivation.
- **Resilient progress** — synchronizes Marine Life, Quiz, return-plan, and demo-completion progress to Cloudflare D1 while retaining `localStorage` as an offline fallback.

## How It Works

1. Take a medicine photo or upload an image from the device.
2. Analyze the image locally in the browser.
3. Review the medicine-name candidate, confidence, bounding boxes, and general disposal guidance.
4. Find nearby pharmacies through a live OpenStreetMap search or use the clearly labeled sample locations.
5. Select a pharmacy to contact, then plan and simulate completion of the medication hand-off.
6. Unlock a Marine Life card and save collection progress on the device.
7. Complete the Quiz to connect responsible disposal with its potential effect on aquatic ecosystems.

## Technical Architecture

```mermaid
flowchart LR
    A[React + TypeScript + Vite] --> B[Camera / Upload]
    B --> C[ONNX Runtime Web<br/>WebGPU → WASM]
    C --> D[YOLO11 ONNX<br/>13 medicine classes]
    D --> E[Candidate + confidence<br/>general disposal guidance]
    E --> F[Cloudflare Pages Function]
    F --> L[OpenStreetMap Overpass<br/>multi-endpoint fallback]
    L --> G[Leaflet / react-leaflet]
    G --> H[Return plan + simulated completion]
    H --> I[Marine Life collection + Quiz]
    I --> J[localStorage fallback]
    I --> M[Prototype account API]
    M --> N[Cloudflare D1]
    A --> K[Cloudflare Pages]
```

`src/inference/yolo.ts` owns the browser inference pipeline and enforces the expected model contract: input `1 × 3 × 640 × 640`, output `1 × 17 × 8400`, and the fixed 13-class order documented below.

## Tech Stack

| Layer | Technology | Current role |
| --- | --- | --- |
| UI | React 19 | Component-based user journey and interaction state |
| Language | TypeScript | Typed application, pharmacy, quiz, and inference logic |
| Build tool | Vite | Local development and optimized static production build |
| Hosting | Cloudflare Pages | Static deployment from the GitHub `main` branch |
| Mapping | Leaflet + react-leaflet | Interactive pharmacy map, markers, popups, and map focus |
| Location data | Pages Function + OpenStreetMap Overpass | Validates coordinates, expands 2/5/10 km, retries public instances, normalizes and sorts results |
| Account persistence | Cloudflare D1 | Stores hashed account credentials, sessions, and cross-device progress |
| Offline persistence | `localStorage` | Stores non-identifying progress on the current device; never stores the phone number |
| Browser inference | ONNX Runtime Web | WebGPU-first inference with a WASM fallback |
| Vision model | YOLO11 ONNX | 13-class medication detector, ONNX opset 17 |

## Current Status

MediCycle is a **prototype / competition demo**, not a production medical identification service.

| Area | Status |
| --- | --- |
| Responsive UX and guided demo flow | Complete for the prototype |
| Camera/upload and local inference | Complete |
| Confidence policy and detection overlay | Complete |
| Nearby-pharmacy proxy and Leaflet map | Implemented; requires Pages Functions deployment; take-back availability remains unverified |
| Prototype account and D1 progress sync | Implemented; requires the D1 binding, migration, and pepper secret described below |
| Marine Life collection and offline progress | Complete |
| Six-question Quiz, scoring, and restart | Complete |
| ONNX preprocessing and inference module | Integrated |
| YOLO11 medication model | Included at `public/models/best.onnx` |
| Medication-name candidates | Enabled; explicitly not a diagnosis |

The prototype does not provide medical advice. Medicine identity and local disposal requirements should be confirmed with a qualified professional or authorized collection program.

## Local Development

Requirements: a current Node.js and npm installation.

```bash
npm install
npm run dev
```

Before submitting a change, run both project checks:

```bash
npm run build
npm run lint
npm run sanity:inference
```

The Vite server is sufficient for UI-only work. The production build is written to `dist/`. To run the account and pharmacy APIs locally, copy `wrangler.local.jsonc` to `wrangler.jsonc` without committing it, add a local `PHONE_HASH_PEPPER` (at least 24 random characters) to `.dev.vars`, apply `migrations/0001_accounts_and_progress.sql`, and run `npx wrangler pages dev`. Both `.dev.vars` and Wrangler's local D1 state are ignored by Git.

## Deployment

Cloudflare Pages automatically deploys updates from the GitHub `main` branch. The Pages project needs a D1 binding and secret before the new APIs can serve account requests.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |

### Required Cloudflare configuration

1. Create a D1 database named `medicycle-progress`.
2. Open its Console and execute `migrations/0001_accounts_and_progress.sql`.
3. In the MediCycle Pages project's production and preview settings, add a D1 binding named exactly `DB` and select `medicycle-progress`.
4. Add an encrypted secret named exactly `PHONE_HASH_PEPPER` to production and preview. Use a cryptographically random value of at least 32 bytes and never put it in Git or frontend environment variables.
5. Set the Pages compatibility date to `2026-09-04` or newer and enable `nodejs_compat` for production and preview.
6. Keep the existing build command `npm run build`, output directory `dist`, and production branch `main`, then trigger a new deployment.

### Pages Function endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/auth/register` | `POST` | Create a prototype account and merge device progress |
| `/api/auth/login` | `POST` | Verify phone + PIN, create an HttpOnly session, and merge/restore progress |
| `/api/auth/logout` | `POST` | Revoke only the current session; saved progress remains |
| `/api/progress` | `GET` | Restore the signed-in user's progress |
| `/api/progress` | `PUT` | Merge and save progress |
| `/api/progress` | `DELETE` | Reset progress without deleting the account |
| `/api/pharmacies?lat=…&lon=…` | `GET` | Return normalized nearest pharmacies through the server-side Overpass fallback |

## Model Integration Notes

The browser model must be stored at `public/models/best.onnx`. If the binary is omitted from a branch or deployment artifact, copy the exported ONNX file to that exact path before building or deploying. `public/models/classes.json` documents the fixed class order; the same order is also enforced in code.

Confidence policy:

- `>= 0.70`: **Likely match / 很可能是**
- `0.50–0.70`: **Possible match / 可能是**
- `< 0.50` or no detection: **Unable to identify reliably / 無法可靠辨識**, with a request to retake the photo

The fixed class order is: `canagliflozin`, `femara`, `henformin`, `januvia`, `kombiglyze`, `methimazole`, `nolvadex`, `onglyza`, `oseni`, `panbiotic`, `qtern`, `repaglinide`, `trajenta`.
