<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { seoData } from '~/data'
import { ref, computed, onMounted, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import CarSelector from '~/components/calculator/CarSelector.vue'

definePageMeta({
  middleware: 'auth-calculator',
})

const { checkAuth } = useAuth()
const { showToast } = useToast()

useHead({
  title: 'Car Ownership vs Lease Calculator',
  meta: [
    {
      name: 'description',
      content:
        'Advanced calculator to compare car ownership vs leasing with customizable options, tax savings, and template comparison',
    },
    { property: 'og:site_name', content: seoData.mySite },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${seoData.mySite}/dev/utilities/car-lease-calculator` },
    { property: 'og:title', content: 'Car Ownership vs Lease Calculator' },
    {
      property: 'og:description',
      content:
        'Professional financial model with multi-currency, depreciation models, and template comparison',
    },
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/dev/utilities/car-lease-calculator` }],
})

// Currency configurations
const currencies = {
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee', locale: 'en-IN' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound', locale: 'en-GB' },
  AUD: { symbol: 'A$', code: 'AUD', name: 'Australian Dollar', locale: 'en-AU' },
  CAD: { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA' },
}

// Depreciation models
const depreciationModels = {
  straightLine: 'Straight-Line',
  accelerated: 'Accelerated (Double Declining)',
  custom: 'Custom Depreciation',
  none: 'No Depreciation',
}

// Default assumptions with all new fields (blank/null values for fresh start)
const defaultAssumptions = {
  // General
  carName: '',
  currency: 'INR',
  analysisPeriod: 5,
  annualDistance: 0,
  fuelPrice: 0,
  mileage: 0,

  // Owned Car
  purchaseYear: null as number | null, // Year when car was purchased/owned from
  currentMarketValue: 0,
  expectedValueAfter5Years: 0,
  annualInsurance: 0,
  annualServiceMaintenance: 0,
  repairsFactor: 0.45, // Factor for calculating major repairs and tyre replacement: (Insurance + Maintenance) × factor
  depreciationModel: 'straightLine',
  depreciationRate: 15, // Annual percentage (standard for cars: 15-20% per year)

  // Lease Options (Dynamic - 1-5 options)
  leaseOptions: [
    {
      name: 'Option A',
      emi: 0,
      tenure: 0,
      allowedKMperYear: 0,
      extraKMCharge: 0,
    },
  ],

  // Reimbursements
  fuelReimbursementCap: 0,
  driverReimbursementCap: 0,
  taxDeductions: 0, // Other tax deductions (reduces tax saving from lease EMI)

  // Advanced Tax Options
  effectiveTaxRate: 30, // For lease EMI deduction (default 30%)

  // Investment
  returnOnInvestedCapital: 7, // Default 7% annual return

  // Post-Lease Scenario (what happens after lease ends if tenure < analysis period)
  postLeaseScenario: 'extend' as 'extend' | 'buy' | 'lease_new', // Default: extend lease
}

// ========== ASSUMPTIONS (EDITABLE INPUTS) ==========
const assumptions = ref({ ...defaultAssumptions })

// Template management
const showSaveModal = ref(false)
const showTemplatesModal = ref(false)
const showEditModal = ref(false)
const templateName = ref('')
const templateDescription = ref('')
const isDefaultTemplate = ref(false)
const isLoading = ref(false)
const editingTemplate = ref<Template | null>(null)
const currentlyLoadedTemplateId = ref<number | null>(null) // Track which template is currently loaded
const saveAsNew = ref(true) // Default to saving as new template
const showNavigationWarning = ref(false)
const pendingNavigation = ref<(() => void) | null>(null)
const originalTemplateData = ref<typeof defaultAssumptions | null>(null) // Store original template data for comparison

// Template comparison
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
const selectedTemplates = ref<number[]>([])

// PDF Export
const isExportingPDF = ref(false)

// Repairs factor edit toggle
const showRepairsFactorEdit = ref(false)
// Depreciation edit toggle
const showDepreciationEdit = ref(false)
// Return on Investment edit toggle
const showReturnOnInvestmentEdit = ref(false)

// Tooltip state
const showTooltip = ref<string | null>(null)

// Help panel state
const showHelpPanel = ref(false)
const hasSeenTour = ref(false)

// Visual feedback state
const isCalculating = ref(false)
const fieldChanged = ref<Record<string, boolean>>({})
const originalValues = ref<Record<string, unknown>>({})

// Collapsible sections state
const sectionExpanded = ref({
  general: true,
  ownedCar: true,
  leaseOptions: true,
  reimbursements: true,
  postLease: false, // Collapsed by default
  taxInvestment: true,
})

const toggleSection = (section: keyof typeof sectionExpanded.value) => {
  sectionExpanded.value[section] = !sectionExpanded.value[section]
}

const toggleTooltip = (fieldId: string) => {
  showTooltip.value = showTooltip.value === fieldId ? null : fieldId
}

// Help panel functions
const openHelpPanel = () => {
  showHelpPanel.value = true
}

const closeHelpPanel = () => {
  showHelpPanel.value = false
}

// Tour functionality
const startTour = () => {
  hasSeenTour.value = true
  // Expand all sections for tour
  Object.keys(sectionExpanded.value).forEach((key) => {
    sectionExpanded.value[key as keyof typeof sectionExpanded.value] = true
  })
  // Switch to assumptions tab
  activeTab.value = 'assumptions'
  showToast(
    'Welcome! All sections are now expanded. Fill in your values to see calculations update in real-time.',
    'success',
  )
}

// Validation helpers for form fields
const getFieldValidation = (
  field: string,
  value: number | string,
): 'valid' | 'warning' | 'invalid' | null => {
  if (value === null || value === undefined || value === '' || value === 0) {
    return null
  }

  switch (field) {
    case 'annualDistance':
      if (typeof value === 'number') {
        if (value < 5000) return 'warning' // Very low
        if (value > 50000) return 'warning' // Very high
        return 'valid'
      }
      return null
    case 'mileage':
      if (typeof value === 'number') {
        if (value < 10) return 'warning' // Low mileage
        if (value > 25) return 'warning' // Very high mileage (electric/hybrid)
        return 'valid'
      }
      return null
    case 'fuelPrice':
      if (typeof value === 'number') {
        const currency = assumptions.value.currency
        if (currency === 'INR' && (value < 80 || value > 120)) return 'warning'
        if (currency === 'USD' && (value < 2.5 || value > 5)) return 'warning'
        if (currency === 'EUR' && (value < 1.5 || value > 2.5)) return 'warning'
        return 'valid'
      }
      return null
    case 'analysisPeriod':
      if (typeof value === 'number') {
        if (value < 3) return 'warning' // Too short for meaningful analysis
        if (value > 10) return 'warning' // Very long period
        return 'valid'
      }
      return null
    case 'currentMarketValue':
      if (typeof value === 'number') {
        const currency = assumptions.value.currency
        if (currency === 'INR' && (value < 300000 || value > 5000000)) return 'warning'
        if (currency === 'USD' && (value < 10000 || value > 100000)) return 'warning'
        return 'valid'
      }
      return null
    default:
      return null
  }
}

// Smart placeholder values based on currency
const getSmartPlaceholder = (field: string): string => {
  const currency = assumptions.value.currency

  switch (field) {
    case 'fuelPrice':
      if (currency === 'INR') return '100'
      if (currency === 'USD') return '3.50'
      if (currency === 'EUR') return '1.80'
      if (currency === 'GBP') return '1.50'
      return '100'
    case 'currentMarketValue':
      if (currency === 'INR') return '700,000'
      if (currency === 'USD') return '25,000'
      if (currency === 'EUR') return '22,000'
      if (currency === 'GBP') return '20,000'
      return '700,000'
    case 'annualDistance':
      return '15,000'
    case 'mileage':
      return '15'
    default:
      return ''
  }
}

// Get field completion status
const getFieldStatus = (field: string, value: unknown): 'empty' | 'filled' | 'changed' => {
  if (value === null || value === undefined || value === '' || value === 0) {
    return 'empty'
  }
  if (fieldChanged.value[field]) {
    return 'changed'
  }
  return 'filled'
}

// Get field border class based on status
const getFieldBorderClass = (field: string, value: unknown): string => {
  const status = getFieldStatus(field, value)
  const baseClasses = 'border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100'

  switch (status) {
    case 'empty':
      return `${baseClasses} border-gray-300 dark:border-slate-600`
    case 'filled':
      return `${baseClasses} border-green-400 dark:border-green-600`
    case 'changed':
      return `${baseClasses} border-orange-400 dark:border-orange-500`
    default:
      return `${baseClasses} border-yellow-300 dark:border-slate-600`
  }
}

// Auto-calculate Expected Value based on depreciation
const calculateExpectedValue = () => {
  if (assumptions.value.depreciationModel === 'none') {
    assumptions.value.expectedValueAfter5Years = assumptions.value.currentMarketValue
  } else {
    const rate = assumptions.value.depreciationRate / 100
    const years = assumptions.value.analysisPeriod
    if (assumptions.value.depreciationModel === 'straightLine') {
      assumptions.value.expectedValueAfter5Years = Math.max(
        0,
        assumptions.value.currentMarketValue * (1 - rate * years),
      )
    } else if (assumptions.value.depreciationModel === 'accelerated') {
      assumptions.value.expectedValueAfter5Years = Math.max(
        0,
        assumptions.value.currentMarketValue * Math.pow(1 - rate * 2, years),
      )
    } else {
      // Custom: use major repairs as basis
      assumptions.value.expectedValueAfter5Years = Math.max(
        0,
        assumptions.value.currentMarketValue * 0.3,
      ) // Rough estimate: 30% of original
    }
    updateCurrencyInputs()
    showToast('Expected value calculated based on depreciation model', 'success')
  }
}

// Helper functions for purchase year input
const purchaseYearInput = ref<string>('')

// Initialize purchaseYearInput from assumptions
watch(
  () => assumptions.value.purchaseYear,
  (newVal) => {
    if (newVal !== null && newVal !== undefined) {
      purchaseYearInput.value = newVal.toString()
    } else {
      purchaseYearInput.value = ''
    }
  },
  { immediate: true },
)

const handlePurchaseYearInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  purchaseYearInput.value = input.value
  // Don't update assumptions yet - allow free typing
}

const handlePurchaseYearBlur = (event: Event) => {
  const input = event.target as HTMLInputElement
  const rawValue = input.value.trim()

  if (rawValue === '') {
    assumptions.value.purchaseYear = null
    purchaseYearInput.value = ''
    return
  }

  const value = parseInt(rawValue, 10)
  if (!isNaN(value)) {
    const currentYear = new Date().getFullYear()
    const clampedValue = Math.max(1990, Math.min(currentYear, value))
    assumptions.value.purchaseYear = clampedValue
    purchaseYearInput.value = clampedValue.toString()
  } else {
    assumptions.value.purchaseYear = null
    purchaseYearInput.value = ''
  }
}

const incrementPurchaseYear = () => {
  const currentYear = new Date().getFullYear()
  const currentValue = assumptions.value.purchaseYear ?? 2020
  const newValue = Math.min(currentYear, currentValue + 1)
  assumptions.value.purchaseYear = newValue
  purchaseYearInput.value = newValue.toString()
}

const decrementPurchaseYear = () => {
  const currentValue = assumptions.value.purchaseYear ?? 2020
  const newValue = Math.max(1990, currentValue - 1)
  assumptions.value.purchaseYear = newValue
  purchaseYearInput.value = newValue.toString()
}

// Store last selected variant for recalculation
const lastSelectedVariant = ref<{
  price_ex_showroom_inr: number | null
} | null>(null)

// Watch purchase year and depreciation to recalculate current market value
watch(
  [
    () => assumptions.value.purchaseYear,
    () => assumptions.value.depreciationModel,
    () => assumptions.value.depreciationRate,
  ],
  () => {
    // Recalculate current market value if we have a selected variant and purchase year
    if (lastSelectedVariant.value?.price_ex_showroom_inr && assumptions.value.purchaseYear) {
      const calculatedValue = calculateCurrentMarketValue(
        lastSelectedVariant.value.price_ex_showroom_inr,
        assumptions.value.purchaseYear,
      )
      assumptions.value.currentMarketValue = calculatedValue
      currencyInputs.value.currentMarketValue = formatNumberWithCommas(calculatedValue)
    }
  },
)

// Track field changes
watch(
  assumptions,
  () => {
    // Mark fields as changed when they differ from original
    Object.keys(assumptions.value).forEach((key) => {
      if (originalValues.value[key] !== undefined) {
        fieldChanged.value[key] =
          assumptions.value[key as keyof typeof assumptions.value] !== originalValues.value[key]
      }
    })

    // Show calculating indicator
    isCalculating.value = true
    setTimeout(() => {
      isCalculating.value = false
    }, 300)
  },
  { deep: true },
)

// Initialize original values
onMounted(async () => {
  await checkAuth()

  const route = useRoute()
  const templateId = route.query.templateId ? Number(route.query.templateId) : null

  // Load templates from database first (needed for loading by ID)
  await loadTemplates()

  // If templateId is provided in query, load that template from database
  if (templateId) {
    const template = savedTemplates.value.find((t) => t.id === templateId)
    if (template) {
      // Use the same loadTemplate function that loads from savedTemplates (database)
      loadTemplate(templateId)
      // Clear query parameter after loading
      navigateTo({ query: {} }, { replace: true })
    } else {
      showToast('Template not found', 'error')
      // Start fresh with blank defaults
      assumptions.value = JSON.parse(JSON.stringify(defaultAssumptions))
      updateCurrencyInputs()
    }
  } else {
    // Start fresh with blank defaults
    assumptions.value = JSON.parse(JSON.stringify(defaultAssumptions))
    updateCurrencyInputs()
    // Store as original template data for unsaved changes tracking
    originalTemplateData.value = JSON.parse(JSON.stringify(assumptions.value))
  }

  // Store original values after initialization
  setTimeout(() => {
    originalValues.value = JSON.parse(JSON.stringify(assumptions.value))
    if (!originalTemplateData.value) {
      originalTemplateData.value = JSON.parse(JSON.stringify(assumptions.value))
    }
  }, 100)
})

// Check if there are unsaved changes
const hasUnsavedChanges = computed(() => {
  if (!originalTemplateData.value) return false

  // Deep compare current assumptions with original template data
  const current = JSON.stringify(assumptions.value)
  const original = JSON.stringify(originalTemplateData.value)
  return current !== original
})

// Navigation guard to warn about unsaved changes
onBeforeRouteLeave((to, from, next) => {
  if (!hasUnsavedChanges.value) {
    // No unsaved changes, allow navigation
    next()
    return
  }

  // There are unsaved changes, show warning modal
  showNavigationWarning.value = true
  pendingNavigation.value = () => next()

  // Prevent navigation for now
  next(false)
})

// Handle navigation warning actions
const handleNavigationSave = () => {
  showNavigationWarning.value = false
  // Open save modal
  showSaveModal.value = true
  // Clear pending navigation - user will navigate after saving if they want
  pendingNavigation.value = null
}

const handleNavigationDiscard = () => {
  showNavigationWarning.value = false
  // Clear unsaved changes tracking
  originalTemplateData.value = JSON.parse(JSON.stringify(assumptions.value))
  // Execute pending navigation
  if (pendingNavigation.value) {
    pendingNavigation.value()
    pendingNavigation.value = null
  }
}

const handleNavigationCancel = () => {
  showNavigationWarning.value = false
  pendingNavigation.value = null
}

// Confirmation modals
const showResetConfirmModal = ref(false)
const showDeleteLeaseOptionModal = ref(false)
const leaseOptionToDelete = ref<number | null>(null)

// Reset to defaults function
const resetToDefaults = () => {
  showResetConfirmModal.value = true
}

const handleResetConfirm = () => {
  assumptions.value = JSON.parse(JSON.stringify(defaultAssumptions))
  updateCurrencyInputs()
  fieldChanged.value = {}
  originalValues.value = JSON.parse(JSON.stringify(assumptions.value))
  originalTemplateData.value = JSON.parse(JSON.stringify(assumptions.value)) // Reset unsaved changes tracking
  currentlyLoadedTemplateId.value = null // Clear loaded template ID on reset
  templateName.value = ''
  templateDescription.value = ''
  isDefaultTemplate.value = false
  saveAsNew.value = true
  showResetConfirmModal.value = false
  showToast('Calculator reset to defaults', 'success')
}

// Note: localStorage auto-save removed - templates are managed in database only
// Users can explicitly save templates via the "Save Template" button

// Functions to add/remove lease options
const addLeaseOption = () => {
  if (assumptions.value.leaseOptions.length >= 5) {
    showToast('Maximum 5 lease options allowed', 'warning')
    return
  }
  const optionNames = ['A', 'B', 'C', 'D', 'E']
  const nextIndex = assumptions.value.leaseOptions.length
  assumptions.value.leaseOptions.push({
    name: `Option ${optionNames[nextIndex]}`,
    emi: 0,
    tenure: 0,
    allowedKMperYear: 0,
    extraKMCharge: 0,
  })
  // Update currency inputs for the new option
  const newIndex = assumptions.value.leaseOptions.length - 1
  currencyInputs.value[`leaseOption_${newIndex}_emi`] = formatNumberWithCommas(
    assumptions.value.leaseOptions[newIndex].emi,
  )
  currencyInputs.value[`leaseOption_${newIndex}_extraKMCharge`] = formatNumberWithCommas(
    assumptions.value.leaseOptions[newIndex].extraKMCharge,
  )
}

const openDeleteLeaseOptionModal = (index: number) => {
  if (assumptions.value.leaseOptions.length <= 1) {
    showToast('At least 1 lease option is required', 'warning')
    return
  }
  leaseOptionToDelete.value = index
  showDeleteLeaseOptionModal.value = true
}

const removeLeaseOption = () => {
  const index = leaseOptionToDelete.value
  if (index === null || assumptions.value.leaseOptions.length <= 1) {
    showDeleteLeaseOptionModal.value = false
    leaseOptionToDelete.value = null
    return
  }

  // Remove currency inputs for this option
  const emiKey = `leaseOption_${index}_emi`
  const extraKMKey = `leaseOption_${index}_extraKMCharge`
  const { [emiKey]: _, [extraKMKey]: __, ...restInputs } = currencyInputs.value

  // Reindex remaining currency inputs
  const newInputs: Record<string, string> = {}
  let newIndex = 0
  for (let i = 0; i < assumptions.value.leaseOptions.length; i++) {
    if (i !== index) {
      const oldEMIKey = `leaseOption_${i}_emi`
      const oldExtraKMKey = `leaseOption_${i}_extraKMCharge`
      const newEMIKey = `leaseOption_${newIndex}_emi`
      const newExtraKMKey = `leaseOption_${newIndex}_extraKMCharge`
      if (restInputs[oldEMIKey]) {
        newInputs[newEMIKey] = restInputs[oldEMIKey]
      }
      if (restInputs[oldExtraKMKey]) {
        newInputs[newExtraKMKey] = restInputs[oldExtraKMKey]
      }
      newIndex++
    }
  }
  // Update currency inputs - rebuild from scratch to avoid dynamic delete
  currencyInputs.value = {}
  Object.assign(currencyInputs.value, newInputs)
  // Remove the option
  assumptions.value.leaseOptions.splice(index, 1)

  showDeleteLeaseOptionModal.value = false
  leaseOptionToDelete.value = null
  showToast('Lease option removed', 'success')
}

// Helper function to create template data from assumptions
const createTemplateData = () => {
  return JSON.parse(
    JSON.stringify({
      // General
      carName: assumptions.value.carName || '',
      currency: assumptions.value.currency || 'INR',
      analysisPeriod: Number(assumptions.value.analysisPeriod) || 5,
      annualDistance: Number(assumptions.value.annualDistance) || 0,
      fuelPrice: Number(assumptions.value.fuelPrice) || 0,
      mileage: Number(assumptions.value.mileage) || 0,

      // Owned Car
      purchaseYear:
        assumptions.value.purchaseYear !== null && assumptions.value.purchaseYear !== undefined
          ? Number(assumptions.value.purchaseYear)
          : null,
      currentMarketValue: Number(assumptions.value.currentMarketValue) || 0,
      expectedValueAfter5Years: Number(assumptions.value.expectedValueAfter5Years) || 0,
      annualInsurance: Number(assumptions.value.annualInsurance) || 0,
      annualServiceMaintenance: Number(assumptions.value.annualServiceMaintenance) || 0,
      repairsFactor: Number(assumptions.value.repairsFactor) || 0.45,
      depreciationModel: assumptions.value.depreciationModel || 'straightLine',
      depreciationRate: Number(assumptions.value.depreciationRate) || 15,

      // Lease Options - ensure all properties are included
      leaseOptions: (assumptions.value.leaseOptions || []).map(
        (option: (typeof defaultAssumptions.leaseOptions)[0]) => ({
          name: option.name || 'Unnamed Option',
          emi: Number(option.emi) || 0,
          tenure: Number(option.tenure) || 0,
          allowedKMperYear: Number(option.allowedKMperYear) || 0,
          extraKMCharge: Number(option.extraKMCharge) || 0,
        }),
      ),

      // Reimbursements
      fuelReimbursementCap: Number(assumptions.value.fuelReimbursementCap) || 0,
      driverReimbursementCap: Number(assumptions.value.driverReimbursementCap) || 0,
      taxDeductions: Number(assumptions.value.taxDeductions) || 0,

      // Advanced Tax Options
      effectiveTaxRate: Number(assumptions.value.effectiveTaxRate) || 30,

      // Investment
      returnOnInvestedCapital: Number(assumptions.value.returnOnInvestedCapital) || 7,

      // Post-Lease Scenario
      postLeaseScenario: assumptions.value.postLeaseScenario || 'extend',
    }),
  )
}

const saveTemplate = async () => {
  if (!templateName.value.trim()) {
    showToast('Template name is required', 'warning')
    return
  }

  isLoading.value = true
  try {
    const templateData = createTemplateData()

    // Check if we should overwrite existing template or save as new
    if (currentlyLoadedTemplateId.value && !saveAsNew.value) {
      // Update existing template
      const response = await $fetch<{ success: boolean; template: Template }>(
        `/api/calculator/templates/${currentlyLoadedTemplateId.value}`,
        {
          method: 'PUT',
          body: {
            name: templateName.value,
            description: templateDescription.value || null,
            template_data: templateData,
            is_default: isDefaultTemplate.value,
          },
        },
      )

      if (response.success) {
        showSaveModal.value = false
        // Update original template data to reflect saved state
        originalTemplateData.value = JSON.parse(JSON.stringify(assumptions.value))
        await loadTemplates() // Reload templates after updating
        showToast('Template updated successfully!', 'success')
      }
    } else {
      // Create new template
      const response = await $fetch<{ success: boolean; template: unknown }>(
        '/api/calculator/templates',
        {
          method: 'POST',
          body: {
            calculator_key: 'car-lease',
            name: templateName.value,
            description: templateDescription.value || null,
            template_data: templateData,
            is_default: isDefaultTemplate.value,
          },
        },
      )

      if (response.success) {
        showSaveModal.value = false
        // Update original template data to reflect saved state
        originalTemplateData.value = JSON.parse(JSON.stringify(assumptions.value))
        templateName.value = ''
        templateDescription.value = ''
        isDefaultTemplate.value = false
        currentlyLoadedTemplateId.value = null // Clear loaded template ID after saving as new
        await loadTemplates() // Reload templates after saving
        showToast('Template saved successfully!', 'success')
      }
    }
  } catch (error) {
    console.error('Error saving template:', error)
    showToast('Failed to save template', 'error')
  } finally {
    isLoading.value = false
  }
}

// Export template as JSON file
const exportTemplateAsJSON = () => {
  try {
    const templateData = createTemplateData()
    const exportData = {
      name: templateName.value || 'Calculator Template',
      description: templateDescription.value || '',
      template_data: templateData,
      exported_at: new Date().toISOString(),
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${exportData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().getTime()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast('Template exported as JSON file!', 'success')
  } catch (error) {
    console.error('Error exporting template:', error)
    showToast('Failed to export template', 'error')
  }
}

// Import template from JSON file
const importTemplateFromJSON = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const importedData = JSON.parse(content)

      if (!importedData.template_data) {
        showToast('Invalid template file format', 'error')
        return
      }

      const templateData = importedData.template_data as typeof defaultAssumptions

      // Ensure leaseOptions array exists and has correct structure
      let leaseOptions = templateData.leaseOptions || []
      if (!Array.isArray(leaseOptions)) {
        leaseOptions = defaultAssumptions.leaseOptions
      }

      if (leaseOptions.length === 0) {
        leaseOptions = defaultAssumptions.leaseOptions
      } else if (leaseOptions.length > 5) {
        leaseOptions = leaseOptions.slice(0, 5)
      }

      // Ensure each lease option has all required properties
      leaseOptions = leaseOptions.map((option: (typeof defaultAssumptions.leaseOptions)[0]) => ({
        name: option.name || 'Unnamed Option',
        emi: Number(option.emi) || 0,
        tenure: Number(option.tenure) || 0,
        allowedKMperYear: Number(option.allowedKMperYear) || 0,
        extraKMCharge: Number(option.extraKMCharge) || 0,
      }))

      // Load the template data into assumptions
      assumptions.value = {
        ...defaultAssumptions,
        ...templateData,
        leaseOptions: leaseOptions,
        purchaseYear:
          templateData.purchaseYear !== null && templateData.purchaseYear !== undefined
            ? Number(templateData.purchaseYear)
            : null,
        analysisPeriod: Number(templateData.analysisPeriod) || 5,
        annualDistance: Number(templateData.annualDistance) || 0,
        fuelPrice: Number(templateData.fuelPrice) || 0,
        mileage: Number(templateData.mileage) || 0,
        currentMarketValue: Number(templateData.currentMarketValue) || 0,
        expectedValueAfter5Years: Number(templateData.expectedValueAfter5Years) || 0,
        annualInsurance: Number(templateData.annualInsurance) || 0,
        annualServiceMaintenance: Number(templateData.annualServiceMaintenance) || 0,
        repairsFactor: Number(templateData.repairsFactor) || 0.45,
        depreciationRate: Number(templateData.depreciationRate) || 15,
        fuelReimbursementCap: Number(templateData.fuelReimbursementCap) || 0,
        driverReimbursementCap: Number(templateData.driverReimbursementCap) || 0,
        taxDeductions: Number(templateData.taxDeductions) || 0,
        effectiveTaxRate: Number(templateData.effectiveTaxRate) || 30,
        returnOnInvestedCapital: Number(templateData.returnOnInvestedCapital) || 7,
        postLeaseScenario: templateData.postLeaseScenario || 'extend',
      }

      // Pre-fill template name and description if available
      if (importedData.name) {
        templateName.value = importedData.name
      }
      if (importedData.description) {
        templateDescription.value = importedData.description
      }

      // Clear loaded template ID since this is imported
      currentlyLoadedTemplateId.value = null
      saveAsNew.value = true

      // Store imported data as original for unsaved changes tracking
      originalTemplateData.value = JSON.parse(JSON.stringify(assumptions.value))

      updateCurrencyInputs()
      showToast('Template imported successfully!', 'success')
    } catch (error) {
      console.error('Error importing template:', error)
      showToast('Failed to import template. Please check the file format.', 'error')
    }

    // Reset file input
    input.value = ''
  }

  reader.readAsText(file)
}

// Load templates from database
const loadTemplates = async () => {
  try {
    const response = await $fetch<{ success: boolean; templates: Template[] }>(
      '/api/calculator/templates?calculatorKey=car-lease',
    )
    if (response.success) {
      savedTemplates.value = response.templates
    }
  } catch (error) {
    console.error('Error loading templates:', error)
  }
}

// Open edit template modal
const openEditTemplateModal = (template: Template) => {
  editingTemplate.value = template
  templateName.value = template.name
  templateDescription.value = template.description || ''
  isDefaultTemplate.value = template.is_default
  showEditModal.value = true
}

// Update template
const updateTemplate = async () => {
  if (!editingTemplate.value || !templateName.value.trim()) {
    showToast('Template name is required', 'warning')
    return
  }

  isLoading.value = true
  try {
    // Update template metadata only (name, description, is_default)
    // Template data is updated when user saves from the calculator
    const response = await $fetch<{ success: boolean; template: Template }>(
      `/api/calculator/templates/${editingTemplate.value.id}`,
      {
        method: 'PUT',
        body: {
          name: templateName.value,
          description: templateDescription.value || null,
          template_data: editingTemplate.value.template_data, // Keep existing data
          is_default: isDefaultTemplate.value,
        },
      },
    )

    if (response.success) {
      showEditModal.value = false
      templateName.value = ''
      templateDescription.value = ''
      isDefaultTemplate.value = false
      editingTemplate.value = null
      await loadTemplates() // Reload templates after updating
      showToast('Template updated successfully!', 'success')
    }
  } catch (error) {
    console.error('Error updating template:', error)
    showToast('Failed to update template', 'error')
  } finally {
    isLoading.value = false
  }
}

// Watch for templates modal to load templates when opened
watch(showTemplatesModal, (isOpen) => {
  if (isOpen) {
    loadTemplates()
  }
})

// Load a template into the calculator
const loadTemplate = async (templateId: number) => {
  const template = savedTemplates.value.find((t) => t.id === templateId)
  if (template) {
    try {
      const templateData = template.template_data as typeof defaultAssumptions

      // Ensure leaseOptions array exists and has correct structure with all properties
      let leaseOptions = templateData.leaseOptions || []
      if (!Array.isArray(leaseOptions)) {
        leaseOptions = defaultAssumptions.leaseOptions
      }

      // Ensure at least 1 option and max 5 options
      if (leaseOptions.length === 0) {
        leaseOptions = defaultAssumptions.leaseOptions
      } else if (leaseOptions.length > 5) {
        leaseOptions = leaseOptions.slice(0, 5)
      }

      // Ensure each lease option has all required properties
      leaseOptions = leaseOptions.map((option: (typeof defaultAssumptions.leaseOptions)[0]) => ({
        name: option.name || 'Unnamed Option',
        emi: Number(option.emi) || 0,
        tenure: Number(option.tenure) || 0,
        allowedKMperYear: Number(option.allowedKMperYear) || 0,
        extraKMCharge: Number(option.extraKMCharge) || 0,
      }))

      // Merge template data with defaults, ensuring all fields are properly loaded
      assumptions.value = {
        ...defaultAssumptions,
        ...templateData,
        leaseOptions: leaseOptions, // Use the normalized lease options
        // Ensure numeric fields are properly converted
        purchaseYear:
          templateData.purchaseYear !== null && templateData.purchaseYear !== undefined
            ? Number(templateData.purchaseYear)
            : null,
        analysisPeriod: Number(templateData.analysisPeriod) || 5,
        annualDistance: Number(templateData.annualDistance) || 0,
        fuelPrice: Number(templateData.fuelPrice) || 0,
        mileage: Number(templateData.mileage) || 0,
        currentMarketValue: Number(templateData.currentMarketValue) || 0,
        expectedValueAfter5Years: Number(templateData.expectedValueAfter5Years) || 0,
        annualInsurance: Number(templateData.annualInsurance) || 0,
        annualServiceMaintenance: Number(templateData.annualServiceMaintenance) || 0,
        repairsFactor: Number(templateData.repairsFactor) || 0.45,
        depreciationRate: Number(templateData.depreciationRate) || 15,
        fuelReimbursementCap: Number(templateData.fuelReimbursementCap) || 0,
        driverReimbursementCap: Number(templateData.driverReimbursementCap) || 0,
        taxDeductions: Number(templateData.taxDeductions) || 0,
        effectiveTaxRate: Number(templateData.effectiveTaxRate) || 30,
        returnOnInvestedCapital: Number(templateData.returnOnInvestedCapital) || 7,
        postLeaseScenario: templateData.postLeaseScenario || 'extend',
      }

      // Track the loaded template ID
      currentlyLoadedTemplateId.value = templateId

      // Store original template data for comparison
      originalTemplateData.value = JSON.parse(JSON.stringify(assumptions.value))

      // Pre-fill template name and description for save modal
      templateName.value = template.name
      templateDescription.value = template.description || ''
      isDefaultTemplate.value = template.is_default

      updateCurrencyInputs()
      showToast(`Template "${template.name}" loaded!`, 'success')
    } catch (e) {
      console.error('Error loading template:', e)
      showToast('Failed to load template', 'error')
    }
  }
}

// Calculate depreciation
const calculateDepreciation = (year: number, totalYears: number) => {
  const model = assumptions.value.depreciationModel
  const initialValue = assumptions.value.currentMarketValue
  const rate = assumptions.value.depreciationRate / 100

  if (model === 'straightLine') {
    return (initialValue * rate) / totalYears
  } else if (model === 'accelerated') {
    // Double declining balance
    const bookValue = initialValue * Math.pow(1 - rate * 2, year - 1)
    return bookValue * rate * 2
  } else if (model === 'custom') {
    // Custom: distribute majorRepairs5Years over years
    return year <= totalYears ? calculatedRepairs.value.majorRepairs5Years / totalYears : 0
  }
  return 0
}

// ========== CALCULATIONS ==========

// Calculate major repairs and tyre replacement based on formula: (Insurance + Maintenance) × factor
const calculatedRepairs = computed(() => {
  const baseCost = assumptions.value.annualInsurance + assumptions.value.annualServiceMaintenance
  const totalRepairsCost = baseCost * assumptions.value.repairsFactor
  // Split roughly: 70% for major repairs, 30% for tyre replacement
  const majorRepairs5Years = Math.round(totalRepairsCost * 0.7)
  const tyreReplacement = Math.round(totalRepairsCost * 0.3)
  return { majorRepairs5Years, tyreReplacement }
})

// Ownership Costs with Depreciation
const ownershipCosts = computed(() => {
  const years = []
  let totalFuel = 0
  let totalInsurance = 0
  let totalService = 0
  let totalRepairs = 0
  let totalDepreciation = 0
  const repairs = calculatedRepairs.value

  for (let year = 1; year <= assumptions.value.analysisPeriod; year++) {
    const fuelCost =
      (assumptions.value.annualDistance / assumptions.value.mileage) * assumptions.value.fuelPrice
    const insurance = assumptions.value.annualInsurance
    const service = assumptions.value.annualServiceMaintenance
    let yearRepairs = 0
    const depreciation = calculateDepreciation(year, assumptions.value.analysisPeriod)

    // Repairs apply in later years
    if (year === Math.floor(assumptions.value.analysisPeriod * 0.8)) {
      yearRepairs = repairs.tyreReplacement
    } else if (year === assumptions.value.analysisPeriod) {
      yearRepairs = repairs.majorRepairs5Years
    }

    totalFuel += fuelCost
    totalInsurance += insurance
    totalService += service
    totalRepairs += yearRepairs
    totalDepreciation += depreciation

    years.push({
      year,
      fuelCost,
      insurance,
      service,
      repairs: yearRepairs,
      depreciation,
      total: fuelCost + insurance + service + yearRepairs + depreciation,
    })
  }

  // Calculate final value based on depreciation model
  let finalValue = assumptions.value.expectedValueAfter5Years
  if (!finalValue || finalValue === 0) {
    // Auto-calculate if not provided
    if (assumptions.value.depreciationModel === 'straightLine') {
      finalValue =
        assumptions.value.currentMarketValue *
        (1 - (assumptions.value.depreciationRate / 100) * assumptions.value.analysisPeriod)
    } else if (assumptions.value.depreciationModel === 'accelerated') {
      finalValue =
        assumptions.value.currentMarketValue *
        Math.pow(
          1 - (assumptions.value.depreciationRate / 100) * 2,
          assumptions.value.analysisPeriod,
        )
    } else if (assumptions.value.depreciationModel === 'custom') {
      finalValue = Math.max(0, assumptions.value.currentMarketValue * 0.3) // Rough estimate: 30% of original
    } else {
      finalValue = assumptions.value.currentMarketValue // No depreciation
    }
  }

  // Total ownership cost = Initial Purchase Price + Operating Costs - Resale Value
  const operatingCosts =
    totalFuel + totalInsurance + totalService + totalRepairs + totalDepreciation
  const totalCosts = assumptions.value.currentMarketValue + operatingCosts // Include initial purchase price
  const netOwnershipCost = totalCosts - finalValue // Subtract resale value at end

  return {
    years,
    operatingCosts, // Operating costs only (fuel, insurance, service, repairs, depreciation)
    totalCosts, // Total including purchase price
    purchasePrice: assumptions.value.currentMarketValue,
    resaleValue: finalValue,
    netOwnershipCost,
    totalDepreciation,
  }
})

// Dynamic Lease Options
const leaseOptions = computed(() => {
  const calculateLeaseOption = (option: {
    name: string
    emi: number
    tenure: number
    allowedKMperYear: number
    extraKMCharge: number
  }) => {
    // Ensure all values are numbers, defaulting to 0 if null/undefined
    const emi = Number(option.emi) || 0
    const annualEMI = emi * 12

    // Calculate annual fuel cost with defensive checks
    const annualDistance = Number(assumptions.value.annualDistance) || 0
    const mileage = Number(assumptions.value.mileage) || 1 // Avoid division by zero
    const fuelPrice = Number(assumptions.value.fuelPrice) || 0
    const annualFuelCost = (annualDistance / mileage) * fuelPrice

    const allowedKMperYear = Number(option.allowedKMperYear) || 0
    const extraKM = Math.max(0, annualDistance - allowedKMperYear)
    const extraKMCharge = Number(option.extraKMCharge) || 0
    const extraKMCost = extraKM * extraKMCharge

    const grossAnnualCost = annualEMI + annualFuelCost + extraKMCost

    // Reimbursement with defensive checks
    const fuelReimbursementCap = Number(assumptions.value.fuelReimbursementCap) || 0
    const driverReimbursementCap = Number(assumptions.value.driverReimbursementCap) || 0
    const fuelReimbursement = Math.min(annualFuelCost, fuelReimbursementCap)
    const reimbursement = fuelReimbursement + driverReimbursementCap

    // Tax Saving with effective rate - defensive checks
    const effectiveTaxRate = Number(assumptions.value.effectiveTaxRate) || 0
    const effectiveRate = effectiveTaxRate / 100
    const taxDeductions = Number(assumptions.value.taxDeductions) || 0
    const taxSaving = Math.max(0, annualEMI * effectiveRate - taxDeductions)

    // Net Annual Cost
    const netAnnualCost = grossAnnualCost - reimbursement - taxSaving

    // Calculate total cost considering lease tenure vs analysis period
    const analysisPeriod = Number(assumptions.value.analysisPeriod) || 1
    const leaseTenureMonths = Number(option.tenure) || 0
    const leaseTenureYears = leaseTenureMonths / 12

    // Cost during actual lease period
    let leasePeriodCost = netAnnualCost * leaseTenureYears

    // Handle post-lease period if lease ends before analysis period
    let postLeaseCost = 0
    let postLeaseYears = 0
    if (leaseTenureYears > 0 && leaseTenureYears < analysisPeriod) {
      postLeaseYears = analysisPeriod - leaseTenureYears
      const postLeaseScenario = assumptions.value.postLeaseScenario || 'extend'

      switch (postLeaseScenario) {
        case 'extend':
          // Extend lease at same annual cost
          postLeaseCost = netAnnualCost * postLeaseYears
          break
        case 'buy': {
          // Buy the car - use ownership operating cost for remaining period
          // Calculate average annual ownership operating cost (fuel + insurance + service + repairs + depreciation)
          // Note: This is approximate - actual ownership costs may vary year-over-year
          const annualFuel =
            (annualDistance / (assumptions.value.mileage || 1)) * assumptions.value.fuelPrice
          const annualInsurance = Number(assumptions.value.annualInsurance) || 0
          const annualService = Number(assumptions.value.annualServiceMaintenance) || 0
          // Calculate repairs (same formula as ownership costs)
          const repairsBase = annualInsurance + annualService
          const repairsFactor = Number(assumptions.value.repairsFactor) || 0.45
          const totalRepairsCost = repairsBase * repairsFactor
          const annualRepairs = totalRepairsCost / analysisPeriod
          // Calculate average annual depreciation
          const depreciationRate = Number(assumptions.value.depreciationRate) || 15
          const avgAnnualDepreciation =
            (Number(assumptions.value.currentMarketValue) || 0) * (depreciationRate / 100)
          const ownershipAnnualOperatingCost =
            annualFuel + annualInsurance + annualService + annualRepairs + avgAnnualDepreciation
          postLeaseCost = ownershipAnnualOperatingCost * postLeaseYears
          break
        }
        case 'lease_new':
          // Lease new car - for now, use extend (would need another option selected)
          postLeaseCost = netAnnualCost * postLeaseYears
          break
      }
    } else if (leaseTenureYears > analysisPeriod) {
      // Lease continues beyond analysis period - only count analysis period
      leasePeriodCost = netAnnualCost * analysisPeriod
    }

    const netTotalCost = leasePeriodCost + postLeaseCost

    return {
      optionName: option.name || 'Unnamed Option',
      emi: emi,
      tenure: leaseTenureMonths,
      tenureYears: leaseTenureYears,
      allowedKMperYear: allowedKMperYear,
      extraKMCharge: extraKMCharge,
      annualEMI,
      annualFuelCost,
      extraKM,
      extraKMCost,
      grossAnnualCost,
      reimbursement,
      taxSaving,
      netAnnualCost: Math.max(0, netAnnualCost), // Ensure non-negative for display
      leasePeriodCost: Math.max(0, leasePeriodCost), // Cost during lease period
      postLeaseCost: Math.max(0, postLeaseCost), // Cost after lease ends (if applicable)
      postLeaseYears: postLeaseYears, // Years after lease ends
      netTotalCost: Math.max(0, netTotalCost), // Total cost for analysis period
    }
  }

  return assumptions.value.leaseOptions.map((option) => calculateLeaseOption(option))
})

// Investment Return
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

// Best Lease Option
const bestLeaseOption = computed(() => {
  if (leaseOptions.value.length === 0) return null
  return leaseOptions.value.reduce((min, option) =>
    option.netTotalCost < min.netTotalCost ? option : min,
  )
})

// Lease options ranking (by net total cost; after-investment ranking is identical since investment gain is constant)
const leaseOptionsRanked = computed(() => {
  return [...leaseOptions.value].sort((a, b) => a.netTotalCost - b.netTotalCost)
})

// Final Comparison
const finalComparison = computed(() => {
  if (!bestLeaseOption.value) return null

  return {
    ownedCar: {
      name: assumptions.value.carName,
      operatingCost: ownershipCosts.value.operatingCosts,
      purchasePrice: ownershipCosts.value.purchasePrice,
      resaleGain: -ownershipCosts.value.resaleValue,
      netCost: ownershipCosts.value.netOwnershipCost,
      avgMonthlyCost:
        ownershipCosts.value.netOwnershipCost / (assumptions.value.analysisPeriod * 12),
      maintenanceRisk: 'High',
      taxBenefit: 'None',
      assetAtEnd: ownershipCosts.value.resaleValue,
    },
    leasedCar: {
      optionName: bestLeaseOption.value.optionName,
      operatingCost: bestLeaseOption.value.netTotalCost, // Net lease cost for full tenure (EMI + fuel + extra KM - reimbursements - tax savings) × tenure
      investmentGain: investmentReturn.value.totalGain,
      netCost: bestLeaseOption.value.netTotalCost, // Net lease cost (before investment gain adjustment)
      netCostAfterInvestment: bestLeaseOption.value.netTotalCost - investmentReturn.value.totalGain, // Net cost after subtracting investment gain
      avgMonthlyCost: bestLeaseOption.value.netTotalCost / (assumptions.value.analysisPeriod * 12), // Average monthly net lease cost
      avgMonthlyCostAfterInvestment:
        (bestLeaseOption.value.netTotalCost - investmentReturn.value.totalGain) /
        (assumptions.value.analysisPeriod * 12), // Average monthly cost after investment gain
      maintenanceRisk: 'Low (Included)',
      taxBenefit: `${formatCurrency(bestLeaseOption.value.taxSaving)}/year`,
      assetAtEnd: investmentReturn.value.finalValue,
    },
  }
})

// Recommendation
const recommendation = computed(() => {
  if (!finalComparison.value) return null

  const ownedCost = finalComparison.value.ownedCar.netCost
  // Use netCostAfterInvestment for comparison (includes investment gain benefit)
  const leasedCost = finalComparison.value.leasedCar.netCostAfterInvestment

  if (leasedCost < ownedCost) {
    const savings = ownedCost - leasedCost
    return {
      recommended: finalComparison.value.leasedCar.optionName,
      netCost: leasedCost,
      savings,
      explanation:
        savings > 0
          ? `${finalComparison.value.leasedCar.optionName} is recommended. Leasing saves ${formatCurrency(savings)} over ${assumptions.value.analysisPeriod} years compared to owning.`
          : `${finalComparison.value.leasedCar.optionName} is recommended.`,
    }
  } else {
    const savings = leasedCost - ownedCost
    return {
      recommended: `Owned ${assumptions.value.carName}`,
      netCost: ownedCost,
      savings,
      explanation:
        savings > 0
          ? `Keeping your owned ${assumptions.value.carName} is recommended. It saves ${formatCurrency(savings)} over ${assumptions.value.analysisPeriod} years compared to leasing.`
          : `Keeping your owned ${assumptions.value.carName} is recommended.`,
    }
  }
})

// Lightweight sensitivity analysis (Low/Base/High) to support decision making without adding complex UI
type Scenario = {
  id: string
  label: string
  overrides: Partial<typeof defaultAssumptions>
}

const runScenario = (overrides: Partial<typeof defaultAssumptions>) => {
  const a = {
    ...JSON.parse(JSON.stringify(defaultAssumptions)),
    ...JSON.parse(JSON.stringify(assumptions.value)),
    ...overrides,
  }

  // Ownership net cost (same core logic as ownershipCosts)
  const repairsBase = (Number(a.annualInsurance) || 0) + (Number(a.annualServiceMaintenance) || 0)
  const repairsFactor = Number(a.repairsFactor) || 0
  const totalRepairsCost = repairsBase * repairsFactor
  const majorRepairs = Math.round(totalRepairsCost * 0.7)
  const tyres = Math.round(totalRepairsCost * 0.3)

  const years = Math.max(1, Number(a.analysisPeriod) || 1)
  const annualDistance = Number(a.annualDistance) || 0
  const mileage = Math.max(1, Number(a.mileage) || 1)
  const fuelPrice = Number(a.fuelPrice) || 0
  const annualFuel = (annualDistance / mileage) * fuelPrice
  const annualInsurance = Number(a.annualInsurance) || 0
  const annualService = Number(a.annualServiceMaintenance) || 0
  const depreciationRate = (Number(a.depreciationRate) || 0) / 100

  const purchasePrice = Number(a.currentMarketValue) || 0

  // Depreciation model for resale value
  let resaleValue = Number(a.expectedValueAfter5Years) || 0
  if (!resaleValue) {
    if (a.depreciationModel === 'straightLine') {
      resaleValue = Math.max(0, purchasePrice * (1 - depreciationRate * years))
    } else if (a.depreciationModel === 'accelerated') {
      resaleValue = Math.max(0, purchasePrice * Math.pow(1 - depreciationRate * 2, years))
    } else if (a.depreciationModel === 'custom') {
      resaleValue = Math.max(0, purchasePrice * 0.3)
    } else {
      resaleValue = purchasePrice
    }
  }

  // Ownership cost for scenarios:
  // Use "cash operating costs + value loss (purchasePrice - resaleValue)".
  // Do NOT add purchase price again if you already include value loss, otherwise you double-count.
  let totalRepairs = 0
  // tyre at ~80% of period, major at end
  const tyreYear = Math.floor(years * 0.8)
  for (let y = 1; y <= years; y++) {
    if (y === tyreYear) totalRepairs += tyres
    if (y === years) totalRepairs += majorRepairs
  }

  // Value loss (economic cost). If depreciation model is 'none', resale equals purchase (loss 0).
  const valueLoss =
    a.depreciationModel === 'none' ? 0 : Math.max(0, purchasePrice - resaleValue)

  const operatingCashCosts =
    annualFuel * years +
    annualInsurance * years +
    annualService * years +
    totalRepairs

  const ownedNetCost = operatingCashCosts + valueLoss

  // Lease: compute each option net total cost for analysis period (matches leaseOptions logic)
  const fuelReimbursementCap = Number(a.fuelReimbursementCap) || 0
  const driverReimbursementCap = Number(a.driverReimbursementCap) || 0
  const effectiveRate = (Number(a.effectiveTaxRate) || 0) / 100
  const taxDeductions = Number(a.taxDeductions) || 0

  const postLeaseScenario = (a.postLeaseScenario || 'extend') as 'extend' | 'buy' | 'lease_new'

  const options = Array.isArray(a.leaseOptions) ? a.leaseOptions : []
  let bestLease: { optionName: string; netTotalCost: number; postLeaseYears: number } | null = null

  for (const opt of options) {
    const emi = Number(opt.emi) || 0
    const annualEMI = emi * 12
    const allowedKMperYear = Number(opt.allowedKMperYear) || 0
    const extraKM = Math.max(0, annualDistance - allowedKMperYear)
    const extraKMCharge = Number(opt.extraKMCharge) || 0
    const extraKMCost = extraKM * extraKMCharge
    const grossAnnualCost = annualEMI + annualFuel + extraKMCost

    const fuelReimbursement = Math.min(annualFuel, fuelReimbursementCap)
    const reimbursement = fuelReimbursement + driverReimbursementCap

    const taxSaving = Math.max(0, annualEMI * effectiveRate - taxDeductions)
    const netAnnualCost = grossAnnualCost - reimbursement - taxSaving

    const leaseTenureMonths = Number(opt.tenure) || 0
    const leaseTenureYears = leaseTenureMonths / 12

    let leasePeriodCost = netAnnualCost * leaseTenureYears
    let postLeaseCost = 0
    let postLeaseYears = 0

    if (leaseTenureYears > 0 && leaseTenureYears < years) {
      postLeaseYears = years - leaseTenureYears
      switch (postLeaseScenario) {
        case 'extend':
        case 'lease_new':
          postLeaseCost = netAnnualCost * postLeaseYears
          break
        case 'buy': {
          // Keep it simple: approximate remaining years as ownership annual operating cost
          const repairsBase2 = annualInsurance + annualService
          const totalRepairsCost2 = repairsBase2 * (Number(a.repairsFactor) || 0)
          const annualRepairs = totalRepairsCost2 / years
          const annualDep = ((Number(a.depreciationRate) || 0) / 100) * purchasePrice
          const ownershipAnnualOperatingCost =
            annualFuel + annualInsurance + annualService + annualRepairs + annualDep
          postLeaseCost = ownershipAnnualOperatingCost * postLeaseYears
          break
        }
      }
    } else if (leaseTenureYears > years) {
      leasePeriodCost = netAnnualCost * years
    }

    const netTotalCost = Math.max(0, leasePeriodCost + postLeaseCost)
    if (!bestLease || netTotalCost < bestLease.netTotalCost) {
      bestLease = { optionName: opt.name || 'Option', netTotalCost, postLeaseYears }
    }
  }

  // Investment gain (same logic as investmentReturn; constant across lease options)
  const roi = (Number(a.returnOnInvestedCapital) || 0) / 100
  let invested = purchasePrice
  for (let y = 1; y <= years; y++) invested += invested * roi
  const investmentGain = invested - purchasePrice

  const bestLeaseAfterInvestment = bestLease ? bestLease.netTotalCost - investmentGain : Infinity
  const leaseRecommended = bestLeaseAfterInvestment < ownedNetCost

  return {
    ownedNetCost,
    bestLeaseOption: bestLease?.optionName || null,
    bestLeaseNetCost: bestLease?.netTotalCost ?? null,
    bestLeaseNetCostAfterInvestment: bestLease ? bestLeaseAfterInvestment : null,
    investmentGain,
    recommended: leaseRecommended ? bestLease?.optionName || 'Lease' : `Own ${a.carName || 'Car'}`,
    savings: leaseRecommended
      ? ownedNetCost - bestLeaseAfterInvestment
      : bestLeaseAfterInvestment - ownedNetCost,
  }
}

const sensitivityScenarios = computed(() => {
  const scenarios: Scenario[] = [
    {
      id: 'low-cost',
      label: 'Low running cost (−20% km & fuel)',
      overrides: {
        annualDistance: Math.max(
          0,
          Math.round((Number(assumptions.value.annualDistance) || 0) * 0.8),
        ),
        fuelPrice: Math.max(0, (Number(assumptions.value.fuelPrice) || 0) * 0.8),
      },
    },
    {
      id: 'base',
      label: 'Base (your inputs)',
      overrides: {},
    },
    {
      id: 'high-cost',
      label: 'High running cost (+20% km & fuel)',
      overrides: {
        annualDistance: Math.max(
          0,
          Math.round((Number(assumptions.value.annualDistance) || 0) * 1.2),
        ),
        fuelPrice: Math.max(0, (Number(assumptions.value.fuelPrice) || 0) * 1.2),
      },
    },
    {
      id: 'low-resale',
      label: 'Low resale (−20% end value)',
      overrides: {
        // IMPORTANT:
        // expectedValueAfter5Years only affects calculations when explicitly set.
        // To make this scenario effective for ALL users (including those relying on auto depreciation),
        // we force the resale value to be derived from the depreciation model by clearing the explicit override,
        // and we increase the depreciation rate to reduce end value.
        expectedValueAfter5Years: 0,
        depreciationModel:
          assumptions.value.depreciationModel === 'none'
            ? 'straightLine'
            : assumptions.value.depreciationModel,
        depreciationRate: Math.min(
          60,
          Math.max(0, (Number(assumptions.value.depreciationRate) || 15) * 1.2),
        ),
      },
    },
    {
      id: 'high-roi',
      label: 'High ROI (+3% points)',
      overrides: {
        returnOnInvestedCapital: (Number(assumptions.value.returnOnInvestedCapital) || 0) + 3,
      },
    },
  ]

  return scenarios.map((s) => ({
    ...s,
    result: runScenario(s.overrides),
  }))
})

// Helper function to calculate costs for a template
const calculateTemplateCosts = (templateData: typeof defaultAssumptions) => {
  // Calculate ownership costs
  const repairs = {
    majorRepairs5Years: Math.round(
      (templateData.annualInsurance + templateData.annualServiceMaintenance) *
        templateData.repairsFactor *
        0.7,
    ),
    tyreReplacement: Math.round(
      (templateData.annualInsurance + templateData.annualServiceMaintenance) *
        templateData.repairsFactor *
        0.3,
    ),
  }

  let totalFuel = 0
  let totalInsurance = 0
  let totalService = 0
  let totalRepairs = 0
  let totalDepreciation = 0

  for (let year = 1; year <= templateData.analysisPeriod; year++) {
    const fuelCost = (templateData.annualDistance / templateData.mileage) * templateData.fuelPrice
    const insurance = templateData.annualInsurance
    const service = templateData.annualServiceMaintenance
    let yearRepairs = 0
    const depreciation = calculateDepreciationForTemplate(
      year,
      templateData.analysisPeriod,
      templateData,
      repairs.majorRepairs5Years,
    )

    if (year === Math.floor(templateData.analysisPeriod * 0.8)) {
      yearRepairs = repairs.tyreReplacement
    } else if (year === templateData.analysisPeriod) {
      yearRepairs = repairs.majorRepairs5Years
    }

    totalFuel += fuelCost
    totalInsurance += insurance
    totalService += service
    totalRepairs += yearRepairs
    totalDepreciation += depreciation
  }

  // Calculate final value (depreciated resale value) based on depreciation model
  let finalValue = templateData.expectedValueAfter5Years
  if (!finalValue || finalValue === 0) {
    // Auto-calculate if not provided
    if (templateData.depreciationModel === 'straightLine') {
      finalValue = Math.max(
        0,
        templateData.currentMarketValue *
          (1 - (templateData.depreciationRate / 100) * templateData.analysisPeriod),
      )
    } else if (templateData.depreciationModel === 'accelerated') {
      finalValue = Math.max(
        0,
        templateData.currentMarketValue *
          Math.pow(1 - (templateData.depreciationRate / 100) * 2, templateData.analysisPeriod),
      )
    } else if (templateData.depreciationModel === 'custom') {
      finalValue = Math.max(0, templateData.currentMarketValue * 0.3) // Rough estimate: 30% of original
    } else {
      finalValue = templateData.currentMarketValue // No depreciation
    }
  }

  // Operating costs (fuel, insurance, service, repairs, depreciation)
  const operatingCosts =
    totalFuel + totalInsurance + totalService + totalRepairs + totalDepreciation

  // Total ownership cost = Initial Purchase Price + Operating Costs - Resale Value
  const totalCosts = templateData.currentMarketValue + operatingCosts
  const ownedCost = totalCosts - finalValue

  // Calculate best lease option
  let bestLeaseCost = Infinity
  let bestLeaseOption = null

  for (const option of templateData.leaseOptions) {
    const annualEMI = option.emi * 12
    const annualFuelCost =
      (templateData.annualDistance / templateData.mileage) * templateData.fuelPrice
    const extraKM = Math.max(0, templateData.annualDistance - option.allowedKMperYear)
    const extraKMCost = extraKM * option.extraKMCharge
    const grossAnnualCost = annualEMI + annualFuelCost + extraKMCost

    const fuelReimbursement = Math.min(annualFuelCost, templateData.fuelReimbursementCap)
    const reimbursement = fuelReimbursement + templateData.driverReimbursementCap

    const effectiveRate = templateData.effectiveTaxRate / 100
    const taxSaving = Math.max(0, annualEMI * effectiveRate - templateData.taxDeductions)

    const netAnnualCost = grossAnnualCost - reimbursement - taxSaving
    const netTotalCost = netAnnualCost * templateData.analysisPeriod

    if (netTotalCost < bestLeaseCost) {
      bestLeaseCost = netTotalCost
      bestLeaseOption = option.name
    }
  }

  return {
    ownedCost,
    leaseCost: bestLeaseCost,
    netCost: Math.min(ownedCost, bestLeaseCost),
    recommendation: ownedCost < bestLeaseCost ? 'Own' : 'Lease',
    bestLeaseOption,
  }
}

// Helper function to calculate depreciation for a template
const calculateDepreciationForTemplate = (
  year: number,
  totalYears: number,
  templateData: typeof defaultAssumptions,
  majorRepairs5Years: number,
) => {
  if (templateData.depreciationModel === 'none') return 0

  const rate = templateData.depreciationRate / 100
  const baseValue = templateData.currentMarketValue

  if (templateData.depreciationModel === 'straightLine') {
    return (baseValue * rate) / totalYears
  } else if (templateData.depreciationModel === 'accelerated') {
    // Double declining balance
    const bookValue = baseValue * Math.pow(1 - rate * 2, year - 1)
    return bookValue * rate * 2
  } else if (templateData.depreciationModel === 'custom') {
    // Custom: distribute majorRepairs5Years over years (matching original logic)
    return year <= totalYears ? majorRepairs5Years / totalYears : 0
  }

  return 0
}

// Template Comparison
const templateComparison = computed(() => {
  if (selectedTemplates.value.length === 0) return []

  return selectedTemplates.value
    .map((templateId) => {
      const template = savedTemplates.value.find((t) => t.id === templateId)
      if (!template) return null

      const templateData = template.template_data as typeof defaultAssumptions
      const costs = calculateTemplateCosts(templateData)

      return {
        name: template.name,
        ownedCost: costs.ownedCost,
        leaseCost: costs.leaseCost,
        netCost: costs.netCost,
        recommendation: costs.recommendation,
        bestLeaseOption: costs.bestLeaseOption,
      }
    })
    .filter(Boolean)
})

// Format currency based on selected currency
const formatCurrency = (value: number) => {
  if (value == null || isNaN(value)) return '0'
  const currency =
    currencies[assumptions.value.currency as keyof typeof currencies] || currencies.INR
  return `${currency.symbol}${Number(value).toLocaleString(currency.locale, { maximumFractionDigits: 0 })}`
}

// Format number with commas for display in inputs
const formatNumberWithCommas = (value: number | string): string => {
  if (value === null || value === undefined || value === '') return ''
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
  if (isNaN(numValue)) return ''
  return numValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

// Parse comma-separated number string to number
const parseCommaNumber = (value: string): number => {
  if (!value) return 0
  const cleaned = value.replace(/,/g, '').trim()
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

// Get currency code for suffix
const getCurrencyCode = () => {
  return assumptions.value.currency || 'INR'
}

// Reactive formatters for currency inputs
const currencyInputs = ref<Record<string, string>>({})

// Initialize currency input values
const validateExpectedValue = () => {
  if (assumptions.value.expectedValueAfter5Years > assumptions.value.currentMarketValue) {
    assumptions.value.expectedValueAfter5Years = assumptions.value.currentMarketValue
    updateCurrencyInputs()
    showToast('Expected value cannot exceed current market value', 'warning')
  }
}

const openSaveModalFromTemplates = () => {
  showSaveModal.value = true
  showTemplatesModal.value = false
}

const loadTemplateAndClose = async (templateId: number) => {
  await loadTemplate(templateId)
  showTemplatesModal.value = false
}

const closeEditModal = () => {
  showEditModal.value = false
  editingTemplate.value = null
  templateName.value = ''
  templateDescription.value = ''
  isDefaultTemplate.value = false
}

const closeDeleteLeaseOptionModal = () => {
  showDeleteLeaseOptionModal.value = false
  leaseOptionToDelete.value = null
}

const incrementAllowedKM = (option: (typeof defaultAssumptions.leaseOptions)[0]) => {
  option.allowedKMperYear = Math.max(0, (option.allowedKMperYear || 0) + 1000)
}

const decrementAllowedKM = (option: (typeof defaultAssumptions.leaseOptions)[0]) => {
  option.allowedKMperYear = Math.max(0, (option.allowedKMperYear || 0) - 1000)
}

const updateCurrencyInputs = () => {
  currencyInputs.value.currentMarketValue = formatNumberWithCommas(
    assumptions.value.currentMarketValue,
  )
  currencyInputs.value.expectedValueAfter5Years = formatNumberWithCommas(
    assumptions.value.expectedValueAfter5Years,
  )
  currencyInputs.value.annualInsurance = formatNumberWithCommas(assumptions.value.annualInsurance)
  currencyInputs.value.annualServiceMaintenance = formatNumberWithCommas(
    assumptions.value.annualServiceMaintenance,
  )
  currencyInputs.value.fuelPrice = formatNumberWithCommas(assumptions.value.fuelPrice)
  currencyInputs.value.fuelReimbursementCap = formatNumberWithCommas(
    assumptions.value.fuelReimbursementCap,
  )
  currencyInputs.value.driverReimbursementCap = formatNumberWithCommas(
    assumptions.value.driverReimbursementCap,
  )
  currencyInputs.value.taxDeductions = formatNumberWithCommas(assumptions.value.taxDeductions)

  // Update lease option EMIs and extraKMCharge
  assumptions.value.leaseOptions.forEach((option, index) => {
    currencyInputs.value[`leaseOption_${index}_emi`] = formatNumberWithCommas(option.emi)
    currencyInputs.value[`leaseOption_${index}_extraKMCharge`] = formatNumberWithCommas(
      option.extraKMCharge,
    )
  })
}

watch(
  () => [
    assumptions.value.currentMarketValue,
    assumptions.value.expectedValueAfter5Years,
    assumptions.value.annualInsurance,
    assumptions.value.annualServiceMaintenance,
    assumptions.value.fuelPrice,
    assumptions.value.fuelReimbursementCap,
    assumptions.value.driverReimbursementCap,
    assumptions.value.taxDeductions,
    assumptions.value.leaseOptions.map((o) => ({ emi: o.emi, extraKMCharge: o.extraKMCharge })),
  ],
  () => {
    updateCurrencyInputs()
  },
  { immediate: true, deep: true },
)

// Handle currency input changes
const updateCurrencyValue = (key: string, value: string) => {
  const numValue = Math.max(0, parseCommaNumber(value)) // Prevent negative values
  const formatted = formatNumberWithCommas(numValue)

  // Update the formatted display value
  currencyInputs.value[key] = formatted

  // Update the actual numeric value in assumptions
  switch (key) {
    case 'currentMarketValue':
      assumptions.value.currentMarketValue = numValue
      break
    case 'expectedValueAfter5Years':
      assumptions.value.expectedValueAfter5Years = numValue
      break
    case 'annualInsurance':
      assumptions.value.annualInsurance = numValue
      break
    case 'annualServiceMaintenance':
      assumptions.value.annualServiceMaintenance = numValue
      break
    case 'fuelPrice':
      assumptions.value.fuelPrice = numValue
      break
    case 'fuelReimbursementCap':
      assumptions.value.fuelReimbursementCap = numValue
      break
    case 'driverReimbursementCap':
      assumptions.value.driverReimbursementCap = numValue
      break
    case 'taxDeductions':
      assumptions.value.taxDeductions = numValue
      break
    default:
      if (key.startsWith('leaseOption_')) {
        const emiMatch = key.match(/leaseOption_(\d+)_emi/)
        if (emiMatch) {
          const index = parseInt(emiMatch[1])
          if (assumptions.value.leaseOptions[index]) {
            // Force reactivity by creating a new array reference
            const updatedOptions = [...assumptions.value.leaseOptions]
            updatedOptions[index] = { ...updatedOptions[index], emi: numValue }
            assumptions.value.leaseOptions = updatedOptions
          }
        } else {
          const extraKMMatch = key.match(/leaseOption_(\d+)_extraKMCharge/)
          if (extraKMMatch) {
            const index = parseInt(extraKMMatch[1])
            if (assumptions.value.leaseOptions[index]) {
              // Force reactivity by creating a new array reference
              const updatedOptions = [...assumptions.value.leaseOptions]
              updatedOptions[index] = { ...updatedOptions[index], extraKMCharge: numValue }
              assumptions.value.leaseOptions = updatedOptions
            }
          }
        }
      }
  }
}

// Export to PDF
// Helper function to format currency for PDF
const formatCurrencyForPDF = (amount: number): string => {
  const currency = currencies[assumptions.value.currency as keyof typeof currencies]
  if (!currency)
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return amount.toLocaleString(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

// Helper function to check if new page is needed
const checkPageBreak = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  yPos: number,
  requiredSpace: number = 10,
  margin: number = 20,
): number => {
  const pageHeight = doc.internal.pageSize.height
  if (yPos + requiredSpace > pageHeight - margin) {
    doc.addPage()
    return margin
  }
  return yPos
}

// Helper function to add colored box
const addColoredBox = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number[],
  textColor: number[] = [0, 0, 0],
): void => {
  doc.setFillColor(color[0], color[1], color[2])
  doc.setDrawColor(color[0], color[1], color[2])
  doc.setLineWidth(0.5)
  doc.roundedRect(x, y, width, height, 2, 2, 'FD')
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
}

// Helper function to add section header with colored background
const addSectionHeader = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  yPos: number,
  title: string,
  fontSize: number = 14,
  icon: string = '',
): number => {
  yPos = checkPageBreak(doc, yPos, 20, 20)
  const pageWidth = doc.internal.pageSize.width
  const margin = 20

  // Colored header box
  doc.setFillColor(30, 144, 255) // Sky blue
  doc.setDrawColor(30, 144, 255)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, yPos - 5, pageWidth - margin * 2, 12, 2, 2, 'FD')

  // Header text
  doc.setFontSize(fontSize)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(255, 255, 255)
  const headerText = icon ? `${icon} ${title}` : title
  doc.text(headerText, margin + 5, yPos + 3)

  // Reset colors
  doc.setTextColor(0, 0, 0)
  doc.setFont(undefined, 'normal')
  return yPos + 12
}

// Helper function to draw table with borders
const drawTable = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  startX: number,
  startY: number,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  headerColor: number[] = [240, 240, 240],
): number => {
  const rowHeight = 7
  const headerHeight = 8
  let currentY = startY

  // Check page break before drawing
  currentY = checkPageBreak(doc, currentY, (rows.length + 1) * rowHeight + headerHeight, 20)
  startY = currentY

  // Calculate total table width and ensure it fits within page
  const pageWidth = doc.internal.pageSize.width
  const margin = 20
  const maxTableWidth = pageWidth - margin * 2 - startX + margin
  const totalColWidth = colWidths.reduce((a, b) => a + b, 0)

  // Scale column widths if table is too wide
  let adjustedColWidths = colWidths
  if (totalColWidth > maxTableWidth) {
    const scaleFactor = maxTableWidth / totalColWidth
    adjustedColWidths = colWidths.map((w) => w * scaleFactor)
  }
  const tableWidth = adjustedColWidths.reduce((a, b) => a + b, 0)

  // Draw header background
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2])
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(startX, startY, tableWidth, headerHeight, 'FD')

  // Draw header text
  doc.setFont(undefined, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  let currentX = startX
  headers.forEach((header, index) => {
    doc.text(header, currentX + 3, startY + 5.5)
    currentX += adjustedColWidths[index]
  })

  // Draw rows
  doc.setFont(undefined, 'normal')
  doc.setFontSize(8)
  currentY = startY + headerHeight

  rows.forEach((row, rowIndex) => {
    currentY = checkPageBreak(doc, currentY, rowHeight, 20)
    if (currentY === 20) {
      // New page - redraw header
      startY = currentY
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2])
      doc.rect(startX, startY, tableWidth, headerHeight, 'FD')
      doc.setFont(undefined, 'bold')
      currentX = startX
      headers.forEach((header, index) => {
        doc.text(header, currentX + 3, startY + 5.5)
        currentX += adjustedColWidths[index]
      })
      doc.setFont(undefined, 'normal')
      currentY = startY + headerHeight
    }

    // Alternate row color
    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(startX, currentY, tableWidth, rowHeight, 'FD')
    }

    // Draw row borders
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.rect(startX, currentY, tableWidth, rowHeight)

    // Draw cell borders and text
    currentX = startX
    row.forEach((cell, colIndex) => {
      // Vertical line
      doc.line(currentX, currentY, currentX, currentY + rowHeight)
      // Text with proper wrapping
      const cellText = doc.splitTextToSize(cell, adjustedColWidths[colIndex] - 6)
      const textY = currentY + rowHeight / 2 - (cellText.length - 1) * 2.5
      doc.text(cellText, currentX + 3, textY, { maxWidth: adjustedColWidths[colIndex] - 6 })
      currentX += adjustedColWidths[colIndex]
    })

    // Bottom border
    doc.line(startX, currentY + rowHeight, startX + tableWidth, currentY + rowHeight)

    currentY += rowHeight
  })

  // Final border
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.5)
  doc.rect(startX, startY, tableWidth, currentY - startY)

  return currentY + 5
}

const exportToPDF = async () => {
  isExportingPDF.value = true
  try {
    // Dynamic import of jsPDF
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    let yPos = margin

    // ========== COVER PAGE ==========
    // Title with gradient effect (simulated with colored box)
    addColoredBox(doc, margin, yPos, contentWidth, 50, [30, 144, 255], [255, 255, 255])
    doc.setFontSize(28)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Car Ownership vs Lease', pageWidth / 2, yPos + 18, { align: 'center' })
    doc.setFontSize(18)
    doc.text('Financial Analysis Report', pageWidth / 2, yPos + 32, { align: 'center' })
    doc.setTextColor(0, 0, 0)

    yPos += 60

    // Info boxes
    const boxWidth = (contentWidth - 10) / 2
    const infoBoxes = [
      {
        label: 'Generated',
        value: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      },
      { label: 'Currency', value: assumptions.value.currency },
    ]

    if (assumptions.value.carName) {
      infoBoxes.push({ label: 'Vehicle', value: assumptions.value.carName })
    }
    infoBoxes.push({ label: 'Analysis Period', value: `${assumptions.value.analysisPeriod} years` })

    let boxX = margin
    infoBoxes.forEach((box, index) => {
      if (index > 0 && index % 2 === 0) {
        boxX = margin
        yPos += 25
      }
      addColoredBox(doc, boxX, yPos, boxWidth, 20, [245, 245, 250], [0, 0, 0])
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text(box.label, boxX + 5, yPos + 8)
      doc.setFont(undefined, 'normal')
      doc.setFontSize(9)
      doc.text(box.value, boxX + 5, yPos + 15)
      boxX += boxWidth + 10
    })

    yPos += 30

    // Executive Summary Box with color and text wrapping
    if (recommendation.value && finalComparison.value) {
      const isLeaseRecommended =
        recommendation.value.recommended.includes('Leased') ||
        recommendation.value.recommended.includes('lease')
      const summaryColor = isLeaseRecommended ? [34, 197, 94] : [59, 130, 246] // Green for lease, blue for own

      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      const summaryTitle = '✓ EXECUTIVE SUMMARY'

      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      const summaryText = recommendation.value.explanation
      // Use more conservative width for text wrapping (account for padding on both sides)
      const textWidth = contentWidth - 20 // 10px padding on each side
      const summaryLines = doc.splitTextToSize(summaryText, textWidth)

      const summaryBoxHeight = 10 + summaryLines.length * 5.5 + 15

      addColoredBox(
        doc,
        margin,
        yPos,
        contentWidth,
        summaryBoxHeight,
        summaryColor,
        [255, 255, 255],
      )

      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(summaryTitle, margin + 10, yPos + 10)

      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      doc.text(summaryLines, margin + 10, yPos + 20)
      doc.setTextColor(0, 0, 0)
    }

    // ========== PAGE 2: REPORT OVERVIEW ==========
    doc.addPage()
    yPos = margin

    yPos = addSectionHeader(doc, yPos, '1. REPORT OVERVIEW', 16, '[REPORT]')

    // Info box with text wrapping
    const overviewText1 = `This comprehensive financial analysis report compares the total cost of ownership versus leasing a vehicle over a ${assumptions.value.analysisPeriod}-year period.`
    const overviewText2 = `The analysis considers all relevant costs, tax benefits, reimbursements, depreciation, and investment opportunities.`
    doc.setFontSize(10)
    const overviewLines1 = doc.splitTextToSize(overviewText1, contentWidth - 10)
    const overviewLines2 = doc.splitTextToSize(overviewText2, contentWidth - 10)
    const overviewBoxHeight = (overviewLines1.length + overviewLines2.length) * 5 + 10
    addColoredBox(doc, margin, yPos, contentWidth, overviewBoxHeight, [240, 249, 255], [0, 0, 0])
    doc.text(overviewLines1, margin + 5, yPos + 7)
    doc.text(overviewLines2, margin + 5, yPos + 7 + overviewLines1.length * 5)

    yPos += overviewBoxHeight + 5

    // Key points with icons
    doc.setFont(undefined, 'bold')
    doc.setFontSize(10)
    doc.text('The calculator evaluates:', margin, yPos)
    yPos += 7

    const keyPoints = [
      { text: 'Total ownership costs (purchase price, operating expenses, resale value)' },
      { text: 'Lease costs (EMI, fuel, extra charges, reimbursements, tax benefits)' },
      { text: 'Investment returns from selling vehicle and investing proceeds' },
      { text: 'Net cost comparison to determine the most economical option' },
    ]

    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    keyPoints.forEach((point) => {
      yPos = checkPageBreak(doc, yPos, 6, 20)
      doc.text(`• ${point.text}`, margin + 5, yPos)
      yPos += 6
    })
    yPos += 5

    // ========== CALCULATION METHODOLOGY ==========
    yPos = addSectionHeader(doc, yPos, '2. CALCULATION METHODOLOGY', 14, '[METHOD]')

    // Ownership Cost Calculation Box with text wrapping
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    const ownershipTitle = '2.1 Ownership Cost Calculation'
    const ownershipFormula =
      'Formula: Total Ownership Cost = Purchase Price + Operating Costs - Resale Value'
    doc.setFontSize(9)
    const ownershipFormulaLines = doc.splitTextToSize(ownershipFormula, contentWidth - 10)

    const ownershipPoints = [
      '• Fuel costs: (Annual Distance ÷ Mileage) × Fuel Price × Analysis Period',
      '• Insurance: Annual Premium × Analysis Period',
      '• Service & Maintenance: Annual Cost × Analysis Period',
      '• Repairs: (Insurance + Maintenance) × Repair Factor (70% Major, 30% Tyres)',
      '• Depreciation: Based on selected model (Straight-Line/Accelerated/Custom)',
    ]

    // Calculate total height needed
    let ownershipPointsHeight = 0
    ownershipPoints.forEach((point) => {
      const pointLines = doc.splitTextToSize(point, contentWidth - 20)
      ownershipPointsHeight += pointLines.length * 5
    })
    const ownershipBoxHeight = 8 + ownershipFormulaLines.length * 5 + ownershipPointsHeight + 10

    addColoredBox(doc, margin, yPos, contentWidth, ownershipBoxHeight, [240, 249, 255], [0, 0, 0])
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text(ownershipTitle, margin + 5, yPos + 8)
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    doc.text(ownershipFormulaLines, margin + 5, yPos + 15)

    let methodY = yPos + 15 + ownershipFormulaLines.length * 5 + 5
    ownershipPoints.forEach((point) => {
      const pointLines = doc.splitTextToSize(point, contentWidth - 20)
      doc.text(pointLines, margin + 10, methodY)
      methodY += pointLines.length * 5
    })
    yPos += ownershipBoxHeight + 5

    // Lease Cost Calculation Box with text wrapping
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    const leaseTitle = '2.2 Lease Cost Calculation'
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)

    const leasePoints = [
      '• Annual Lease = (Monthly EMI × 12) + Fuel Cost + Extra KM Charges',
      '• Gross Annual Cost = Annual EMI + Fuel + Extra KM',
      '• Net Annual Cost = Gross - Reimbursements - Tax Savings',
      '• Tax Saving = (Annual EMI × Tax Rate) - Other Deductions',
      '• If Tenure < Analysis Period: Add Post-Lease Cost',
    ]

    // Calculate total height needed
    let leasePointsHeight = 0
    leasePoints.forEach((point) => {
      const pointLines = doc.splitTextToSize(point, contentWidth - 20)
      leasePointsHeight += pointLines.length * 5
    })
    const leaseBoxHeight = 8 + leasePointsHeight + 10

    addColoredBox(doc, margin, yPos, contentWidth, leaseBoxHeight, [240, 253, 244], [0, 0, 0])
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text(leaseTitle, margin + 5, yPos + 8)
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)

    methodY = yPos + 15
    leasePoints.forEach((point) => {
      const pointLines = doc.splitTextToSize(point, contentWidth - 20)
      doc.text(pointLines, margin + 10, methodY)
      methodY += pointLines.length * 5
    })
    yPos += leaseBoxHeight + 5

    // Investment Return Calculation Box
    addColoredBox(doc, margin, yPos, contentWidth, 40, [255, 251, 235], [0, 0, 0])
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text('2.3 Investment Return Calculation', margin + 5, yPos + 8)
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)

    const investmentPoints = [
      `💼 Initial Investment = Current Market Value (${formatCurrencyForPDF(assumptions.value.currentMarketValue)})`,
      `📈 Annual Return Rate = ${assumptions.value.returnOnInvestedCapital}% (Compound Interest)`,
      `💰 Final Value = Initial × (1 + ${assumptions.value.returnOnInvestedCapital}%)^${assumptions.value.analysisPeriod}`,
      `✅ Total Gain = Final Value - Initial Investment`,
    ]

    methodY = yPos + 15
    investmentPoints.forEach((point) => {
      doc.text(point, margin + 10, methodY)
      methodY += 5
    })
    yPos += 45

    // ========== INPUT ASSUMPTIONS ==========
    yPos = addSectionHeader(doc, yPos, '3. INPUT ASSUMPTIONS', 14, '[INPUTS]')

    // General Assumptions Table
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('3.1 General Assumptions', margin, yPos)
    yPos += 7

    const generalHeaders = ['Parameter', 'Value']
    const generalColWidths = [80, 110]
    const generalRows = [
      ['Car Name', assumptions.value.carName || 'Not specified'],
      ['Analysis Period', `${assumptions.value.analysisPeriod} years`],
      ['Currency', assumptions.value.currency],
      ['Annual Distance', `${assumptions.value.annualDistance.toLocaleString()} km`],
      ['Fuel Price', `${formatCurrencyForPDF(assumptions.value.fuelPrice)} per liter`],
      ['Mileage', `${assumptions.value.mileage} km per liter`],
    ]
    yPos = drawTable(
      doc,
      margin,
      yPos,
      generalHeaders,
      generalRows,
      generalColWidths,
      [240, 249, 255],
    )
    yPos += 5

    // Owned Car Assumptions Table
    doc.setFont(undefined, 'bold')
    doc.text('3.2 Owned Car Assumptions', margin, yPos)
    yPos += 7

    const ownedHeaders = ['Parameter', 'Value']
    const ownedColWidths = [90, 100]
    const ownedRows = [
      ['Purchase Year', assumptions.value.purchaseYear?.toString() || 'Not specified'],
      ['Current Market Value', formatCurrencyForPDF(assumptions.value.currentMarketValue)],
      [
        'Expected Resale Value',
        formatCurrencyForPDF(assumptions.value.expectedValueAfter5Years) || 'Auto-calculated',
      ],
      ['Annual Insurance', formatCurrencyForPDF(assumptions.value.annualInsurance)],
      [
        'Annual Service & Maintenance',
        formatCurrencyForPDF(assumptions.value.annualServiceMaintenance),
      ],
      [
        'Repairs Factor',
        `${(assumptions.value.repairsFactor * 100).toFixed(0)}% of (Insurance + Maintenance)`,
      ],
      [
        'Depreciation Model',
        depreciationModels[assumptions.value.depreciationModel as keyof typeof depreciationModels],
      ],
      ['Depreciation Rate', `${assumptions.value.depreciationRate}% per year`],
    ]
    yPos = drawTable(doc, margin, yPos, ownedHeaders, ownedRows, ownedColWidths, [255, 250, 240])
    yPos += 5

    // Lease Options Table
    doc.setFont(undefined, 'bold')
    doc.text('3.3 Lease Options', margin, yPos)
    yPos += 7

    const leaseOptionHeaders = [
      'Option',
      'EMI/Month',
      'Tenure',
      'Allowed KM/Year',
      'Extra KM Charge',
    ]
    const leaseOptionColWidths = [30, 32, 28, 38, 42]
    const leaseOptionRows = assumptions.value.leaseOptions.map((option) => [
      option.name,
      formatCurrencyForPDF(option.emi),
      `${option.tenure} mo`,
      `${option.allowedKMperYear.toLocaleString()} km`,
      `${formatCurrencyForPDF(option.extraKMCharge)}/km`,
    ])

    yPos = drawTable(
      doc,
      margin,
      yPos,
      leaseOptionHeaders,
      leaseOptionRows,
      leaseOptionColWidths,
      [240, 253, 244],
    )
    yPos += 5

    // Reimbursements & Tax Table
    doc.setFont(undefined, 'bold')
    doc.text('3.4 Reimbursements & Tax', margin, yPos)
    yPos += 7

    const taxHeaders = ['Parameter', 'Value']
    const taxColWidths = [90, 100]
    const taxRows = [
      [
        'Fuel Reimbursement Cap',
        `${formatCurrencyForPDF(assumptions.value.fuelReimbursementCap)} per year`,
      ],
      [
        'Driver Reimbursement Cap',
        `${formatCurrencyForPDF(assumptions.value.driverReimbursementCap)} per year`,
      ],
      ['Effective Tax Rate', `${assumptions.value.effectiveTaxRate}%`],
      ['Other Tax Deductions', formatCurrencyForPDF(assumptions.value.taxDeductions)],
      ['Return on Invested Capital', `${assumptions.value.returnOnInvestedCapital}% per year`],
    ]

    if (assumptions.value.postLeaseScenario) {
      taxRows.push([
        'Post-Lease Scenario',
        assumptions.value.postLeaseScenario === 'extend'
          ? 'Extend Lease'
          : assumptions.value.postLeaseScenario === 'buy'
            ? 'Buy Car'
            : 'Lease New Car',
      ])
    }

    yPos = drawTable(doc, margin, yPos, taxHeaders, taxRows, taxColWidths, [255, 247, 237])
    yPos += 5

    // ========== OWNERSHIP COSTS BREAKDOWN ==========
    yPos = addSectionHeader(doc, yPos, '4. OWNERSHIP COSTS BREAKDOWN', 14, '[OWNERSHIP]')

    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('Year-by-Year Breakdown', margin, yPos)
    yPos += 8

    // Create table with proper borders
    const ownershipHeaders = [
      'Year',
      'Fuel',
      'Insurance',
      'Service',
      'Repairs',
      'Depreciation',
      'Total',
    ]
    const ownershipColWidths = [18, 25, 25, 25, 25, 25, 30]
    const ownershipRows = ownershipCosts.value.years.map((year) => [
      `Year ${year.year}`,
      formatCurrencyForPDF(year.fuelCost),
      formatCurrencyForPDF(year.insurance),
      formatCurrencyForPDF(year.service),
      formatCurrencyForPDF(year.repairs),
      formatCurrencyForPDF(year.depreciation),
      formatCurrencyForPDF(year.total),
    ])

    yPos = drawTable(
      doc,
      margin,
      yPos,
      ownershipHeaders,
      ownershipRows,
      ownershipColWidths,
      [220, 237, 255],
    )
    yPos += 5

    // Summary with colored boxes - with text wrapping
    doc.setFont(undefined, 'bold')
    doc.setFontSize(11)
    const summaryTitle = 'Ownership Cost Summary'

    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    const summaryItems = [
      {
        label: `Total Operating Costs (${assumptions.value.analysisPeriod} years):`,
        value: formatCurrencyForPDF(ownershipCosts.value.operatingCosts),
      },
      { label: 'Purchase Price:', value: formatCurrencyForPDF(ownershipCosts.value.purchasePrice) },
      {
        label: 'Total Ownership Cost:',
        value: formatCurrencyForPDF(ownershipCosts.value.totalCosts),
      },
      {
        label: `Resale Value (after ${assumptions.value.analysisPeriod} years):`,
        value: formatCurrencyForPDF(ownershipCosts.value.resaleValue),
      },
    ]

    // Calculate height needed for labels (with wrapping)
    let summaryHeight = 8 + 5 // title + spacing
    summaryItems.forEach((item) => {
      const labelLines = doc.splitTextToSize(item.label, contentWidth - 60) // leave space for value
      summaryHeight += labelLines.length * 6
    })
    summaryHeight += 12 // net cost line
    summaryHeight += 6 // average monthly line
    summaryHeight += 5 // padding

    addColoredBox(doc, margin, yPos, contentWidth, summaryHeight, [250, 250, 255], [0, 0, 0])
    doc.setFont(undefined, 'bold')
    doc.setFontSize(11)
    doc.text(summaryTitle, margin + 5, yPos + 8)

    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    let summaryY = yPos + 15
    summaryItems.forEach((item) => {
      const labelLines = doc.splitTextToSize(item.label, contentWidth - 60)
      doc.text(labelLines, margin + 5, summaryY)
      doc.setFont(undefined, 'bold')
      doc.text(item.value, margin + contentWidth - 5, summaryY, { align: 'right' })
      doc.setFont(undefined, 'normal')
      summaryY += labelLines.length * 6
    })

    // Net cost highlighted
    doc.setFont(undefined, 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 144, 255)
    const netCostText = `NET OWNERSHIP COST: ${formatCurrencyForPDF(ownershipCosts.value.netOwnershipCost)}`
    const netCostLines = doc.splitTextToSize(netCostText, contentWidth - 10)
    doc.text(netCostLines, margin + 5, summaryY)
    doc.setTextColor(0, 0, 0)
    summaryY += netCostLines.length * 6
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    const avgMonthlyText = `Average Monthly Cost: ${formatCurrencyForPDF(ownershipCosts.value.netOwnershipCost / (assumptions.value.analysisPeriod * 12))}`
    const avgMonthlyLines = doc.splitTextToSize(avgMonthlyText, contentWidth - 10)
    doc.text(avgMonthlyLines, margin + 5, summaryY)

    yPos += summaryHeight + 5

    // ========== LEASE COMPARISON ==========
    yPos = addSectionHeader(doc, yPos, '5. LEASE OPTIONS COMPARISON', 14, '[LEASE]')

    leaseOptions.value.forEach((option, index) => {
      yPos = checkPageBreak(doc, yPos, 50, 20)

      // Option header box
      const optionColor = index % 2 === 0 ? [237, 242, 255] : [250, 250, 255]
      addColoredBox(doc, margin, yPos, contentWidth, 8, optionColor, [0, 0, 0])
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text(`${option.optionName}`, margin + 5, yPos + 5.5)
      yPos += 12

      // Create table for lease option details
      const leaseHeaders = ['Detail', 'Value']
      // Ensure columns fit within contentWidth (pageWidth - 2*margin)
      // For A4: ~210mm width, margin 20mm each side = 170mm contentWidth
      // Use proportional widths that fit: ~75mm for Detail, ~85mm for Value
      const leaseColWidths = [75, 85]
      const leaseRows = [
        ['Lease Tenure', `${option.tenure} months (${option.tenureYears.toFixed(1)} years)`],
        ['Monthly EMI', formatCurrencyForPDF(option.emi)],
        ['Annual EMI', formatCurrencyForPDF(option.annualEMI)],
        ['Annual Fuel Cost', formatCurrencyForPDF(option.annualFuelCost)],
        ['Allowed KM/Year', `${option.allowedKMperYear.toLocaleString()} km`],
        ['Extra KM', `${option.extraKM.toLocaleString()} km`],
        ['Extra KM Cost', formatCurrencyForPDF(option.extraKMCost)],
        ['Gross Annual Cost', formatCurrencyForPDF(option.grossAnnualCost)],
        ['Reimbursement', formatCurrencyForPDF(option.reimbursement)],
        ['Tax Saving', formatCurrencyForPDF(option.taxSaving)],
        ['Net Annual Cost', formatCurrencyForPDF(option.netAnnualCost)],
      ]

      if (option.postLeaseYears > 0) {
        leaseRows.push([
          'Post-Lease Period',
          `${option.postLeaseYears} years (${assumptions.value.postLeaseScenario === 'extend' ? 'Extend Lease' : assumptions.value.postLeaseScenario === 'buy' ? 'Buy Car' : 'Lease New'})`,
        ])
        leaseRows.push(['Lease Period Cost', formatCurrencyForPDF(option.leasePeriodCost)])
        leaseRows.push(['Post-Lease Cost', formatCurrencyForPDF(option.postLeaseCost)])
      }

      yPos = drawTable(doc, margin, yPos, leaseHeaders, leaseRows, leaseColWidths, [237, 242, 255])

      // Highlight net cost with text wrapping
      doc.setFont(undefined, 'bold')
      doc.setFontSize(11)
      const netCostText = `NET ${assumptions.value.analysisPeriod}-YEAR COST: ${formatCurrencyForPDF(option.netTotalCost)}`
      const netCostLines = doc.splitTextToSize(netCostText, contentWidth - 20)
      const netCostBoxHeight = Math.max(12, netCostLines.length * 5 + 6)
      addColoredBox(
        doc,
        margin,
        yPos,
        contentWidth,
        netCostBoxHeight,
        [30, 144, 255],
        [255, 255, 255],
      )
      doc.setTextColor(255, 255, 255)
      doc.text(netCostLines, margin + 10, yPos + 8)
      doc.setTextColor(0, 0, 0)
      yPos += netCostBoxHeight + 5

      doc.setFont(undefined, 'normal')
      doc.setFontSize(9)
      const avgMonthlyText = `Average Monthly Cost: ${formatCurrencyForPDF(option.netTotalCost / (assumptions.value.analysisPeriod * 12))}`
      const avgMonthlyLines = doc.splitTextToSize(avgMonthlyText, contentWidth - 20)
      doc.text(avgMonthlyLines, margin + 10, yPos)
      yPos += avgMonthlyLines.length * 5 + 5
    })

    // ========== INVESTMENT RETURN ==========
    yPos = addSectionHeader(doc, yPos, '6. INVESTMENT RETURN ANALYSIS', 14, '[INVESTMENT]')

    // Info box with text wrapping
    const investmentInfoText = `If you lease, you sell your vehicle for ${formatCurrencyForPDF(assumptions.value.currentMarketValue)} and invest the proceeds at ${assumptions.value.returnOnInvestedCapital}% annual return. The investment grows with compound interest over ${assumptions.value.analysisPeriod} years.`
    doc.setFontSize(9)
    const investmentInfoLines = doc.splitTextToSize(investmentInfoText, contentWidth - 10)
    const investmentBoxHeight = Math.max(20, investmentInfoLines.length * 5 + 10)
    addColoredBox(doc, margin, yPos, contentWidth, investmentBoxHeight, [240, 253, 244], [0, 0, 0])
    doc.text(investmentInfoLines, margin + 5, yPos + 7)
    yPos += investmentBoxHeight + 5

    // Investment table
    const investmentHeaders = ['Year', 'Opening Value', 'Interest Earned', 'Closing Value']
    const investmentColWidths = [20, 45, 45, 50]
    const investmentRows = investmentReturn.value.years.map((year) => [
      `Year ${year.year}`,
      formatCurrencyForPDF(year.openingValue),
      formatCurrencyForPDF(year.interestEarned),
      formatCurrencyForPDF(year.closingValue),
    ])

    yPos = drawTable(
      doc,
      margin,
      yPos,
      investmentHeaders,
      investmentRows,
      investmentColWidths,
      [220, 252, 231],
    )
    yPos += 5

    // Results with colored highlights - with text wrapping
    doc.setFont(undefined, 'bold')
    doc.setFontSize(10)
    const resultsTitle = 'Investment Results'

    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    const comparisonText = `Comparison: Owned car resale value: ${formatCurrencyForPDF(ownershipCosts.value.resaleValue)}`
    const comparisonLines = doc.splitTextToSize(comparisonText, contentWidth - 10)

    const resultsBoxHeight = 8 + 6 + 6 + comparisonLines.length * 5 + 5

    addColoredBox(doc, margin, yPos, contentWidth, resultsBoxHeight, [240, 253, 244], [0, 0, 0])
    doc.setFont(undefined, 'bold')
    doc.setFontSize(10)
    doc.text(resultsTitle, margin + 5, yPos + 8)

    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    doc.text(`Final Investment Value:`, margin + 5, yPos + 16)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(34, 197, 94)
    doc.text(
      formatCurrencyForPDF(investmentReturn.value.finalValue),
      margin + contentWidth - 5,
      yPos + 16,
      { align: 'right' },
    )
    doc.setTextColor(0, 0, 0)

    doc.setFont(undefined, 'normal')
    doc.text(`Total Investment Gain:`, margin + 5, yPos + 23)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(34, 197, 94)
    doc.text(
      formatCurrencyForPDF(investmentReturn.value.totalGain),
      margin + contentWidth - 5,
      yPos + 23,
      { align: 'right' },
    )
    doc.setTextColor(0, 0, 0)

    doc.setFont(undefined, 'normal')
    doc.text(comparisonLines, margin + 5, yPos + 30)

    yPos += resultsBoxHeight + 5

    // Investment advantage box with text wrapping
    const advantage = investmentReturn.value.finalValue - ownershipCosts.value.resaleValue
    doc.setFont(undefined, 'bold')
    doc.setFontSize(11)
    const advantageText = `Investment Advantage: ${formatCurrencyForPDF(advantage)}`
    const advantageLines = doc.splitTextToSize(advantageText, contentWidth - 20)
    const advantageBoxHeight = Math.max(15, advantageLines.length * 5 + 8)
    addColoredBox(
      doc,
      margin,
      yPos,
      contentWidth,
      advantageBoxHeight,
      [34, 197, 94],
      [255, 255, 255],
    )
    doc.setTextColor(255, 255, 255)
    doc.text(advantageLines, margin + 10, yPos + 10)
    doc.setTextColor(0, 0, 0)
    yPos += advantageBoxHeight + 5

    // ========== FINAL COMPARISON ==========
    yPos = addSectionHeader(doc, yPos, '7. FINAL COMPARISON', 14, '[COMPARE]')

    if (finalComparison.value && bestLeaseOption.value) {
      // Comparison table
      const comparisonHeaders = ['Metric', 'Owned Car', 'Leased Car']
      const comparisonColWidths = [65, 62, 63]
      const comparisonRows = [
        [
          'Purchase Price',
          formatCurrencyForPDF(finalComparison.value.ownedCar.purchasePrice),
          'N/A (Lease)',
        ],
        [
          'Operating Cost',
          formatCurrencyForPDF(finalComparison.value.ownedCar.operatingCost),
          formatCurrencyForPDF(finalComparison.value.leasedCar.operatingCost),
        ],
        [
          'Resale/Investment Gain',
          formatCurrencyForPDF(finalComparison.value.ownedCar.resaleGain),
          `+${formatCurrencyForPDF(finalComparison.value.leasedCar.investmentGain)}`,
        ],
        [
          'NET COST',
          formatCurrencyForPDF(finalComparison.value.ownedCar.netCost),
          formatCurrencyForPDF(finalComparison.value.leasedCar.netCost),
        ],
        [
          'Monthly Cost',
          formatCurrencyForPDF(finalComparison.value.ownedCar.avgMonthlyCost),
          formatCurrencyForPDF(finalComparison.value.leasedCar.avgMonthlyCost),
        ],
        [
          'Maintenance Risk',
          finalComparison.value.ownedCar.maintenanceRisk,
          finalComparison.value.leasedCar.maintenanceRisk,
        ],
        [
          'Tax Benefit',
          finalComparison.value.ownedCar.taxBenefit,
          finalComparison.value.leasedCar.taxBenefit,
        ],
        [
          'Asset at End',
          formatCurrencyForPDF(finalComparison.value.ownedCar.assetAtEnd),
          formatCurrencyForPDF(finalComparison.value.leasedCar.assetAtEnd),
        ],
      ]

      yPos = drawTable(
        doc,
        margin,
        yPos,
        comparisonHeaders,
        comparisonRows,
        comparisonColWidths,
        [255, 247, 237],
      )
      yPos += 5

      // Savings highlight with text wrapping
      const savings =
        finalComparison.value.ownedCar.netCost - finalComparison.value.leasedCar.netCost
      const savingsColor =
        savings > 0 ? [34, 197, 94] : savings < 0 ? [59, 130, 246] : [156, 163, 175]
      doc.setFont(undefined, 'bold')
      doc.setFontSize(12)
      let savingsText = ''
      if (savings > 0) {
        savingsText = `SAVINGS WITH LEASING: ${formatCurrencyForPDF(savings)}`
      } else if (savings < 0) {
        savingsText = `SAVINGS WITH OWNERSHIP: ${formatCurrencyForPDF(Math.abs(savings))}`
      } else {
        savingsText = `COSTS ARE EQUAL`
      }
      const savingsLines = doc.splitTextToSize(savingsText, contentWidth - 20)
      const savingsBoxHeight = Math.max(18, savingsLines.length * 6 + 8)
      addColoredBox(
        doc,
        margin,
        yPos,
        contentWidth,
        savingsBoxHeight,
        savingsColor,
        [255, 255, 255],
      )
      doc.setTextColor(255, 255, 255)
      doc.text(savingsLines, margin + 10, yPos + 12)
      doc.setTextColor(0, 0, 0)
      yPos += savingsBoxHeight + 5
    }

    // ========== RECOMMENDATION ==========
    yPos = addSectionHeader(doc, yPos, '8. RECOMMENDATION', 14, '[RECOMMEND]')

    if (recommendation.value) {
      const isLeaseRecommended =
        recommendation.value.recommended.includes('Leased') ||
        recommendation.value.recommended.includes('lease')
      const recColor = isLeaseRecommended ? [34, 197, 94] : [59, 130, 246]

      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      const recTitle = `✓ ${recommendation.value.recommended}`
      // Use more conservative width for text wrapping
      const textWidth = contentWidth - 20 // 10px padding on each side
      const recTitleLines = doc.splitTextToSize(recTitle, textWidth)

      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      const recLines = doc.splitTextToSize(recommendation.value.explanation, textWidth)

      const recBoxHeight = recTitleLines.length * 7 + recLines.length * 5.5 + 15

      addColoredBox(doc, margin, yPos, contentWidth, recBoxHeight, recColor, [255, 255, 255])

      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(recTitleLines, margin + 10, yPos + 10)

      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text(recLines, margin + 10, yPos + 10 + recTitleLines.length * 7)
      doc.setTextColor(0, 0, 0)
      yPos += recBoxHeight + 5
    }

    // ========== FOOTER NOTES ==========
    yPos = addSectionHeader(doc, yPos, '9. IMPORTANT NOTES', 14, '[NOTES]')

    doc.setFontSize(8)
    const notes = [
      'This analysis is based on the assumptions provided and should be used as a guide only.',
      'Actual costs may vary based on market conditions, usage patterns, and other factors.',
      'Tax benefits are calculated based on the effective tax rate provided and may vary based on individual tax situations.',
      'Investment returns are estimates and actual returns may differ.',
      'Depreciation calculations are estimates; actual resale values may vary.',
      'Post-lease scenarios are estimates and actual costs may differ.',
      'Maintenance costs for owned vehicles may increase over time.',
      'This report does not account for personal preferences, lifestyle factors, or non-financial considerations.',
      'Consult with a financial advisor for personalized advice.',
    ]

    // Calculate total height needed for all notes with wrapping
    let totalNotesHeight = 0
    notes.forEach((note) => {
      const noteLines = doc.splitTextToSize(`• ${note}`, contentWidth - 10)
      totalNotesHeight += noteLines.length * 4 + 2
    })
    totalNotesHeight += 10 // padding

    let noteY = yPos
    addColoredBox(doc, margin, noteY, contentWidth, totalNotesHeight, [255, 251, 235], [0, 0, 0])
    noteY += 6

    notes.forEach((note) => {
      noteY = checkPageBreak(doc, noteY, 6, 20)
      if (noteY === 20) {
        // New page - recalculate and redraw box
        let remainingNotesHeight = 0
        const currentIndex = notes.indexOf(note)
        for (let i = currentIndex; i < notes.length; i++) {
          const noteLines = doc.splitTextToSize(`• ${notes[i]}`, contentWidth - 10)
          remainingNotesHeight += noteLines.length * 4 + 2
        }
        remainingNotesHeight += 10
        addColoredBox(
          doc,
          margin,
          noteY,
          contentWidth,
          remainingNotesHeight,
          [255, 251, 235],
          [0, 0, 0],
        )
        noteY += 6
      }
      const noteLines = doc.splitTextToSize(`• ${note}`, contentWidth - 10)
      doc.text(noteLines, margin + 5, noteY)
      noteY += noteLines.length * 4 + 2
    })
    yPos = noteY + 5

    // ========== AUTHOR CREDIT ==========
    yPos = checkPageBreak(doc, yPos, 25, 20)
    yPos += 5

    // Credit section with colored box
    addColoredBox(doc, margin, yPos, contentWidth, 20, [30, 144, 255], [255, 255, 255])

    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Tool Author', margin + 5, yPos + 8)

    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text('Siddhartha Basu', margin + 5, yPos + 15)

    doc.setFontSize(9)
    const emailText = 'For correspondence: siddhartha.basu@outlook.com'
    doc.text(emailText, margin + contentWidth - 5, yPos + 15, { align: 'right' })

    doc.setTextColor(0, 0, 0)
    yPos += 25

    // ========== SAVE PDF ==========
    const fileName = `car-lease-analysis-${assumptions.value.carName ? assumptions.value.carName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'report'}-${Date.now()}.pdf`
    doc.save(fileName)
    showToast('PDF report exported successfully!', 'success')
  } catch (error) {
    console.error('Error exporting PDF:', error)
    showToast('Failed to export PDF. Please install jsPDF library.', 'error')
  } finally {
    isExportingPDF.value = false
  }
}

// Calculate current market value based on purchase year and depreciation
const calculateCurrentMarketValue = (
  exShowroomPrice: number,
  purchaseYear: number | null,
): number => {
  if (!purchaseYear) {
    // If no purchase year, use simple 85% approximation
    return Math.round(exShowroomPrice * 0.85)
  }

  const currentYear = new Date().getFullYear()
  const yearsOwned = Math.max(0, currentYear - purchaseYear)

  if (yearsOwned === 0) {
    // Brand new car - use 95% of ex-showroom (accounting for registration, insurance, etc.)
    return Math.round(exShowroomPrice * 0.95)
  }

  const model = assumptions.value.depreciationModel
  const rate = assumptions.value.depreciationRate / 100

  if (model === 'straightLine') {
    // Straight-line: depreciate by rate% per year
    const totalDepreciation = Math.min(1, rate * yearsOwned) // Cap at 100% depreciation
    return Math.round(exShowroomPrice * (1 - totalDepreciation))
  } else if (model === 'accelerated') {
    // Accelerated (double declining balance): higher depreciation in early years
    const depreciatedValue = exShowroomPrice * Math.pow(1 - rate * 2, yearsOwned)
    return Math.max(0, Math.round(depreciatedValue))
  } else if (model === 'custom') {
    // Custom: use a conservative estimate (30% retained value after 5 years, linear)
    const retainedValue = Math.max(0.3, 1 - (yearsOwned / 5) * 0.7)
    return Math.round(exShowroomPrice * retainedValue)
  } else {
    // None: no depreciation
    return exShowroomPrice
  }
}

// Handle car variant selection for owned car
const handleCarVariantSelected = (variant: {
  manufacturer_name: string
  model_name: string
  variant_name: string
  price_ex_showroom_inr: number | null
  mileage_kmpl: number | null
  fuel_type: string | null
}) => {
  // Update car name
  assumptions.value.carName = `${variant.manufacturer_name} ${variant.model_name} ${variant.variant_name}`

  const autoFilledFields: string[] = ['carName']

  // Store variant for recalculation when purchase year changes
  lastSelectedVariant.value = {
    price_ex_showroom_inr: variant.price_ex_showroom_inr,
  }

  // Auto-fill price if available - calculate based on purchase year and depreciation
  if (variant.price_ex_showroom_inr) {
    const calculatedValue = calculateCurrentMarketValue(
      variant.price_ex_showroom_inr,
      assumptions.value.purchaseYear,
    )
    assumptions.value.currentMarketValue = calculatedValue
    currencyInputs.value.currentMarketValue = formatNumberWithCommas(calculatedValue)
    autoFilledFields.push('currentMarketValue')
  }

  // Auto-fill mileage if available
  if (variant.mileage_kmpl) {
    assumptions.value.mileage = Math.round(variant.mileage_kmpl * 0.9) // Real-world is ~90% of ARAI
    autoFilledFields.push('mileage')
  }

  // Update currency inputs
  updateCurrencyInputs()

  // Show auto-fill confirmation
  if (autoFilledFields.length > 1) {
    showToast(`Car details loaded: ${autoFilledFields.length} fields auto-filled`, 'success')
  } else {
    showToast('Car name updated', 'success')
  }
}

// Handle lease option car selection
const handleLeaseOptionSelected = (
  optionIndex: number,
  variant: {
    manufacturer_name: string
    model_name: string
    variant_name: string
    price_ex_showroom_inr: number | null
    mileage_kmpl: number | null
  },
) => {
  if (assumptions.value.leaseOptions[optionIndex]) {
    // Update option name
    assumptions.value.leaseOptions[optionIndex].name =
      `${variant.manufacturer_name} ${variant.model_name}`

    const autoFilledFields: string[] = ['optionName']

    // Estimate EMI based on price (rough estimate: 2-3% of ex-showroom price per month for 5-year lease)
    if (variant.price_ex_showroom_inr) {
      // EMI calculation: approximately 2.5% of ex-showroom price per month
      const estimatedEMI = Math.round((variant.price_ex_showroom_inr * 0.025) / 1000) * 1000 // Round to nearest 1000
      assumptions.value.leaseOptions[optionIndex].emi = estimatedEMI
      currencyInputs.value[`leaseOption_${optionIndex}_emi`] = formatNumberWithCommas(estimatedEMI)
      autoFilledFields.push('emi')
    }

    // Update currency inputs
    updateCurrencyInputs()

    // Show auto-fill confirmation
    showToast(
      `Lease option ${assumptions.value.leaseOptions[optionIndex].name} details loaded`,
      'success',
    )
  }
}

// Active tab state
const activeTab = ref('assumptions')
</script>

<template>
  <div class="py-6 sm:py-10 container mx-auto max-w-7xl px-3 sm:px-6 w-full">
    <!-- Header -->
    <div class="text-center mb-8 sm:mb-12">
      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-4 mb-4"
      >
        <NuxtLink
          to="/dev"
          class="inline-flex items-center justify-center sm:justify-start text-sky-600 dark:text-sky-400 hover:underline"
        >
          <Icon icon="mdi:arrow-left" class="mr-2" />
          Back to Utilities
        </NuxtLink>
        <button
          class="inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors w-full sm:w-auto"
          @click="showTemplatesModal = true"
        >
          <Icon icon="mdi:file-multiple" class="mr-2" />
          Templates
        </button>
        <button
          class="inline-flex items-center justify-center px-3 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors w-full sm:w-auto"
          @click="showSaveModal = true"
        >
          <Icon icon="mdi:content-save" class="mr-2" />
          Save Template
        </button>
        <button
          :disabled="isExportingPDF"
          class="inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
          @click="exportToPDF"
        >
          <Icon icon="mdi:file-pdf-box" class="mr-2" />
          {{ isExportingPDF ? 'Exporting...' : 'Export PDF' }}
        </button>
        <button
          class="inline-flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors w-full sm:w-auto"
          title="Reset all fields to blank defaults"
          @click="resetToDefaults"
        >
          <Icon icon="mdi:refresh" class="mr-2" />
          Reset to Defaults
        </button>
      </div>
      <h1 class="text-4xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
        Car Ownership vs Lease Calculator
      </h1>
      <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
        Advanced calculator with multi-currency support, depreciation models, dynamic lease options,
        and template comparison
      </p>
      <!-- Calculation Status Indicator -->
      <div
        v-if="isCalculating"
        class="mt-4 flex items-center justify-center gap-2 text-sm text-sky-600 dark:text-sky-400"
      >
        <Icon icon="mdi:loading" class="animate-spin" />
        <span>Calculating...</span>
      </div>
    </div>

    <!-- Recommendation Banner -->
    <div
      v-if="recommendation"
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
            <span class="font-semibold">Net {{ assumptions.analysisPeriod }}-Year Cost:</span>
            {{ formatCurrency(recommendation.netCost) }}
          </p>
          <p class="text-base opacity-90">{{ recommendation.explanation }}</p>
        </div>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div
      class="mb-6 border-b border-gray-300 dark:border-slate-700 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto whitespace-nowrap"
      style="scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch"
    >
      <div class="flex gap-2 min-w-max">
        <button
          v-for="tab in [
            { id: 'assumptions', label: '01 Assumptions', icon: 'mdi:cog' },
            { id: 'ownership', label: '02 Ownership', icon: 'mdi:car' },
            { id: 'lease', label: '03 Lease Comparison', icon: 'mdi:file-compare' },
            { id: 'investment', label: '04 Investment', icon: 'mdi:chart-line' },
            { id: 'comparison', label: '05 Final Comparison', icon: 'mdi:scale-balance' },
          ]"
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

    <!-- Tab Content -->
    <div
      class="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-slate-800"
    >
      <!-- 01 ASSUMPTIONS -->
      <div v-show="activeTab === 'assumptions'" class="space-y-4">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center">
              <Icon icon="mdi:cog" class="mr-2 text-sky-600" />
              Assumptions (Edit Here)
            </h2>
            <div class="flex items-center gap-2">
              <button
                v-if="!hasSeenTour"
                class="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                @click="startTour"
              >
                <Icon icon="mdi:compass" class="mr-1.5" />
                Take a Tour
              </button>
              <button
                class="inline-flex items-center px-3 py-1.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors text-sm"
                @click="openHelpPanel"
              >
                <Icon icon="mdi:help-circle" class="mr-1.5" />
                Help
              </button>
            </div>
          </div>
          <div
            class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
          >
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <span class="font-semibold">💡 Quick Start:</span> All editable inputs are highlighted
              in yellow. Change values here to update all calculations automatically.
            </p>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              <span class="text-red-500">*</span> indicates required fields. Click section headers
              to expand/collapse sections. Click <span class="font-semibold">Help</span> for
              detailed explanations.
            </p>
          </div>
        </div>

        <!-- General -->
        <section
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 mb-4"
        >
          <button
            class="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
            type="button"
            @click="toggleSection('general')"
          >
            <div class="flex-1">
              <h3
                class="text-xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
              >
                <Icon
                  icon="mdi:chevron-down"
                  class="text-sky-600 dark:text-sky-400 transition-transform"
                  :class="{ 'rotate-180': !sectionExpanded.general }"
                />
                GENERAL
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">
                Basic information about your car and analysis parameters
              </p>
            </div>
            <span v-if="sectionExpanded.general" class="text-xs text-gray-500 dark:text-gray-400"
              >Click to collapse</span
            >
          </button>
          <div v-show="sectionExpanded.general" class="space-y-4">
            <!-- Basic Info Group -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Car Name</label
                >
                <input
                  v-model="assumptions.carName"
                  type="text"
                  class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                  placeholder="e.g., Nexon, Honda City"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Name of your car for reference
                </p>
              </div>
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
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Currency for all calculations
                </p>
              </div>
            </div>

            <!-- Analysis Period -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label
                  class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  Analysis Period (Years) <span class="text-red-500">*</span>
                  <span
                    v-if="
                      getFieldValidation('analysisPeriod', assumptions.analysisPeriod) === 'valid'
                    "
                    class="text-green-600 dark:text-green-400"
                  >
                    <Icon icon="mdi:check-circle" class="text-sm" />
                  </span>
                  <span
                    v-else-if="
                      getFieldValidation('analysisPeriod', assumptions.analysisPeriod) === 'warning'
                    "
                    class="text-yellow-600 dark:text-yellow-400"
                  >
                    <Icon
                      icon="mdi:alert"
                      class="text-sm"
                      title="Value outside typical range (3-10 years)"
                    />
                  </span>
                </label>
                <div class="relative">
                  <input
                    v-model.number="assumptions.analysisPeriod"
                    type="number"
                    min="1"
                    max="20"
                    :class="`w-full px-3 py-2 text-sm ${getFieldBorderClass('analysisPeriod', assumptions.analysisPeriod)}`"
                    placeholder="5"
                    @input="
                      assumptions.analysisPeriod = Math.max(1, assumptions.analysisPeriod || 1)
                    "
                  />
                  <span
                    v-if="getFieldStatus('analysisPeriod', assumptions.analysisPeriod) === 'filled'"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400"
                  >
                    <Icon icon="mdi:check-circle" class="text-base" />
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Time period for cost comparison (typically 3-10 years)
                </p>
              </div>
            </div>

            <!-- Fuel-Related Fields Group -->
            <div
              class="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700"
            >
              <h4
                class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"
              >
                <Icon icon="mdi:fuel" class="text-sky-600" />
                Fuel-Related Costs
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label
                    class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    Annual Distance (km) <span class="text-red-500">*</span>
                    <span
                      v-if="
                        getFieldValidation('annualDistance', assumptions.annualDistance) === 'valid'
                      "
                      class="text-green-600 dark:text-green-400"
                    >
                      <Icon icon="mdi:check-circle" class="text-sm" />
                    </span>
                    <span
                      v-else-if="
                        getFieldValidation('annualDistance', assumptions.annualDistance) ===
                        'warning'
                      "
                      class="text-yellow-600 dark:text-yellow-400"
                    >
                      <Icon
                        icon="mdi:alert"
                        class="text-sm"
                        title="Value outside typical range (5,000-50,000 km/year)"
                      />
                    </span>
                  </label>
                  <div class="relative">
                    <input
                      v-model.number="assumptions.annualDistance"
                      type="number"
                      min="0"
                      :class="`w-full px-3 py-2 text-sm ${getFieldBorderClass('annualDistance', assumptions.annualDistance)}`"
                      :placeholder="getSmartPlaceholder('annualDistance')"
                      @input="
                        assumptions.annualDistance = Math.max(0, assumptions.annualDistance || 0)
                      "
                    />
                    <span
                      v-if="
                        getFieldStatus('annualDistance', assumptions.annualDistance) === 'filled'
                      "
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400"
                    >
                      <Icon icon="mdi:check-circle" class="text-base" />
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Your annual driving distance in kilometers
                    <span class="text-gray-400 dark:text-gray-500 italic">
                      • Example: 15,000 km/year</span
                    >
                  </p>
                </div>
                <div>
                  <label
                    class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    Fuel Price (/Litre) <span class="text-red-500">*</span>
                    <span
                      v-if="getFieldValidation('fuelPrice', assumptions.fuelPrice) === 'valid'"
                      class="text-green-600 dark:text-green-400"
                    >
                      <Icon icon="mdi:check-circle" class="text-sm" />
                    </span>
                    <span
                      v-else-if="
                        getFieldValidation('fuelPrice', assumptions.fuelPrice) === 'warning'
                      "
                      class="text-yellow-600 dark:text-yellow-400"
                    >
                      <Icon
                        icon="mdi:alert"
                        class="text-sm"
                        title="Value outside typical range for selected currency"
                      />
                    </span>
                  </label>
                  <div class="flex items-center relative">
                    <input
                      :value="currencyInputs.fuelPrice"
                      type="text"
                      :class="`flex-1 px-3 py-2 text-sm border rounded-l ${getFieldBorderClass('fuelPrice', assumptions.fuelPrice).replace('rounded', 'rounded-l')}`"
                      :placeholder="getSmartPlaceholder('fuelPrice')"
                      @input="
                        updateCurrencyValue('fuelPrice', ($event.target as HTMLInputElement).value)
                      "
                    />
                    <span
                      v-if="getFieldStatus('fuelPrice', assumptions.fuelPrice) === 'filled'"
                      class="absolute right-12 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400 z-10"
                    >
                      <Icon icon="mdi:check-circle" class="text-base" />
                    </span>
                    <span
                      class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                    >
                      {{ getCurrencyCode() }}/L
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current fuel price per litre in your region
                    <span class="text-gray-400 dark:text-gray-500 italic">
                      • Example: ₹100/L (INR), $3.50/L (USD)</span
                    >
                  </p>
                </div>
                <div>
                  <label
                    class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    Mileage (km/L) <span class="text-red-500">*</span>
                    <span
                      v-if="getFieldValidation('mileage', assumptions.mileage) === 'valid'"
                      class="text-green-600 dark:text-green-400"
                    >
                      <Icon icon="mdi:check-circle" class="text-sm" />
                    </span>
                    <span
                      v-else-if="getFieldValidation('mileage', assumptions.mileage) === 'warning'"
                      class="text-yellow-600 dark:text-yellow-400"
                    >
                      <Icon
                        icon="mdi:alert"
                        class="text-sm"
                        title="Value outside typical range (10-25 km/L)"
                      />
                    </span>
                  </label>
                  <div class="relative">
                    <input
                      v-model.number="assumptions.mileage"
                      type="number"
                      min="0"
                      :class="`w-full px-3 py-2 text-sm ${getFieldBorderClass('mileage', assumptions.mileage)}`"
                      :placeholder="getSmartPlaceholder('mileage')"
                      @input="assumptions.mileage = Math.max(0, assumptions.mileage || 0)"
                    />
                    <span
                      v-if="getFieldStatus('mileage', assumptions.mileage) === 'filled'"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400"
                    >
                      <Icon icon="mdi:check-circle" class="text-base" />
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Your car's fuel efficiency (kilometers per litre)
                    <span class="text-gray-400 dark:text-gray-500 italic"> • Example: 15 km/L</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Owned Car -->
        <section
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 mb-4"
        >
          <button
            class="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
            type="button"
            @click="toggleSection('ownedCar')"
          >
            <div class="flex-1">
              <h3
                class="text-xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
              >
                <Icon
                  icon="mdi:chevron-down"
                  class="text-sky-600 dark:text-sky-400 transition-transform"
                  :class="{ 'rotate-180': !sectionExpanded.ownedCar }"
                />
                OWNED CAR
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">
                Enter details about your current or planned car purchase
              </p>
            </div>
            <span v-if="sectionExpanded.ownedCar" class="text-xs text-gray-500 dark:text-gray-400"
              >Click to collapse</span
            >
          </button>
          <div v-show="sectionExpanded.ownedCar">
            <div
              class="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <label class="block text-sm font-medium mb-2"
                >Select Car (Optional - Auto-fills details)</label
              >
              <CarSelector
                v-model="assumptions.carName"
                @variant-selected="handleCarVariantSelected"
              />
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Search for a car to auto-fill specifications, or enter details manually below
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Year of Ownership</label
                >
                <div class="flex items-center">
                  <input
                    :value="purchaseYearInput"
                    type="number"
                    :min="1990"
                    :max="new Date().getFullYear()"
                    class="flex-1 px-3 py-2 text-sm border rounded-l bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                    placeholder="e.g., 2023"
                    @input="handlePurchaseYearInput"
                    @blur="handlePurchaseYearBlur"
                  />
                  <div
                    class="flex flex-col border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r"
                  >
                    <button
                      class="px-2 py-1 text-xs border-b border-yellow-300 dark:border-slate-600 bg-sky-100 dark:bg-slate-700 hover:bg-sky-200 dark:hover:bg-slate-600 text-sky-700 dark:text-sky-300 transition-colors flex items-center justify-center"
                      type="button"
                      title="Increase year"
                      @click="incrementPurchaseYear"
                    >
                      <Icon icon="mdi:chevron-up" class="w-3 h-3" />
                    </button>
                    <button
                      class="px-2 py-1 text-xs bg-sky-100 dark:bg-slate-700 hover:bg-sky-200 dark:hover:bg-slate-600 text-sky-700 dark:text-sky-300 transition-colors flex items-center justify-center"
                      type="button"
                      title="Decrease year"
                      @click="decrementPurchaseYear"
                    >
                      <Icon icon="mdi:chevron-down" class="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Year when you purchased/started owning the car (used to calculate depreciation
                  from ex-showroom price)
                </p>
              </div>
              <div>
                <label
                  class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  Current Market Value <span class="text-red-500">*</span>
                  <span
                    v-if="
                      getFieldValidation('currentMarketValue', assumptions.currentMarketValue) ===
                      'valid'
                    "
                    class="text-green-600 dark:text-green-400"
                  >
                    <Icon icon="mdi:check-circle" class="text-sm" />
                  </span>
                  <span
                    v-else-if="
                      getFieldValidation('currentMarketValue', assumptions.currentMarketValue) ===
                      'warning'
                    "
                    class="text-yellow-600 dark:text-yellow-400"
                  >
                    <Icon
                      icon="mdi:alert"
                      class="text-sm"
                      title="Value outside typical range for selected currency"
                    />
                  </span>
                </label>
                <div class="flex items-center relative">
                  <input
                    :value="currencyInputs.currentMarketValue"
                    type="text"
                    :class="`flex-1 px-3 py-2 text-sm border rounded-l ${getFieldBorderClass('currentMarketValue', assumptions.currentMarketValue).replace('rounded', 'rounded-l')}`"
                    :placeholder="getSmartPlaceholder('currentMarketValue')"
                    @input="
                      updateCurrencyValue(
                        'currentMarketValue',
                        ($event.target as HTMLInputElement).value,
                      )
                    "
                  />
                  <span
                    v-if="
                      getFieldStatus('currentMarketValue', assumptions.currentMarketValue) ===
                      'filled'
                    "
                    class="absolute right-12 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400 z-10"
                  >
                    <Icon icon="mdi:check-circle" class="text-base" />
                  </span>
                  <span
                    class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                  >
                    {{ getCurrencyCode() }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Current market value or purchase price of your car
                  <span
                    v-if="lastSelectedVariant?.price_ex_showroom_inr && assumptions.purchaseYear"
                    class="block mt-1 text-sky-600 dark:text-sky-400"
                  >
                    Calculated from ex-showroom price ({{
                      formatCurrency(lastSelectedVariant.price_ex_showroom_inr)
                    }}) based on {{ new Date().getFullYear() - assumptions.purchaseYear }} years of
                    ownership
                  </span>
                </p>
              </div>
              <div>
                <label
                  class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  Expected Value After {{ assumptions.analysisPeriod }} Years
                  <span
                    v-if="assumptions.expectedValueAfter5Years > assumptions.currentMarketValue"
                    class="text-red-600 dark:text-red-400"
                    title="Expected value cannot exceed current market value"
                  >
                    <Icon icon="mdi:alert-circle" class="text-sm" />
                  </span>
                </label>
                <div class="flex items-center relative">
                  <input
                    :value="currencyInputs.expectedValueAfter5Years"
                    type="text"
                    :class="`flex-1 px-3 py-2 text-sm border rounded-l ${getFieldBorderClass('expectedValueAfter5Years', assumptions.expectedValueAfter5Years).replace('rounded', 'rounded-l')} ${assumptions.expectedValueAfter5Years > assumptions.currentMarketValue ? 'border-red-400 dark:border-red-600' : ''}`"
                    placeholder="200,000"
                    @input="
                      updateCurrencyValue(
                        'expectedValueAfter5Years',
                        ($event.target as HTMLInputElement).value,
                      )
                    "
                    @blur="validateExpectedValue"
                  />
                  <span
                    v-if="
                      getFieldStatus(
                        'expectedValueAfter5Years',
                        assumptions.expectedValueAfter5Years,
                      ) === 'filled' &&
                      assumptions.expectedValueAfter5Years <= assumptions.currentMarketValue
                    "
                    class="absolute right-12 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400 z-10"
                  >
                    <Icon icon="mdi:check-circle" class="text-base" />
                  </span>
                  <span
                    class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                  >
                    {{ getCurrencyCode() }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Expected resale value after {{ assumptions.analysisPeriod }} years (optional -
                  auto-calculated based on depreciation if empty)
                  <button
                    v-if="
                      assumptions.depreciationModel !== 'none' &&
                      !assumptions.expectedValueAfter5Years
                    "
                    class="ml-2 text-sky-600 dark:text-sky-400 hover:underline text-xs"
                    type="button"
                    @click="calculateExpectedValue"
                  >
                    Auto-calculate
                  </button>
                </p>
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Annual Insurance Cost <span class="text-red-500">*</span></label
                >
                <div class="flex items-center">
                  <input
                    :value="currencyInputs.annualInsurance"
                    type="text"
                    class="flex-1 px-3 py-2 text-sm border rounded-l bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                    placeholder="30,000"
                    @input="
                      updateCurrencyValue(
                        'annualInsurance',
                        ($event.target as HTMLInputElement).value,
                      )
                    "
                  />
                  <span
                    class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                  >
                    {{ getCurrencyCode() }}
                  </span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >Annual Service & Maintenance <span class="text-red-500">*</span></label
                >
                <div class="flex items-center">
                  <input
                    :value="currencyInputs.annualServiceMaintenance"
                    type="text"
                    class="flex-1 px-3 py-2 text-sm border rounded-l bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                    placeholder="15,000"
                    @input="
                      updateCurrencyValue(
                        'annualServiceMaintenance',
                        ($event.target as HTMLInputElement).value,
                      )
                    "
                  />
                  <span
                    class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                  >
                    {{ getCurrencyCode() }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Combined Section: Depreciation, Repairs Factor, and Return on Invested Capital -->
            <div
              class="mt-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700"
            >
              <h4
                class="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2"
              >
                <Icon icon="mdi:calculator-variant" class="text-sky-600 dark:text-sky-400" />
                Calculation Factors
              </h4>
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
                These factors affect how costs are calculated. Click to edit each value.
              </p>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Depreciation -->
                <div tabindex="-1" @blur="showDepreciationEdit = false">
                  <label
                    class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >
                    Depreciation
                    <button
                      class="ml-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      type="button"
                      title="Click for help"
                      @click.stop="toggleTooltip('depreciation')"
                    >
                      <Icon icon="mdi:help-circle" class="text-base" />
                    </button>
                    <button
                      class="ml-2 text-sm text-sky-600 dark:text-sky-400 hover:underline"
                      type="button"
                      title="Click to edit depreciation"
                      @click="showDepreciationEdit = !showDepreciationEdit"
                    >
                      ({{ depreciationModels[assumptions.depreciationModel]
                      }}{{
                        assumptions.depreciationModel !== 'none'
                          ? `, ${assumptions.depreciationRate}%`
                          : ''
                      }})
                    </button>
                  </label>
                  <!-- Tooltip for Depreciation -->
                  <div
                    v-if="showTooltip === 'depreciation'"
                    class="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          Depreciation
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          Represents how much your car's value decreases over time. Affects the
                          final resale value and net ownership cost.
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          • <span class="font-semibold">Straight-Line:</span> Constant depreciation
                          each year (standard: 15% per year)
                          <br />
                          • <span class="font-semibold">Accelerated:</span> Higher depreciation in
                          early years
                          <br />
                          • <span class="font-semibold">Custom:</span> User-defined depreciation
                          pattern
                          <br />
                          • <span class="font-semibold">None:</span> No depreciation (car retains
                          value)
                        </p>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                  <div v-if="showDepreciationEdit" class="mb-2 space-y-2">
                    <select
                      v-model="assumptions.depreciationModel"
                      class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      @blur="showDepreciationEdit = false"
                    >
                      <option v-for="(label, key) in depreciationModels" :key="key" :value="key">
                        {{ label }}
                      </option>
                    </select>
                    <div
                      v-if="
                        assumptions.depreciationModel !== 'none' &&
                        assumptions.depreciationModel !== 'custom'
                      "
                    >
                      <input
                        v-model.number="assumptions.depreciationRate"
                        type="number"
                        step="0.1"
                        min="0"
                        class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                        placeholder="15"
                        @blur="showDepreciationEdit = false"
                        @input="
                          assumptions.depreciationRate = Math.max(
                            0,
                            assumptions.depreciationRate || 0,
                          )
                        "
                      />
                      <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                        Annual depreciation rate (standard for cars: 15-20%)
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Repairs Factor -->
                <div tabindex="-1" @blur="showRepairsFactorEdit = false">
                  <div class="flex items-center gap-2 flex-wrap mb-1.5">
                    <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Repairs Factor
                      <button
                        class="ml-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                        type="button"
                        title="Click for help"
                        @click.stop="toggleTooltip('repairsFactor')"
                      >
                        <Icon icon="mdi:help-circle" class="text-base" />
                      </button>
                      <button
                        class="ml-2 text-sm text-sky-600 dark:text-sky-400 hover:underline"
                        type="button"
                        title="Click to edit factor"
                        @click="showRepairsFactorEdit = !showRepairsFactorEdit"
                      >
                        ({{ assumptions.repairsFactor }})
                      </button>
                    </label>
                  </div>
                  <div
                    v-if="!showRepairsFactorEdit"
                    class="text-xs text-gray-600 dark:text-gray-400 space-y-1"
                  >
                    <div>
                      <span class="font-semibold">Major Repairs:</span>
                      {{ formatCurrency(calculatedRepairs.majorRepairs5Years) }}
                    </div>
                    <div>
                      <span class="font-semibold">Tyre Replacement:</span>
                      {{ formatCurrency(calculatedRepairs.tyreReplacement) }}
                    </div>
                  </div>
                  <!-- Tooltip for Repairs Factor -->
                  <div
                    v-if="showTooltip === 'repairsFactor'"
                    class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          Repairs Factor
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          Automatically calculates major repairs and tyre replacement costs based
                          on:
                          <span class="font-semibold"
                            >(Annual Insurance + Annual Service & Maintenance) ×
                            {{ assumptions.repairsFactor }}</span
                          >
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          • 70% goes to Major Repairs (typically in later years)
                          <br />
                          • 30% goes to Tyre Replacement
                          <br />
                          • Default factor: 0.45 (45% of insurance + maintenance)
                        </p>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                  <div v-if="showRepairsFactorEdit" class="mt-2">
                    <input
                      v-model.number="assumptions.repairsFactor"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                      placeholder="0.45"
                      autofocus
                      @blur="showRepairsFactorEdit = false"
                      @input="
                        assumptions.repairsFactor = Math.max(
                          0,
                          Math.min(1, assumptions.repairsFactor || 0),
                        )
                      "
                    />
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                      (Insurance + Maintenance) × {{ assumptions.repairsFactor }}
                    </p>
                  </div>
                </div>

                <!-- Return on Invested Capital -->
                <div tabindex="-1" @blur="showReturnOnInvestmentEdit = false">
                  <label
                    class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                  >
                    Return on Invested Capital
                    <button
                      class="ml-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      type="button"
                      title="Click for help"
                      @click.stop="toggleTooltip('returnOnInvestment')"
                    >
                      <Icon icon="mdi:help-circle" class="text-base" />
                    </button>
                    <button
                      class="ml-2 text-sm text-sky-600 dark:text-sky-400 hover:underline"
                      type="button"
                      title="Click to edit return rate"
                      @click="showReturnOnInvestmentEdit = !showReturnOnInvestmentEdit"
                    >
                      ({{ assumptions.returnOnInvestedCapital }}%)
                    </button>
                  </label>
                  <!-- Tooltip for Return on Investment -->
                  <div
                    v-if="showTooltip === 'returnOnInvestment'"
                    class="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          Return on Invested Capital
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          If you lease instead of buying, you can invest the money you would have
                          spent on the car. This represents the annual return rate you'd earn on
                          that investment.
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          • Default: 7% (conservative estimate for fixed deposits/mutual funds)
                          <br />
                          • This investment gain reduces the net cost of leasing
                          <br />
                          • Higher return rates make leasing more attractive financially
                        </p>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                  <div v-if="showReturnOnInvestmentEdit" class="mb-2">
                    <input
                      v-model.number="assumptions.returnOnInvestedCapital"
                      type="number"
                      step="0.1"
                      min="0"
                      class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                      placeholder="7"
                      autofocus
                      @blur="showReturnOnInvestmentEdit = false"
                      @input="
                        assumptions.returnOnInvestedCapital = Math.max(
                          0,
                          assumptions.returnOnInvestedCapital || 0,
                        )
                      "
                    />
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                      Annual return rate on invested capital (default: 7%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Lease Options -->
        <section
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 mb-4"
        >
          <div class="flex items-center justify-between mb-4">
            <button
              class="flex items-center gap-2 hover:opacity-80 transition-opacity"
              type="button"
              @click="toggleSection('leaseOptions')"
            >
              <div class="flex-1">
                <h3
                  class="text-xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
                >
                  <Icon
                    icon="mdi:chevron-down"
                    class="text-sky-600 dark:text-sky-400 transition-transform"
                    :class="{ 'rotate-180': !sectionExpanded.leaseOptions }"
                  />
                  LEASE OPTIONS
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">
                  Configure one or more lease options to compare with ownership
                </p>
              </div>
            </button>
            <button
              :disabled="assumptions.leaseOptions.length >= 5"
              class="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
              title="Add Lease Option"
              @click="addLeaseOption"
            >
              <Icon icon="mdi:plus-circle" class="w-5 h-5" />
              Add Option
            </button>
            <span
              v-if="sectionExpanded.leaseOptions"
              class="text-xs text-gray-500 dark:text-gray-400"
              >Click to collapse</span
            >
          </div>
          <div v-show="sectionExpanded.leaseOptions" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="(option, index) in assumptions.leaseOptions"
              :key="index"
              class="p-3 border rounded bg-gray-50 dark:bg-slate-800 space-y-2.5 relative"
            >
              <div
                class="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200 dark:border-slate-700"
              >
                <div class="flex items-center gap-1.5 flex-1 min-w-0">
                  <Icon
                    icon="mdi:car-sports"
                    class="text-sky-600 dark:text-sky-400 text-lg flex-shrink-0"
                  />
                  <input
                    v-model="option.name"
                    type="text"
                    class="font-semibold text-base bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-sky-500 rounded px-1 -ml-1 text-zinc-800 dark:text-zinc-200 flex-1 min-w-0"
                  />
                </div>
                <button
                  :disabled="assumptions.leaseOptions.length <= 1"
                  class="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  type="button"
                  title="Remove Lease Option"
                  @click.stop="openDeleteLeaseOptionModal(index)"
                >
                  <Icon icon="mdi:delete-outline" class="w-5 h-5" />
                </button>
              </div>

              <!-- Car Variant Selector -->
              <div class="mb-2">
                <CarSelector
                  :key="`lease-option-${index}`"
                  @variant-selected="(variant) => handleLeaseOptionSelected(index, variant)"
                />
              </div>

              <!-- Compact Lease Terms - 2x2 Grid -->
              <div class="grid grid-cols-2 gap-2">
                <!-- Monthly EMI -->
                <div class="flex flex-col min-w-0">
                  <label class="text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >Monthly EMI <span class="text-red-500">*</span></label
                  >
                  <div class="flex items-center">
                    <input
                      :value="
                        currencyInputs[`leaseOption_${index}_emi`] ||
                        formatNumberWithCommas(option.emi)
                      "
                      type="text"
                      class="flex-1 min-w-0 px-3 py-2 text-sm border rounded-l bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                      :placeholder="formatNumberWithCommas(option.emi)"
                      @input="
                        updateCurrencyValue(
                          `leaseOption_${index}_emi`,
                          ($event.target as HTMLInputElement).value,
                        )
                      "
                    />
                    <span
                      class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                    >
                      {{ getCurrencyCode() }}/mo
                    </span>
                  </div>
                </div>

                <!-- Lease Tenure with Single Increment Button -->
                <div class="flex flex-col min-w-0">
                  <label class="text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >Tenure <span class="text-red-500">*</span></label
                  >
                  <div class="flex items-center">
                    <input
                      v-model.number="option.tenure"
                      type="number"
                      min="0"
                      class="flex-1 min-w-0 px-3 py-2 text-sm border rounded-l bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                      @input="option.tenure = Math.max(0, option.tenure || 0)"
                    />
                    <div
                      class="flex flex-col border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r"
                    >
                      <button
                        class="px-2 py-1 text-xs border-b border-yellow-300 dark:border-slate-600 bg-sky-100 dark:bg-slate-700 hover:bg-sky-200 dark:hover:bg-slate-600 text-sky-700 dark:text-sky-300 transition-colors flex items-center justify-center"
                        type="button"
                        title="Quick add 12 months"
                        @click="option.tenure = Math.max(0, option.tenure + 12)"
                      >
                        <Icon icon="mdi:chevron-up" class="w-3 h-3" />
                      </button>
                      <button
                        class="px-2 py-1 text-xs bg-sky-100 dark:bg-slate-700 hover:bg-sky-200 dark:hover:bg-slate-600 text-sky-700 dark:text-sky-300 transition-colors flex items-center justify-center"
                        type="button"
                        title="Quick subtract 12 months"
                        @click="option.tenure = Math.max(0, option.tenure - 12)"
                      >
                        <Icon icon="mdi:chevron-down" class="w-3 h-3" />
                      </button>
                    </div>
                    <span
                      class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                    >
                      mo
                    </span>
                  </div>
                </div>

                <!-- Allowed KM with +1000 Counter -->
                <div class="flex flex-col min-w-0">
                  <label class="text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >Allowed KM</label
                  >
                  <div class="flex items-center">
                    <input
                      v-model.number="option.allowedKMperYear"
                      type="number"
                      min="0"
                      class="flex-1 min-w-0 px-3 py-2 text-sm border rounded-l bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                      @input="option.allowedKMperYear = Math.max(0, option.allowedKMperYear || 0)"
                    />
                    <div
                      class="flex flex-col border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r"
                    >
                      <button
                        class="px-2 py-1 text-xs border-b border-yellow-300 dark:border-slate-600 bg-sky-100 dark:bg-slate-700 hover:bg-sky-200 dark:hover:bg-slate-600 text-sky-700 dark:text-sky-300 transition-colors flex items-center justify-center"
                        type="button"
                        title="Quick add 1000 km"
                        @click="incrementAllowedKM(option)"
                      >
                        <Icon icon="mdi:chevron-up" class="w-3 h-3" />
                      </button>
                      <button
                        class="px-2 py-1 text-xs bg-sky-100 dark:bg-slate-700 hover:bg-sky-200 dark:hover:bg-slate-600 text-sky-700 dark:text-sky-300 transition-colors flex items-center justify-center"
                        type="button"
                        title="Quick subtract 1000 km"
                        @click="decrementAllowedKM(option)"
                      >
                        <Icon icon="mdi:chevron-down" class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Extra KM Charge -->
                <div class="flex flex-col min-w-0">
                  <label
                    class="text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300 truncate"
                    >Extra KM Charge</label
                  >
                  <div class="flex items-center">
                    <input
                      :value="
                        currencyInputs[`leaseOption_${index}_extraKMCharge`] ||
                        formatNumberWithCommas(option.extraKMCharge)
                      "
                      type="text"
                      class="flex-1 min-w-0 px-3 py-2 text-sm border rounded-l bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                      :placeholder="formatNumberWithCommas(option.extraKMCharge)"
                      @input="
                        updateCurrencyValue(
                          `leaseOption_${index}_extraKMCharge`,
                          ($event.target as HTMLInputElement).value,
                        )
                      "
                    />
                    <span
                      class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                    >
                      {{ getCurrencyCode() }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Reimbursements -->
        <section
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 mb-4"
        >
          <button
            class="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
            type="button"
            @click="toggleSection('reimbursements')"
          >
            <div class="flex-1">
              <h3
                class="text-xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
              >
                <Icon
                  icon="mdi:chevron-down"
                  class="text-sky-600 dark:text-sky-400 transition-transform"
                  :class="{ 'rotate-180': !sectionExpanded.reimbursements }"
                />
                REIMBURSEMENTS (LEASE)
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">
                Reimbursement caps for fuel and driver expenses (if applicable)
              </p>
            </div>
            <span
              v-if="sectionExpanded.reimbursements"
              class="text-xs text-gray-500 dark:text-gray-400"
              >Click to collapse</span
            >
          </button>
          <div
            v-show="sectionExpanded.reimbursements"
            class="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                >Fuel Reimbursement Cap (/Year)</label
              >
              <div class="flex items-center">
                <input
                  :value="currencyInputs.fuelReimbursementCap"
                  type="text"
                  class="flex-1 px-3 py-2 text-sm border rounded-l bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                  placeholder="120,000"
                  @input="
                    updateCurrencyValue(
                      'fuelReimbursementCap',
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
                <span
                  class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                >
                  {{ getCurrencyCode() }}
                </span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                >Driver Reimbursement Cap (/Year)</label
              >
              <div class="flex items-center">
                <input
                  :value="currencyInputs.driverReimbursementCap"
                  type="text"
                  class="flex-1 px-3 py-2 text-sm border rounded-l bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                  placeholder="180,000"
                  @input="
                    updateCurrencyValue(
                      'driverReimbursementCap',
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
                <span
                  class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                >
                  {{ getCurrencyCode() }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Post-Lease Scenario (only show if any lease option has tenure < analysis period) -->
        <section
          v-if="
            assumptions.leaseOptions.some(
              (opt) => opt.tenure > 0 && opt.tenure / 12 < assumptions.analysisPeriod,
            )
          "
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 mb-4"
        >
          <button
            class="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
            type="button"
            @click="toggleSection('postLease')"
          >
            <div class="flex-1">
              <h3
                class="text-xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
              >
                <Icon
                  icon="mdi:chevron-down"
                  class="text-sky-600 dark:text-sky-400 transition-transform"
                  :class="{ 'rotate-180': !sectionExpanded.postLease }"
                />
                POST-LEASE SCENARIO
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">
                What happens after lease ends (if lease tenure is less than analysis period)
              </p>
            </div>
            <span v-if="sectionExpanded.postLease" class="text-xs text-gray-500 dark:text-gray-400"
              >Click to collapse</span
            >
          </button>
          <div v-show="sectionExpanded.postLease" class="space-y-3">
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                After Lease Ends
                <button
                  class="ml-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                  type="button"
                  title="Click for help"
                  @click.stop="toggleTooltip('postLeaseScenario')"
                >
                  <Icon icon="mdi:help-circle" class="text-base" />
                </button>
              </label>
              <!-- Tooltip for Post-Lease Scenario -->
              <div
                v-if="showTooltip === 'postLeaseScenario'"
                class="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      Post-Lease Scenario
                    </p>
                    <p class="text-xs text-gray-700 dark:text-gray-300">
                      If your lease tenure is shorter than the analysis period, this determines what
                      happens after the lease ends.
                    </p>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                      • <span class="font-semibold">Extend Lease:</span> Continue leasing at the
                      same annual cost
                      <br />
                      • <span class="font-semibold">Buy Car:</span> Purchase the car and use
                      ownership costs for remaining period
                      <br />
                      • <span class="font-semibold">Lease New:</span> Lease a new car (uses same
                      lease option cost)
                    </p>
                  </div>
                  <button
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    type="button"
                    @click.stop="showTooltip = null"
                  >
                    <Icon icon="mdi:close" />
                  </button>
                </div>
              </div>
              <select
                v-model="assumptions.postLeaseScenario"
                class="w-full px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="extend">Extend Lease (Continue at same rate)</option>
                <option value="buy">Buy the Car (Use ownership costs)</option>
                <option value="lease_new">Lease New Car (Use same lease option)</option>
              </select>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                This affects the total cost calculation when lease tenure is shorter than the
                analysis period.
              </p>
            </div>
          </div>
        </section>

        <!-- Tax & Investment -->
        <section
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 mb-4"
        >
          <button
            class="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
            type="button"
            @click="toggleSection('taxInvestment')"
          >
            <div class="flex-1">
              <h3
                class="text-xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
              >
                <Icon
                  icon="mdi:chevron-down"
                  class="text-sky-600 dark:text-sky-400 transition-transform"
                  :class="{ 'rotate-180': !sectionExpanded.taxInvestment }"
                />
                TAX & INVESTMENT
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">
                Tax benefits and investment returns for lease options
              </p>
            </div>
            <span
              v-if="sectionExpanded.taxInvestment"
              class="text-xs text-gray-500 dark:text-gray-400"
              >Click to collapse</span
            >
          </button>
          <div v-show="sectionExpanded.taxInvestment" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Effective Tax Rate for Lease EMI -->
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                Effective Tax Rate for Lease EMI (%) <span class="text-red-500">*</span>
                <button
                  class="ml-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                  type="button"
                  title="Click for help"
                  @click.stop="toggleTooltip('effectiveTaxRate')"
                >
                  <Icon icon="mdi:help-circle" class="text-base" />
                </button>
              </label>
              <!-- Tooltip for Effective Tax Rate -->
              <div
                v-if="showTooltip === 'effectiveTaxRate'"
                class="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      Effective Tax Rate
                    </p>
                    <p class="text-xs text-gray-700 dark:text-gray-300">
                      Your income tax rate that applies to lease EMI deductions. This determines how
                      much tax you save when leasing.
                    </p>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                      • <span class="font-semibold">Tax Saving Formula:</span> (Annual Lease EMI ×
                      Effective Tax Rate) - Other Tax Deductions
                      <br />
                      • Default: 30% (highest tax bracket in India)
                      <br />
                      • Only applicable to lease option (owned car has no tax benefit)
                      <br />
                      • Higher tax rates make leasing more attractive
                    </p>
                  </div>
                  <button
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    type="button"
                    @click.stop="showTooltip = null"
                  >
                    <Icon icon="mdi:close" />
                  </button>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <select
                  v-model.number="assumptions.effectiveTaxRate"
                  class="flex-1 px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  @change="assumptions.effectiveTaxRate = Number(assumptions.effectiveTaxRate)"
                >
                  <option :value="0">0%</option>
                  <option :value="5">5%</option>
                  <option :value="10">10%</option>
                  <option :value="20">20%</option>
                  <option :value="30">30%</option>
                </select>
                <input
                  v-if="![0, 5, 10, 20, 30].includes(assumptions.effectiveTaxRate)"
                  v-model.number="assumptions.effectiveTaxRate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  class="w-24 px-3 py-2 text-sm border rounded bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                  placeholder="Custom %"
                  @input="
                    assumptions.effectiveTaxRate = Math.max(0, assumptions.effectiveTaxRate || 0)
                  "
                  @blur="assumptions.effectiveTaxRate = assumptions.effectiveTaxRate || 30"
                />
              </div>
            </div>
            <!-- Other Tax Deductions (moved from REIMBURSEMENTS) -->
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                Other Tax Deductions
                <button
                  class="ml-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                  type="button"
                  title="Click for help"
                  @click.stop="toggleTooltip('otherTaxDeductions')"
                >
                  <Icon icon="mdi:help-circle" class="text-base" />
                </button>
              </label>
              <!-- Tooltip for Other Tax Deductions -->
              <div
                v-if="showTooltip === 'otherTaxDeductions'"
                class="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      Other Tax Deductions
                    </p>
                    <p class="text-xs text-gray-700 dark:text-gray-300">
                      Additional tax deductions (beyond the basic lease EMI deduction) that reduce
                      your overall tax saving.
                    </p>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                      • Subtracted from the calculated tax saving: (EMI × Tax Rate) - Other
                      Deductions
                      <br />
                      • Examples: Additional business expenses, other deductions
                      <br />
                      • Leave as 0 if you don't have additional deductions
                    </p>
                  </div>
                  <button
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    type="button"
                    @click.stop="showTooltip = null"
                  >
                    <Icon icon="mdi:close" />
                  </button>
                </div>
              </div>
              <div class="flex items-center">
                <input
                  :value="currencyInputs.taxDeductions"
                  type="text"
                  class="flex-1 px-3 py-2 text-sm border rounded-l bg-yellow-50 dark:bg-slate-700 dark:text-gray-100 border-yellow-300 dark:border-slate-600"
                  placeholder="0"
                  @input="
                    updateCurrencyValue('taxDeductions', ($event.target as HTMLInputElement).value)
                  "
                />
                <span
                  class="px-2 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-l-0 border-yellow-300 dark:border-slate-600 rounded-r text-gray-700 dark:text-gray-300 whitespace-nowrap flex-shrink-0"
                >
                  {{ getCurrencyCode() }}
                </span>
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                Additional tax deductions that reduce your tax saving from lease EMI
              </p>
            </div>
          </div>
        </section>
      </div>

      <!-- 02 OWNERSHIP -->
      <div v-show="activeTab === 'ownership'" class="space-y-6">
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center">
          <Icon icon="mdi:car" class="mr-2 text-sky-600" />
          {{ assumptions.carName || 'Car' }} Ownership Costs
        </h2>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div
            class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
          >
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Purchase Price</p>
            <p class="text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ formatCurrency(ownershipCosts.purchasePrice) }}
            </p>
          </div>
          <div
            class="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700"
          >
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Operating Costs</p>
            <p class="text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ formatCurrency(ownershipCosts.operatingCosts) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ({{ assumptions.analysisPeriod }} years)
            </p>
          </div>
          <div
            class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800"
          >
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Resale Value</p>
            <p class="text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ formatCurrency(ownershipCosts.resaleValue) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              (After {{ assumptions.analysisPeriod }} years)
            </p>
          </div>
          <div
            class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800"
          >
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Cost</p>
            <p class="text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ formatCurrency(ownershipCosts.netOwnershipCost) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{
                formatCurrency(ownershipCosts.netOwnershipCost / (assumptions.analysisPeriod * 12))
              }}/month
            </p>
          </div>
        </div>

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
                  Repairs
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Depreciation
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
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(year.depreciation) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right font-semibold"
                >
                  {{ formatCurrency(year.total) }}
                </td>
              </tr>
              <tr class="bg-gray-100 dark:bg-slate-800 font-bold">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  TOTAL OPERATING COSTS ({{ assumptions.analysisPeriod }} YEARS)
                </td>
                <td colspan="5" class="border border-gray-300 dark:border-slate-700 px-4 py-2"></td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(ownershipCosts.operatingCosts) }}
                </td>
              </tr>
              <tr class="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  ADD: PURCHASE PRICE
                </td>
                <td colspan="5" class="border border-gray-300 dark:border-slate-700 px-4 py-2"></td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(ownershipCosts.purchasePrice) }}
                </td>
              </tr>
              <tr class="bg-gray-100 dark:bg-slate-800 font-bold">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  TOTAL OWNERSHIP COST
                </td>
                <td colspan="5" class="border border-gray-300 dark:border-slate-700 px-4 py-2"></td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(ownershipCosts.totalCosts) }}
                </td>
              </tr>
              <tr class="bg-yellow-50 dark:bg-yellow-900/20 font-semibold">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  LESS: RESALE VALUE (Depreciated)
                </td>
                <td colspan="5" class="border border-gray-300 dark:border-slate-700 px-4 py-2"></td>
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
                <td colspan="5" class="border border-gray-300 dark:border-slate-700 px-4 py-2"></td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(ownershipCosts.netOwnershipCost) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Cost Breakdown Summary -->
        <div
          class="mt-6 bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700"
        >
          <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
            Cost Breakdown Summary
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Operating Costs ({{ assumptions.analysisPeriod }} years)
              </p>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Fuel:</span>
                  <span class="font-semibold">{{
                    formatCurrency(ownershipCosts.years.reduce((sum, y) => sum + y.fuelCost, 0))
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Insurance:</span>
                  <span class="font-semibold">{{
                    formatCurrency(ownershipCosts.years.reduce((sum, y) => sum + y.insurance, 0))
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Service & Maintenance:</span>
                  <span class="font-semibold">{{
                    formatCurrency(ownershipCosts.years.reduce((sum, y) => sum + y.service, 0))
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Repairs:</span>
                  <span class="font-semibold">{{
                    formatCurrency(ownershipCosts.years.reduce((sum, y) => sum + y.repairs, 0))
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Depreciation:</span>
                  <span class="font-semibold">{{
                    formatCurrency(ownershipCosts.totalDepreciation)
                  }}</span>
                </div>
              </div>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Financial Summary
              </p>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Total Spent:</span>
                  <span class="font-semibold">{{ formatCurrency(ownershipCosts.totalCosts) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Asset Value at End:</span>
                  <span class="font-semibold text-green-600 dark:text-green-400">{{
                    formatCurrency(ownershipCosts.resaleValue)
                  }}</span>
                </div>
                <div
                  class="flex justify-between pt-2 border-t border-gray-300 dark:border-slate-700"
                >
                  <span class="font-semibold text-gray-800 dark:text-gray-200">Net Cost:</span>
                  <span class="font-bold text-lg text-zinc-800 dark:text-zinc-200">{{
                    formatCurrency(ownershipCosts.netOwnershipCost)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Average Monthly:</span>
                  <span class="font-semibold">{{
                    formatCurrency(
                      ownershipCosts.netOwnershipCost / (assumptions.analysisPeriod * 12),
                    )
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 03 LEASE COMPARISON -->
      <div v-show="activeTab === 'lease'" class="space-y-6">
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center">
          <Icon icon="mdi:file-compare" class="mr-2 text-sky-600" />
          Lease Comparison
        </h2>

        <!-- Lease options ranking -->
        <div
          class="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700"
        >
          <div class="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                Lease options ranking
              </h3>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Ranked by total net lease cost over {{ assumptions.analysisPeriod }} years (tax &
                reimbursements applied). “After investment” subtracts the same investment gain for
                all options.
              </p>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-white dark:bg-slate-900">
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-left">
                    Option
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    Net cost (cash)
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    Net cost (after investment)
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    Over‑km / year
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="opt in leaseOptionsRanked"
                  :key="opt.optionName"
                  class="hover:bg-gray-100 dark:hover:bg-slate-900/50"
                >
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2 font-medium">
                    <div class="flex items-center gap-2">
                      <span>{{ opt.optionName }}</span>
                      <span
                        v-if="bestLeaseOption && opt.optionName === bestLeaseOption.optionName"
                        class="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      >
                        Best
                      </span>
                    </div>
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    {{ formatCurrency(opt.netTotalCost) }}
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    {{ formatCurrency(opt.netTotalCost - investmentReturn.totalGain) }}
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    {{
                      Math.max(
                        0,
                        assumptions.annualDistance - opt.allowedKMperYear,
                      ).toLocaleString()
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-slate-800">
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-left">
                  Metric
                </th>
                <th
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                  :class="
                    recommendation && recommendation.recommended === option.optionName
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : ''
                  "
                >
                  {{ option.optionName }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="bg-blue-50 dark:bg-blue-900/20">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-semibold">
                  Lease Tenure
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right font-semibold"
                >
                  {{ option.tenure }} months
                  <span
                    v-if="option.tenure > 0 && option.tenureYears < assumptions.analysisPeriod"
                    class="text-xs text-yellow-600 dark:text-yellow-400 block"
                  >
                    ({{ option.postLeaseYears }} years post-lease)
                  </span>
                  <span
                    v-else-if="option.tenure > 0 && option.tenureYears > assumptions.analysisPeriod"
                    class="text-xs text-blue-600 dark:text-blue-400 block"
                  >
                    (extends beyond analysis)
                  </span>
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Monthly EMI
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  {{ formatCurrency(option.emi) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Annual Lease EMI
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  {{ formatCurrency(option.annualEMI) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Annual Fuel Cost
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  {{ formatCurrency(option.annualFuelCost) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Allowed KM/Year
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  {{ option.allowedKMperYear ? option.allowedKMperYear.toLocaleString() : '0' }} km
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Extra KM Cost
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  {{ formatCurrency(option.extraKMCost) }}
                  <span
                    v-if="option.extraKM > 0"
                    class="text-xs text-orange-600 dark:text-orange-400 block"
                  >
                    ({{ option.extraKM.toLocaleString() }} km extra)
                  </span>
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Extra KM Charge
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  {{ formatCurrency(option.extraKMCharge) }}/km
                </td>
              </tr>
              <tr class="bg-gray-50 dark:bg-slate-800/50">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-semibold">
                  Gross Annual Cost
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right font-semibold"
                >
                  {{ formatCurrency(option.grossAnnualCost) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Reimbursement
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  -{{ formatCurrency(option.reimbursement) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Tax Saving on Lease EMI
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  -{{ formatCurrency(option.taxSaving) }}
                </td>
              </tr>
              <tr class="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  Net Annual Cost
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  {{ formatCurrency(option.netAnnualCost) }}
                </td>
              </tr>
              <tr
                v-if="leaseOptions.some((opt) => opt.postLeaseYears > 0)"
                class="bg-yellow-50 dark:bg-yellow-900/20"
              >
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Lease Period Cost
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  {{ formatCurrency(option.leasePeriodCost) }}
                  <span
                    v-if="option.postLeaseYears > 0"
                    class="text-xs text-gray-600 dark:text-gray-400 block"
                  >
                    ({{ option.tenureYears }} years)
                  </span>
                </td>
              </tr>
              <tr
                v-if="leaseOptions.some((opt) => opt.postLeaseYears > 0)"
                class="bg-orange-50 dark:bg-orange-900/20"
              >
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Post-Lease Cost
                  <span class="text-xs text-gray-600 dark:text-gray-400 block">
                    ({{
                      assumptions.postLeaseScenario === 'extend'
                        ? 'Extend lease'
                        : assumptions.postLeaseScenario === 'buy'
                          ? 'Buy car'
                          : 'Lease new'
                    }})
                  </span>
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  <span v-if="option.postLeaseYears > 0">
                    {{ formatCurrency(option.postLeaseCost) }}
                    <span class="text-xs text-gray-600 dark:text-gray-400 block">
                      ({{ option.postLeaseYears }} years)
                    </span>
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
              </tr>
              <tr class="bg-green-50 dark:bg-green-900/20 font-bold text-lg">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  Net {{ assumptions.analysisPeriod }}-Year Cost
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  {{ formatCurrency(option.netTotalCost) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  Net Monthly Cost
                </td>
                <td
                  v-for="option in leaseOptions"
                  :key="option.optionName"
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right"
                >
                  {{ formatCurrency(option.netTotalCost / (assumptions.analysisPeriod * 12)) }}
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
          Investment Return (Sale of {{ assumptions.carName }})
        </h2>

        <!-- Investment Scenario Summary Card -->
        <div
          class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 mb-4"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Initial Investment</p>
              <p class="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                {{ formatCurrency(assumptions.currentMarketValue) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Car sale proceeds</p>
            </div>
            <div>
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Annual Return Rate</p>
              <p class="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                {{ assumptions.returnOnInvestedCapital }}%
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Compounded annually</p>
            </div>
            <div>
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Investment Period</p>
              <p class="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                {{ assumptions.analysisPeriod }} years
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Full analysis period</p>
            </div>
          </div>
        </div>

        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          If you lease, you sell your {{ assumptions.carName || 'car' }} for
          {{ formatCurrency(assumptions.currentMarketValue) }} and invest the proceeds at
          {{ assumptions.returnOnInvestedCapital }}% annual return over
          {{ assumptions.analysisPeriod }} years.
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

        <!-- Investment vs Resale Comparison -->
        <div
          class="mt-6 bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700"
        >
          <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
            Investment vs Resale Comparison
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-white dark:bg-slate-700 rounded p-3">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">If You Lease (Investment)</p>
              <p class="text-xl font-bold text-green-600 dark:text-green-400">
                {{ formatCurrency(investmentReturn.finalValue) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Gain: {{ formatCurrency(investmentReturn.totalGain) }}
              </p>
            </div>
            <div class="bg-white dark:bg-slate-700 rounded p-3">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">If You Own (Resale Value)</p>
              <p class="text-xl font-bold text-blue-600 dark:text-blue-400">
                {{ formatCurrency(ownershipCosts.resaleValue) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Loss:
                {{ formatCurrency(assumptions.currentMarketValue - ownershipCosts.resaleValue) }}
              </p>
            </div>
          </div>
          <div
            class="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800"
          >
            <p class="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              Investment Advantage:
              {{ formatCurrency(investmentReturn.finalValue - ownershipCosts.resaleValue) }}
            </p>
            <p class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              By leasing, you gain
              {{ formatCurrency(investmentReturn.finalValue - ownershipCosts.resaleValue) }} more
              than if you owned and sold the car.
            </p>
          </div>
        </div>
      </div>

      <!-- 05 FINAL COMPARISON -->
      <div v-show="activeTab === 'comparison'" class="space-y-6">
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200 flex items-center">
          <Icon icon="mdi:scale-balance" class="mr-2 text-sky-600" />
          Final Comparison
        </h2>

        <!-- Recommendation Banner -->
        <div
          v-if="recommendation"
          class="mb-6 p-4 rounded-lg border-2"
          :class="
            recommendation.recommended.includes('Leased') ||
            recommendation.recommended.includes('lease')
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-700'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-700'
          "
        >
          <div class="flex items-start gap-3">
            <Icon
              :icon="
                recommendation.recommended.includes('Leased') ||
                recommendation.recommended.includes('lease')
                  ? 'mdi:check-circle'
                  : 'mdi:information'
              "
              class="text-2xl flex-shrink-0"
              :class="
                recommendation.recommended.includes('Leased') ||
                recommendation.recommended.includes('lease')
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-blue-600 dark:text-blue-400'
              "
            />
            <div class="flex-1">
              <p
                class="font-bold text-lg mb-1"
                :class="
                  recommendation.recommended.includes('Leased') ||
                  recommendation.recommended.includes('lease')
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-blue-800 dark:text-blue-200'
                "
              >
                {{
                  recommendation.recommended.includes('Leased') ||
                  recommendation.recommended.includes('lease')
                    ? '✓ RECOMMENDED: Leasing'
                    : 'RECOMMENDED: Ownership'
                }}
              </p>
              <p
                class="text-sm"
                :class="
                  recommendation.recommended.includes('Leased') ||
                  recommendation.recommended.includes('lease')
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-blue-700 dark:text-blue-300'
                "
              >
                {{ recommendation.explanation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Quick assumptions snapshot -->
        <div
          class="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700"
        >
          <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-2">
            Assumptions snapshot
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            <div class="flex justify-between gap-3">
              <span class="text-gray-600 dark:text-gray-400">Annual km</span>
              <span class="font-medium">{{
                Number(assumptions.annualDistance || 0).toLocaleString()
              }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-gray-600 dark:text-gray-400">Mileage</span>
              <span class="font-medium">{{
                Number(assumptions.mileage || 0).toLocaleString()
              }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-gray-600 dark:text-gray-400">Fuel price</span>
              <span class="font-medium">{{
                formatCurrency(Number(assumptions.fuelPrice || 0))
              }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-gray-600 dark:text-gray-400">Tax rate (lease EMI)</span>
              <span class="font-medium">{{ Number(assumptions.effectiveTaxRate || 0) }}%</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-gray-600 dark:text-gray-400">ROI used</span>
              <span class="font-medium"
                >{{ Number(assumptions.returnOnInvestedCapital || 0) }}%</span
              >
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-gray-600 dark:text-gray-400">Post‑lease</span>
              <span class="font-medium">{{ assumptions.postLeaseScenario }}</span>
            </div>
          </div>
        </div>

        <!-- Comparison Summary Cards -->
        <div v-if="finalComparison" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div
            class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
          >
            <h3 class="font-semibold text-lg mb-3 text-zinc-800 dark:text-zinc-200">Owned Car</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Net Cost:</span>
                <span class="font-bold text-lg">{{
                  formatCurrency(finalComparison.ownedCar.netCost)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Monthly Cost:</span>
                <span class="font-semibold">{{
                  formatCurrency(finalComparison.ownedCar.avgMonthlyCost)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Asset at End:</span>
                <span class="font-semibold text-green-600 dark:text-green-400">{{
                  formatCurrency(finalComparison.ownedCar.assetAtEnd)
                }}</span>
              </div>
            </div>
          </div>
          <div
            class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800"
          >
            <h3 class="font-semibold text-lg mb-3 text-zinc-800 dark:text-zinc-200">
              Leased Car ({{ finalComparison.leasedCar.optionName }})
              <span
                v-if="bestLeaseOption && bestLeaseOption.tenure > 0"
                class="text-xs font-normal text-gray-600 dark:text-gray-400"
              >
                ({{ bestLeaseOption.tenure }} months)
              </span>
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Net Cost (cash):</span>
                <span class="font-bold text-lg">{{
                  formatCurrency(finalComparison.leasedCar.netCost)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400"
                  >Net Cost (after investment):</span
                >
                <span class="font-bold text-lg">{{
                  formatCurrency(finalComparison.leasedCar.netCostAfterInvestment)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Monthly (cash):</span>
                <span class="font-semibold">{{
                  formatCurrency(finalComparison.leasedCar.avgMonthlyCost)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400"
                  >Monthly (after investment):</span
                >
                <span class="font-semibold">{{
                  formatCurrency(finalComparison.leasedCar.avgMonthlyCostAfterInvestment)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">Asset at End:</span>
                <span class="font-semibold text-green-600 dark:text-green-400">{{
                  formatCurrency(finalComparison.leasedCar.assetAtEnd)
                }}</span>
              </div>
              <div
                v-if="bestLeaseOption && bestLeaseOption.postLeaseYears > 0"
                class="mt-2 pt-2 border-t border-green-300 dark:border-green-700"
              >
                <p class="text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ Includes {{ bestLeaseOption.postLeaseYears }} years post-lease cost
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sensitivity panel -->
        <div
          class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-4"
        >
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">
            Sensitivity (quick scenarios)
          </h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Helps answer “does the decision change if assumptions move?”. Uses the same high-level
            model and compares ownership vs best lease
            <span class="font-semibold">after investment</span>.
          </p>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-gray-100 dark:bg-slate-800">
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-left">
                    Scenario
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-left">
                    Recommended
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    Owned (net)
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    Lease best (after inv.)
                  </th>
                  <th class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    Savings
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="s in sensitivityScenarios"
                  :key="s.id"
                  class="hover:bg-gray-50 dark:hover:bg-slate-800/50"
                >
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2">
                    <div class="font-medium text-zinc-800 dark:text-zinc-200">{{ s.label }}</div>
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2">
                    <span class="font-semibold">{{ s.result.recommended }}</span>
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    {{ formatCurrency(s.result.ownedNetCost) }}
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    {{
                      s.result.bestLeaseNetCostAfterInvestment !== null
                        ? formatCurrency(s.result.bestLeaseNetCostAfterInvestment)
                        : '—'
                    }}
                  </td>
                  <td class="border border-gray-300 dark:border-slate-700 px-3 py-2 text-right">
                    {{ formatCurrency(s.result.savings) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="finalComparison" class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-slate-800">
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-left">
                  Metric
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Owned {{ assumptions.carName }}
                </th>
                <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  Leased Car ({{ finalComparison.leasedCar.optionName }})
                  <span
                    v-if="bestLeaseOption && bestLeaseOption.tenure > 0"
                    class="text-xs font-normal text-gray-600 dark:text-gray-400 block"
                  >
                    {{ bestLeaseOption.tenure }} months
                    <span
                      v-if="bestLeaseOption.postLeaseYears > 0"
                      class="text-yellow-600 dark:text-yellow-400"
                    >
                      ({{ bestLeaseOption.postLeaseYears }} years post-lease)
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  <div class="flex items-center gap-1">
                    Purchase Price / Initial Cost
                    <button
                      class="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      type="button"
                      title="Click for explanation"
                      @click.stop="toggleTooltip('purchasePrice')"
                    >
                      <Icon icon="mdi:help-circle" class="text-base" />
                    </button>
                  </div>
                  <!-- Tooltip for Purchase Price -->
                  <div
                    v-if="showTooltip === 'purchasePrice'"
                    class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          Purchase Price / Initial Cost
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          <strong>Owned Car:</strong> The current market value or purchase price of
                          the car you own. This is the upfront cost you paid (or would pay) to buy
                          the car.
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          <strong>Leased Car:</strong> N/A - When leasing, you don't purchase the
                          car, so there's no initial purchase cost. Instead, you pay monthly EMI.
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          This cost is included in the total ownership cost calculation.
                        </p>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.ownedCar.purchasePrice) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-gray-400"
                >
                  N/A (Lease)
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  <div class="flex items-center gap-1">
                    {{ assumptions.analysisPeriod }}-Year Operating Cost
                    <button
                      class="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      type="button"
                      title="Click for explanation"
                      @click.stop="toggleTooltip('operatingCost')"
                    >
                      <Icon icon="mdi:help-circle" class="text-base" />
                    </button>
                  </div>
                  <!-- Tooltip for Operating Cost -->
                  <div
                    v-if="showTooltip === 'operatingCost'"
                    class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          {{ assumptions.analysisPeriod }}-Year Operating Cost
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          <strong>Owned Car:</strong> Total operating costs over
                          {{ assumptions.analysisPeriod }} years including:
                        </p>
                        <ul
                          class="text-xs text-gray-600 dark:text-gray-400 mt-1.5 list-disc list-inside space-y-0.5"
                        >
                          <li>Fuel costs</li>
                          <li>Insurance premiums</li>
                          <li>Service & maintenance</li>
                          <li>Repairs (major repairs + tyre replacement)</li>
                          <li>Depreciation</li>
                        </ul>
                        <p class="text-xs text-gray-700 dark:text-gray-300 mt-1.5">
                          <strong>Leased Car:</strong> Total lease costs over
                          {{ assumptions.analysisPeriod }} years including:
                        </p>
                        <ul
                          class="text-xs text-gray-600 dark:text-gray-400 mt-1.5 list-disc list-inside space-y-0.5"
                        >
                          <li>Monthly EMI × tenure (or analysis period if longer)</li>
                          <li>Fuel costs</li>
                          <li>Extra KM charges (if applicable)</li>
                          <li>Post-lease costs (if lease tenure &lt; analysis period)</li>
                          <li>Less: Reimbursements and tax savings</li>
                        </ul>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.ownedCar.operatingCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.leasedCar.operatingCost) }}
                  <span
                    v-if="bestLeaseOption && bestLeaseOption.postLeaseYears > 0"
                    class="text-xs text-gray-600 dark:text-gray-400 block"
                  >
                    (Includes {{ bestLeaseOption.postLeaseYears }} years post-lease)
                  </span>
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  <div class="flex items-center gap-1">
                    Resale / Investment Gain
                    <button
                      class="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      type="button"
                      title="Click for explanation"
                      @click.stop="toggleTooltip('resaleInvestment')"
                    >
                      <Icon icon="mdi:help-circle" class="text-base" />
                    </button>
                  </div>
                  <!-- Tooltip for Resale/Investment Gain -->
                  <div
                    v-if="showTooltip === 'resaleInvestment'"
                    class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          Resale / Investment Gain
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          <strong>Owned Car (Resale Value):</strong> The estimated value of your car
                          after {{ assumptions.analysisPeriod }} years, calculated based on:
                        </p>
                        <ul
                          class="text-xs text-gray-600 dark:text-gray-400 mt-1.5 list-disc list-inside space-y-0.5"
                        >
                          <li>Initial purchase price</li>
                          <li>Depreciation model selected (Straight-Line, Accelerated, etc.)</li>
                          <li>Depreciation rate</li>
                        </ul>
                        <p class="text-xs text-gray-700 dark:text-gray-300 mt-1.5">
                          <strong>Leased Car (Investment Gain):</strong> If you lease, you sell your
                          car immediately and invest the proceeds at
                          {{ assumptions.returnOnInvestedCapital }}% annual return. This shows the
                          total gain from that investment over
                          {{ assumptions.analysisPeriod }} years.
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          <strong>Note:</strong> Both values are shown as credits (negative costs)
                          in the net cost calculation.
                        </p>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  {{ formatCurrency(finalComparison.ownedCar.resaleGain) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  +{{ formatCurrency(finalComparison.leasedCar.investmentGain) }}
                </td>
              </tr>
              <tr class="bg-green-50 dark:bg-green-900/20 font-bold text-lg">
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2">
                  <div class="flex items-center gap-1">
                    NET COST ({{ assumptions.analysisPeriod }} YEARS)
                    <button
                      class="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      type="button"
                      title="Click for explanation"
                      @click.stop="toggleTooltip('netCost')"
                    >
                      <Icon icon="mdi:help-circle" class="text-base" />
                    </button>
                  </div>
                  <!-- Tooltip for Net Cost -->
                  <div
                    v-if="showTooltip === 'netCost'"
                    class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          NET COST ({{ assumptions.analysisPeriod }} YEARS)
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          This is the <strong>most important metric</strong> for comparison. It
                          represents the total net cost over {{ assumptions.analysisPeriod }} years.
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300 mt-1.5">
                          <strong>Owned Car Calculation:</strong>
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          = Purchase Price + Operating Costs - Resale Value
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300 mt-1.5">
                          <strong>Leased Car Calculation:</strong>
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          = Operating Costs (EMI + fuel + extra KM - reimbursements - tax savings) -
                          Investment Gain
                        </p>
                        <p
                          class="text-xs text-yellow-700 dark:text-yellow-300 mt-1.5 font-semibold"
                        >
                          The option with the lower net cost is the more economical choice.
                        </p>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.ownedCar.netCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.leasedCar.netCost) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  <div class="flex items-center gap-1">
                    Average Monthly Cost
                    <button
                      class="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      type="button"
                      title="Click for explanation"
                      @click.stop="toggleTooltip('avgMonthlyCost')"
                    >
                      <Icon icon="mdi:help-circle" class="text-base" />
                    </button>
                  </div>
                  <!-- Tooltip for Average Monthly Cost -->
                  <div
                    v-if="showTooltip === 'avgMonthlyCost'"
                    class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          Average Monthly Cost
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          The average monthly cost over the {{ assumptions.analysisPeriod }}-year
                          analysis period.
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          <strong>Calculation:</strong> Net Cost ÷ ({{ assumptions.analysisPeriod }}
                          years × 12 months)
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          This helps you understand the monthly financial impact of each option.
                          Note that actual monthly costs may vary (e.g., owned car has upfront
                          purchase, lease has consistent EMI).
                        </p>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.ownedCar.avgMonthlyCost) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.leasedCar.avgMonthlyCost) }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  <div class="flex items-center gap-1">
                    Maintenance Risk
                    <button
                      class="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      type="button"
                      title="Click for explanation"
                      @click.stop="toggleTooltip('maintenanceRisk')"
                    >
                      <Icon icon="mdi:help-circle" class="text-base" />
                    </button>
                  </div>
                  <!-- Tooltip for Maintenance Risk -->
                  <div
                    v-if="showTooltip === 'maintenanceRisk'"
                    class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          Maintenance Risk
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          <strong>Owned Car: High</strong> - You are responsible for all
                          maintenance, repairs, and unexpected costs. As the car ages, maintenance
                          costs typically increase.
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300 mt-1.5">
                          <strong>Leased Car: Low (Included)</strong> - Maintenance and repairs are
                          typically covered by the lease agreement. You don't bear the risk of
                          unexpected major repairs.
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          This is a qualitative factor to consider beyond just cost. Lower
                          maintenance risk provides peace of mind and predictable costs.
                        </p>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ finalComparison.ownedCar.maintenanceRisk }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ finalComparison.leasedCar.maintenanceRisk }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  <div class="flex items-center gap-1">
                    Tax Benefit
                    <button
                      class="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      type="button"
                      title="Click for explanation"
                      @click.stop="toggleTooltip('taxBenefit')"
                    >
                      <Icon icon="mdi:help-circle" class="text-base" />
                    </button>
                  </div>
                  <!-- Tooltip for Tax Benefit -->
                  <div
                    v-if="showTooltip === 'taxBenefit'"
                    class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          Tax Benefit
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          <strong>Owned Car: None</strong> - Personal car ownership typically
                          doesn't provide tax benefits (unless used for business purposes with
                          proper documentation).
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300 mt-1.5">
                          <strong>Leased Car:</strong> Lease EMI payments are typically
                          tax-deductible as business expenses. The tax saving is calculated as:
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          (Annual Lease EMI × Effective Tax Rate) - Other Tax Deductions
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          Higher tax rates make leasing more attractive financially. This tax
                          benefit reduces the net lease cost.
                        </p>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ finalComparison.ownedCar.taxBenefit }}
                </td>
                <td
                  class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right text-green-600 dark:text-green-400"
                >
                  {{ finalComparison.leasedCar.taxBenefit }}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                  <div class="flex items-center gap-1">
                    Asset at End
                    <button
                      class="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      type="button"
                      title="Click for explanation"
                      @click.stop="toggleTooltip('assetAtEnd')"
                    >
                      <Icon icon="mdi:help-circle" class="text-base" />
                    </button>
                  </div>
                  <!-- Tooltip for Asset at End -->
                  <div
                    v-if="showTooltip === 'assetAtEnd'"
                    class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          Asset at End
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300">
                          <strong>Owned Car:</strong> The resale value of your car after
                          {{ assumptions.analysisPeriod }} years. This is the asset you still own
                          and can sell.
                        </p>
                        <p class="text-xs text-gray-700 dark:text-gray-300 mt-1.5">
                          <strong>Leased Car:</strong> The final value of your investment if you
                          sold your car and invested the proceeds at
                          {{ assumptions.returnOnInvestedCapital }}% annual return. This represents
                          the asset value from the investment.
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          <strong>Key Difference:</strong> With ownership, you own a depreciating
                          asset (car). With leasing, you have a growing investment (if return rate >
                          depreciation rate).
                        </p>
                      </div>
                      <button
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                        @click.stop="showTooltip = null"
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </div>
                  </div>
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.ownedCar.assetAtEnd) }}
                </td>
                <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                  {{ formatCurrency(finalComparison.leasedCar.assetAtEnd) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Detailed Breakdown Section -->
        <div
          v-if="finalComparison"
          class="mt-6 bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700"
        >
          <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
            Detailed Cost Breakdown
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Owned Car Breakdown -->
            <div>
              <h4 class="font-semibold mb-2 text-blue-700 dark:text-blue-300">
                Owned Car Breakdown
              </h4>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Purchase Price:</span>
                  <span class="font-semibold">{{
                    formatCurrency(finalComparison.ownedCar.purchasePrice)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Operating Costs:</span>
                  <span class="font-semibold">{{
                    formatCurrency(finalComparison.ownedCar.operatingCost)
                  }}</span>
                </div>
                <div class="flex justify-between text-green-600 dark:text-green-400">
                  <span>Resale Value (Credit):</span>
                  <span class="font-semibold"
                    >-{{ formatCurrency(Math.abs(finalComparison.ownedCar.resaleGain)) }}</span
                  >
                </div>
                <div
                  class="flex justify-between pt-2 border-t border-gray-300 dark:border-slate-700"
                >
                  <span class="font-semibold">Net Cost:</span>
                  <span class="font-bold text-lg">{{
                    formatCurrency(finalComparison.ownedCar.netCost)
                  }}</span>
                </div>
              </div>
            </div>
            <!-- Leased Car Breakdown -->
            <div>
              <h4 class="font-semibold mb-2 text-green-700 dark:text-green-300">
                Leased Car Breakdown ({{ finalComparison.leasedCar.optionName }})
                <span
                  v-if="bestLeaseOption && bestLeaseOption.tenure > 0"
                  class="text-xs font-normal text-gray-600 dark:text-gray-400"
                >
                  - {{ bestLeaseOption.tenure }} months
                </span>
              </h4>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Lease Cost:</span>
                  <span class="font-semibold">{{
                    formatCurrency(finalComparison.leasedCar.operatingCost)
                  }}</span>
                </div>
                <div
                  v-if="bestLeaseOption && bestLeaseOption.postLeaseYears > 0"
                  class="flex justify-between text-orange-600 dark:text-orange-400"
                >
                  <span class="text-xs"
                    >Post-Lease ({{ bestLeaseOption.postLeaseYears }} years):</span
                  >
                  <span class="font-semibold text-xs">{{
                    formatCurrency(bestLeaseOption.postLeaseCost)
                  }}</span>
                </div>
                <div class="flex justify-between text-green-600 dark:text-green-400">
                  <span>Investment Gain (Credit):</span>
                  <span class="font-semibold"
                    >-{{ formatCurrency(finalComparison.leasedCar.investmentGain) }}</span
                  >
                </div>
                <div
                  class="flex justify-between pt-2 border-t border-gray-300 dark:border-slate-700"
                >
                  <span class="font-semibold">Net Cost:</span>
                  <span class="font-bold text-lg">{{
                    formatCurrency(finalComparison.leasedCar.netCost)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- Savings Calculation -->
          <div
            class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
          >
            <div class="flex justify-between items-center">
              <span class="font-semibold text-green-800 dark:text-green-200">
                {{
                  finalComparison.leasedCar.netCost < finalComparison.ownedCar.netCost
                    ? 'Savings with Leasing:'
                    : 'Additional Cost with Leasing:'
                }}
              </span>
              <span
                class="font-bold text-xl"
                :class="
                  finalComparison.leasedCar.netCost < finalComparison.ownedCar.netCost
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                "
              >
                {{
                  formatCurrency(
                    Math.abs(finalComparison.ownedCar.netCost - finalComparison.leasedCar.netCost),
                  )
                }}
              </span>
            </div>
            <p class="text-xs text-green-700 dark:text-green-300 mt-1">
              Over {{ assumptions.analysisPeriod }} years,
              {{
                finalComparison.leasedCar.netCost < finalComparison.ownedCar.netCost
                  ? 'leasing saves'
                  : 'leasing costs'
              }}
              {{
                formatCurrency(
                  Math.abs(finalComparison.ownedCar.netCost - finalComparison.leasedCar.netCost),
                )
              }}
              compared to ownership.
            </p>
          </div>
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
          <li>Tax benefit applies on Lease EMI based on effective tax rate</li>
          <li>Owned car has no tax benefit</li>
          <li>Lease includes insurance + maintenance (not added separately)</li>
          <li>Depreciation calculated based on selected model</li>
          <li>Final decision based on lowest post-tax, post-reimbursement cost</li>
          <li>All calculations update automatically when assumptions change</li>
        </ul>
      </div>
    </div>

    <!-- Author Credit -->
    <div class="mt-8 text-center">
      <div
        class="inline-block bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 max-w-2xl border border-gray-200 dark:border-slate-700"
      >
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
          <Icon icon="mdi:code-tags" class="inline mr-1.5 text-sky-600 dark:text-sky-400" />
          <span class="font-semibold text-zinc-700 dark:text-zinc-300">Tool Author:</span>
          <span class="text-zinc-800 dark:text-zinc-200"> Siddhartha Basu</span>
        </p>
        <p class="text-xs text-zinc-500 dark:text-zinc-400">
          <Icon icon="mdi:email-outline" class="inline mr-1.5" />
          For correspondence:
          <a
            href="mailto:siddhartha.basu@outlook.com"
            class="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline transition-colors"
          >
            siddhartha.basu@outlook.com
          </a>
        </p>
      </div>
    </div>

    <!-- Templates Modal -->
    <div
      v-if="showTemplatesModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      @click.self="showTemplatesModal = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center">
            <Icon icon="mdi:file-multiple" class="mr-2 text-green-600" />
            Template Comparison
          </h2>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            @click="showTemplatesModal = false"
          >
            <Icon name="mdi:close" size="24" />
          </button>
        </div>

        <div class="mb-4 flex items-center justify-between flex-wrap gap-3">
          <p class="text-sm text-gray-600 dark:text-gray-400 flex-1">
            Save your current calculator settings as a template, then compare multiple templates
            side-by-side.
          </p>
          <div class="flex items-center gap-2">
            <button
              class="p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              title="Export current template as JSON file"
              @click="exportTemplateAsJSON"
            >
              <Icon icon="mdi:download" class="text-lg" />
            </button>
            <label
              class="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Icon icon="mdi:upload" class="text-lg" />
              <input
                type="file"
                accept=".json,application/json"
                class="hidden"
                @change="importTemplateFromJSON"
              />
              <span class="sr-only">Import template from JSON file</span>
            </label>
            <button
              class="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors text-sm"
              @click="openSaveModalFromTemplates"
            >
              Save Current as Template
            </button>
          </div>
        </div>

        <div v-if="savedTemplates.length === 0" class="text-center py-12">
          <Icon icon="mdi:file-document-outline" class="text-6xl text-gray-400 mb-4" />
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">No templates saved yet</p>
          <button
            class="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
            @click="openSaveModalFromTemplates"
          >
            Create Your First Template
          </button>
        </div>

        <div v-else class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="template in savedTemplates"
              :key="template.id"
              class="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold">{{ template.name }}</h3>
                  <span
                    v-if="template.is_default"
                    class="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded"
                  >
                    Default
                  </span>
                </div>
                <button
                  class="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm p-1"
                  title="Edit template"
                  @click="openEditTemplateModal(template)"
                >
                  <Icon icon="mdi:pencil" />
                </button>
              </div>
              <div
                v-if="template.description"
                class="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2"
              >
                {{ template.description }}
              </div>
              <div class="space-y-2 text-sm">
                <p>
                  Car: {{ (template.template_data as typeof defaultAssumptions).carName || 'N/A' }}
                </p>
                <p>
                  Period:
                  {{ (template.template_data as typeof defaultAssumptions).analysisPeriod }} years
                </p>
                <p>
                  Options:
                  {{
                    (template.template_data as typeof defaultAssumptions).leaseOptions?.length || 0
                  }}
                </p>
              </div>
              <div class="mt-4 flex gap-2">
                <button
                  class="flex-1 px-3 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 text-sm"
                  @click="loadTemplateAndClose(template.id)"
                >
                  Load
                </button>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="selectedTemplates"
                    type="checkbox"
                    :value="template.id"
                    class="rounded"
                  />
                  <span class="text-sm">Compare</span>
                </label>
              </div>
            </div>
          </div>

          <div v-if="selectedTemplates.length > 0" class="mt-6">
            <h3 class="text-xl font-bold mb-4">Comparison Table</h3>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="bg-gray-100 dark:bg-slate-800">
                    <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-left">
                      Template
                    </th>
                    <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                      Owned Cost
                    </th>
                    <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                      Lease Cost
                    </th>
                    <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                      Net Cost
                    </th>
                    <th class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-center">
                      Recommendation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="comparison in templateComparison"
                    :key="comparison?.name"
                    class="hover:bg-gray-50 dark:hover:bg-slate-800/50"
                  >
                    <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 font-medium">
                      {{ comparison?.name }}
                    </td>
                    <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                      {{ formatCurrency(comparison?.ownedCost || 0) }}
                    </td>
                    <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right">
                      {{ formatCurrency(comparison?.leaseCost || 0) }}
                    </td>
                    <td
                      class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-right font-semibold"
                    >
                      {{ formatCurrency(comparison?.netCost || 0) }}
                    </td>
                    <td class="border border-gray-300 dark:border-slate-700 px-4 py-2 text-center">
                      <span
                        :class="
                          comparison?.recommendation === 'Own'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-green-600 dark:text-green-400'
                        "
                      >
                        {{ comparison?.recommendation }}
                      </span>
                      <div
                        v-if="comparison?.bestLeaseOption"
                        class="text-xs text-gray-500 dark:text-gray-400 mt-1"
                      >
                        ({{ comparison.bestLeaseOption }})
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
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

          <!-- Show overwrite option if a template is currently loaded -->
          <div
            v-if="currentlyLoadedTemplateId"
            class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800"
          >
            <p class="text-sm font-medium mb-2 text-blue-800 dark:text-blue-200">
              Template is currently loaded
            </p>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="saveAsNew"
                  :value="true"
                  type="radio"
                  name="saveOption"
                  class="rounded"
                />
                <span class="text-sm">Save as new template</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="saveAsNew"
                  :value="false"
                  type="radio"
                  name="saveOption"
                  class="rounded"
                />
                <span class="text-sm">Overwrite current template</span>
              </label>
            </div>
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
            {{
              isLoading
                ? 'Saving...'
                : currentlyLoadedTemplateId && !saveAsNew
                  ? 'Update Template'
                  : 'Save Template'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Template Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showEditModal = false"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 class="text-2xl font-bold mb-4">Edit Template</h2>
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
            <input id="isDefaultEdit" v-model="isDefaultTemplate" type="checkbox" class="rounded" />
            <label for="isDefaultEdit" class="text-sm">Set as default template</label>
          </div>
        </div>
        <div class="flex gap-2 mt-6">
          <button
            class="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            @click="closeEditModal"
          >
            Cancel
          </button>
          <button
            :disabled="isLoading"
            class="flex-1 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors disabled:opacity-50"
            @click="updateTemplate"
          >
            {{ isLoading ? 'Updating...' : 'Update Template' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Navigation Warning Modal -->
    <div
      v-if="showNavigationWarning"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="handleNavigationCancel"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center gap-3 mb-4">
          <Icon icon="mdi:alert-circle" class="text-yellow-600 dark:text-yellow-400 text-3xl" />
          <h2 class="text-2xl font-bold text-zinc-800 dark:text-zinc-200">Unsaved Changes</h2>
        </div>
        <p class="text-gray-700 dark:text-gray-300 mb-6">
          You have unsaved changes to your calculator. What would you like to do?
        </p>
        <div class="flex flex-col gap-2">
          <button
            class="w-full px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors flex items-center justify-center gap-2"
            @click="handleNavigationSave"
          >
            <Icon icon="mdi:content-save" />
            Save Template
          </button>
          <button
            class="w-full px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
            @click="handleNavigationDiscard"
          >
            <Icon icon="mdi:close-circle" />
            Discard Changes
          </button>
          <button
            class="w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            @click="handleNavigationCancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Lease Option Confirmation Modal -->
    <div
      v-if="showDeleteLeaseOptionModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showDeleteLeaseOptionModal = false"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
          Remove Lease Option
        </h2>
        <p class="text-gray-700 dark:text-gray-300 mb-6">
          Are you sure you want to remove
          <span class="font-semibold">{{
            leaseOptionToDelete !== null ? assumptions.leaseOptions[leaseOptionToDelete]?.name : ''
          }}</span
          >? This action cannot be undone.
        </p>
        <div class="flex gap-2">
          <button
            class="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            @click="closeDeleteLeaseOptionModal"
          >
            Cancel
          </button>
          <button
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            @click="removeLeaseOption"
          >
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- Reset Confirmation Modal -->
    <div
      v-if="showResetConfirmModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showResetConfirmModal = false"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-sm w-full p-6">
        <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Reset to Defaults</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to reset to default values? All current data will be cleared.
        </p>
        <div class="flex gap-2">
          <button
            class="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            @click="showResetConfirmModal = false"
          >
            Cancel
          </button>
          <button
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            @click="handleResetConfirm"
          >
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Help Panel (Slide-out) -->
    <div
      v-if="showHelpPanel"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex"
      @click="closeHelpPanel"
    >
      <div
        class="bg-white dark:bg-slate-800 w-full max-w-2xl ml-auto shadow-2xl overflow-y-auto"
        @click.stop
      >
        <div
          class="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between"
        >
          <h2 class="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Icon icon="mdi:help-circle" class="text-sky-600" />
            Help & Guide
          </h2>
          <button
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            @click="closeHelpPanel"
          >
            <Icon icon="mdi:close" size="24" />
          </button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Quick Start -->
          <section>
            <h3
              class="text-xl font-bold mb-3 text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
            >
              <Icon icon="mdi:rocket-launch" class="text-sky-600" />
              Quick Start
            </h3>
            <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <span class="font-semibold">1. Fill in Basic Information:</span> Start with your car
                name, currency, and analysis period (typically 5 years).
              </p>
              <p>
                <span class="font-semibold">2. Enter Fuel Costs:</span> Provide your annual driving
                distance, fuel price, and car mileage. These are grouped together for easy
                reference.
              </p>
              <p>
                <span class="font-semibold">3. Set Owned Car Details:</span> Enter your car's
                current market value, insurance, and maintenance costs. You can also select a car
                from the database to auto-fill some values.
              </p>
              <p>
                <span class="font-semibold">4. Add Lease Options:</span> Configure one or more lease
                options with EMI, tenure, and allowed kilometers.
              </p>
              <p>
                <span class="font-semibold">5. Review Results:</span> Check the "Final Comparison"
                tab to see the recommendation and detailed cost breakdown.
              </p>
            </div>
          </section>

          <!-- Key Concepts -->
          <section>
            <h3
              class="text-xl font-bold mb-3 text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
            >
              <Icon icon="mdi:book-open-variant" class="text-sky-600" />
              Key Concepts
            </h3>
            <div class="space-y-4">
              <div
                class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <h4 class="font-semibold mb-2 text-gray-800 dark:text-gray-200">Repairs Factor</h4>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Automatically calculates major repairs and tyre replacement costs based on:
                  <span class="font-semibold"
                    >(Annual Insurance + Annual Service & Maintenance) × Factor</span
                  >
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                  • 70% goes to Major Repairs (typically in later years)<br />
                  • 30% goes to Tyre Replacement<br />
                  • Default factor: 0.45 (45% of insurance + maintenance)
                </p>
              </div>

              <div
                class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <h4 class="font-semibold mb-2 text-gray-800 dark:text-gray-200">Depreciation</h4>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Represents how much your car's value decreases over time. Affects the final resale
                  value and net ownership cost.
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                  • <span class="font-semibold">Straight-Line:</span> Constant depreciation each
                  year (standard: 15% per year)<br />
                  • <span class="font-semibold">Accelerated:</span> Higher depreciation in early
                  years<br />
                  • <span class="font-semibold">Custom:</span> User-defined depreciation pattern<br />
                  • <span class="font-semibold">None:</span> No depreciation (car retains value)
                </p>
              </div>

              <div
                class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <h4 class="font-semibold mb-2 text-gray-800 dark:text-gray-200">
                  Return on Invested Capital
                </h4>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  If you lease instead of buying, you can invest the money you would have spent on
                  the car. This represents the annual return rate you'd earn on that investment.
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                  • Default: 7% (conservative estimate for fixed deposits/mutual funds)<br />
                  • This investment gain reduces the net cost of leasing<br />
                  • Higher return rates make leasing more attractive financially
                </p>
              </div>

              <div
                class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <h4 class="font-semibold mb-2 text-gray-800 dark:text-gray-200">
                  Effective Tax Rate
                </h4>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Your income tax rate that applies to lease EMI deductions. This determines how
                  much tax you save when leasing.
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                  • <span class="font-semibold">Tax Saving Formula:</span> (Annual Lease EMI ×
                  Effective Tax Rate) - Other Tax Deductions<br />
                  • Default: 30% (highest tax bracket in India)<br />
                  • Only applicable to lease option (owned car has no tax benefit)<br />
                  • Higher tax rates make leasing more attractive
                </p>
              </div>
            </div>
          </section>

          <!-- Tips & Best Practices -->
          <section>
            <h3
              class="text-xl font-bold mb-3 text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
            >
              <Icon icon="mdi:lightbulb-on" class="text-sky-600" />
              Tips & Best Practices
            </h3>
            <div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p class="flex items-start gap-2">
                <Icon icon="mdi:check-circle" class="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Use the car selector to auto-fill car specifications from the database</span>
              </p>
              <p class="flex items-start gap-2">
                <Icon icon="mdi:check-circle" class="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Save multiple templates to compare different scenarios side-by-side</span>
              </p>
              <p class="flex items-start gap-2">
                <Icon icon="mdi:check-circle" class="text-green-600 mt-0.5 flex-shrink-0" />
                <span
                  >Look for green checkmarks (✓) to confirm values are within typical ranges</span
                >
              </p>
              <p class="flex items-start gap-2">
                <Icon icon="mdi:check-circle" class="text-green-600 mt-0.5 flex-shrink-0" />
                <span
                  >Yellow warning icons (⚠) indicate values outside typical ranges - review if
                  needed</span
                >
              </p>
              <p class="flex items-start gap-2">
                <Icon icon="mdi:check-circle" class="text-green-600 mt-0.5 flex-shrink-0" />
                <span
                  >Click the <Icon icon="mdi:help-circle" class="inline text-sky-600" /> icon next
                  to complex fields for detailed explanations</span
                >
              </p>
              <p class="flex items-start gap-2">
                <Icon icon="mdi:check-circle" class="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Export your calculations to PDF for sharing or record-keeping</span>
              </p>
            </div>
          </section>

          <!-- Example Scenarios -->
          <section>
            <h3
              class="text-xl font-bold mb-3 text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
            >
              <Icon icon="mdi:chart-line" class="text-sky-600" />
              Example Scenarios
            </h3>
            <div class="space-y-3 text-sm">
              <div
                class="p-3 bg-gray-50 dark:bg-slate-800/50 rounded border border-gray-200 dark:border-slate-700"
              >
                <p class="font-semibold mb-1 text-gray-800 dark:text-gray-200">
                  City Commuter (Low Mileage)
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  Annual Distance: 8,000-12,000 km | Mileage: 12-18 km/L | Analysis Period: 5 years
                </p>
              </div>
              <div
                class="p-3 bg-gray-50 dark:bg-slate-800/50 rounded border border-gray-200 dark:border-slate-700"
              >
                <p class="font-semibold mb-1 text-gray-800 dark:text-gray-200">
                  Highway Traveler (High Mileage)
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  Annual Distance: 25,000-40,000 km | Mileage: 15-20 km/L | Analysis Period: 5-7
                  years
                </p>
              </div>
              <div
                class="p-3 bg-gray-50 dark:bg-slate-800/50 rounded border border-gray-200 dark:border-slate-700"
              >
                <p class="font-semibold mb-1 text-gray-800 dark:text-gray-200">
                  Business Use (Tax Benefits)
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  High tax bracket (30%) | Multiple lease options | Focus on tax savings
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <CommonToast />
  </div>
</template>
