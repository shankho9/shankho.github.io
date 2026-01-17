<template>
  <div class="space-y-6 w-full max-w-full overflow-x-hidden">
    <!-- Header Actions -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
      <div class="flex flex-wrap gap-2">
        <button
          class="p-2.5 sm:p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors touch-manipulation min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
          title="Add Car Variant"
          @click="openAddModal"
        >
          <Icon name="mdi:plus" size="20" />
        </button>
        <button
          :disabled="isExporting"
          class="p-2.5 sm:p-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors touch-manipulation min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
          :title="isExporting ? 'Exporting...' : 'Export CSV'"
          @click="exportToCSV"
        >
          <Icon name="mdi:download" size="20" />
        </button>
        <button
          class="p-2.5 sm:p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors touch-manipulation min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
          title="Download CSV Template"
          @click="downloadTemplate"
        >
          <Icon name="mdi:file-document-outline" size="20" />
        </button>
        <label
          class="p-2.5 sm:p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors touch-manipulation min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
          title="Import CSV"
        >
          <Icon name="mdi:upload" size="20" />
          <input type="file" accept=".csv,text/csv" class="hidden" @change="importFromCSV" />
        </label>
        <button
          :disabled="isLoading"
          class="p-2.5 sm:p-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors touch-manipulation min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
          :title="isLoading ? 'Loading...' : 'Refresh Data'"
          @click="loadAllData"
        >
          <Icon name="mdi:refresh" :class="{ 'animate-spin': isLoading }" size="20" />
        </button>
      </div>
    </div>

    <!-- Search and Filter -->
    <div class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          class="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px] sm:min-h-0"
          placeholder="Search by manufacturer, model, or variant..."
        />
      </div>
      <button
        v-if="searchQuery"
        class="px-4 py-2.5 sm:py-2 text-sm font-medium bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors touch-manipulation min-h-[44px] sm:min-h-0 whitespace-nowrap"
        @click="searchQuery = ''"
      >
        Clear
      </button>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
      >
        <div class="flex items-center gap-2 mb-1">
          <Icon name="mdi:factory" class="text-blue-600 dark:text-blue-400" />
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Manufacturers</span>
        </div>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ uniqueManufacturers.length }}
        </p>
      </div>
      <div
        class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800"
      >
        <div class="flex items-center gap-2 mb-1">
          <Icon name="mdi:car" class="text-green-600 dark:text-green-400" />
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Models</span>
        </div>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ uniqueModels.length }}</p>
      </div>
      <div
        class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800"
      >
        <div class="flex items-center gap-2 mb-1">
          <Icon name="mdi:car-multiple" class="text-purple-600 dark:text-purple-400" />
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Variants</span>
        </div>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ filteredData.length }}</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8 text-gray-500 dark:text-gray-400">
      <Icon name="mdi:loading" class="animate-spin text-4xl mb-2" />
      <p>Loading car data...</p>
    </div>

    <!-- Empty State -->
    <div
      v-if="!isLoading && carData.length === 0"
      class="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
    >
      <Icon name="mdi:car-off" class="text-6xl text-gray-400 mb-4" />
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-2">No car data found</p>
      <p class="text-sm text-gray-500 dark:text-gray-500">Import a CSV file or add data manually</p>
    </div>

    <!-- No Results -->
    <div
      v-else-if="!isLoading && carData.length > 0 && filteredData.length === 0"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      No results match your search criteria.
    </div>

    <!-- Data Table - Mobile and Desktop Layouts -->
    <template v-else-if="!isLoading && filteredData.length > 0">
      <!-- Mobile Card Layout -->
      <div class="block sm:hidden space-y-3">
        <div
          v-for="item in filteredData"
          :key="`${item.manufacturer_id}-${item.model_id}-${item.variant_id}`"
          class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-3"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h4 class="font-semibold text-sm text-gray-900 dark:text-gray-100 break-words">
                {{ item.manufacturer_name }} {{ item.model_name }}
              </h4>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {{ item.variant_name }}
              </p>
            </div>
            <div class="flex items-center gap-2 ml-2 flex-shrink-0">
              <button
                v-if="editingVariantId !== item.variant_id"
                class="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 touch-manipulation"
                title="Edit variant"
                @click.stop="startEdit(item)"
              >
                <Icon name="mdi:pencil" size="18" />
              </button>
              <button
                v-if="editingVariantId !== item.variant_id"
                class="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20 touch-manipulation"
                title="Delete variant"
                @click.stop="confirmDelete(item)"
              >
                <Icon name="mdi:delete-outline" size="18" />
              </button>
              <div v-else class="flex items-center gap-1.5">
                <button
                  :disabled="isSaving"
                  class="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20 touch-manipulation"
                  title="Save changes"
                  @click.stop="saveEdit(item.variant_id)"
                >
                  <Icon name="mdi:check" size="18" />
                </button>
                <button
                  class="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors rounded hover:bg-gray-50 dark:hover:bg-gray-900/20 touch-manipulation"
                  title="Cancel editing"
                  @click.stop="cancelEdit"
                >
                  <Icon name="mdi:close" size="18" />
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-gray-500 dark:text-gray-400">Fuel Type:</span>
              <div
                v-if="editingVariantId !== item.variant_id"
                class="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors mt-1"
                @click="startEdit(item)"
              >
                {{ item.fuel_type || 'N/A' }}
              </div>
              <input
                v-else
                v-model="editForms[item.variant_id].fuel_type"
                type="text"
                class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 mt-1"
              />
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Price:</span>
              <div
                v-if="editingVariantId !== item.variant_id"
                class="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors mt-1"
                @click="startEdit(item)"
              >
                {{
                  item.price_ex_showroom_inr
                    ? `₹${item.price_ex_showroom_inr.toLocaleString()}`
                    : 'N/A'
                }}
              </div>
              <input
                v-else
                v-model.number="editForms[item.variant_id].price_ex_showroom_inr"
                type="number"
                min="0"
                class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 mt-1"
              />
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Mileage:</span>
              <div
                v-if="editingVariantId !== item.variant_id"
                class="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors mt-1"
                @click="startEdit(item)"
              >
                {{ item.mileage_kmpl ? `${item.mileage_kmpl} kmpl` : 'N/A' }}
              </div>
              <input
                v-else
                v-model.number="editForms[item.variant_id].mileage_kmpl"
                type="number"
                step="0.1"
                min="0"
                class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 mt-1"
              />
            </div>
          </div>
        </div>
      </div>
      <!-- Desktop Table Layout -->
      <div class="hidden sm:block overflow-x-auto">
        <div class="inline-block min-w-full align-middle">
          <table class="min-w-full text-sm border rounded-lg dark:border-slate-700">
            <thead class="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th
                  class="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none transition-colors"
                  @click="sortBy('manufacturer')"
                >
                  <div class="flex items-center gap-1.5">
                    Manufacturer
                    <Icon
                      :name="
                        sortColumn === 'manufacturer'
                          ? sortDirection === 'asc'
                            ? 'mdi:chevron-up'
                            : 'mdi:chevron-down'
                          : 'mdi:unfold-more-horizontal'
                      "
                      size="16"
                      class="text-gray-400"
                    />
                  </div>
                </th>
                <th
                  class="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none transition-colors"
                  @click="sortBy('model')"
                >
                  <div class="flex items-center gap-1.5">
                    Model
                    <Icon
                      :name="
                        sortColumn === 'model'
                          ? sortDirection === 'asc'
                            ? 'mdi:chevron-up'
                            : 'mdi:chevron-down'
                          : 'mdi:unfold-more-horizontal'
                      "
                      size="16"
                      class="text-gray-400"
                    />
                  </div>
                </th>
                <th
                  class="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none transition-colors"
                  @click="sortBy('variant')"
                >
                  <div class="flex items-center gap-1.5">
                    Variant
                    <Icon
                      :name="
                        sortColumn === 'variant'
                          ? sortDirection === 'asc'
                            ? 'mdi:chevron-up'
                            : 'mdi:chevron-down'
                          : 'mdi:unfold-more-horizontal'
                      "
                      size="16"
                      class="text-gray-400"
                    />
                  </div>
                </th>
                <th
                  class="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                >
                  Fuel Type
                </th>
                <th
                  class="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                >
                  Price (INR)
                </th>
                <th
                  class="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                >
                  Mileage
                </th>
                <th
                  class="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-24"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              class="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700"
            >
              <tr
                v-for="item in filteredData"
                :key="`${item.manufacturer_id}-${item.model_id}-${item.variant_id}`"
                class="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <td class="px-3 py-3">
                  <div
                    v-if="editingVariantId !== item.variant_id"
                    class="font-medium text-sm text-gray-900 dark:text-gray-100"
                  >
                    {{ item.manufacturer_name }}
                  </div>
                  <input
                    v-else
                    v-model="editForms[item.variant_id].manufacturer_name"
                    type="text"
                    class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600"
                    disabled
                  />
                </td>
                <td class="px-3 py-3">
                  <div
                    v-if="editingVariantId !== item.variant_id"
                    class="text-sm text-gray-900 dark:text-gray-100"
                  >
                    {{ item.model_name }}
                  </div>
                  <input
                    v-else
                    v-model="editForms[item.variant_id].model_name"
                    type="text"
                    class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600"
                    disabled
                  />
                </td>
                <td class="px-3 py-3">
                  <div
                    v-if="editingVariantId !== item.variant_id"
                    class="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    @click="startEdit(item)"
                  >
                    {{ item.variant_name }}
                  </div>
                  <input
                    v-else
                    v-model="editForms[item.variant_id].variant_name"
                    type="text"
                    class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td class="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">
                  <div
                    v-if="editingVariantId !== item.variant_id"
                    class="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    @click="startEdit(item)"
                  >
                    {{ item.fuel_type || 'N/A' }}
                  </div>
                  <input
                    v-else
                    v-model="editForms[item.variant_id].fuel_type"
                    type="text"
                    class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="Petrol, Diesel, etc."
                  />
                </td>
                <td class="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">
                  <div
                    v-if="editingVariantId !== item.variant_id"
                    class="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    @click="startEdit(item)"
                  >
                    {{
                      item.price_ex_showroom_inr
                        ? `₹${item.price_ex_showroom_inr.toLocaleString()}`
                        : 'N/A'
                    }}
                  </div>
                  <input
                    v-else
                    v-model.number="editForms[item.variant_id].price_ex_showroom_inr"
                    type="number"
                    min="0"
                    class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="Price"
                  />
                </td>
                <td class="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">
                  <div
                    v-if="editingVariantId !== item.variant_id"
                    class="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    @click="startEdit(item)"
                  >
                    {{ item.mileage_kmpl ? `${item.mileage_kmpl} kmpl` : 'N/A' }}
                  </div>
                  <input
                    v-else
                    v-model.number="editForms[item.variant_id].mileage_kmpl"
                    type="number"
                    step="0.1"
                    min="0"
                    class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="Mileage"
                  />
                </td>
                <td class="px-3 py-3">
                  <div
                    v-if="editingVariantId !== item.variant_id"
                    class="flex items-center justify-end gap-1"
                  >
                    <button
                      class="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 touch-manipulation"
                      title="Edit variant"
                      @click.stop="startEdit(item)"
                    >
                      <Icon name="mdi:pencil" size="18" />
                    </button>
                    <button
                      class="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20 touch-manipulation"
                      title="Delete variant"
                      @click.stop="confirmDelete(item)"
                    >
                      <Icon name="mdi:delete-outline" size="18" />
                    </button>
                  </div>
                  <div v-else class="flex items-center justify-end gap-1.5">
                    <button
                      :disabled="isSaving"
                      class="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20 touch-manipulation"
                      title="Save changes"
                      @click.stop="saveEdit(item.variant_id)"
                    >
                      <Icon name="mdi:check" size="18" />
                    </button>
                    <button
                      class="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors rounded hover:bg-gray-50 dark:hover:bg-gray-900/20 touch-manipulation"
                      title="Cancel editing"
                      @click.stop="cancelEdit"
                    >
                      <Icon name="mdi:close" size="18" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Edit Modal for Full Details -->
    <div
      v-if="showEditModal && editingVariantId"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      @click.self="closeEditModal"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Variant Details</h3>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            @click="closeEditModal"
          >
            <Icon name="mdi:close" size="24" />
          </button>
        </div>

        <div v-if="editForms[editingVariantId]" class="space-y-4">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Variant Name *
              </label>
              <input
                v-model="editForms[editingVariantId].variant_name"
                type="text"
                required
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Fuel Type
              </label>
              <input
                v-model="editForms[editingVariantId].fuel_type"
                type="text"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                placeholder="Petrol, Diesel, Electric, etc."
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Engine Displacement (cc)
              </label>
              <input
                v-model.number="editForms[editingVariantId].engine_displacement_cc"
                type="number"
                min="0"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Max Power (PS)
              </label>
              <input
                v-model.number="editForms[editingVariantId].max_power_ps"
                type="number"
                min="0"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Max Torque (Nm)
              </label>
              <input
                v-model.number="editForms[editingVariantId].max_torque_nm"
                type="number"
                min="0"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Transmission Type
              </label>
              <input
                v-model="editForms[editingVariantId].transmission_type"
                type="text"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                placeholder="Manual, Automatic, etc."
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Transmission Speeds
              </label>
              <input
                v-model.number="editForms[editingVariantId].transmission_speeds"
                type="number"
                min="0"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Mileage (kmpl)
              </label>
              <input
                v-model.number="editForms[editingVariantId].mileage_kmpl"
                type="number"
                step="0.1"
                min="0"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Seating Capacity
              </label>
              <input
                v-model.number="editForms[editingVariantId].seating_capacity"
                type="number"
                min="2"
                max="10"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Price Ex-Showroom (INR)
              </label>
              <input
                v-model.number="editForms[editingVariantId].price_ex_showroom_inr"
                type="number"
                min="0"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Price On-Road (INR)
              </label>
              <input
                v-model.number="editForms[editingVariantId].price_on_road_inr"
                type="number"
                min="0"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Dimensions -->
          <div class="border-t border-gray-200 dark:border-slate-700 pt-4">
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Dimensions</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Length (mm)
                </label>
                <input
                  v-model.number="editForms[editingVariantId].length_mm"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Width (mm)
                </label>
                <input
                  v-model.number="editForms[editingVariantId].width_mm"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Height (mm)
                </label>
                <input
                  v-model.number="editForms[editingVariantId].height_mm"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Wheelbase (mm)
                </label>
                <input
                  v-model.number="editForms[editingVariantId].wheelbase_mm"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Ground Clearance (mm)
                </label>
                <input
                  v-model.number="editForms[editingVariantId].ground_clearance_mm"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Boot Space (liters)
                </label>
                <input
                  v-model.number="editForms[editingVariantId].boot_space_liters"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Fuel Tank Capacity (liters)
                </label>
                <input
                  v-model.number="editForms[editingVariantId].fuel_tank_capacity_liters"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              @click="closeEditModal"
            >
              Cancel
            </button>
            <button
              :disabled="isSaving"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              @click="saveEdit(editingVariantId)"
            >
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="deleteConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="deleteConfirm = null"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">Confirm Delete</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete
          <strong
            >{{ deleteConfirm?.manufacturer_name }} {{ deleteConfirm?.model_name }}
            {{ deleteConfirm?.variant_name }}</strong
          >? This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            @click="deleteConfirm = null"
          >
            Cancel
          </button>
          <button
            :disabled="isDeleting"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            @click="deleteVariant(deleteConfirm.variant_id)"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Car Variant Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      @click.self="closeAddModal"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">Add New Car Variant</h3>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            @click="closeAddModal"
          >
            <Icon name="mdi:close" size="24" />
          </button>
        </div>

        <div class="space-y-4">
          <!-- Manufacturer Selection -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Manufacturer *
              </label>
              <select
                v-model="addForm.manufacturer_id"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                @change="onManufacturerChange"
              >
                <option :value="null">Select Manufacturer</option>
                <option v-for="mfr in manufacturers" :key="mfr.id" :value="mfr.id">
                  {{ mfr.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Or Create New Manufacturer
              </label>
              <div class="flex gap-2">
                <input
                  v-model="newManufacturer.name"
                  type="text"
                  class="flex-1 px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Manufacturer name"
                />
                <button
                  class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  @click="createManufacturer"
                >
                  Create
                </button>
              </div>
            </div>
          </div>

          <!-- Model Selection -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Model *
              </label>
              <select
                v-model="addForm.model_id"
                :disabled="!addForm.manufacturer_id"
                class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option :value="null">Select Model</option>
                <option v-for="model in availableModels" :key="model.id" :value="model.id">
                  {{ model.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Or Create New Model
              </label>
              <div class="flex gap-2">
                <input
                  v-model="newModel.name"
                  :disabled="!addForm.manufacturer_id"
                  type="text"
                  class="flex-1 px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Model name"
                />
                <button
                  :disabled="!addForm.manufacturer_id"
                  class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="createModel"
                >
                  Create
                </button>
              </div>
            </div>
          </div>

          <!-- Variant Details -->
          <div class="border-t border-gray-200 dark:border-slate-700 pt-4">
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Variant Details
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Variant Name *
                </label>
                <input
                  v-model="addForm.variant_name"
                  type="text"
                  required
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Fuel Type
                </label>
                <input
                  v-model="addForm.fuel_type"
                  type="text"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Petrol, Diesel, Electric, etc."
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Engine Displacement (cc)
                </label>
                <input
                  v-model.number="addForm.engine_displacement_cc"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Max Power (PS)
                </label>
                <input
                  v-model.number="addForm.max_power_ps"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Max Torque (Nm)
                </label>
                <input
                  v-model.number="addForm.max_torque_nm"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Transmission Type
                </label>
                <input
                  v-model="addForm.transmission_type"
                  type="text"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Manual, Automatic, etc."
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Transmission Speeds
                </label>
                <input
                  v-model.number="addForm.transmission_speeds"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Mileage (kmpl)
                </label>
                <input
                  v-model.number="addForm.mileage_kmpl"
                  type="number"
                  step="0.1"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Seating Capacity
                </label>
                <input
                  v-model.number="addForm.seating_capacity"
                  type="number"
                  min="2"
                  max="10"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Price Ex-Showroom (INR)
                </label>
                <input
                  v-model.number="addForm.price_ex_showroom_inr"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Price On-Road (INR)
                </label>
                <input
                  v-model.number="addForm.price_on_road_inr"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <!-- Dimensions -->
            <div class="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
              <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Dimensions
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Length (mm)
                  </label>
                  <input
                    v-model.number="addForm.length_mm"
                    type="number"
                    min="0"
                    class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Width (mm)
                  </label>
                  <input
                    v-model.number="addForm.width_mm"
                    type="number"
                    min="0"
                    class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Height (mm)
                  </label>
                  <input
                    v-model.number="addForm.height_mm"
                    type="number"
                    min="0"
                    class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Wheelbase (mm)
                  </label>
                  <input
                    v-model.number="addForm.wheelbase_mm"
                    type="number"
                    min="0"
                    class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Ground Clearance (mm)
                  </label>
                  <input
                    v-model.number="addForm.ground_clearance_mm"
                    type="number"
                    min="0"
                    class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Boot Space (liters)
                  </label>
                  <input
                    v-model.number="addForm.boot_space_liters"
                    type="number"
                    min="0"
                    class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Fuel Tank Capacity (liters)
                  </label>
                  <input
                    v-model.number="addForm.fuel_tank_capacity_liters"
                    type="number"
                    min="0"
                    class="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              @click="closeAddModal"
            >
              Cancel
            </button>
            <button
              :disabled="isAdding"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              @click="saveNewVariant"
            >
              {{ isAdding ? 'Adding...' : 'Add Variant' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'

const { showToast } = useToast()

interface CarData {
  manufacturer_id: number
  manufacturer_name: string
  manufacturer_country: string
  manufacturer_logo_url: string | null
  model_id: number
  model_name: string
  model_body_type: string | null
  model_segment: string | null
  model_launch_year: number | null
  model_image_url: string | null
  variant_id: number
  variant_name: string
  fuel_type: string | null
  engine_displacement_cc: number | null
  max_power_ps: number | null
  max_torque_nm: number | null
  transmission_type: string | null
  transmission_speeds: number | null
  mileage_kmpl: number | null
  seating_capacity: number
  price_ex_showroom_inr: number | null
  price_on_road_inr: number | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  wheelbase_mm: number | null
  ground_clearance_mm: number | null
  boot_space_liters: number | null
  fuel_tank_capacity_liters: number | null
}

interface EditForm {
  manufacturer_id: number
  manufacturer_name: string
  model_id: number
  model_name: string
  variant_name: string
  fuel_type: string | null
  engine_displacement_cc: number | null
  max_power_ps: number | null
  max_torque_nm: number | null
  transmission_type: string | null
  transmission_speeds: number | null
  mileage_kmpl: number | null
  seating_capacity: number
  price_ex_showroom_inr: number | null
  price_on_road_inr: number | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  wheelbase_mm: number | null
  ground_clearance_mm: number | null
  boot_space_liters: number | null
  fuel_tank_capacity_liters: number | null
}

const carData = ref<CarData[]>([])
const isLoading = ref(false)
const isExporting = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const isAdding = ref(false)
const searchQuery = ref('')
const sortColumn = ref<'manufacturer' | 'model' | 'variant' | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')
const editingVariantId = ref<number | null>(null)
const showEditModal = ref(false)
const showAddModal = ref(false)
const editForms = ref<Record<number, EditForm>>({})
const deleteConfirm = ref<CarData | null>(null)

interface Manufacturer {
  id: number
  name: string
  country: string
  logo_url: string | null
}

interface Model {
  id: number
  manufacturer_id: number
  name: string
  body_type: string | null
  segment: string | null
  launch_year: number | null
  image_url: string | null
}

const manufacturers = ref<Manufacturer[]>([])
const models = ref<Model[]>([])
const newManufacturer = ref({ name: '', country: 'India' })
const newModel = ref({ name: '', body_type: '', segment: '', launch_year: null as number | null })

const addForm = ref({
  manufacturer_id: null as number | null,
  model_id: null as number | null,
  variant_name: '',
  fuel_type: null as string | null,
  engine_displacement_cc: null as number | null,
  max_power_ps: null as number | null,
  max_torque_nm: null as number | null,
  transmission_type: null as string | null,
  transmission_speeds: null as number | null,
  mileage_kmpl: null as number | null,
  seating_capacity: 5,
  price_ex_showroom_inr: null as number | null,
  price_on_road_inr: null as number | null,
  length_mm: null as number | null,
  width_mm: null as number | null,
  height_mm: null as number | null,
  wheelbase_mm: null as number | null,
  ground_clearance_mm: null as number | null,
  boot_space_liters: null as number | null,
  fuel_tank_capacity_liters: null as number | null,
})

const availableModels = computed(() => {
  if (!addForm.value.manufacturer_id) {
    return []
  }
  return models.value.filter((m) => m.manufacturer_id === addForm.value.manufacturer_id)
})

const uniqueManufacturers = computed(() => {
  const manufacturers = new Set(carData.value.map((item) => item.manufacturer_id))
  return Array.from(manufacturers)
})

const uniqueModels = computed(() => {
  const models = new Set(carData.value.map((item) => `${item.manufacturer_id}-${item.model_id}`))
  return Array.from(models)
})

const filteredData = computed(() => {
  let result = [...carData.value]

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter((item) => {
      return (
        item.manufacturer_name.toLowerCase().includes(query) ||
        item.model_name.toLowerCase().includes(query) ||
        item.variant_name.toLowerCase().includes(query) ||
        (item.fuel_type && item.fuel_type.toLowerCase().includes(query))
      )
    })
  }

  // Apply sorting
  if (sortColumn.value) {
    result.sort((a, b) => {
      let aValue: string
      let bValue: string

      switch (sortColumn.value) {
        case 'manufacturer':
          aValue = a.manufacturer_name.toLowerCase()
          bValue = b.manufacturer_name.toLowerCase()
          break
        case 'model':
          aValue = a.model_name.toLowerCase()
          bValue = b.model_name.toLowerCase()
          break
        case 'variant':
          aValue = a.variant_name.toLowerCase()
          bValue = b.variant_name.toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) {
        return sortDirection.value === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortDirection.value === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  return result
})

const sortBy = (column: 'manufacturer' | 'model' | 'variant') => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

const loadAllData = async () => {
  isLoading.value = true
  try {
    const response = await $fetch<{ success: boolean; data: CarData[] }>('/api/cars/all')

    if (response) {
      // Handle both direct array response and wrapped response
      if (Array.isArray(response)) {
        carData.value = response
      } else if (response.success && Array.isArray(response.data)) {
        carData.value = response.data
      } else if (response.data && Array.isArray(response.data)) {
        carData.value = response.data
      } else {
        showToast('Failed to load car data: Unexpected response format', 'error')
        carData.value = []
        return
      }

      if (carData.value.length > 0) {
        showToast(`Car data loaded successfully (${carData.value.length} items)`, 'success')
      } else {
        showToast('No car data found in database', 'info')
      }
    } else {
      showToast('Failed to load car data: No response', 'error')
      carData.value = []
    }
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error)
    showToast(`Failed to load car data: ${errorDetails}`, 'error')
    carData.value = []
  } finally {
    isLoading.value = false
  }
}

const startEdit = (item: CarData) => {
  editingVariantId.value = item.variant_id
  showEditModal.value = true
  editForms.value[item.variant_id] = {
    manufacturer_id: item.manufacturer_id,
    manufacturer_name: item.manufacturer_name,
    model_id: item.model_id,
    model_name: item.model_name,
    variant_name: item.variant_name,
    fuel_type: item.fuel_type,
    engine_displacement_cc: item.engine_displacement_cc,
    max_power_ps: item.max_power_ps,
    max_torque_nm: item.max_torque_nm,
    transmission_type: item.transmission_type,
    transmission_speeds: item.transmission_speeds,
    mileage_kmpl: item.mileage_kmpl,
    seating_capacity: item.seating_capacity,
    price_ex_showroom_inr: item.price_ex_showroom_inr,
    price_on_road_inr: item.price_on_road_inr,
    length_mm: item.length_mm,
    width_mm: item.width_mm,
    height_mm: item.height_mm,
    wheelbase_mm: item.wheelbase_mm,
    ground_clearance_mm: item.ground_clearance_mm,
    boot_space_liters: item.boot_space_liters,
    fuel_tank_capacity_liters: item.fuel_tank_capacity_liters,
  }
}

const closeEditModal = () => {
  showEditModal.value = false
  if (editingVariantId.value) {
    const { [editingVariantId.value]: _, ...rest } = editForms.value
    editForms.value = rest
  }
  editingVariantId.value = null
}

const cancelEdit = () => {
  closeEditModal()
}

const saveEdit = async (variantId: number) => {
  isSaving.value = true

  try {
    const editForm = editForms.value[variantId]
    if (!editForm) {
      showToast('Edit form not found', 'error')
      isSaving.value = false
      return
    }

    if (!editForm.variant_name || !editForm.variant_name.trim()) {
      showToast('Variant name is required', 'error')
      isSaving.value = false
      return
    }

    const response = await $fetch<{ success: boolean; variant?: CarData; error?: string }>(
      `/api/cars/variants/${variantId}`,
      {
        method: 'PUT',
        body: {
          variant_name: editForm.variant_name.trim(),
          fuel_type: editForm.fuel_type || null,
          engine_displacement_cc: editForm.engine_displacement_cc ?? null,
          max_power_ps: editForm.max_power_ps ?? null,
          max_torque_nm: editForm.max_torque_nm ?? null,
          transmission_type: editForm.transmission_type || null,
          transmission_speeds: editForm.transmission_speeds ?? null,
          mileage_kmpl: editForm.mileage_kmpl ?? null,
          seating_capacity: editForm.seating_capacity ?? 5,
          price_ex_showroom_inr: editForm.price_ex_showroom_inr ?? null,
          price_on_road_inr: editForm.price_on_road_inr ?? null,
          length_mm: editForm.length_mm ?? null,
          width_mm: editForm.width_mm ?? null,
          height_mm: editForm.height_mm ?? null,
          wheelbase_mm: editForm.wheelbase_mm ?? null,
          ground_clearance_mm: editForm.ground_clearance_mm ?? null,
          boot_space_liters: editForm.boot_space_liters ?? null,
          fuel_tank_capacity_liters: editForm.fuel_tank_capacity_liters ?? null,
        },
      },
    )

    if (response.success) {
      showToast('Variant updated successfully', 'success')
      closeEditModal()
      await loadAllData()
    } else {
      showToast(response.error || 'Failed to update variant', 'error')
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update variant'
    showToast(errorMsg, 'error')
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (item: CarData) => {
  deleteConfirm.value = item
}

const deleteVariant = async (variantId: number) => {
  isDeleting.value = true

  try {
    const response = await $fetch<{ success: boolean; error?: string }>(
      `/api/cars/variants/${variantId}`,
      {
        method: 'DELETE',
      },
    )

    if (response.success) {
      showToast('Variant deleted successfully', 'success')
      deleteConfirm.value = null
      await loadAllData()
    } else {
      showToast(response.error || 'Failed to delete variant', 'error')
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to delete variant'
    showToast(errorMsg, 'error')
  } finally {
    isDeleting.value = false
  }
}

const downloadTemplate = () => {
  // CSV template with headers and example rows
  const headers = [
    'Manufacturer ID',
    'Manufacturer Name',
    'Manufacturer Country',
    'Model ID',
    'Model Name',
    'Body Type',
    'Segment',
    'Launch Year',
    'Variant ID',
    'Variant Name',
    'Fuel Type',
    'Engine Displacement (cc)',
    'Max Power (PS)',
    'Max Torque (Nm)',
    'Transmission Type',
    'Transmission Speeds',
    'Mileage (kmpl)',
    'Seating Capacity',
    'Price Ex-Showroom (INR)',
    'Price On-Road (INR)',
    'Length (mm)',
    'Width (mm)',
    'Height (mm)',
    'Wheelbase (mm)',
    'Ground Clearance (mm)',
    'Boot Space (liters)',
    'Fuel Tank Capacity (liters)',
  ]

  // Example rows with sample data
  const exampleRows = [
    [
      '', // Manufacturer ID (leave empty for new)
      'Tata Motors',
      'India',
      '', // Model ID (leave empty for new)
      'Nexon',
      'SUV',
      'Compact',
      '2017',
      '', // Variant ID (leave empty for new)
      'XZ+',
      'Petrol',
      '1199',
      '120',
      '170',
      'Manual',
      '6',
      '17.4',
      '5',
      '1200000',
      '1400000',
      '3993',
      '1811',
      '1606',
      '2498',
      '209',
      '350',
      '44',
    ],
    [
      '',
      'Tata Motors',
      'India',
      '',
      'Nexon',
      'SUV',
      'Compact',
      '2017',
      '',
      'XZ+ Diesel',
      'Diesel',
      '1497',
      '115',
      '260',
      'Manual',
      '6',
      '21.5',
      '5',
      '1250000',
      '1450000',
      '3993',
      '1811',
      '1606',
      '2498',
      '209',
      '350',
      '44',
    ],
    [
      '',
      'Maruti Suzuki',
      'India',
      '',
      'Swift',
      'Hatchback',
      'Premium',
      '2005',
      '',
      'VDI',
      'Diesel',
      '1248',
      '75',
      '190',
      'Manual',
      '5',
      '28.4',
      '5',
      '650000',
      '750000',
      '3840',
      '1735',
      '1530',
      '2450',
      '170',
      '268',
      '37',
    ],
  ]

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...exampleRows.map((row) =>
      row.map((cell) => (cell.includes(',') ? `"${cell}"` : cell)).join(','),
    ),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', 'car-data-template.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  showToast('CSV template downloaded successfully', 'success')
}

const exportToCSV = async () => {
  isExporting.value = true
  try {
    const csv = await $fetch<string>('/api/cars/export-csv')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `car-database-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('CSV exported successfully', 'success')
  } catch {
    showToast('Failed to export CSV', 'error')
  } finally {
    isExporting.value = false
  }
}

const importFromCSV = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch<{
      success: boolean
      imported: number
      updated: number
      errors?: string[]
      message: string
    }>('/api/cars/import-csv', {
      method: 'POST',
      body: formData,
    })

    if (response.success) {
      showToast(response.message, 'success')
      await loadAllData()
    } else {
      showToast('Failed to import CSV', 'error')
    }
  } catch {
    showToast('Failed to import CSV', 'error')
  } finally {
    // Reset file input
    input.value = ''
  }
}

const loadManufacturers = async () => {
  try {
    const response = await $fetch<{ success: boolean; manufacturers: Manufacturer[] }>(
      '/api/cars/manufacturers',
    )
    if (response.success) {
      manufacturers.value = response.manufacturers
    }
  } catch {
    // Silently fail - manufacturers dropdown will be empty
  }
}

const loadModels = async () => {
  try {
    const response = await $fetch<{ success: boolean; models: Model[] }>('/api/cars/models')
    if (response.success) {
      models.value = response.models
    }
  } catch {
    // Silently fail - models dropdown will be empty
  }
}

const onManufacturerChange = () => {
  addForm.value.model_id = null
  newModel.value.name = ''
}

const createManufacturer = async () => {
  if (!newManufacturer.value.name.trim()) {
    showToast('Manufacturer name is required', 'error')
    return
  }

  try {
    const response = await $fetch<{ success: boolean; manufacturer: Manufacturer }>(
      '/api/cars/manufacturers',
      {
        method: 'POST',
        body: {
          name: newManufacturer.value.name.trim(),
          country: newManufacturer.value.country || 'India',
        },
      },
    )

    if (response.success) {
      showToast('Manufacturer created successfully', 'success')
      await loadManufacturers()
      addForm.value.manufacturer_id = response.manufacturer.id
      newManufacturer.value = { name: '', country: 'India' }
    }
  } catch (error) {
    const errorMessage =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Failed to create manufacturer'
    showToast(errorMessage, 'error')
  }
}

const createModel = async () => {
  if (!newModel.value.name.trim()) {
    showToast('Model name is required', 'error')
    return
  }

  if (!addForm.value.manufacturer_id) {
    showToast('Please select a manufacturer first', 'error')
    return
  }

  try {
    const response = await $fetch<{ success: boolean; model: Model }>('/api/cars/models', {
      method: 'POST',
      body: {
        manufacturer_id: addForm.value.manufacturer_id,
        name: newModel.value.name.trim(),
        body_type: newModel.value.body_type || null,
        segment: newModel.value.segment || null,
        launch_year: newModel.value.launch_year ?? null,
      },
    })

    if (response.success) {
      showToast('Model created successfully', 'success')
      await loadModels()
      addForm.value.model_id = response.model.id
      newModel.value = { name: '', body_type: '', segment: '', launch_year: null }
    }
  } catch (error) {
    const errorMessage =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Failed to create model'
    showToast(errorMessage, 'error')
  }
}

const openAddModal = () => {
  showAddModal.value = true
  addForm.value = {
    manufacturer_id: null,
    model_id: null,
    variant_name: '',
    fuel_type: null,
    engine_displacement_cc: null,
    max_power_ps: null,
    max_torque_nm: null,
    transmission_type: null,
    transmission_speeds: null,
    mileage_kmpl: null,
    seating_capacity: 5,
    price_ex_showroom_inr: null,
    price_on_road_inr: null,
    length_mm: null,
    width_mm: null,
    height_mm: null,
    wheelbase_mm: null,
    ground_clearance_mm: null,
    boot_space_liters: null,
    fuel_tank_capacity_liters: null,
  }
  newManufacturer.value = { name: '', country: 'India' }
  newModel.value = { name: '', body_type: '', segment: '', launch_year: null }
}

const closeAddModal = () => {
  showAddModal.value = false
}

const saveNewVariant = async () => {
  if (!addForm.value.model_id || !addForm.value.variant_name?.trim()) {
    showToast('Model and variant name are required', 'error')
    return
  }

  isAdding.value = true

  try {
    const response = await $fetch<{ success: boolean; variant?: CarData; error?: string }>(
      '/api/cars/variants',
      {
        method: 'POST',
        body: {
          model_id: addForm.value.model_id,
          variant_name: addForm.value.variant_name.trim(),
          fuel_type: addForm.value.fuel_type || null,
          engine_displacement_cc: addForm.value.engine_displacement_cc ?? null,
          max_power_ps: addForm.value.max_power_ps ?? null,
          max_torque_nm: addForm.value.max_torque_nm ?? null,
          transmission_type: addForm.value.transmission_type || null,
          transmission_speeds: addForm.value.transmission_speeds ?? null,
          mileage_kmpl: addForm.value.mileage_kmpl ?? null,
          seating_capacity: addForm.value.seating_capacity ?? 5,
          price_ex_showroom_inr: addForm.value.price_ex_showroom_inr ?? null,
          price_on_road_inr: addForm.value.price_on_road_inr ?? null,
          length_mm: addForm.value.length_mm ?? null,
          width_mm: addForm.value.width_mm ?? null,
          height_mm: addForm.value.height_mm ?? null,
          wheelbase_mm: addForm.value.wheelbase_mm ?? null,
          ground_clearance_mm: addForm.value.ground_clearance_mm ?? null,
          boot_space_liters: addForm.value.boot_space_liters ?? null,
          fuel_tank_capacity_liters: addForm.value.fuel_tank_capacity_liters ?? null,
        },
      },
    )

    if (response.success) {
      showToast('Variant added successfully', 'success')
      closeAddModal()
      await loadAllData()
    } else {
      showToast(response.error || 'Failed to add variant', 'error')
    }
  } catch (error) {
    const errorMsg =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Failed to add variant'
    showToast(errorMsg, 'error')
  } finally {
    isAdding.value = false
  }
}

onMounted(() => {
  loadAllData()
  loadManufacturers()
  loadModels()
})
</script>
