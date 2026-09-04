export type AnalysisResult = {
  drugName: string
  category: string
  action: 'return' | 'household'
  reason: string
  steps: string[]
}

export type Pharmacy = {
  id: string
  name: string
  lat: number
  lon: number
  address: string
  phone?: string
  distance: number
  takeBackStatus: 'verified' | 'unverified'
}

export type PageName = 'home' | 'result' | 'activity'
export type LocatorState = 'idle' | 'locating' | 'ready' | 'fallback' | 'error'

export const fixedDemoCase: AnalysisResult = {
  drugName: 'Ethinyl Estradiol 0.03 mg',
  category: 'Fixed demonstration case | Hormonal medication',
  action: 'return',
  reason:
    'This fixed demonstration case represents unused hormonal medication. It should be returned to a medical institution or a confirmed collection point so active ingredients do not enter wastewater or get used accidentally.',
  steps: [
    'Keep the medicine in its original packaging or medication bag.',
    'Do not flush it down a toilet or sink, and do not place it in household recycling.',
    'Use the pharmacy finder below and call before taking it to a medical institution or pharmacy.',
  ],
}

export const fallbackPharmacies: Omit<Pharmacy, 'distance'>[] = [
  {
    id: 'demo-1',
    name: 'Anxin Community Pharmacy',
    lat: 24.1799,
    lon: 120.6468,
    address: 'Section 3, Taiwan Boulevard, Xitun District, Taichung',
    takeBackStatus: 'unverified',
  },
  {
    id: 'demo-2',
    name: 'Harbor Health Pharmacy',
    lat: 24.1838,
    lon: 120.6412,
    address: 'Section 2, Henan Road, Xitun District, Taichung',
    takeBackStatus: 'unverified',
  },
  {
    id: 'demo-3',
    name: 'Sustainable Care Pharmacy',
    lat: 24.1745,
    lon: 120.6509,
    address: 'Section 3, Wenxin Road, Xitun District, Taichung',
    takeBackStatus: 'unverified',
  },
]

export const marineCards = [
  { name: 'Clownfish', image: '/figma-original/card-clownfish.png' },
  { name: 'Beluga', image: '/figma-original/card-beluga.png' },
  { name: 'Green Sea Turtle', image: '/figma-original/card-sea-turtle.png' },
  { name: 'Coral Reef', image: '/figma-original/card-coral-reef.png' },
  { name: 'Jellyfish', image: '/figma-original/card-jellyfish.png' },
  { name: 'Stingray', image: '/figma-original/card-stingray.png' },
] as const

export const marineFacts = [
  {
    name: 'Beluga',
    label: 'Bioaccumulation',
    image: '/figma-original/beluga.png',
    text: 'Drug residues and endocrine disruptors can accumulate in marine mammals, affecting immunity, fertility, and long-term population health.',
  },
  {
    name: 'Green Sea Turtle',
    label: 'Endocrine disruption',
    image: '/figma-original/green-sea-turtle.png',
    text: 'Environmental estrogens may interfere with developmental signals and reproductive balance in vulnerable marine populations.',
  },
  {
    name: 'Clownfish',
    label: 'Reproductive health',
    image: '/figma-original/clownfish.png',
    text: 'Synthetic hormones such as ethinyl estradiol can disrupt gonadal development, reproduction, and behavior in fish.',
  },
  {
    name: 'Coral Reef',
    label: 'Ecosystem resilience',
    image: '/figma-original/coral-reef.png',
    text: 'Pharmaceutical residues entering wastewater can affect the growth and reproductive capacity of corals and other marine organisms.',
  },
  {
    name: 'Fish in Polluted Water',
    label: 'Generational impact',
    image: '/figma-original/polluted-water-fish.png',
    text: 'Persistent exposure can reduce fertility and survival, with effects that may compound across multiple generations.',
  },
] as const

export const pageHash: Record<PageName, string> = {
  home: '#home',
  result: '#analysis-result',
  activity: '#ocean-collection',
}
