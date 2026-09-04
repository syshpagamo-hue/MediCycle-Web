# MediCycle YOLO11 model

Place the exported browser-compatible ONNX model at:

```text
public/models/best.onnx
```

The browser inference module expects this MediCycle Ultralytics YOLO11 detection export:

- One RGB image input in NCHW shape `1 × 3 × 640 × 640`
- Float values normalized to `0–1`
- Raw detection output shaped exactly `1 × 17 × 8400`
- ONNX opset 17

Images are letterboxed to `640 × 640`, converted to RGB NCHW Float32 tensors,
and normalized to `0–1`. The output is parsed as four box values followed by 13
class scores. Class-aware NMS is applied before boxes are restored to the original
image coordinates.

## Class names

`public/models/classes.json` records the required model class order:

```json
["canagliflozin", "femara", "henformin", "januvia", "kombiglyze", "methimazole", "nolvadex", "onglyza", "oseni", "panbiotic", "qtern", "repaglinide", "trajenta"]
```

The application also hard-codes and validates this order so a changed or missing
JSON file cannot silently relabel detections. This export does not include a
separate objectness score.

The UI invokes this pipeline directly. Results are medicine-name candidates only;
they do not produce diagnosis, treatment, dosing, or other medical inferences.
