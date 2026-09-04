# MediCycle AI

> **Recognize the medicine. Activate better choices.**

MediCycle is a competition prototype that turns medication disposal into a clear, guided action. It combines a camera/upload experience, disposal guidance, nearby-pharmacy discovery, and ocean-impact learning to help users connect one household decision with a wider environmental outcome. The current release presents a transparent fixed demonstration case while the production medication-recognition model is still being trained and validated.

中文簡介：MediCycle 透過藥物處理引導、附近藥局搜尋與海洋教育，把正確回收行動轉化為容易理解且可持續的互動流程。

![MediCycle homepage with the hormone medication disposal hero and primary call to action](public/readme/hero.png)

## Product Walkthrough

### Fixed Demo result and disposal guidance

The current Demo Mode uses an Ethinyl Estradiol 0.03 mg case. The result is deliberately labeled as a fixed case—not as an identification of the user's photo—and provides a step-by-step professional return plan.

![Fixed Ethinyl Estradiol demonstration result and professional collection guidance](public/readme/demo-result.png)

### Marine Life collection

Completing the guided disposal simulation unlocks marine life cards, making the environmental consequence of a small household action visible and memorable.

![MediCycle Marine Life collection experience](public/readme/marine-collection.png)

## Features

- **Demo Mode** — runs one clearly labeled Ethinyl Estradiol case so the complete competition journey can be demonstrated without presenting simulated output as live AI.
- **Camera and upload** — supports camera capture, file selection, drag-and-drop, local preview, file-type validation, and a 10 MB size limit. In the current prototype, selected images remain on the device and are not analyzed or uploaded.
- **AI medication-recognition pipeline** — includes a browser-side YOLO11 ONNX inference module with image decoding, letterboxing, WebGPU/WASM execution, output parsing, confidence filtering, and non-maximum suppression. The production model and validated class-to-guidance connection are not enabled yet.
- **Disposal guidance** — explains the recommended action, why it matters, and the steps required for a safer medication hand-off.
- **Nearby pharmacies** — uses browser geolocation, OpenStreetMap Overpass data, and an interactive Leaflet map, with sample data available for a reliable demo. Pharmacy take-back participation is not assumed; users are told to contact each location to verify it.
- **Marine Life collection** — rewards simulated completion with six unlockable species cards and environmental impact stories.
- **Six-question Quiz** — checks understanding of pharmaceutical pollution, responsible disposal, aquatic impact, and AI's intended role.
- **Local progress** — stores the marine collection count in `localStorage`; no account or application database is required for the prototype.

## How It Works

1. Take a medicine photo or upload an image from the device.
2. Preview the image locally and start the analysis step.
3. Review the medicine result and disposal guidance. In the current Demo Mode, this is always the fixed Ethinyl Estradiol case.
4. Find nearby pharmacies through a live OpenStreetMap search or use the clearly labeled sample locations.
5. Select a pharmacy to contact, then plan and simulate completion of the medication hand-off.
6. Unlock a Marine Life card and save collection progress on the device.
7. Complete the Quiz to connect responsible disposal with its potential effect on aquatic ecosystems.

## Technical Architecture

```mermaid
flowchart LR
    A[React + TypeScript + Vite] --> B[Camera / Upload]
    B -. Production model pending .-> C[ONNX Runtime Web<br/>YOLO11 ONNX]
    B --> D[Demo Mode<br/>Fixed Ethinyl Estradiol case]
    C -. Future validated class mapping .-> E[Disposal guidance]
    D --> E
    E --> F[OpenStreetMap Overpass]
    F --> G[Leaflet / react-leaflet]
    G --> H[Return plan + simulated completion]
    H --> I[Marine Life collection + Quiz]
    I --> J[localStorage progress]
    A --> K[Cloudflare Pages]
```

The UI currently follows the solid Demo Mode path. `src/inference/yolo.ts` provides the intended ONNX Runtime Web pipeline, but the trained `best.onnx`, final class labels, confidence behavior, and class-to-disposal-guidance mapping must be validated before production recognition is enabled.

## Tech Stack

| Layer | Technology | Current role |
| --- | --- | --- |
| UI | React 19 | Component-based user journey and interaction state |
| Language | TypeScript | Typed application, pharmacy, quiz, and inference logic |
| Build tool | Vite | Local development and optimized static production build |
| Hosting | Cloudflare Pages | Static deployment from the GitHub `main` branch |
| Mapping | Leaflet + react-leaflet | Interactive pharmacy map, markers, popups, and map focus |
| Location data | OpenStreetMap Overpass API | Searches nearby `amenity=pharmacy` records |
| Browser persistence | `localStorage` | Stores Marine Life collection progress on the current device |
| Future browser inference | ONNX Runtime Web | WebGPU-first inference with a WASM fallback; module present, production model not enabled |
| Future vision model | YOLO11 ONNX | Planned medication detection model; still being trained and validated |

## Current Status

MediCycle is a **prototype / competition demo**, not a production medical identification service.

| Area | Status |
| --- | --- |
| Responsive UX and guided demo flow | Complete for the prototype |
| Camera/upload preview | Complete; preview-only and local |
| Fixed disposal-guidance case | Complete |
| Nearby-pharmacy search and Leaflet map | Complete; take-back availability remains unverified |
| Marine Life collection and `localStorage` progress | Complete |
| Six-question Quiz, scoring, and restart | Complete |
| ONNX preprocessing and inference module | Implemented for future integration |
| Production YOLO11 medication model | In training / validation; not included in this repository |
| Live medication identification | Not enabled |

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
```

The local development server uses Vite. The production build is written to `dist/`.

## Deployment

Cloudflare Pages automatically deploys updates from the GitHub `main` branch.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |

The application is a static client-side build. OpenStreetMap tiles and Overpass pharmacy results are requested by the browser at runtime.

## Model Integration Notes

The future browser model is expected at `public/models/best.onnx`, with class names optionally supplied at `public/models/classes.json`. See [`public/models/README.md`](public/models/README.md) for the supported input/output shapes and integration constraints.

Do not enable live medicine identification until the trained model, confidence thresholds, labels, and disposal-guidance mapping have been tested as one end-to-end system.
