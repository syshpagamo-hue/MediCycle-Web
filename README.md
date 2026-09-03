# MediCycle Web

MediCycle AI is a React + TypeScript + Vite prototype for medicine recognition, safe disposal guidance, and ocean-impact learning.

## Current prototype scope

- Front-end-only mock medicine analysis
- Local image preview; selected photos are not uploaded
- Disposal guidance and nearby-pharmacy discovery
- Marine life collection with progress stored in `localStorage`
- Two-question environmental impact check
- Static output compatible with Cloudflare Pages

The current build does not include YOLO inference, Next.js, a Worker API, Drizzle, or a database.

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
