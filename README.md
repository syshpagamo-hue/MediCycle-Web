# MediCycle Web

MediCycle AI is a React + TypeScript + Vite prototype for medicine recognition, safe disposal guidance, and ocean-impact learning.

## Current prototype scope

- Front-end-only mock medicine analysis
- Local image preview; selected photos are not uploaded
- Disposal guidance and nearby-pharmacy discovery
- Marine life collection with progress stored in `localStorage`
- Two-question environmental impact check
- Static output compatible with Cloudflare Pages

The current repository does not include the trained YOLO model, Next.js, a
Worker API, Drizzle, or a database.

## Browser ONNX inference

The browser-side YOLO11 pipeline is implemented with `onnxruntime-web`. Add the
model as `public/models/best.onnx` and, optionally, class names as
`public/models/classes.json`. See `public/models/README.md` for the expected
input and output formats.

Detection overlays are intentionally independent from the mock disposal,
collection, and quiz flow until the trained model has been validated.

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
