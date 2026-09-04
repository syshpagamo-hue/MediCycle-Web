# MediCycle YOLO11 model

Place the exported browser-compatible ONNX model at:

```text
public/models/best.onnx
```

The browser inference module expects a standard Ultralytics YOLO11 detection export:

- One RGB image input, normally NCHW (`1 × 3 × height × width`)
- Float values normalized to `0–1`
- Raw detection output shaped like `1 × (4 + classes) × predictions` or
  `1 × predictions × (4 + classes)`
- End-to-end NMS output shaped like `1 × predictions × 6` is also supported

The input dimensions are read from model metadata. Dynamic dimensions fall back
to `640 × 640`. Images are letterboxed, and detected boxes are restored to the
original image coordinates.

## Class names

Optionally add `public/models/classes.json` as a JSON array in model class order:

```json
["Medicine A", "Medicine B", "Medicine C"]
```

Without this file, overlays use `Class 0`, `Class 1`, and so on. If the exported
model includes a separate objectness score (YOLOv5-style output), pass
`hasObjectness: true` to `runYoloInference`.

The current UI is explicitly in Demo Mode and does not invoke this pipeline.
Its disposal recommendation, return plan, collection unlock, and quiz use one
fixed, clearly labeled demonstration case until the model and class-to-guidance
mapping have been validated.
