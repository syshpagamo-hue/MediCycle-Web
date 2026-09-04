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
  openingHours?: string
  distance: number
  takeBackStatus: 'osm-listed' | 'unverified'
}

export type Coordinates = {
  lat: number
  lon: number
}

export type PageName = 'home' | 'result' | 'activity'
export type LocatorState =
  | 'idle'
  | 'locating'
  | 'ready'
  | 'fallback'
  | 'location-error'
  | 'location-timeout'
  | 'timeout'
  | 'network-error'
  | 'empty'

export type QuizOption = {
  id: 'A' | 'B' | 'C' | 'D'
  text: string
}

export type QuizQuestion = {
  id: string
  question: string
  options: QuizOption[]
  correctOptionId: QuizOption['id']
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'ee2-marine-fish-impact',
    question:
      'What impact does ethinyl estradiol (EE2), a common component of oral contraceptives, have on marine fish like clownfish when it enters water bodies?',
    options: [
      {
        id: 'A',
        text: 'It induces feminization in male fish, affects sperm/egg development, alters behavior, and may lead to population collapse.',
      },
      { id: 'B', text: 'It causes fish to grow abnormally large.' },
      { id: 'C', text: 'It damages fish gills, causing immediate suffocation.' },
      { id: 'D', text: 'It changes fish scale colors to help them escape predators.' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'medication-path-to-ocean',
    question:
      'How do waste medications used by humans (such as birth control pills, antidepressants, and painkillers) mainly enter the ocean to disrupt coral reefs and marine life?',
    options: [
      { id: 'A', text: 'High-temperature exhaust gas directly emitted by factories' },
      { id: 'B', text: 'Plastic garbage dumped at sea by ships' },
      { id: 'C', text: 'Household wastewater and improper drug disposal' },
      { id: 'D', text: 'Chemical substances released by underwater volcanic eruptions' },
    ],
    correctOptionId: 'C',
  },
  {
    id: 'importance-of-proper-disposal',
    question: 'Why is proper medication disposal important?',
    options: [
      { id: 'A', text: 'It protects the environment.' },
      { id: 'B', text: "It changes the medicine's color." },
      { id: 'C', text: 'It makes medicine cheaper.' },
      { id: 'D', text: 'It increases plastic recycling.' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'hormone-medication-disposal',
    question: 'Where should hormone medications be disposed of?',
    options: [
      { id: 'A', text: 'Household trash' },
      { id: 'B', text: 'Flush them down the toilet' },
      { id: 'C', text: 'A designated pharmacy or medical collection point' },
      { id: 'D', text: 'Recycling bin' },
    ],
    correctOptionId: 'C',
  },
  {
    id: 'marine-animal-water-pollution',
    question: 'Which marine animal is most affected by water pollution?',
    options: [
      { id: 'A', text: 'Sea turtle' },
      { id: 'B', text: 'Eagle' },
      { id: 'C', text: 'Panda' },
      { id: 'D', text: 'Butterfly' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'ai-system-role',
    question: 'What does AI help our system do?',
    options: [
      { id: 'A', text: 'Identify medications' },
      { id: 'B', text: 'Produce medicine' },
      { id: 'C', text: 'Deliver medicine' },
      { id: 'D', text: 'Sell medicine' },
    ],
    correctOptionId: 'A',
  },
]

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
  {
    id: 'demo-4',
    name: 'Blue Current Pharmacy',
    lat: 24.1717,
    lon: 120.6434,
    address: 'Fuxing Road, Xitun District, Taichung',
    takeBackStatus: 'unverified',
  },
  {
    id: 'demo-5',
    name: 'Ocean Care Pharmacy',
    lat: 24.1868,
    lon: 120.6531,
    address: 'Qinghai Road, Xitun District, Taichung',
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
