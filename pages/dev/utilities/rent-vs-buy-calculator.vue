<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, computed, onMounted, watch } from 'vue'
import { seoData } from '~/data'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'

definePageMeta({
  middleware: ['auth-utilities', 'utility-access'],
})

const { checkAuth } = useAuth()
const { showToast } = useToast()

useHead({
  title: 'Rent vs Buy (EMI) Calculator',
  meta: [
    {
      name: 'description',
      content:
        'Decision tool to compare renting vs buying a home with mortgage/EMI, appreciation, taxes, and investment opportunity cost.',
    },
    { property: 'og:site_name', content: seoData.mySite },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${seoData.mySite}/dev/utilities/rent-vs-buy-calculator` },
    { property: 'og:title', content: 'Rent vs Buy (EMI) Calculator' },
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/dev/utilities/rent-vs-buy-calculator` }],
})

// Currency configurations (match car calculator style)
const currencies = {
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee', locale: 'en-IN' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound', locale: 'en-GB' },
}

const defaultAssumptions = {
  // General
  currency: 'INR',
  analysisYears: 7,
  discountRate: 7, // % used for NPV (often equals expected investment return)

  // Home purchase
  homePrice: 0,
  downPaymentPct: 20, // %
  loanRate: 9, // % annual
  loanTenureYears: 20, // amortization tenure
  closingCostsPct: 2, // % of home price (stamp duty, fees)
  propertyTaxPct: 0.4, // % of home price per year
  maintenancePct: 0.6, // % of home price per year
  homeInsuranceAnnual: 0,
  homeAppreciation: 5, // % annual
  sellingCostsPct: 2, // % of sale price (brokerage etc)

  // Rent
  rentMonthly: 0,
  rentEscalation: 5, // % annual
  renterInsuranceAnnual: 0,
  securityDepositMonths: 2, // months of rent (assumed returned at end)

  // Investment
  investmentReturn: 7, // % annual return on invested money
}

const assumptions = ref({ ...defaultAssumptions })

const activeTab = ref<'assumptions' | 'buy' | 'rent' | 'comparison'>('assumptions')

// ===== India tier presets (decision-support defaults) =====
type IndiaTier = 'metro' | 'tier2' | 'tier3'

const indiaTier = ref<IndiaTier>('metro')
const applyPresetOverwrite = ref(false)

const INDIA_TIER_PRESETS: Record<IndiaTier, Partial<typeof defaultAssumptions>> = {
  metro: {
    // Typically higher rent growth and higher appreciation, higher maintenance
    loanRate: 9.0,
    homeAppreciation: 6.0,
    rentEscalation: 6.0,
    maintenancePct: 0.8,
    propertyTaxPct: 0.4,
    closingCostsPct: 2.5,
    sellingCostsPct: 2.0,
    securityDepositMonths: 2,
    investmentReturn: 7.5,
    discountRate: 7.5,
  },
  tier2: {
    loanRate: 9.0,
    homeAppreciation: 5.0,
    rentEscalation: 5.0,
    maintenancePct: 0.6,
    propertyTaxPct: 0.35,
    closingCostsPct: 2.0,
    sellingCostsPct: 2.0,
    securityDepositMonths: 2,
    investmentReturn: 7.0,
    discountRate: 7.0,
  },
  tier3: {
    loanRate: 9.0,
    homeAppreciation: 4.0,
    rentEscalation: 4.0,
    maintenancePct: 0.5,
    propertyTaxPct: 0.3,
    closingCostsPct: 1.5,
    sellingCostsPct: 2.0,
    securityDepositMonths: 1,
    investmentReturn: 6.5,
    discountRate: 6.5,
  },
}

const applyIndiaTierPreset = () => {
  if (assumptions.value.currency !== 'INR') {
    showToast('India tier presets are tuned for INR. Switching currency to INR.', 'info')
    assumptions.value.currency = 'INR'
  }

  const preset = INDIA_TIER_PRESETS[indiaTier.value]
  const keys = Object.keys(preset) as (keyof typeof defaultAssumptions)[]

  keys.forEach((k) => {
    const current = assumptions.value[k]
    const shouldApply =
      applyPresetOverwrite.value || current === 0 || current === '' || current === null
    if (shouldApply) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(assumptions.value as any)[k] = preset[k] as any
    }
  })

  syncMoneyInputsFromAssumptions()
  showToast('Applied India tier preset. You can still override any field.', 'success')
}

// ===== Formatting =====
const formatCurrency = (value: number) => {
  const curr = currencies[assumptions.value.currency as keyof typeof currencies] || currencies.INR
  return new Intl.NumberFormat(curr.locale, {
    style: 'currency',
    currency: curr.code,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

// Comma-separated numeric inputs for money fields (without currency symbol)
type MoneyField = 'homePrice' | 'homeInsuranceAnnual' | 'rentMonthly' | 'renterInsuranceAnnual'

const moneyInputs = ref<Record<MoneyField, string>>({
  homePrice: '',
  homeInsuranceAnnual: '',
  rentMonthly: '',
  renterInsuranceAnnual: '',
})

const formatNumberWithCommas = (value: number) => {
  const curr = currencies[assumptions.value.currency as keyof typeof currencies] || currencies.INR
  return new Intl.NumberFormat(curr.locale, { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0,
  )
}

const parseMoneyInput = (raw: string) => {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned) return { value: 0, isEmpty: true }
  const num = Number(cleaned)
  if (!Number.isFinite(num)) return { value: 0, isEmpty: true }
  return { value: Math.max(0, num), isEmpty: false }
}

const syncMoneyInputsFromAssumptions = () => {
  ;(
    ['homePrice', 'homeInsuranceAnnual', 'rentMonthly', 'renterInsuranceAnnual'] as MoneyField[]
  ).forEach((k) => {
    const n = Number((assumptions.value as unknown as Record<string, unknown>)[k] || 0)
    moneyInputs.value[k] = n > 0 ? formatNumberWithCommas(n) : ''
  })
}

const updateMoneyField = (field: MoneyField, raw: string) => {
  const { value, isEmpty } = parseMoneyInput(raw)
  ;(assumptions.value as unknown as Record<string, unknown>)[field] = isEmpty ? 0 : value
  moneyInputs.value[field] = isEmpty ? '' : formatNumberWithCommas(value)
}

// ===== Core finance helpers =====
const monthlyRate = (annualPct: number) => annualPct / 100 / 12

const pmt = (principal: number, annualRatePct: number, years: number) => {
  const r = monthlyRate(annualRatePct)
  const n = Math.max(1, Math.round(years * 12))
  if (r === 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

const remainingBalance = (
  principal: number,
  annualRatePct: number,
  totalYears: number,
  paymentsMadeMonths: number,
) => {
  const r = monthlyRate(annualRatePct)
  const n = Math.max(1, Math.round(totalYears * 12))
  const k = clamp(Math.round(paymentsMadeMonths), 0, n)
  if (r === 0) {
    return Math.max(0, principal * (1 - k / n))
  }
  // Remaining balance formula after k payments
  const pow = Math.pow(1 + r, n)
  const powK = Math.pow(1 + r, k)
  return (principal * (pow - powK)) / (pow - 1)
}

const discountMonthly = (annualPct: number) => Math.pow(1 + annualPct / 100, 1 / 12) - 1

const npvMonthly = (cashflows: number[], annualDiscountPct: number) => {
  const r = discountMonthly(annualDiscountPct)
  return cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + r, i + 1), 0)
}

// ===== Derived values =====
const derived = computed(() => {
  const years = clamp(Number(assumptions.value.analysisYears) || 1, 1, 40)
  const homePrice = Math.max(0, Number(assumptions.value.homePrice) || 0)
  const downPct = clamp(Number(assumptions.value.downPaymentPct) || 0, 0, 100)
  const downPayment = homePrice * (downPct / 100)
  const loanPrincipal = Math.max(0, homePrice - downPayment)
  const emi = pmt(
    loanPrincipal,
    Number(assumptions.value.loanRate) || 0,
    Number(assumptions.value.loanTenureYears) || 1,
  )

  return { years, homePrice, downPayment, loanPrincipal, emi }
})

// ===== Buy model (monthly cashflows + end equity) =====
const buyModel = computed(() => {
  const months = derived.value.years * 12
  const discount = clamp(Number(assumptions.value.discountRate) || 0, 0, 30)
  const investReturn = clamp(Number(assumptions.value.investmentReturn) || 0, 0, 30)

  const closingCosts =
    derived.value.homePrice * (clamp(Number(assumptions.value.closingCostsPct) || 0, 0, 20) / 100)
  const propertyTaxAnnual =
    derived.value.homePrice * (clamp(Number(assumptions.value.propertyTaxPct) || 0, 0, 10) / 100)
  const maintenanceAnnual =
    derived.value.homePrice * (clamp(Number(assumptions.value.maintenancePct) || 0, 0, 15) / 100)
  const homeInsuranceAnnual = Math.max(0, Number(assumptions.value.homeInsuranceAnnual) || 0)

  // Upfront outflow at month 0 (not included in NPV function which starts at month 1)
  const upfront = derived.value.downPayment + closingCosts

  const monthlyTax = propertyTaxAnnual / 12
  const monthlyMaint = maintenanceAnnual / 12
  const monthlyInsurance = homeInsuranceAnnual / 12

  const monthlyOutflow = derived.value.emi + monthlyTax + monthlyMaint + monthlyInsurance
  // Optimize: Calculate NPV directly without creating large array (saves memory for long analysis periods)
  // For months > 240 (20 years), use formula instead of array
  const useFormula = months > 240
  const cashflows: number[] = useFormula ? [] : Array.from({ length: months }, () => monthlyOutflow)

  // Home value after N years
  const appreciation = clamp(Number(assumptions.value.homeAppreciation) || 0, -10, 20) / 100
  const homeValueEnd = derived.value.homePrice * Math.pow(1 + appreciation, derived.value.years)

  // Remaining balance after N years (based on amortization tenure)
  const bal = remainingBalance(
    derived.value.loanPrincipal,
    Number(assumptions.value.loanRate) || 0,
    Number(assumptions.value.loanTenureYears) || 1,
    months,
  )

  const sellingCosts =
    homeValueEnd * (clamp(Number(assumptions.value.sellingCostsPct) || 0, 0, 10) / 100)
  const equityEnd = Math.max(0, homeValueEnd - bal - sellingCosts)

  // NPV: monthly outflows + add upfront (treated as month 1 cashflow for NPV approximation) - equity as inflow at end
  // Use formula for large periods to save memory
  const r = discountMonthly(discount)
  let npvOutflows: number
  // Handle r = 0 case to avoid division by zero (when discount rate is 0%)
  if (Math.abs(r) < 1e-10) {
    // When discount rate is 0%, NPV is simply the sum of cashflows (no discounting)
    npvOutflows = useFormula
      ? monthlyOutflow * months + upfront
      : npvMonthly(cashflows, discount) + upfront
  } else {
    npvOutflows = useFormula
      ? (monthlyOutflow * (1 - Math.pow(1 + r, -months))) / r + upfront / (1 + r)
      : npvMonthly(cashflows, discount) + upfront / Math.pow(1 + r, 1)
  }
  const equityPV = Math.abs(r) < 1e-10 ? equityEnd : equityEnd / Math.pow(1 + r, months)
  const npvNetCost = npvOutflows - equityPV

  // Opportunity: if you rent instead, you can invest the upfront amount; show it as comparison helper
  const investmentGainOnUpfront =
    upfront * (Math.pow(1 + investReturn / 100, derived.value.years) - 1)

  return {
    months,
    monthlyOutflow,
    upfront,
    closingCosts,
    propertyTaxAnnual,
    maintenanceAnnual,
    homeInsuranceAnnual,
    homeValueEnd,
    remainingBalanceEnd: bal,
    sellingCosts,
    equityEnd,
    npvNetCost,
    investmentGainOnUpfront,
  }
})

// ===== Rent model (monthly rent escalation + end investment) =====
const rentModel = computed(() => {
  const months = derived.value.years * 12
  const discount = clamp(Number(assumptions.value.discountRate) || 0, 0, 30)
  const investReturn = clamp(Number(assumptions.value.investmentReturn) || 0, 0, 30)

  const rent0 = Math.max(0, Number(assumptions.value.rentMonthly) || 0)
  const esc = clamp(Number(assumptions.value.rentEscalation) || 0, -10, 20) / 100
  const renterInsuranceAnnual = Math.max(0, Number(assumptions.value.renterInsuranceAnnual) || 0)
  const monthlyRenterInsurance = renterInsuranceAnnual / 12

  // Security deposit as upfront outflow, returned at end (no interest modeled)
  const depositMonths = clamp(Number(assumptions.value.securityDepositMonths) || 0, 0, 24)
  const deposit = rent0 * depositMonths

  // Monthly rent escalates annually
  // Optimize: Calculate NPV directly for long periods to save memory
  const useFormula = months > 240
  const cashflows: number[] = useFormula ? [] : []
  if (!useFormula) {
    for (let m = 0; m < months; m++) {
      const yearIndex = Math.floor(m / 12)
      const rent = rent0 * Math.pow(1 + esc, yearIndex)
      cashflows.push(rent + monthlyRenterInsurance)
    }
  }

  // Invest the "buy upfront" amount (down payment + closing) if renting
  const investBase = buyModel.value.upfront
  const investFinal = investBase * Math.pow(1 + investReturn / 100, derived.value.years)
  const investGain = investFinal - investBase

  // Calculate NPV - use formula for long periods, array method for short periods
  const r = discountMonthly(discount)
  let npvOutflows: number
  let avgMonthly: number

  if (useFormula) {
    // Calculate NPV using formula (memory efficient for long periods)
    npvOutflows = deposit / (1 + r)
    for (let m = 0; m < months; m++) {
      const yearIndex = Math.floor(m / 12)
      const rent = rent0 * Math.pow(1 + esc, yearIndex)
      npvOutflows += (rent + monthlyRenterInsurance) / Math.pow(1 + r, m + 1)
    }
    // Approximate average monthly (for display only)
    const finalYearRent = rent0 * Math.pow(1 + esc, Math.floor((months - 1) / 12))
    avgMonthly = (rent0 + finalYearRent) / 2 + monthlyRenterInsurance
  } else {
    npvOutflows = npvMonthly(cashflows, discount) + deposit / Math.pow(1 + r, 1)
    avgMonthly = cashflows.reduce((a, b) => a + b, 0) / Math.max(1, cashflows.length)
  }

  const depositPV = deposit / Math.pow(1 + r, months) // returned
  const investPV = investFinal / Math.pow(1 + r, months)
  const npvNetCost = npvOutflows - depositPV - investPV

  return {
    months,
    rent0,
    deposit,
    renterInsuranceAnnual,
    avgMonthly,
    investBase,
    investFinal,
    investGain,
    npvNetCost,
  }
})

// ===== Recommendation =====
const recommendation = computed(() => {
  const buyCost = buyModel.value.npvNetCost
  const rentCost = rentModel.value.npvNetCost
  const diff = buyCost - rentCost
  if (diff < 0) {
    return {
      recommended: 'Buy',
      savings: Math.abs(diff),
      explanation: `Buying has a lower net present cost by ${formatCurrency(Math.abs(diff))} over ${derived.value.years} years (using your discount rate).`,
    }
  }
  return {
    recommended: 'Rent',
    savings: diff,
    explanation: `Renting has a lower net present cost by ${formatCurrency(diff)} over ${derived.value.years} years (using your discount rate).`,
  }
})

// ===== Sensitivity =====
type Scenario = { id: string; label: string; overrides: Partial<typeof defaultAssumptions> }

// Optimized scenario runner - avoids deep cloning and minimizes memory usage
const runScenario = (overrides: Partial<typeof defaultAssumptions>) => {
  // Create shallow merge instead of deep clone to save memory
  const merged = { ...assumptions.value, ...overrides }

  // Calculate directly without swapping assumptions (more memory efficient)
  const years = clamp(Number(merged.analysisYears) || 1, 1, 40)
  const months = years * 12
  const homePrice = Math.max(0, Number(merged.homePrice) || 0)
  const downPct = clamp(Number(merged.downPaymentPct) || 0, 0, 100)
  const downPayment = homePrice * (downPct / 100)
  const loanPrincipal = Math.max(0, homePrice - downPayment)
  const loanRate = Number(merged.loanRate) || 0
  const loanTenureYears = Number(merged.loanTenureYears) || 1

  // Calculate EMI
  const emi = pmt(loanPrincipal, loanRate, loanTenureYears)

  // Buy model calculation (simplified, only what we need for NPV)
  const discount = clamp(Number(merged.discountRate) || 0, 0, 30)
  const closingCosts = homePrice * (clamp(Number(merged.closingCostsPct) || 0, 0, 20) / 100)
  const propertyTaxAnnual = homePrice * (clamp(Number(merged.propertyTaxPct) || 0, 0, 10) / 100)
  const maintenanceAnnual = homePrice * (clamp(Number(merged.maintenancePct) || 0, 0, 15) / 100)
  const homeInsuranceAnnual = Math.max(0, Number(merged.homeInsuranceAnnual) || 0)
  const upfront = downPayment + closingCosts
  const monthlyOutflow =
    emi + propertyTaxAnnual / 12 + maintenanceAnnual / 12 + homeInsuranceAnnual / 12

  // Calculate NPV without creating full cashflow array (memory efficient)
  const r = discountMonthly(discount)
  // Handle r = 0 case to avoid division by zero (when discount rate is 0%)
  const npvOutflows =
    Math.abs(r) < 1e-10
      ? monthlyOutflow * months + upfront // When discount rate is 0%, NPV is simply the sum
      : (monthlyOutflow * (1 - Math.pow(1 + r, -months))) / r + upfront / (1 + r)

  const appreciation = clamp(Number(merged.homeAppreciation) || 0, -10, 20) / 100
  const homeValueEnd = homePrice * Math.pow(1 + appreciation, years)
  const bal = remainingBalance(loanPrincipal, loanRate, loanTenureYears, months)
  const sellingCosts = homeValueEnd * (clamp(Number(merged.sellingCostsPct) || 0, 0, 10) / 100)
  const equityEnd = Math.max(0, homeValueEnd - bal - sellingCosts)
  const equityPV = equityEnd / Math.pow(1 + r, months)
  const buyNPV = npvOutflows - equityPV

  // Rent model calculation (simplified)
  const rent0 = Math.max(0, Number(merged.rentMonthly) || 0)
  const esc = clamp(Number(merged.rentEscalation) || 0, -10, 20) / 100
  const renterInsuranceAnnual = Math.max(0, Number(merged.renterInsuranceAnnual) || 0)
  const monthlyRenterInsurance = renterInsuranceAnnual / 12
  const depositMonths = clamp(Number(merged.securityDepositMonths) || 0, 0, 24)
  const deposit = rent0 * depositMonths
  const investReturn = clamp(Number(merged.investmentReturn) || 0, 0, 30)
  const investFinal = upfront * Math.pow(1 + investReturn / 100, years)

  // Calculate rent NPV without creating full cashflow array
  let rentNPV = 0
  for (let m = 0; m < months; m++) {
    const yearIndex = Math.floor(m / 12)
    const rent = rent0 * Math.pow(1 + esc, yearIndex)
    rentNPV += (rent + monthlyRenterInsurance) / Math.pow(1 + r, m + 1)
  }
  rentNPV +=
    deposit / (1 + r) - deposit / Math.pow(1 + r, months) - investFinal / Math.pow(1 + r, months)

  const diff = buyNPV - rentNPV
  const recommended = diff < 0 ? 'Buy' : 'Rent'
  const savings = Math.abs(diff)

  return {
    buy: buyNPV,
    rent: rentNPV,
    rec: recommended,
    savings,
  }
}

// Memoize sensitivity calculation to avoid recomputing on every change
type SensitivityResult = Array<{
  id: string
  label: string
  overrides: Partial<typeof defaultAssumptions>
  result: ReturnType<typeof runScenario>
}>
let sensitivityCache: { key: string; result: SensitivityResult } | null = null

const sensitivity = computed((): SensitivityResult => {
  // Create cache key from ALL relevant assumption values that affect calculations
  // Missing fields would cause stale cache hits when these values change
  const cacheKey = [
    assumptions.value.analysisYears,
    assumptions.value.homePrice,
    assumptions.value.downPaymentPct,
    assumptions.value.loanRate,
    assumptions.value.loanTenureYears,
    assumptions.value.discountRate,
    assumptions.value.closingCostsPct, // Used in buy model calculation
    assumptions.value.propertyTaxPct, // Used in buy model calculation
    assumptions.value.maintenancePct, // Used in buy model calculation
    assumptions.value.homeInsuranceAnnual, // Used in buy model calculation
    assumptions.value.homeAppreciation,
    assumptions.value.sellingCostsPct, // Used in buy model calculation
    assumptions.value.rentMonthly,
    assumptions.value.rentEscalation,
    assumptions.value.renterInsuranceAnnual, // Used in rent model calculation
    assumptions.value.securityDepositMonths, // Used in rent model calculation
    assumptions.value.investmentReturn,
  ].join('|')

  // Return cached result if assumptions haven't changed
  if (sensitivityCache && sensitivityCache.key === cacheKey) {
    return sensitivityCache.result
  }

  const scenarios: Scenario[] = [
    {
      id: 'base',
      label: 'Base (your inputs)',
      overrides: {},
    },
    {
      id: 'high-rate',
      label: 'Higher loan rate (+1%)',
      overrides: { loanRate: (Number(assumptions.value.loanRate) || 0) + 1 },
    },
    {
      id: 'low-app',
      label: 'Lower appreciation (−2%)',
      overrides: { homeAppreciation: (Number(assumptions.value.homeAppreciation) || 0) - 2 },
    },
    {
      id: 'high-rent',
      label: 'Higher rent escalation (+2%)',
      overrides: { rentEscalation: (Number(assumptions.value.rentEscalation) || 0) + 2 },
    },
    {
      id: 'high-discount',
      label: 'Higher discount rate (+2%)',
      overrides: { discountRate: (Number(assumptions.value.discountRate) || 0) + 2 },
    },
  ]

  const result = scenarios.map((s) => ({
    ...s,
    result: runScenario(s.overrides),
  }))

  // Cache the result
  sensitivityCache = { key: cacheKey, result }

  return result
})

// ===== Templates (synced per user via DB) =====
const CALCULATOR_KEY = 'rent-vs-buy'

interface Template {
  id: number
  calculator_key: string
  name: string
  description: string | null
  template_data: typeof defaultAssumptions
  is_default: boolean
  created_at: Date
  updated_at: Date
}

const savedTemplates = ref<Template[]>([])
const showTemplatesModal = ref(false)
const showSaveModal = ref(false)
const templateName = ref('')
const templateDescription = ref('')
const isDefaultTemplate = ref(false)
const isLoadingTemplates = ref(false)
const currentlyLoadedTemplateId = ref<number | null>(null)
const saveAsNew = ref(true)

const loadTemplates = async () => {
  isLoadingTemplates.value = true
  try {
    const response = await $fetch<{ success: boolean; templates: Template[] }>(
      `/api/calculator/templates?calculatorKey=${CALCULATOR_KEY}`,
      {
        // Add timeout to prevent hanging
        timeout: 10000, // 10 seconds
      },
    )
    if (response.success) savedTemplates.value = response.templates
  } catch (e) {
    console.error('[Rent vs Buy Calculator] Failed to load templates:', e)
    // Check if it's a database schema error (table might not exist)
    const errorData =
      e && typeof e === 'object' && 'data' in e
        ? (e as { data?: { error?: string; details?: string } }).data
        : null
    const errorMessage =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : 'Unknown error'

    if (
      errorData?.error === 'schema_missing' ||
      errorMessage.includes('schema needs updating') ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('relation') ||
      errorMessage.includes('column')
    ) {
      showToast(
        errorData?.details ||
          'Database migration required. Run: npm run migrate:calculator-templates:prod',
        'error',
      )
    } else {
      showToast('Failed to load templates. Please try again.', 'error')
    }
  } finally {
    isLoadingTemplates.value = false
  }
}

const saveTemplate = async () => {
  const name = templateName.value.trim()
  if (!name) {
    showToast('Template name is required', 'error')
    return
  }

  isLoadingTemplates.value = true
  try {
    const templateData = JSON.parse(JSON.stringify(assumptions.value))

    if (currentlyLoadedTemplateId.value && !saveAsNew.value) {
      const response = await $fetch<{ success: boolean; template: Template }>(
        `/api/calculator/templates/${currentlyLoadedTemplateId.value}`,
        {
          method: 'PUT',
          body: {
            name,
            description: templateDescription.value || null,
            template_data: templateData,
            is_default: isDefaultTemplate.value,
          },
        },
      )
      if (response.success) {
        showToast('Template updated', 'success')
        showSaveModal.value = false
        await loadTemplates()
      }
      return
    }

    const response = await $fetch<{ success: boolean; template: Template }>(
      '/api/calculator/templates',
      {
        method: 'POST',
        body: {
          calculator_key: CALCULATOR_KEY,
          name,
          description: templateDescription.value || null,
          template_data: templateData,
          is_default: isDefaultTemplate.value,
        },
      },
    )
    if (response.success) {
      showToast('Template saved', 'success')
      showSaveModal.value = false
      templateName.value = ''
      templateDescription.value = ''
      isDefaultTemplate.value = false
      currentlyLoadedTemplateId.value = null
      saveAsNew.value = true
      await loadTemplates()
    }
  } catch (e) {
    console.error(e)
    showToast('Failed to save template', 'error')
  } finally {
    isLoadingTemplates.value = false
  }
}

const loadTemplate = async (id: number) => {
  const t = savedTemplates.value.find((x) => x.id === id)
  if (!t) return
  assumptions.value = JSON.parse(JSON.stringify(t.template_data))
  syncMoneyInputsFromAssumptions()
  currentlyLoadedTemplateId.value = id
  // Default UX: when a template is loaded, "Save" should update it unless user opts to "Save as new".
  saveAsNew.value = false
  showTemplatesModal.value = false
  showToast(`Loaded: ${t.name}`, 'success')
}

const deleteTemplate = async (id: number) => {
  isLoadingTemplates.value = true
  try {
    const response = await $fetch<{ success: boolean }>(`/api/calculator/templates/${id}`, {
      method: 'DELETE',
    })
    if (response.success) {
      showToast('Template deleted', 'success')
      await loadTemplates()
    }
  } catch (e) {
    console.error(e)
    showToast('Failed to delete template', 'error')
  } finally {
    isLoadingTemplates.value = false
  }
}

// ===== PDF Export (rich report like car lease calculator) =====
const isExportingPDF = ref(false)

// Minimal jsPDF surface we use (keeps types stable across jsPDF versions/builds)
type PdfDoc = {
  internal: { pageSize: { width: number; height: number } }
  addPage: () => void
  save: (filename: string) => void
  setFontSize: (size: number) => void
  setFont: (fontName: string, fontStyle: 'normal' | 'bold') => void
  setTextColor: (r: number, g: number, b: number) => void
  setFillColor: (r: number, g: number, b: number) => void
  setDrawColor: (r: number, g: number, b: number) => void
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: { align?: 'center' | 'left' | 'right' },
  ) => void
  line: (x1: number, y1: number, x2: number, y2: number) => void
  rect: (x: number, y: number, w: number, h: number, style?: 'S' | 'F') => void
  roundedRect: (
    x: number,
    y: number,
    w: number,
    h: number,
    rx: number,
    ry: number,
    style?: 'S' | 'F',
  ) => void
  splitTextToSize: (text: string, maxWidth: number) => string[]
}

const formatCurrencyForPDF = (value: number) => {
  // jsPDF doesn't always play nicely with some currency symbols; for INR use "INR" prefix
  const code = assumptions.value.currency
  const safeValue = Number.isFinite(value) ? value : 0
  const n = formatNumberWithCommas(Math.round(safeValue))
  if (code === 'INR') return `INR ${n}`
  if (code === 'USD') return `USD ${n}`
  if (code === 'EUR') return `EUR ${n}`
  if (code === 'GBP') return `GBP ${n}`
  return `${code} ${n}`
}

const checkPageBreak = (doc: PdfDoc, y: number, neededHeight: number, margin: number) => {
  const pageHeight = doc.internal.pageSize.height
  if (y + neededHeight > pageHeight - margin) {
    doc.addPage()
    return margin
  }
  return y
}

const addColoredBox = (
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  fillRgb: [number, number, number],
  textRgb: [number, number, number] = [0, 0, 0],
) => {
  doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2])
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  doc.setTextColor(textRgb[0], textRgb[1], textRgb[2])
}

const addSectionHeader = (doc: PdfDoc, y: number, title: string, margin: number) => {
  y = checkPageBreak(doc, y, 14, margin)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)
  doc.text(title, margin, y)
  doc.setDrawColor(220, 220, 220)
  doc.line(margin, y + 2, doc.internal.pageSize.width - margin, y + 2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  return y + 10
}

const addKeyValueTable = (
  doc: PdfDoc,
  y: number,
  title: string,
  rows: Array<[string, string]>,
  margin: number,
) => {
  const pageWidth = doc.internal.pageSize.width
  const contentWidth = pageWidth - margin * 2
  y = addSectionHeader(doc, y, title, margin)
  const rowHeight = 7
  const leftW = Math.floor(contentWidth * 0.55)
  const rightW = contentWidth - leftW

  rows.forEach(([k, v]) => {
    y = checkPageBreak(doc, y, rowHeight + 2, margin)
    doc.setDrawColor(230, 230, 230)
    doc.rect(margin, y - 5, contentWidth, rowHeight, 'S')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(String(k), margin + 2, y)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(String(v), rightW - 6)
    doc.text(lines, margin + leftW + 2, y)
    y += rowHeight
  })
  return y + 4
}

const exportToPDF = async () => {
  isExportingPDF.value = true
  try {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    const margin = 16
    const pageWidth = doc.internal.pageSize.width
    const contentWidth = pageWidth - margin * 2
    let y = margin

    // ===== Cover page =====
    addColoredBox(doc, margin, y, contentWidth, 44, [2, 132, 199], [255, 255, 255])
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Rent vs Buy (EMI)', pageWidth / 2, y + 18, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Decision Analysis Report', pageWidth / 2, y + 30, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    y += 56

    // Info boxes
    const boxW = (contentWidth - 10) / 2
    const info = [
      [
        'Generated',
        new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
      ],
      ['Currency', assumptions.value.currency],
      ['Horizon', `${derived.value.years} years`],
      ['Discount rate', `${assumptions.value.discountRate}%`],
    ] as Array<[string, string]>
    let x = margin
    info.forEach((item, idx) => {
      if (idx > 0 && idx % 2 === 0) {
        x = margin
        y += 22
      }
      addColoredBox(doc, x, y, boxW, 18, [245, 245, 250], [0, 0, 0])
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(item[0], x + 4, y + 7)
      doc.setFont('helvetica', 'normal')
      doc.text(item[1], x + 4, y + 14)
      x += boxW + 10
    })
    y += 32

    // Executive summary
    const recColor: [number, number, number] =
      recommendation.value.recommended === 'Buy' ? [34, 197, 94] : [59, 130, 246]
    const summaryText = recommendation.value.explanation
    const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 16)
    const summaryHeight = 12 + summaryLines.length * 5.5 + 10
    addColoredBox(doc, margin, y, contentWidth, summaryHeight, recColor, [255, 255, 255])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('EXECUTIVE SUMMARY', margin + 8, y + 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(summaryLines, margin + 8, y + 18)
    doc.setTextColor(0, 0, 0)

    // ===== Page 2: Inputs & methodology =====
    doc.addPage()
    y = margin

    y = addKeyValueTable(
      doc,
      y,
      '1. Inputs snapshot',
      [
        ['Home price', formatCurrencyForPDF(derived.value.homePrice)],
        ['Down payment', formatCurrencyForPDF(derived.value.downPayment)],
        ['Down payment %', `${assumptions.value.downPaymentPct}%`],
        ['Loan rate', `${assumptions.value.loanRate}%`],
        ['Loan tenure', `${assumptions.value.loanTenureYears} years`],
        ['Closing costs %', `${assumptions.value.closingCostsPct}%`],
        ['Property tax %/yr', `${assumptions.value.propertyTaxPct}%`],
        ['Maintenance %/yr', `${assumptions.value.maintenancePct}%`],
        [
          'Home insurance / yr',
          formatCurrencyForPDF(Number(assumptions.value.homeInsuranceAnnual) || 0),
        ],
        ['Home appreciation %/yr', `${assumptions.value.homeAppreciation}%`],
        ['Selling costs %', `${assumptions.value.sellingCostsPct}%`],
        ['Monthly rent', formatCurrencyForPDF(Number(assumptions.value.rentMonthly) || 0)],
        ['Rent escalation %/yr', `${assumptions.value.rentEscalation}%`],
        ['Deposit (months)', `${assumptions.value.securityDepositMonths}`],
        [
          'Renter insurance / yr',
          formatCurrencyForPDF(Number(assumptions.value.renterInsuranceAnnual) || 0),
        ],
        ['Investment return %/yr', `${assumptions.value.investmentReturn}%`],
        ['Discount rate %/yr', `${assumptions.value.discountRate}%`],
      ],
      margin,
    )

    y = addSectionHeader(doc, y, '2. Method (how we decide)', margin)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const method = [
      `We compare Rent vs Buy by estimating net present cost (NPV) over ${derived.value.years} years.`,
      'Buy includes: upfront down payment + closing costs, monthly EMI + taxes + maintenance + insurance, and end equity (home value minus remaining loan and selling costs).',
      'Rent includes: monthly rent with annual escalation + renter insurance, refundable deposit at end, and investing the buy-upfront amount at your investment return.',
      `Future values are discounted using your discount rate (${assumptions.value.discountRate}%).`,
    ]
    method.forEach((line) => {
      const lines = doc.splitTextToSize(line, contentWidth)
      y = checkPageBreak(doc, y, lines.length * 5 + 4, margin)
      doc.text(lines, margin, y)
      y += lines.length * 5 + 3
    })

    // ===== Page 3: Results =====
    doc.addPage()
    y = margin
    y = addKeyValueTable(
      doc,
      y,
      '3. Results',
      [
        ['Buy: net present cost', formatCurrencyForPDF(buyModel.value.npvNetCost)],
        ['Rent: net present cost', formatCurrencyForPDF(rentModel.value.npvNetCost)],
        ['Advantage (NPV)', formatCurrencyForPDF(recommendation.value.savings)],
        ['Recommended', recommendation.value.recommended],
        ['Buy: monthly outflow (est.)', formatCurrencyForPDF(buyModel.value.monthlyOutflow)],
        ['Buy: equity at end (est.)', formatCurrencyForPDF(buyModel.value.equityEnd)],
        ['Rent: avg monthly (est.)', formatCurrencyForPDF(rentModel.value.avgMonthly)],
        ['Rent: investment at end', formatCurrencyForPDF(rentModel.value.investFinal)],
      ],
      margin,
    )

    y = addSectionHeader(doc, y, '4. Sensitivity (quick scenarios)', margin)
    const sensRows = sensitivity.value.map((s) => [
      s.label,
      s.result.rec,
      formatCurrencyForPDF(s.result.buy),
      formatCurrencyForPDF(s.result.rent),
      formatCurrencyForPDF(s.result.savings),
    ])

    // simple table rendering
    const colTitles = ['Scenario', 'Recommended', 'Buy (NPV)', 'Rent (NPV)', 'Savings']
    const colWidths = [70, 30, 28, 28, 28]
    const rowH = 8
    y = checkPageBreak(doc, y, 16, margin)
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, y - 6, contentWidth, rowH, 'F')
    let cx = margin
    colTitles.forEach((t, i) => {
      doc.text(t, cx + 2, y)
      cx += colWidths[i]
    })
    doc.setFont('helvetica', 'normal')
    y += rowH

    sensRows.forEach((r, idx) => {
      y = checkPageBreak(doc, y, rowH + 2, margin)
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, y - 6, contentWidth, rowH, 'F')
      }
      let x2 = margin
      r.forEach((cell, i) => {
        const lines = doc.splitTextToSize(String(cell), colWidths[i] - 4)
        doc.text(lines, x2 + 2, y)
        x2 += colWidths[i]
      })
      y += rowH
    })

    doc.save(`rent-vs-buy-${new Date().toISOString().slice(0, 10)}.pdf`)
    showToast('PDF exported', 'success')
  } catch (e) {
    console.error(e)
    showToast('Failed to export PDF', 'error')
  } finally {
    isExportingPDF.value = false
  }
}

// ===== Lifecycle =====
onMounted(async () => {
  // Sync money inputs first so page renders immediately
  syncMoneyInputsFromAssumptions()

  // Check auth with timeout to prevent hanging
  try {
    const authPromise = checkAuth()
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), 5000) // 5 second timeout
    })

    await Promise.race([authPromise, timeoutPromise])
  } catch (error) {
    console.warn('[Rent vs Buy Calculator] Auth check failed, but continuing:', error)
    // Don't block page load if auth check fails
  }
})

watch(
  () => showTemplatesModal.value,
  (open) => {
    if (open) loadTemplates()
  },
)
</script>

<template>
  <div class="py-6 sm:py-10 container mx-auto max-w-7xl px-3 sm:px-6 w-full overflow-x-hidden">
    <!-- Header -->
    <div class="text-center mb-8 sm:mb-12">
      <div class="flex flex-row flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-3">
        <NuxtLink
          to="/dev"
          class="inline-flex items-center text-sm text-sky-600 dark:text-sky-400 hover:underline"
        >
          <Icon icon="mdi:arrow-left" class="mr-1.5 text-base" />
          Back to Utilities
        </NuxtLink>
        <span class="hidden sm:inline text-gray-300 dark:text-slate-600">|</span>
        <button
          class="inline-flex items-center px-2.5 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          @click="showTemplatesModal = true"
        >
          <Icon icon="mdi:file-multiple" class="mr-1.5 text-base" />
          Templates
        </button>
        <button
          class="inline-flex items-center px-2.5 py-1.5 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
          @click="showSaveModal = true"
        >
          <Icon icon="mdi:content-save" class="mr-1.5 text-base" />
          Save
        </button>
        <button
          :disabled="isExportingPDF"
          class="inline-flex items-center px-2.5 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="exportToPDF"
        >
          <Icon icon="mdi:file-pdf-box" class="mr-1.5 text-base" />
          {{ isExportingPDF ? 'Exporting…' : 'PDF' }}
        </button>
      </div>
      <h1 class="text-3xl sm:text-4xl font-bold mb-3 text-zinc-800 dark:text-zinc-200">
        Rent vs Buy (EMI) Calculator
      </h1>
      <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
        Compare renting vs buying with EMI, taxes, maintenance, appreciation, and investment
        opportunity cost using an NPV-style decision metric.
      </p>
    </div>

    <!-- Recommendation Banner -->
    <div
      class="mb-6 p-5 rounded-lg border-2"
      :class="
        recommendation.recommended === 'Buy'
          ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600'
      "
    >
      <div class="flex items-start gap-4">
        <Icon
          :icon="recommendation.recommended === 'Buy' ? 'mdi:check-circle' : 'mdi:information'"
          class="text-3xl flex-shrink-0"
          :class="
            recommendation.recommended === 'Buy'
              ? 'text-green-600 dark:text-green-400'
              : 'text-blue-600 dark:text-blue-400'
          "
        />
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold mb-2">
            <span
              :class="
                recommendation.recommended === 'Buy'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-blue-700 dark:text-blue-300'
              "
            >
              Recommended: {{ recommendation.recommended }}
            </span>
          </h2>
          <p class="text-base sm:text-lg mb-2">
            <span class="font-semibold">Estimated advantage (NPV):</span>
            {{ formatCurrency(recommendation.savings) }}
          </p>
          <p class="text-sm opacity-90 break-words">{{ recommendation.explanation }}</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div
      class="mb-6 border-b border-gray-300 dark:border-slate-700 mx-0 sm:-mx-3 px-0 sm:px-0 overflow-x-auto whitespace-nowrap w-full max-w-full min-w-0"
      style="scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch"
    >
      <div class="flex gap-2 min-w-max w-max">
        <button
          v-for="tab in [
            { id: 'assumptions', label: '01 Assumptions', icon: 'mdi:cog' },
            { id: 'buy', label: '02 Buy (EMI)', icon: 'mdi:home' },
            { id: 'rent', label: '03 Rent', icon: 'mdi:home-outline' },
            { id: 'comparison', label: '04 Comparison', icon: 'mdi:scale-balance' },
          ] as const"
          :key="tab.id"
          class="px-4 py-2 font-semibold transition-colors border-b-2 flex-shrink-0"
          :class="
            activeTab === tab.id
              ? 'border-sky-600 text-sky-700 dark:text-sky-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          "
          @click="activeTab = tab.id"
        >
          <Icon :icon="tab.icon" class="inline mr-2" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div
      class="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-slate-800 min-w-0 overflow-x-hidden"
    >
      <!-- Assumptions -->
      <div v-show="activeTab === 'assumptions'" class="space-y-6">
        <!-- India tier preset -->
        <div
          class="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50"
        >
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="min-w-0">
              <h3 class="text-base font-bold text-zinc-800 dark:text-zinc-200">
                India city tier preset
              </h3>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Applies realistic defaults (rent escalation, appreciation, maintenance, etc.). It
                won’t change your home price/rent unless you enter them.
              </p>
            </div>
          </div>

          <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                >Tier</label
              >
              <select
                v-model="indiaTier"
                class="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-slate-700 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="metro">Tier 1 (Metro)</option>
                <option value="tier2">Tier 2</option>
                <option value="tier3">Tier 3</option>
              </select>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <input
                id="preset-overwrite"
                v-model="applyPresetOverwrite"
                type="checkbox"
                class="w-4 h-4"
              />
              <label for="preset-overwrite" class="text-gray-700 dark:text-gray-300">
                Overwrite existing values
              </label>
            </div>
            <button
              type="button"
              class="w-full sm:w-auto px-4 py-2.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
              @click="applyIndiaTierPreset"
            >
              Apply preset
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >Currency</label
            >
            <select
              v-model="assumptions.currency"
              class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option v-for="(curr, code) in currencies" :key="code" :value="code">
                {{ curr.symbol }} - {{ curr.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >Analysis horizon (years)</label
            >
            <input
              v-model.number="assumptions.analysisYears"
              type="number"
              min="1"
              max="40"
              class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >Discount rate (NPV) %</label
            >
            <input
              v-model.number="assumptions.discountRate"
              type="number"
              min="0"
              max="30"
              step="0.1"
              class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Used to discount future cashflows. Often set equal to expected investment return.
            </p>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >Investment return %</label
            >
            <input
              v-model.number="assumptions.investmentReturn"
              type="number"
              min="0"
              max="30"
              step="0.1"
              class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800"
          >
            <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center">
              <Icon icon="mdi:home" class="mr-2 text-sky-600" /> Buy inputs
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Home price</label
                >
                <input
                  :value="moneyInputs.homePrice"
                  type="text"
                  inputmode="numeric"
                  placeholder="0"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                  @input="updateMoneyField('homePrice', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Down payment %</label
                >
                <input
                  v-model.number="assumptions.downPaymentPct"
                  type="number"
                  min="0"
                  max="100"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Loan rate %</label
                >
                <input
                  v-model.number="assumptions.loanRate"
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Loan tenure (yrs)</label
                >
                <input
                  v-model.number="assumptions.loanTenureYears"
                  type="number"
                  min="1"
                  max="40"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Closing costs %</label
                >
                <input
                  v-model.number="assumptions.closingCostsPct"
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Home appreciation %</label
                >
                <input
                  v-model.number="assumptions.homeAppreciation"
                  type="number"
                  min="-10"
                  max="20"
                  step="0.1"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Property tax %/yr</label
                >
                <input
                  v-model.number="assumptions.propertyTaxPct"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Maintenance %/yr</label
                >
                <input
                  v-model.number="assumptions.maintenancePct"
                  type="number"
                  min="0"
                  max="15"
                  step="0.1"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Home insurance / yr</label
                >
                <input
                  :value="moneyInputs.homeInsuranceAnnual"
                  type="text"
                  inputmode="numeric"
                  placeholder="0"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                  @input="
                    updateMoneyField(
                      'homeInsuranceAnnual',
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Selling costs %</label
                >
                <input
                  v-model.number="assumptions.sellingCostsPct"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                />
              </div>
            </div>
          </div>

          <div
            class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800"
          >
            <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center">
              <Icon icon="mdi:home-outline" class="mr-2 text-sky-600" /> Rent inputs
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Monthly rent</label
                >
                <input
                  :value="moneyInputs.rentMonthly"
                  type="text"
                  inputmode="numeric"
                  placeholder="0"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                  @input="
                    updateMoneyField('rentMonthly', ($event.target as HTMLInputElement).value)
                  "
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Rent escalation %/yr</label
                >
                <input
                  v-model.number="assumptions.rentEscalation"
                  type="number"
                  min="-10"
                  max="20"
                  step="0.1"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Renter insurance / yr</label
                >
                <input
                  :value="moneyInputs.renterInsuranceAnnual"
                  type="text"
                  inputmode="numeric"
                  placeholder="0"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                  @input="
                    updateMoneyField(
                      'renterInsuranceAnnual',
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Security deposit (months)</label
                >
                <input
                  v-model.number="assumptions.securityDepositMonths"
                  type="number"
                  min="0"
                  max="24"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Assumed returned at the end (no interest).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Buy -->
      <div v-show="activeTab === 'buy'" class="space-y-5 sm:space-y-6">
        <h2
          class="text-xl sm:text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center"
        >
          <Icon icon="mdi:home" class="mr-2 text-sky-600" />
          Buy (EMI) Breakdown
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800"
          >
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Down payment</p>
            <p class="text-lg sm:text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ formatCurrency(derived.downPayment) }}
            </p>
          </div>
          <div
            class="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-slate-700"
          >
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly outflow (est.)</p>
            <p class="text-lg sm:text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ formatCurrency(buyModel.monthlyOutflow) }}
            </p>
          </div>
          <div
            class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800"
          >
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Equity at end (est.)</p>
            <p class="text-lg sm:text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ formatCurrency(buyModel.equityEnd) }}
            </p>
          </div>
        </div>

        <div class="overflow-x-auto mx-0 sm:-mx-3 min-w-0 max-w-full">
          <table class="w-full border-collapse text-sm min-w-[520px] sm:min-w-0">
            <tbody>
              <tr>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 font-medium whitespace-nowrap"
                >
                  Upfront (down + closing)
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 text-right"
                >
                  {{ formatCurrency(buyModel.upfront) }}
                </td>
              </tr>
              <tr>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 font-medium whitespace-nowrap"
                >
                  Monthly EMI
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 text-right"
                >
                  {{ formatCurrency(derived.emi) }}
                </td>
              </tr>
              <tr>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 font-medium whitespace-nowrap"
                >
                  Property tax / year
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 text-right"
                >
                  {{ formatCurrency(buyModel.propertyTaxAnnual) }}
                </td>
              </tr>
              <tr>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 font-medium whitespace-nowrap"
                >
                  Maintenance / year
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 text-right"
                >
                  {{ formatCurrency(buyModel.maintenanceAnnual) }}
                </td>
              </tr>
              <tr>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 font-medium whitespace-nowrap"
                >
                  Home value at end
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 text-right"
                >
                  {{ formatCurrency(buyModel.homeValueEnd) }}
                </td>
              </tr>
              <tr>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 font-medium whitespace-nowrap"
                >
                  Remaining loan at end
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 text-right"
                >
                  {{ formatCurrency(buyModel.remainingBalanceEnd) }}
                </td>
              </tr>
              <tr class="bg-gray-100 dark:bg-slate-800 font-bold">
                <td class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2">
                  Net present cost (Buy)
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 text-right"
                >
                  {{ formatCurrency(buyModel.npvNetCost) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Rent -->
      <div v-show="activeTab === 'rent'" class="space-y-5 sm:space-y-6">
        <h2
          class="text-xl sm:text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center"
        >
          <Icon icon="mdi:home-outline" class="mr-2 text-sky-600" />
          Rent Breakdown
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800"
          >
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly rent (start)</p>
            <p class="text-lg sm:text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ formatCurrency(rentModel.rent0) }}
            </p>
          </div>
          <div
            class="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-slate-700"
          >
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Security deposit</p>
            <p class="text-lg sm:text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ formatCurrency(rentModel.deposit) }}
            </p>
          </div>
          <div
            class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800"
          >
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Investment value at end</p>
            <p class="text-lg sm:text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ formatCurrency(rentModel.investFinal) }}
            </p>
          </div>
        </div>

        <div class="overflow-x-auto mx-0 sm:-mx-3 min-w-0 max-w-full">
          <table class="w-full border-collapse text-sm min-w-[520px] sm:min-w-0">
            <tbody>
              <tr>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 font-medium whitespace-nowrap"
                >
                  Invested base (buy upfront)
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 text-right"
                >
                  {{ formatCurrency(rentModel.investBase) }}
                </td>
              </tr>
              <tr>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 font-medium whitespace-nowrap"
                >
                  Investment gain (est.)
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 text-right"
                >
                  {{ formatCurrency(rentModel.investGain) }}
                </td>
              </tr>
              <tr class="bg-gray-100 dark:bg-slate-800 font-bold">
                <td class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2">
                  Net present cost (Rent)
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-2 text-right"
                >
                  {{ formatCurrency(rentModel.npvNetCost) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Comparison -->
      <div v-show="activeTab === 'comparison'" class="space-y-5 sm:space-y-6">
        <h2
          class="text-xl sm:text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center"
        >
          <Icon icon="mdi:scale-balance" class="mr-2 text-sky-600" />
          Final Comparison
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800"
          >
            <h3 class="font-semibold text-lg mb-3 text-zinc-800 dark:text-zinc-200">Buy</h3>
            <div class="space-y-2">
              <div class="flex justify-between gap-2 items-baseline">
                <span class="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0"
                  >NPV net cost:</span
                >
                <span class="font-bold text-lg text-right min-w-0 break-all">{{
                  formatCurrency(buyModel.npvNetCost)
                }}</span>
              </div>
              <div class="flex justify-between gap-2 items-baseline">
                <span class="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0"
                  >Monthly outflow (est.):</span
                >
                <span class="font-semibold text-right min-w-0 break-all">{{
                  formatCurrency(buyModel.monthlyOutflow)
                }}</span>
              </div>
              <div class="flex justify-between gap-2 items-baseline">
                <span class="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0"
                  >Equity at end:</span
                >
                <span class="font-semibold text-right min-w-0 break-all">{{
                  formatCurrency(buyModel.equityEnd)
                }}</span>
              </div>
            </div>
          </div>

          <div
            class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
          >
            <h3 class="font-semibold text-lg mb-3 text-zinc-800 dark:text-zinc-200">Rent</h3>
            <div class="space-y-2">
              <div class="flex justify-between gap-2 items-baseline">
                <span class="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0"
                  >NPV net cost:</span
                >
                <span class="font-bold text-lg text-right min-w-0 break-all">{{
                  formatCurrency(rentModel.npvNetCost)
                }}</span>
              </div>
              <div class="flex justify-between gap-2 items-baseline">
                <span class="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0"
                  >Avg monthly (est.):</span
                >
                <span class="font-semibold text-right min-w-0 break-all">{{
                  formatCurrency(rentModel.avgMonthly)
                }}</span>
              </div>
              <div class="flex justify-between gap-2 items-baseline">
                <span class="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0"
                  >Investment at end:</span
                >
                <span class="font-semibold text-right min-w-0 break-all">{{
                  formatCurrency(rentModel.investFinal)
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-3 sm:p-4"
        >
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">Sensitivity</h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Quick “what-if” checks so you can see when the decision flips.
          </p>
          <div class="overflow-x-auto mx-0 sm:-mx-3 min-w-0 max-w-full">
            <table class="w-full border-collapse text-sm min-w-[720px] sm:min-w-0">
              <thead>
                <tr class="bg-gray-100 dark:bg-slate-800">
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-left">
                    Scenario
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-left">
                    Recommended
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    Buy (NPV)
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    Rent (NPV)
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    Savings
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="s in sensitivity"
                  :key="s.id"
                  class="hover:bg-gray-50 dark:hover:bg-slate-800/50"
                >
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2">
                    <span class="font-medium text-zinc-800 dark:text-zinc-200">{{ s.label }}</span>
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2">
                    <span class="font-semibold">{{ s.result.rec }}</span>
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    {{ formatCurrency(s.result.buy) }}
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    {{ formatCurrency(s.result.rent) }}
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    {{ formatCurrency(s.result.savings) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Templates Modal -->
    <div
      v-if="showTemplatesModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4"
      @click.self="showTemplatesModal = false"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-200">Local Templates</h3>
          <button class="text-gray-500 hover:text-gray-700" @click="showTemplatesModal = false">
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div v-if="isLoadingTemplates" class="text-sm text-gray-600 dark:text-gray-400">
          Loading templates...
        </div>
        <div
          v-else-if="savedTemplates.length === 0"
          class="text-sm text-gray-600 dark:text-gray-400"
        >
          No templates saved yet.
        </div>
        <div v-else class="space-y-2 max-h-[60vh] overflow-y-auto">
          <div
            v-for="t in savedTemplates"
            :key="t.id"
            class="border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex items-start justify-between gap-3"
          >
            <div class="min-w-0">
              <div class="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {{ t.name }}
              </div>
              <div v-if="t.description" class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {{ t.description }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Updated: {{ new Date(t.updated_at).toLocaleString() }}
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                class="px-3 py-1.5 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700"
                @click="loadTemplate(t.id)"
              >
                Load
              </button>
              <button
                class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                @click="deleteTemplate(t.id)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Templates are synced to your account and scoped to this calculator.
        </p>
      </div>
    </div>

    <!-- Save Template Modal -->
    <div
      v-if="showSaveModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4"
      @click.self="showSaveModal = false"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-200">Save template</h3>
          <button class="text-gray-500 hover:text-gray-700" @click="showSaveModal = false">
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >Name</label
            >
            <input
              v-model="templateName"
              type="text"
              class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
              placeholder="e.g., Bangalore 2BHK, 2026"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
              >Description (optional)</label
            >
            <textarea
              v-model="templateDescription"
              rows="3"
              class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
              placeholder="Any notes about assumptions..."
            />
          </div>
          <div v-if="currentlyLoadedTemplateId" class="flex items-center gap-2 text-xs">
            <input id="save-as-new" v-model="saveAsNew" type="checkbox" class="w-4 h-4" />
            <label for="save-as-new" class="text-gray-600 dark:text-gray-400">
              Save as new (uncheck to overwrite loaded template)
            </label>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <input id="is-default" v-model="isDefaultTemplate" type="checkbox" class="w-4 h-4" />
            <label for="is-default" class="text-gray-600 dark:text-gray-400">
              Set as default
            </label>
          </div>
          <button
            :disabled="isLoadingTemplates"
            class="w-full px-4 py-2.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors disabled:opacity-50"
            @click="saveTemplate"
          >
            {{ isLoadingTemplates ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <CommonToast />
  </div>
</template>
