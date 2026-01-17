<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { seoData } from '~/data'
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  middleware: 'auth-calculator',
})

const { checkAuth } = useAuth()

useHead({
  title: 'Car Ownership vs Lease Calculator',
  meta: [
    {
      name: 'description',
      content:
        'Compare owning a car vs leasing options (A/B/C) with tax savings, reimbursements, and opportunity cost analysis',
    },
    { property: 'og:site_name', content: seoData.mySite },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${seoData.mySite}/dev/utilities/car-lease-calculator` },
    { property: 'og:title', content: 'Car Ownership vs Lease Calculator' },
    {
      property: 'og:description',
      content:
        'Professional financial model to compare car ownership vs leasing with tax benefits and investment returns',
    },
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/dev/utilities/car-lease-calculator` }],
})

// Default assumptions
const defaultAssumptions = {
  // General
  analysisPeriod: 5,
  annualDistance: 16000,
  fuelPrice: 100,
  mileage: 10,

  // Owned Car (Nexon)
  currentMarketValue: 700000,
  expectedValueAfter5Years: 200000,
  annualInsurance: 30000,
  annualServiceMaintenance: 15000,
  majorRepairs5Years: 50000,
  tyreReplacement: 20000,

  // Lease Options
  leaseTenure: 60,
  optionA_EMI: 25000,
  optionB_EMI: 30000,
  optionC_EMI: 35000,
  allowedKMperYear: 15000,
  extraKMCharge: 5,

  // Reimbursements
  fuelReimbursementCap: 120000,
  driverReimbursementCap: 180000,

  // Tax & Investment
  incomeTaxBracket: 30,
  returnOnInvestedCapital: 5,
}

// ========== ASSUMPTIONS (EDITABLE INPUTS) ==========
const assumptions = ref({ ...defaultAssumptions })

// Template management
const showSaveModal = ref(false)
const templateName = ref('')
const templateDescription = ref('')
const isDefaultTemplate = ref(false)
const isLoading = ref(false)

// Load template from localStorage on mount
onMounted(async () => {
  await checkAuth()
  const savedData = localStorage.getItem('calculator_assumptions')
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData)
      assumptions.value = { ...defaultAssumptions, ...parsed }
    } catch (e) {
      console.error('Error loading saved assumptions:', e)
    }
  }
})

// Auto-save to localStorage when assumptions change
watch(
  assumptions,
  (newVal) => {
    localStorage.setItem('calculator_assumptions', JSON.stringify(newVal))
  },
  { deep: true },
)

const saveTemplate = async () => {
  if (!templateName.value.trim()) {
    alert('Template name is required')
    return
  }

  isLoading.value = true
  try {
    const response = await $fetch<{ success: boolean; template: unknown }>(
      '/api/calculator/templates',
      {
        method: 'POST',
        body: {
          name: templateName.value,
          description: templateDescription.value || null,
          template_data: assumptions.value,
          is_default: isDefaultTemplate.value,
        },
      },
    )

    if (response.success) {
      showSaveModal.value = false
      templateName.value = ''
      templateDescription.value = ''
      isDefaultTemplate.value = false
      alert('Template saved successfully!')
    }
  } catch (error) {
    console.error('Error saving template:', error)
    alert('Failed to save template')
  } finally {
    isLoading.value = false
  }
}

// ========== CALCULATIONS ==========

// Sheet 2: Nexon Ownership Costs
const ownershipCosts = computed(() => {
  const years = []
  let totalFuel = 0
  let totalInsurance = 0
  let totalService = 0
  let totalRepairs = 0

  for (let year = 1; year <= assumptions.value.analysisPeriod; year++) {
    const fuelCost =
      (assumptions.value.annualDistance / assumptions.value.mileage) * assumptions.value.fuelPrice
    const insurance = assumptions.value.annualInsurance
    const service = assumptions.value.annualServiceMaintenance
    let repairs = 0

    // Repairs apply only in year 4 & 5
    if (year === 4) {
      repairs = assumptions.value.tyreReplacement
    } else if (year === 5) {
      repairs = assumptions.value.majorRepairs5Years
    }

    totalFuel += fuelCost
    totalInsurance += insurance
    totalService += service
    totalRepairs += repairs

    years.push({
      year,
      fuelCost,
      insurance,
      service,
      repairs,
      total: fuelCost + insurance + service + repairs,
    })
  }

  const total5Years = totalFuel + totalInsurance + totalService + totalRepairs
  const netOwnershipCost = total5Years - assumptions.value.expectedValueAfter5Years

  return {
    years,
    total5Years,
    resaleValue: assumptions.value.expectedValueAfter5Years,
    netOwnershipCost,
  }
})

// Sheet 3: Lease Comparison
const leaseOptions = computed(() => {
  const calculateLeaseOption = (emi: number, optionName: string) => {
    const annualEMI = emi * 12
    const annualFuelCost =
      (assumptions.value.annualDistance / assumptions.value.mileage) * assumptions.value.fuelPrice
    const extraKM = Math.max(
      0,
      assumptions.value.annualDistance - assumptions.value.allowedKMperYear,
    )
    const extraKMCost = extraKM * assumptions.value.extraKMCharge
    const grossAnnualCost = annualEMI + annualFuelCost + extraKMCost

    // Reimbursement = MIN(Fuel Cost, Fuel Cap) + Driver Cap
    const fuelReimbursement = Math.min(annualFuelCost, assumptions.value.fuelReimbursementCap)
    const reimbursement = fuelReimbursement + assumptions.value.driverReimbursementCap

    // Tax Saving on Lease EMI
    const taxSaving = annualEMI * (assumptions.value.incomeTaxBracket / 100)

    // Net Annual Cost
    const netAnnualCost = grossAnnualCost - reimbursement - taxSaving

    // Net 5-Year Cost
    const net5YearCost = netAnnualCost * assumptions.value.analysisPeriod

    return {
      optionName,
      annualEMI,
      annualFuelCost,
      extraKM,
      extraKMCost,
      grossAnnualCost,
      reimbursement,
      taxSaving,
      netAnnualCost,
      net5YearCost,
    }
  }

  return {
    optionA: calculateLeaseOption(assumptions.value.optionA_EMI, 'Option A'),
    optionB: calculateLeaseOption(assumptions.value.optionB_EMI, 'Option B'),
    optionC: calculateLeaseOption(assumptions.value.optionC_EMI, 'Option C'),
  }
})

// Sheet 4: Investment Return
const investmentReturn = computed(() => {
  const years = []
  let openingValue = assumptions.value.currentMarketValue
  const returnRate = assumptions.value.returnOnInvestedCapital / 100

  for (let year = 1; year <= assumptions.value.analysisPeriod; year++) {
    const interestEarned = openingValue * returnRate
    const closingValue = openingValue + interestEarned

    years.push({
      year,
      openingValue,
      interestEarned,
      closingValue,
    })

    openingValue = closingValue
  }

  const finalValue = years[years.length - 1].closingValue
  const totalGain = finalValue - assumptions.value.currentMarketValue

  return {
    years,
    finalValue,
    totalGain,
  }
})

// Sheet 5: Final Comparison
const finalComparison = computed(() => {
  const bestLeaseOption = (() => {
    const options = [
      { name: 'Option A', cost: leaseOptions.value.optionA.net5YearCost },
      { name: 'Option B', cost: leaseOptions.value.optionB.net5YearCost },
      { name: 'Option C', cost: leaseOptions.value.optionC.net5YearCost },
    ]
    return options.reduce((min, option) => (option.cost < min.cost ? option : min))
  })()

  const bestLeaseData =
    bestLeaseOption.name === 'Option A'
      ? leaseOptions.value.optionA
      : bestLeaseOption.name === 'Option B'
        ? leaseOptions.value.optionB
        : leaseOptions.value.optionC

  return {
    ownedNexon: {
      operatingCost: ownershipCosts.value.total5Years,
      resaleGain: -assumptions.value.expectedValueAfter5Years, // Negative because it reduces cost
      netCost: ownershipCosts.value.netOwnershipCost,
      avgMonthlyCost:
        ownershipCosts.value.netOwnershipCost / (assumptions.value.analysisPeriod * 12),
      maintenanceRisk: 'High',
      taxBenefit: 'None',
      assetAtEnd: assumptions.value.expectedValueAfter5Years,
    },
    leasedCar: {
      operatingCost: bestLeaseData.net5YearCost,
      investmentGain: investmentReturn.value.totalGain,
      netCost: bestLeaseData.net5YearCost - investmentReturn.value.totalGain,
      avgMonthlyCost:
        (bestLeaseData.net5YearCost - investmentReturn.value.totalGain) /
        (assumptions.value.analysisPeriod * 12),
      maintenanceRisk: 'Low (Included)',
      taxBenefit: `₹${bestLeaseData.taxSaving.toLocaleString('en-IN')}/year`,
      assetAtEnd: investmentReturn.value.finalValue,
      optionName: bestLeaseOption.name,
    },
  }
})

// Sheet 6: Recommendation
const recommendation = computed(() => {
  const ownedCost = ownershipCosts.value.netOwnershipCost
  const leasedCost = finalComparison.value.leasedCar.netCost

  if (leasedCost < ownedCost) {
    return {
      recommended: finalComparison.value.leasedCar.optionName,
      netCost: leasedCost,
      savings: ownedCost - leasedCost,
      explanation: `${finalComparison.value.leasedCar.optionName} is recommended. Leasing saves ₹${(ownedCost - leasedCost).toLocaleString('en-IN')} over 5 years compared to owning.`,
    }
  } else {
    return {
      recommended: 'Owned Nexon',
      netCost: ownedCost,
      savings: leasedCost - ownedCost,
      explanation: `Keeping your owned Nexon is recommended. It saves ₹${(leasedCost - ownedCost).toLocaleString('en-IN')} over 5 years compared to leasing.`,
    }
  }
})

// Format currency
const formatCurrency = (value: number) => {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

// Active tab state
const activeTab = ref('assumptions')
</script>

<template>
  <div class="py-10 container mx-auto max-w-7xl px-6">
    <!-- Header -->
    <div class="text-center mb-12">
      <div class="flex items-center justify-center gap-4 mb-4">
        <NuxtLink
          to="/dev"
          class="inline-flex items-center text-sky-600 dark:text-sky-400 hover:underline"
        >
          <Icon icon="mdi:arrow-left" class="mr-2" />
          Back to Utilities
        </NuxtLink>
        <NuxtLink
          to="/dev/utilities/calculator-templates"
          class="inline-flex items-center text-sky-600 dark:text-sky-400 hover:underline"
        >
          <Icon icon="mdi:folder-multiple" class="mr-2" />
          Templates
        </NuxtLink>
        <button
          class="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
          @click="showSaveModal = true"
        >
          <Icon icon="mdi:content-save" class="mr-2" />
          Save Template
        </button>
      </div>
      <h1 class="text-4xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
        Car Ownership vs Lease Calculator
      </h1>
      <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
        Compare owning your car vs leasing options (A/B/C) with tax savings, reimbursements, and
        opportunity cost analysis. Save and load different scenarios as templates.
      </p>
    </div>

    <!-- Recommendation Banner -->
    <div
      class="mb-8 p-6 rounded-lg border-2"
      :class="
        recommendation.recommended.includes('Option')
          ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600'
      "
    >
      <div class="flex items-start gap-4">
        <Icon
          :icon="
            recommendation.recommended.includes('Option') ? 'mdi:check-circle' : 'mdi:information'
          "
          class="text-3xl flex-shrink-0"
          :class="
            recommendation.recommended.includes('Option')
              ? 'text-green-600 dark:text-green-400'
              : 'text-blue-600 dark:text-blue-400'
          "
        />
        <div class="flex-1">
          <h2 class="text-2xl font-bold mb-2">
            <span
              :class="
                recommendation.recommended.includes('Option')
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-blue-700 dark:text-blue-300'
              "
            >
              Recommended: {{ recommendation.recommended }}
            </span>
          </h2>
          <p class="text-lg mb-2">
            <span class="font-semibold">Net 5-Year Cost:</span>
            {{ formatCurrency(recommendation.netCost) }}
          </p>
          <p class="text-base opacity-90">{{ recommendation.explanation }}</p>
        </div>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="mb-6 flex flex-wrap gap-2 border-b border-gray-300 dark:border-slate-700">
      <button
        v-for="tab in [
          { id: 'assumptions', label: '01 Assumptions', icon: 'mdi:cog' },
          { id: 'ownership', label: '02 Ownership', icon: 'mdi:car' },
          { id: 'lease', label: '03 Lease Comparison', icon: 'mdi:file-compare' },
          { id: 'investment', label: '04 Investment', icon: 'mdi:chart-line' },
          { id: 'comparison', label: '05 Final Comparison', icon: 'mdi:scale-balance' },
        ]"
        :key="tab.id"
        class="px-4 py-2 font-semibold transition-colors border-b-2"
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

    <!-- Tab Content -->
    <div
      class="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-800"
    >
      <!-- 01 ASSUMPTIONS -->
      <div v-show="activeTab === 'assumptions'" class="space-y-8">
        <div>
          <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center">
            <Icon icon="mdi:cog" class="mr-2 text-sky-600" />
            Assumptions (Edit Here)
          </h2>
          <p class="text-sm text-zinc-500 dark:text-zinc-500 mb-6 italic">
            All editable inputs are highlighted in yellow. Change values here to update all
            calculations automatically.
          </p>
        </div>

        <!-- General -->
        <section>
          <h3 class="text-xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">GENERAL</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Analysis Period (Years)</label>
              <input
                v-model.number="assumptions.analysisPeriod"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Annual Distance Driven (km)</label>
              <input
                v-model.number="assumptions.annualDistance"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Fuel Price (₹/Litre)</label>
              <input
                v-model.number="assumptions.fuelPrice"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Mileage (km/L)</label>
              <input
                v-model.number="assumptions.mileage"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
          </div>
        </section>

        <!-- Owned Car -->
        <section>
          <h3 class="text-xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">OWNED CAR (NEXON)</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Current Market Value (₹)</label>
              <input
                v-model.number="assumptions.currentMarketValue"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Expected Value After 5 Years (₹)</label>
              <input
                v-model.number="assumptions.expectedValueAfter5Years"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Annual Insurance Cost (₹)</label>
              <input
                v-model.number="assumptions.annualInsurance"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Annual Service & Maintenance (₹)</label>
              <input
                v-model.number="assumptions.annualServiceMaintenance"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1"
                >Major Repairs – Total (5 Years) (₹)</label
              >
              <input
                v-model.number="assumptions.majorRepairs5Years"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Tyre Replacement (Year 4/5) (₹)</label>
              <input
                v-model.number="assumptions.tyreReplacement"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
          </div>
        </section>

        <!-- Lease Options -->
        <section>
          <h3 class="text-xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
            LEASE OPTIONS (MONTHLY EMI)
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Lease Tenure (Months)</label>
              <input
                v-model.number="assumptions.leaseTenure"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Option A EMI (₹)</label>
              <input
                v-model.number="assumptions.optionA_EMI"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Option B EMI (₹)</label>
              <input
                v-model.number="assumptions.optionB_EMI"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Option C EMI (₹)</label>
              <input
                v-model.number="assumptions.optionC_EMI"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Allowed KM per Year</label>
              <input
                v-model.number="assumptions.allowedKMperYear"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Extra KM Charge (₹/KM)</label>
              <input
                v-model.number="assumptions.extraKMCharge"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
          </div>
        </section>

        <!-- Reimbursements -->
        <section>
          <h3 class="text-xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
            REIMBURSEMENTS (LEASE)
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Fuel Reimbursement Cap (₹/Year)</label>
              <input
                v-model.number="assumptions.fuelReimbursementCap"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1"
                >Driver Reimbursement Cap (₹/Year)</label
              >
              <input
                v-model.number="assumptions.driverReimbursementCap"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
          </div>
        </section>

        <!-- Tax & Investment -->
        <section>
          <h3 class="text-xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">TAX & INVESTMENT</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Income Tax Bracket (%)</label>
              <input
                v-model.number="assumptions.incomeTaxBracket"
                type="number"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Return on Invested Capital (%)</label>
              <input
                v-model.number="assumptions.returnOnInvestedCapital"
                type="number"
                step="0.1"
                class="w-full px-3 py-2 border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              />
            </div>
          </div>
        </section>
      </div>

      <!-- 02 OWNERSHIP -->
      <div v-show="activeTab === 'ownership'" class="space-y-6">
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center">
          <Icon icon="mdi:car" class="mr-2 text-sky-600" />
          Nexon Ownership Costs
        </h2>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-slate-800">
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-left">
                  Year
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Fuel Cost
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Insurance
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Service & Maintenance
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Repairs / Tyres
                </th>
                <th
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right font-bold"
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="year in ownershipCosts.years"
                :key="year.year"
                class="hover:bg-gray-50 dark:hover:bg-slate-800/50"
              >
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Year {{ year.year }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(year.fuelCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(year.insurance) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(year.service) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(year.repairs) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right font-semibold"
                >
                  {{ formatCurrency(year.total) }}
                </td>
              </tr>
              <tr class="bg-gray-100 dark:bg-slate-800 font-bold">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  TOTAL (5 YEARS)
                </td>
                <td colspan="4" class="border border-gray-300 dark:border-slate-700 px-4 py-2"></td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(ownershipCosts.total5Years) }}
                </td>
              </tr>
              <tr class="bg-yellow-50 dark:bg-yellow-900/20 font-semibold">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  LESS: RESALE VALUE
                </td>
                <td colspan="4" class="border border-gray-300 dark:border-slate-700 px-4 py-2"></td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-red-600 dark:text-red-400"
                >
                  -{{ formatCurrency(ownershipCosts.resaleValue) }}
                </td>
              </tr>
              <tr class="bg-green-50 dark:bg-green-900/20 font-bold text-lg">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  NET OWNERSHIP COST
                </td>
                <td colspan="4" class="border border-gray-300 dark:border-slate-700 px-4 py-2"></td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(ownershipCosts.netOwnershipCost) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 03 LEASE COMPARISON -->
      <div v-show="activeTab === 'lease'" class="space-y-6">
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center">
          <Icon icon="mdi:file-compare" class="mr-2 text-sky-600" />
          Lease Comparison (A/B/C)
        </h2>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-slate-800">
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-left">
                  Metric
                </th>
                <th
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                  :class="
                    recommendation.recommended === 'Option A'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : ''
                  "
                >
                  Option A
                </th>
                <th
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                  :class="
                    recommendation.recommended === 'Option B'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : ''
                  "
                >
                  Option B
                </th>
                <th
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                  :class="
                    recommendation.recommended === 'Option C'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : ''
                  "
                >
                  Option C
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Annual Lease EMI
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionA.annualEMI) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionB.annualEMI) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionC.annualEMI) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Annual Fuel Cost
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionA.annualFuelCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionB.annualFuelCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionC.annualFuelCost) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Extra KM Cost
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionA.extraKMCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionB.extraKMCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionC.extraKMCost) }}
                </td>
              </tr>
              <tr class="bg-gray-50 dark:bg-slate-800/50">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-semibold">
                  Gross Annual Cost
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right font-semibold"
                >
                  {{ formatCurrency(leaseOptions.optionA.grossAnnualCost) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right font-semibold"
                >
                  {{ formatCurrency(leaseOptions.optionB.grossAnnualCost) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right font-semibold"
                >
                  {{ formatCurrency(leaseOptions.optionC.grossAnnualCost) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Reimbursement
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  -{{ formatCurrency(leaseOptions.optionA.reimbursement) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  -{{ formatCurrency(leaseOptions.optionB.reimbursement) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  -{{ formatCurrency(leaseOptions.optionC.reimbursement) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Tax Saving on Lease EMI
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  -{{ formatCurrency(leaseOptions.optionA.taxSaving) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  -{{ formatCurrency(leaseOptions.optionB.taxSaving) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  -{{ formatCurrency(leaseOptions.optionC.taxSaving) }}
                </td>
              </tr>
              <tr class="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  Net Annual Cost
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionA.netAnnualCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionB.netAnnualCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionC.netAnnualCost) }}
                </td>
              </tr>
              <tr class="bg-green-50 dark:bg-green-900/20 font-bold text-lg">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  Net 5-Year Cost
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionA.net5YearCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionB.net5YearCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(leaseOptions.optionC.net5YearCost) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 04 INVESTMENT RETURN -->
      <div v-show="activeTab === 'investment'" class="space-y-6">
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center">
          <Icon icon="mdi:chart-line" class="mr-2 text-sky-600" />
          Investment Return (Sale of Nexon)
        </h2>
        <p class="text-sm text-zinc-500 dark:text-zinc-500 mb-4">
          If you lease, you sell your Nexon for ₹{{
            formatCurrency(assumptions.currentMarketValue)
          }}
          and invest the proceeds at {{ assumptions.returnOnInvestedCapital }}% annual return.
        </p>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-slate-800">
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-left">
                  Year
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Opening Value
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Interest Earned
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Closing Value
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="year in investmentReturn.years"
                :key="year.year"
                class="hover:bg-gray-50 dark:hover:bg-slate-800/50"
              >
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Year {{ year.year }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(year.openingValue) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  {{ formatCurrency(year.interestEarned) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right font-semibold"
                >
                  {{ formatCurrency(year.closingValue) }}
                </td>
              </tr>
              <tr class="bg-green-50 dark:bg-green-900/20 font-bold text-lg">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">Final Value</td>
                <td colspan="2" class="border border-gray-300 dark:border-slate-700 px-4 py-2"></td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(investmentReturn.finalValue) }}
                </td>
              </tr>
              <tr class="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">Total Gain</td>
                <td colspan="2" class="border border-gray-300 dark:border-slate-700 px-4 py-2"></td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  {{ formatCurrency(investmentReturn.totalGain) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 05 FINAL COMPARISON -->
      <div v-show="activeTab === 'comparison'" class="space-y-6">
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center">
          <Icon icon="mdi:scale-balance" class="mr-2 text-sky-600" />
          Final Comparison
        </h2>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-slate-800">
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-left">
                  Metric
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Owned Nexon
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Leased Car ({{ finalComparison.leasedCar.optionName }})
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  5-Year Operating Cost
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.ownedNexon.operatingCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.leasedCar.operatingCost) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Resale / Investment Gain
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  {{ formatCurrency(finalComparison.ownedNexon.resaleGain) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  +{{ formatCurrency(finalComparison.leasedCar.investmentGain) }}
                </td>
              </tr>
              <tr class="bg-green-50 dark:bg-green-900/20 font-bold text-lg">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  NET COST (5 YEARS)
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.ownedNexon.netCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.leasedCar.netCost) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Average Monthly Cost
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.ownedNexon.avgMonthlyCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.leasedCar.avgMonthlyCost) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Maintenance Risk
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ finalComparison.ownedNexon.maintenanceRisk }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ finalComparison.leasedCar.maintenanceRisk }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Tax Benefit
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ finalComparison.ownedNexon.taxBenefit }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  {{ finalComparison.leasedCar.taxBenefit }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Asset at End
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.ownedNexon.assetAtEnd) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.leasedCar.assetAtEnd) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Footer Note -->
    <div class="mt-12 text-center">
      <div class="inline-block bg-sky-50 dark:bg-sky-900/20 rounded-lg p-6 max-w-3xl">
        <p class="text-zinc-700 dark:text-zinc-300 mb-2">
          <strong>Model Rules:</strong>
        </p>
        <ul
          class="text-sm text-zinc-600 dark:text-zinc-400 text-left space-y-1 list-disc list-inside"
        >
          <li>Tax benefit applies only on Lease EMI (30% bracket)</li>
          <li>Owned car has no tax benefit</li>
          <li>Lease includes insurance + maintenance (not added separately)</li>
          <li>Final decision based on lowest post-tax, post-reimbursement, 5-year cost</li>
          <li>All calculations update automatically when assumptions change</li>
        </ul>
      </div>
    </div>

    <!-- Save Template Modal -->
    <div
      v-if="showSaveModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showSaveModal = false"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 class="text-2xl font-bold mb-4">Save Template</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Template Name *</label>
            <input
              v-model="templateName"
              type="text"
              class="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
              placeholder="e.g., My Car Lease Analysis"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <textarea
              v-model="templateDescription"
              rows="3"
              class="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
              placeholder="Optional description..."
            />
          </div>
          <div class="flex items-center gap-2">
            <input id="isDefault" v-model="isDefaultTemplate" type="checkbox" class="rounded" />
            <label for="isDefault" class="text-sm">Set as default template</label>
          </div>
        </div>
        <div class="flex gap-2 mt-6">
          <button
            class="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            @click="showSaveModal = false"
          >
            Cancel
          </button>
          <button
            :disabled="isLoading"
            class="flex-1 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors disabled:opacity-50"
            @click="saveTemplate"
          >
            {{ isLoading ? 'Saving...' : 'Save Template' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
