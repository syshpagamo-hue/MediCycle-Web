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
  address?: string
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
  explanation: LocalizedQuizExplanation
  sources: QuizSource[]
}

export type LocalizedQuizExplanation = {
  en: {
    correct: string
    incorrect: Partial<Record<QuizOption['id'], string>>
  }
  'zh-TW': {
    correct: string
    incorrect: Partial<Record<QuizOption['id'], string>>
  }
}

export type QuizSource = {
  organization: string
  title: string
  href: string
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'ee2-marine-fish-impact',
    question:
      'What impact can ethinyl estradiol (EE2), a synthetic estrogen used in some oral contraceptives, have on fish when it enters aquatic environments?',
    options: [
      {
        id: 'A',
        text: 'It can feminize male fish, disrupt reproductive development and behavior, reduce reproductive success, and in severe long-term exposure contribute to population decline.',
      },
      { id: 'B', text: 'It causes fish to grow abnormally large.' },
      { id: 'C', text: 'It immediately damages fish gills and causes suffocation.' },
      { id: 'D', text: 'It changes fish scale colors to help them escape predators.' },
    ],
    correctOptionId: 'A',
    explanation: {
      en: {
        correct: 'EE2 is a powerful synthetic estrogen. Direct fish studies show that long-term, low-level exposure can feminize males, alter sexual development and reproductive behavior, reduce fertilization, and—under sustained whole-ecosystem exposure—drive a fish population close to extinction.',
        incorrect: {
          B: 'Abnormal body growth is not the well-established main effect of EE2 in these studies.',
          C: 'The documented concern is endocrine and reproductive disruption, not immediate suffocation from gill damage.',
          D: 'EE2 does not provide a protective color change; studies instead report changes to sexual traits and behavior.',
        },
      },
      'zh-TW': {
        correct: 'EE2 是作用很強的合成雌激素。魚類直接研究顯示，長期接觸低濃度 EE2 可能使雄魚雌性化、干擾性別發育與生殖行為、降低受精成功率；在長期全生態系暴露下，甚至曾使魚群接近滅絕。',
        incorrect: {
          B: '這些研究確認的主要影響不是讓魚的體型異常變大。',
          C: '主要風險是內分泌與生殖干擾，不是立刻破壞魚鰓而窒息。',
          D: 'EE2 不會讓魚獲得保護性色彩；研究觀察到的是性徵與行為改變。',
        },
      },
    },
    sources: [
      {
        organization: 'NIH / PubMed · PNAS',
        title: 'Collapse of a fish population after exposure to a synthetic estrogen',
        href: 'https://pubmed.ncbi.nlm.nih.gov/17517636/',
      },
      {
        organization: 'NIH / PubMed · Environmental Toxicology and Chemistry',
        title: '17α-Ethinylestradiol alters reproductive behaviors, hormones, and sexual morphology in male fathead minnows',
        href: 'https://pubmed.ncbi.nlm.nih.gov/19650224/',
      },
    ],
  },
  {
    id: 'medication-path-to-ocean',
    question:
      'How do pharmaceuticals used by humans mainly enter aquatic environments and eventually affect marine life?',
    options: [
      { id: 'A', text: 'High-temperature exhaust gas directly emitted by factories' },
      { id: 'B', text: 'Plastic garbage dumped at sea by ships' },
      { id: 'C', text: 'Human excretion, household wastewater, and improper medication disposal' },
      { id: 'D', text: 'Chemical substances released by underwater volcanic eruptions' },
    ],
    correctOptionId: 'C',
    explanation: {
      en: {
        correct: 'After people take medicines, the body may excrete part of the active ingredient into household wastewater. Unused medicines poured into sinks or toilets add another route, and conventional wastewater treatment may not remove every compound before treated water reaches rivers and coastal waters.',
        incorrect: {
          A: 'Factory exhaust is air pollution and is not the main pathway described for medicines used in homes.',
          B: 'Plastic dumping is a serious but different pollution problem; it does not explain dissolved pharmaceutical residues.',
          D: 'Underwater volcanoes are natural geological sources, not the main source of human medicines in water.',
        },
      },
      'zh-TW': {
        correct: '人服藥後，部分有效成分可能隨排泄物進入家庭污水；把剩藥倒進水槽或馬桶也會增加污染。一般污水處理不一定能完全去除每種藥物，殘留物因此可能進入河川與沿海水域。',
        incorrect: {
          A: '工廠高溫廢氣屬於空氣污染，並非家庭用藥進入水域的主要途徑。',
          B: '海洋塑膠是嚴重但不同的污染問題，無法解釋水中的溶解藥物殘留。',
          D: '海底火山是自然地質來源，不是人類藥物進入水域的主要來源。',
        },
      },
    },
    sources: [
      {
        organization: 'US EPA',
        title: 'How Pharmaceuticals Enter the Environment',
        href: 'https://www.epa.gov/household-medication-disposal/how-pharmaceuticals-enter-environment',
      },
    ],
  },
  {
    id: 'importance-of-proper-disposal',
    question: 'Why is proper medication disposal important?',
    options: [
      { id: 'A', text: 'It helps prevent pharmaceutical pollution and protects aquatic ecosystems.' },
      { id: 'B', text: "It changes the medicine's color." },
      { id: 'C', text: 'It makes medicine cheaper.' },
      { id: 'D', text: 'It increases plastic recycling.' },
    ],
    correctOptionId: 'A',
    explanation: {
      en: {
        correct: 'Proper disposal reduces medicines entering sewers, landfill leachate, streams, and rivers. Take-back programs also keep unwanted medicines out of homes, lowering the chance of accidental poisoning or misuse while protecting the environment.',
        incorrect: {
          B: 'Disposal does not change a medicine’s color.',
          C: 'Disposal practices do not set or reduce medicine prices.',
          D: 'Medicine take-back is a safety and pollution-prevention action, not a way to increase ordinary plastic recycling.',
        },
      },
      'zh-TW': {
        correct: '正確處理可減少藥物進入下水道、掩埋場滲出水、溪流與河川。回收計畫也能把不再需要的藥品移出家中，降低誤食或誤用風險，同時保護環境。',
        incorrect: {
          B: '處理方式不會改變藥物顏色。',
          C: '藥物處理方式不會決定或降低售價。',
          D: '藥品回收是安全與污染預防措施，不是增加一般塑膠回收量的方法。',
        },
      },
    },
    sources: [
      {
        organization: 'US EPA',
        title: 'How Proper Disposal of Medicines Protects You and the Earth',
        href: 'https://www.epa.gov/sites/default/files/2015-06/documents/how-to-dispose-medicines.pdf',
      },
    ],
  },
  {
    id: 'hormone-medication-disposal',
    question: 'What is generally the preferred way to dispose of unused hormone medications?',
    options: [
      { id: 'A', text: 'Throw them directly into household trash' },
      { id: 'B', text: 'Flush them down the toilet' },
      { id: 'C', text: 'Use an authorized medication take-back or collection program' },
      { id: 'D', text: 'Put them in a household recycling bin' },
    ],
    correctOptionId: 'C',
    explanation: {
      en: {
        correct: 'FDA guidance says the best option for most unused or expired medicines is an authorized take-back location or mail-back program. The exact product label and local rules still matter, so a pharmacist or collection program should be consulted when unsure.',
        incorrect: {
          A: 'Household trash is a fallback for some medicines only when take-back is unavailable and FDA disposal steps are followed; it is not the preferred first choice.',
          B: 'Medicines should not be flushed unless the specific product is on the FDA Flush List or its instructions explicitly require it.',
          D: 'Household recycling bins are for accepted recyclable materials, not loose or packaged medicines.',
        },
      },
      'zh-TW': {
        correct: 'FDA 指引指出，多數未使用或過期藥物的最佳選擇是合法回收點或郵寄回收計畫。實際處理仍應查看產品標示與當地規定；不確定時可詢問藥師或回收單位。',
        incorrect: {
          A: '只有在無法使用回收服務且依照 FDA 步驟處理時，部分藥物才可丟入家庭垃圾；這不是優先選擇。',
          B: '除非特定藥物列在 FDA 可沖棄清單或說明書明確要求，否則不應沖入馬桶。',
          D: '家用資源回收桶只收當地核准的可回收物，不應放入散裝或包裝中的藥品。',
        },
      },
    },
    sources: [
      {
        organization: 'US FDA',
        title: 'Disposal of Unused Medicines: What You Should Know',
        href: 'https://www.fda.gov/drugs/safe-disposal-medicines/disposal-unused-medicines-what-you-should-know',
      },
    ],
  },
  {
    id: 'pharmaceutical-harm-to-aquatic-animals',
    question: 'Why can pharmaceutical pollution be harmful to aquatic animals?',
    options: [
      {
        id: 'A',
        text: 'Pharmaceuticals are biologically active and can affect reproduction, development, physiology, or behavior.',
      },
      { id: 'B', text: 'They always make seawater warmer.' },
      { id: 'C', text: 'They increase the amount of oxygen in water.' },
      { id: 'D', text: 'They turn medicines into microplastics.' },
    ],
    correctOptionId: 'A',
    explanation: {
      en: {
        correct: 'Medicines are designed to act on living systems. When residues remain in water, continuously exposed aquatic animals may respond even at low concentrations; documented effects vary by compound and include altered physiology, development, reproduction, and behavior.',
        incorrect: {
          B: 'Pharmaceutical residues do not automatically raise seawater temperature.',
          C: 'They do not reliably add oxygen to water; oxygen level is a separate water-quality issue.',
          D: 'Pharmaceutical molecules do not become microplastics simply by entering water.',
        },
      },
      'zh-TW': {
        correct: '藥物原本就是為了作用於生物系統而設計。殘留物進入水中後，持續暴露的水生動物即使接觸低濃度也可能產生反應；影響會因藥物而異，包括生理、發育、繁殖與行為改變。',
        incorrect: {
          B: '藥物殘留不會必然使海水升溫。',
          C: '藥物不會穩定增加水中氧氣；溶氧量是另一項水質問題。',
          D: '藥物分子不會只因進入水中就變成微塑膠。',
        },
      },
    },
    sources: [
      {
        organization: 'US EPA',
        title: 'The Impact of Pharmaceuticals Released to the Environment',
        href: 'https://www.epa.gov/household-medication-disposal/impact-pharmaceuticals-released-environment',
      },
      {
        organization: 'USGS',
        title: 'Complex Mixtures, Complex Responses—Assessing Pharmaceutical Effects on Fish',
        href: 'https://www.usgs.gov/programs/environmental-health-program/science/complex-mixtures-complex-responses-using?page=0',
      },
    ],
  },
  {
    id: 'ai-system-role',
    question: 'What does AI help MediCycle do?',
    options: [
      { id: 'A', text: 'Analyze an image to help identify the medication.' },
      { id: 'B', text: 'Produce medicine' },
      { id: 'C', text: 'Deliver medicine' },
      { id: 'D', text: 'Sell medicine' },
    ],
    correctOptionId: 'A',
    explanation: {
      en: {
        correct: 'MediCycle runs its included YOLO11 model in the browser to analyze a medicine photo and show a name candidate with confidence. It is an identification aid—not a diagnosis—and users are asked to confirm the medicine from its packaging or with a qualified professional.',
        incorrect: {
          B: 'MediCycle has no medicine-manufacturing function.',
          C: 'It helps plan a hand-off but does not operate a delivery service.',
          D: 'It does not sell medicines.',
        },
      },
      'zh-TW': {
        correct: 'MediCycle 會在瀏覽器內執行內建 YOLO11 模型，分析藥品照片並顯示藥名候選與信心分數。這只是辨識輔助，不是診斷；使用者仍應依原包裝或詢問合格專業人員確認。',
        incorrect: {
          B: 'MediCycle 沒有製造藥物的功能。',
          C: '系統可協助規劃交付，但不提供運送服務。',
          D: '系統不販售藥物。',
        },
      },
    },
    sources: [
      {
        organization: 'MediCycle system design',
        title: 'On-device AI medicine-name candidate workflow',
        href: 'https://github.com/syshpagamo-hue/MediCycle-Web#ai-candidate-and-disposal-guidance',
      },
    ],
  },
]

export const medicationReturnGuidance: AnalysisResult = {
  drugName: '',
  category: 'AI medication name candidate',
  action: 'return',
  reason:
    'If this medicine is unused or expired, keep it separate and contact a medical institution, pharmacy, or authorized collection program to confirm a suitable return option.',
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
