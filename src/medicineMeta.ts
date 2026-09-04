export type MedicineCategory = 'hormone-therapy' | 'endocrine-related' | 'other'

export type MedicineMeta = {
  classId: number
  label: string
  displayName: string
  category: MedicineCategory
  highlight: boolean
}

// This explicit mapping is the only source of medicine classification used by the UI.
// Its order must continue to match the trained model's class indices.
export const MEDICINE_META = [
  { classId: 0, label: 'canagliflozin', displayName: 'canagliflozin', category: 'other', highlight: false },
  { classId: 1, label: 'femara', displayName: 'Femara (letrozole)', category: 'hormone-therapy', highlight: true },
  { classId: 2, label: 'henformin', displayName: 'henformin', category: 'other', highlight: false },
  { classId: 3, label: 'januvia', displayName: 'Januvia (sitagliptin)', category: 'other', highlight: false },
  { classId: 4, label: 'kombiglyze', displayName: 'Kombiglyze', category: 'other', highlight: false },
  { classId: 5, label: 'methimazole', displayName: 'methimazole', category: 'endocrine-related', highlight: true },
  { classId: 6, label: 'nolvadex', displayName: 'Nolvadex (tamoxifen)', category: 'hormone-therapy', highlight: true },
  { classId: 7, label: 'onglyza', displayName: 'Onglyza (saxagliptin)', category: 'other', highlight: false },
  { classId: 8, label: 'oseni', displayName: 'Oseni', category: 'other', highlight: false },
  { classId: 9, label: 'panbiotic', displayName: 'panbiotic', category: 'other', highlight: false },
  { classId: 10, label: 'qtern', displayName: 'Qtern', category: 'other', highlight: false },
  { classId: 11, label: 'repaglinide', displayName: 'repaglinide', category: 'other', highlight: false },
  { classId: 12, label: 'trajenta', displayName: 'Trajenta (linagliptin)', category: 'other', highlight: false },
] as const satisfies readonly MedicineMeta[]

export const MEDICYCLE_CLASS_NAMES = MEDICINE_META.map(({ label }) => label)

export const HORMONE_THERAPY_ACCENT = '#6d28d9'
export const ENDOCRINE_RELATED_ACCENT = '#0f766e'
export const DEFAULT_DETECTION_COLORS = ['#5eb7dd', '#ff8a3d', '#ffce54', '#745bd8', '#20a67a', '#e6537c'] as const
const DEFAULT_DETECTION_TEXT_COLORS = ['#050505', '#050505', '#050505', '#ffffff', '#ffffff', '#050505'] as const

const metaByLabel = new Map<string, MedicineMeta>(
  MEDICINE_META.map((meta) => [meta.label, meta]),
)

export function getMedicineMeta(label: string, classId?: number): MedicineMeta | undefined {
  const mappedByClass = classId === undefined ? undefined : MEDICINE_META[classId]
  if (mappedByClass?.label === label.toLowerCase()) return mappedByClass
  return metaByLabel.get(label.toLowerCase())
}

export function getMedicineColor(label: string, classId: number) {
  const meta = getMedicineMeta(label, classId)
  if (meta?.category === 'hormone-therapy') return HORMONE_THERAPY_ACCENT
  if (meta?.category === 'endocrine-related') return ENDOCRINE_RELATED_ACCENT
  return DEFAULT_DETECTION_COLORS[classId % DEFAULT_DETECTION_COLORS.length]
}

export function getMedicineDisplayName(label: string, classId?: number) {
  return getMedicineMeta(label, classId)?.displayName ?? label
}

export function getMedicineTextColor(label: string, classId: number) {
  return getMedicineMeta(label, classId)?.highlight
    ? '#ffffff'
    : DEFAULT_DETECTION_TEXT_COLORS[classId % DEFAULT_DETECTION_TEXT_COLORS.length]
}
