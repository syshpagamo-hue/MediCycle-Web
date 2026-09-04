# MediCycle Web

MediCycle AI is a React + TypeScript + Vite prototype for medicine recognition, safe disposal guidance, and ocean-impact learning.

## Current prototype scope

- Explicit Demo Mode with one fixed Ethinyl Estradiol guidance case
- Local camera/upload preview; selected photos are not analyzed or uploaded
- Disposal guidance and nearby-pharmacy discovery with unverified take-back status
- Marine life collection with progress stored in `localStorage`
- Two-question environmental impact check
- Static output compatible with Cloudflare Pages

The current repository does not include the trained YOLO model, Next.js, a
Worker API, Drizzle, or a database.

## Demo Mode and future browser ONNX inference

The current UI does not run live medicine recognition. It labels all result
content as a fixed demonstration case, and uploaded photos are preview-only.

A browser-side YOLO11 pipeline remains available for future integration with
`onnxruntime-web`. Before enabling it, add and validate the model at
`public/models/best.onnx`, add class names at `public/models/classes.json`, and
connect validated classes to safe guidance. See `public/models/README.md` for
the expected input and output formats.

Do not present model output as medicine identification until the trained model,
confidence behavior, and class-to-guidance mapping have been validated.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Cloudflare Pages output directory: `dist`
