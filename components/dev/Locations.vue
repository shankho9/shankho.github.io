<template>
  <div class="space-y-6 w-full max-w-full overflow-x-hidden">
    <!-- Authentication Required Message -->
    <div v-if="!isAuthenticated" class="mb-4 sm:mb-6">
      <div
        class="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-8 text-center border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        <Icon
          name="mdi:lock"
          class="text-4xl sm:text-6xl text-sky-700 dark:text-sky-400 mb-3 sm:mb-4 mx-auto"
        />
        <h2 class="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-zinc-800 dark:text-zinc-200">
          Authentication Required
        </h2>
        <p class="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mb-4 sm:mb-6 px-2">
          Please sign in with Google to access location manager.
        </p>
        <div id="google-signin-button-locations" class="flex justify-center"></div>
      </div>
    </div>

    <div v-if="isAuthenticated" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <!-- Form Section -->
      <div class="min-w-0">
        <h3 class="text-base font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Add New Location
        </h3>

        <!-- Place Search -->
        <div
          class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
        >
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
            >Search for a Place</label
          >
          <div class="relative w-full">
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              class="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px] sm:min-h-0 max-w-full"
              placeholder="Type a place name (e.g., Paris, France)"
              @input="onSearchInput"
              @focus="onSearchFocus"
            />
            <!-- Loading indicator -->
            <div
              v-if="isSearching && searchSuggestions.length === 0"
              class="absolute z-[9999] w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg p-3 text-center text-xs text-gray-500 dark:text-gray-400"
            >
              Searching...
            </div>
            <!-- Suggestions dropdown -->
            <div
              v-if="searchSuggestions.length > 0"
              class="absolute z-[9999] w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-xl max-h-64 sm:max-h-56 overflow-y-auto"
              style="position: absolute; top: 100%; left: 0"
            >
              <div
                v-for="(suggestion, index) in searchSuggestions"
                :key="index"
                class="px-3 py-3 sm:py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-200 dark:border-slate-700 last:border-b-0 transition-colors touch-manipulation active:bg-blue-100 dark:active:bg-slate-600"
                @click="selectSuggestion(suggestion)"
              >
                <div class="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {{ suggestion.name }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{ suggestion.address }}
                </div>
                <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <span v-if="suggestion.lat !== null && suggestion.lng !== null">
                    {{ suggestion.lat.toFixed(4) }}, {{ suggestion.lng.toFixed(4) }}
                  </span>
                  <span v-else class="text-yellow-600 dark:text-yellow-400">
                    Coordinates not available
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            Search for a place and select from suggestions to auto-fill coordinates
          </p>
        </div>

        <form class="space-y-3" @submit.prevent="submitPlace">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
              >Name *</label
            >
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px] sm:min-h-0"
              placeholder="e.g. Paris, France"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                >Latitude *</label
              >
              <input
                v-model.number="form.lat"
                type="number"
                step="any"
                required
                class="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm font-mono border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px] sm:min-h-0"
                placeholder="e.g. 48.8566"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                >Longitude *</label
              >
              <input
                v-model.number="form.lng"
                type="number"
                step="any"
                required
                class="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm font-mono border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px] sm:min-h-0"
                placeholder="e.g. 2.3522"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
              >Year Visited</label
            >
            <input
              v-model.number="form.year"
              type="number"
              min="1900"
              max="2100"
              class="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px] sm:min-h-0"
              placeholder="e.g. 2024"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
              >Type *</label
            >
            <select
              v-model="form.type"
              required
              class="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px] sm:min-h-0"
            >
              <option disabled value="">Select a type</option>
              <option value="home">Home</option>
              <option value="trip">Trip</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
              >Description</label
            >
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 transition-all resize-none min-h-[80px] sm:min-h-0"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
              >Blog Slug</label
            >
            <input
              v-model="form.blog_slug"
              type="text"
              class="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px] sm:min-h-0"
              placeholder="Optional blog post slug"
            />
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full px-4 py-3 sm:py-2 text-base sm:text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation min-h-[44px] sm:min-h-0"
          >
            {{ isSubmitting ? 'Adding...' : 'Add Location' }}
          </button>

          <div
            v-if="successMessage"
            class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
          >
            <p class="text-green-800 dark:text-green-200">{{ successMessage }}</p>
          </div>

          <div
            v-if="errorMessage"
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <p class="text-red-800 dark:text-red-200">{{ errorMessage }}</p>
          </div>
        </form>
      </div>

      <!-- Map Preview Section -->
      <div class="min-w-0">
        <h3 class="text-base font-semibold mb-3 text-gray-900 dark:text-gray-100">Map Preview</h3>
        <div
          class="border rounded-lg overflow-hidden w-full"
          style="height: 300px; min-height: 300px; max-width: 100%"
        >
          <div ref="mapContainer" class="w-full h-full"></div>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1.5 px-1">
          Search for a place above or enter coordinates to see location on map. Marker will appear
          when coordinates are set.
        </p>
      </div>
    </div>

    <!-- Locations List Section -->
    <div v-if="isAuthenticated" class="mt-4 sm:mt-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
          All Locations ({{ filteredAndSortedLocations.length
          }}{{ locationSearchQuery ? ` of ${locations.length}` : '' }})
        </h3>
        <button
          class="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-base sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0"
          @click="loadLocations"
        >
          Refresh
        </button>
      </div>

      <!-- Search and Sort Controls -->
      <div class="mb-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div class="flex-1">
          <input
            v-model="locationSearchQuery"
            type="text"
            class="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px] sm:min-h-0"
            placeholder="Search locations..."
          />
        </div>
        <button
          v-if="locationSearchQuery"
          class="px-4 py-2.5 sm:py-2 text-sm font-medium bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors touch-manipulation min-h-[44px] sm:min-h-0 whitespace-nowrap"
          @click="locationSearchQuery = ''"
        >
          Clear
        </button>
      </div>

      <div v-if="isLoadingLocations" class="text-center py-8 text-gray-500">
        Loading locations...
      </div>

      <div
        v-else-if="locations.length === 0"
        class="text-center py-8 text-gray-500 dark:text-gray-400"
      >
        No locations added yet. Add your first location above!
      </div>

      <div
        v-else-if="locations.length > 0 && filteredAndSortedLocations.length === 0"
        class="text-center py-8 text-gray-500 dark:text-gray-400"
      >
        No locations match your search criteria.
      </div>

      <!-- Mobile: Card Layout, Desktop: Table Layout -->
      <template v-if="filteredAndSortedLocations.length > 0">
        <div class="block sm:hidden space-y-3">
          <div
            v-for="location in filteredAndSortedLocations"
            :key="location.id"
            class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-3"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-sm text-gray-900 dark:text-gray-100 break-words">
                  {{ location.name }}
                </h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                  {{ location.lat.toFixed(4) }}, {{ location.lng.toFixed(4) }}
                </p>
              </div>
              <div class="flex items-center gap-2 ml-2 flex-shrink-0">
                <button
                  v-if="editingId !== location.id"
                  class="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20 touch-manipulation"
                  title="Delete location"
                  @click.stop="confirmDelete(location)"
                >
                  <Icon name="mdi:delete-outline" size="20" />
                </button>
                <div v-else class="flex items-center gap-1.5">
                  <button
                    :disabled="isSaving"
                    class="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20 touch-manipulation"
                    title="Save changes"
                    @click="saveEdit(location.id)"
                  >
                    <Icon name="mdi:check" size="20" />
                  </button>
                  <button
                    class="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors rounded hover:bg-gray-50 dark:hover:bg-gray-900/20 touch-manipulation"
                    title="Cancel editing"
                    @click="cancelEdit"
                  >
                    <Icon name="mdi:close" size="20" />
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-gray-500 dark:text-gray-400">Type:</span>
                <div
                  v-if="editingId !== location.id"
                  class="cursor-pointer mt-1"
                  @click="startEdit(location)"
                >
                  <span
                    class="px-2 py-0.5 text-xs font-medium rounded-full inline-block"
                    :class="
                      location.type === 'home'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    "
                  >
                    {{ location.type || 'N/A' }}
                  </span>
                </div>
                <select
                  v-else
                  v-model="editForms[location.id].type"
                  class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  <option value="">Select type</option>
                  <option value="home">Home</option>
                  <option value="trip">Trip</option>
                </select>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Year:</span>
                <div
                  v-if="editingId !== location.id"
                  class="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors mt-1"
                  @click="startEdit(location)"
                >
                  {{ location.year || 'N/A' }}
                </div>
                <input
                  v-else
                  v-model.number="editForms[location.id].year"
                  type="number"
                  min="1900"
                  max="2100"
                  class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 mt-1"
                  placeholder="Year"
                />
              </div>
            </div>

            <div>
              <span class="text-gray-500 dark:text-gray-400 text-xs">Description:</span>
              <div
                v-if="editingId !== location.id"
                class="text-xs text-gray-600 dark:text-gray-400 mt-1 break-words cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                :title="location.description || 'Click to add description'"
                @click="startEdit(location)"
              >
                {{ location.description || 'N/A' }}
              </div>
              <textarea
                v-else
                v-model="editForms[location.id].description"
                rows="2"
                class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 resize-none mt-1"
                placeholder="Description"
              />
            </div>
          </div>
        </div>

        <!-- Desktop: Table Layout -->
        <div class="hidden sm:block overflow-x-auto border rounded-lg dark:border-slate-700">
          <div class="inline-block min-w-full align-middle">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th
                    class="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none transition-colors touch-manipulation"
                    @click="sortBy('name')"
                  >
                    <div class="flex items-center gap-1.5">
                      Name
                      <Icon
                        :name="
                          sortColumn === 'name'
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
                    class="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none transition-colors touch-manipulation"
                    @click="sortBy('coordinates')"
                  >
                    <div class="flex items-center gap-1.5">
                      Coordinates
                      <Icon
                        :name="
                          sortColumn === 'coordinates'
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
                    class="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none transition-colors touch-manipulation"
                    @click="sortBy('type')"
                  >
                    <div class="flex items-center gap-1.5">
                      Type
                      <Icon
                        :name="
                          sortColumn === 'type'
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
                    class="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none transition-colors touch-manipulation"
                    @click="sortBy('year')"
                  >
                    <div class="flex items-center gap-1.5">
                      Year
                      <Icon
                        :name="
                          sortColumn === 'year'
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
                    class="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none transition-colors touch-manipulation"
                    @click="sortBy('description')"
                  >
                    <div class="flex items-center gap-1.5">
                      Description
                      <Icon
                        :name="
                          sortColumn === 'description'
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
                    class="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-20 sm:w-16"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                class="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700"
              >
                <tr
                  v-for="location in filteredAndSortedLocations"
                  :key="location.id"
                  class="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td class="px-2 sm:px-3 py-2">
                    <div class="font-medium text-sm text-gray-900 dark:text-gray-100 break-words">
                      {{ location.name }}
                    </div>
                  </td>
                  <td
                    class="px-2 sm:px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-nowrap"
                  >
                    {{ location.lat.toFixed(4) }}, {{ location.lng.toFixed(4) }}
                  </td>
                  <td class="px-2 sm:px-3 py-2">
                    <div
                      v-if="editingId !== location.id"
                      class="cursor-pointer"
                      title="Click to edit"
                      @click="startEdit(location)"
                    >
                      <span
                        class="px-2 py-0.5 text-xs font-medium rounded-full"
                        :class="
                          location.type === 'home'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        "
                      >
                        {{ location.type || 'N/A' }}
                      </span>
                    </div>
                    <select
                      v-else
                      v-model="editForms[location.id].type"
                      class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="home">Home</option>
                      <option value="trip">Trip</option>
                    </select>
                  </td>
                  <td class="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                    <div
                      v-if="editingId !== location.id"
                      class="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Click to edit"
                      @click="startEdit(location)"
                    >
                      {{ location.year || 'N/A' }}
                    </div>
                    <input
                      v-else
                      v-model.number="editForms[location.id].year"
                      type="number"
                      min="1900"
                      max="2100"
                      class="w-20 px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                      placeholder="Year"
                    />
                  </td>
                  <td class="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                    <div
                      v-if="editingId !== location.id"
                      class="max-w-xs truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      :title="location.description || 'Click to add description'"
                      @click="startEdit(location)"
                    >
                      {{ location.description || 'N/A' }}
                    </div>
                    <textarea
                      v-else
                      v-model="editForms[location.id].description"
                      rows="2"
                      class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Description"
                    />
                  </td>
                  <td class="px-2 sm:px-3 py-2">
                    <div
                      v-if="editingId !== location.id"
                      class="flex items-center justify-end gap-1"
                    >
                      <button
                        class="p-2 sm:p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20 touch-manipulation"
                        title="Delete location"
                        @click.stop="confirmDelete(location)"
                      >
                        <Icon name="mdi:delete-outline" size="20" class="sm:w-[18px] sm:h-[18px]" />
                      </button>
                    </div>
                    <div v-else class="flex items-center justify-end gap-1.5">
                      <button
                        :disabled="isSaving"
                        class="p-2 sm:p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20 touch-manipulation"
                        title="Save changes"
                        @click="saveEdit(location.id)"
                      >
                        <Icon name="mdi:check" size="20" class="sm:w-[18px] sm:h-[18px]" />
                      </button>
                      <button
                        class="p-2 sm:p-1.5 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors rounded hover:bg-gray-50 dark:hover:bg-gray-900/20 touch-manipulation"
                        title="Cancel editing"
                        @click="cancelEdit"
                      >
                        <Icon name="mdi:close" size="20" class="sm:w-[18px] sm:h-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- Duplicate Warning Modal -->
    <div
      v-if="duplicateWarning"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="duplicateWarning = null"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4 text-yellow-600 dark:text-yellow-400">
          ⚠️ Duplicate Location Warning
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">A similar location already exists:</p>
        <div class="bg-gray-50 dark:bg-slate-700 rounded p-4 mb-4">
          <p class="font-medium text-gray-900 dark:text-gray-100">
            {{ duplicateWarning.location.name }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ duplicateWarning.location.lat.toFixed(6) }},
            {{ duplicateWarning.location.lng.toFixed(6) }}
          </p>
          <p class="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
            Distance: {{ duplicateWarning.distance.toFixed(2) }} km
          </p>
        </div>
        <p class="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          Are you sure you want to add this location anyway?
        </p>
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            @click="duplicateWarning = null"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            @click="proceedWithDuplicate"
          >
            Add Anyway
          </button>
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
        <h3 class="text-lg font-semibold mb-4">Confirm Delete</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete <strong>{{ deleteConfirm.name }}</strong
          >? This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            @click="deleteConfirm = null"
          >
            Cancel
          </button>
          <button
            :disabled="isDeleting"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            @click="deleteLocation(deleteConfirm.id)"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useGoogleAuth } from '~/composables/useGoogleAuth'

interface PlaceForm {
  name: string
  lat: number | null
  lng: number | null
  year?: number | null
  description: string
  blog_slug?: string
  type: 'home' | 'trip' | ''
}

interface PlaceSuggestion {
  name: string
  address: string
  lat: number | null // null when coordinates aren't available (placesService unavailable)
  lng: number | null // null when coordinates aren't available (placesService unavailable)
  placeId: string
  isError?: boolean // Flag to indicate error fallback cases (API call failed)
}

interface Location {
  id: number
  name: string
  lat: number
  lng: number
  year?: number | null
  description?: string | null
  blog_slug?: string | null
  type?: 'home' | 'trip' | null
  created_at?: string
}

const form = ref<PlaceForm>({
  name: '',
  lat: null,
  lng: null,
  year: null,
  description: '',
  blog_slug: '',
  type: '',
})

const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const mapContainer = ref<HTMLDivElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const searchSuggestions = ref<PlaceSuggestion[]>([])
const isSearching = ref(false)
const locations = ref<Location[]>([])
const isLoadingLocations = ref(false)
const editingId = ref<number | null>(null)
// Store edit state per location ID to prevent overwriting unsaved edits
// Use Record instead of Map for Vue 3 reactivity (Vue doesn't track Map mutations)
const editForms = ref<Record<number, PlaceForm>>({})
const isSaving = ref(false)
const deleteConfirm = ref<Location | null>(null)
const isDeleting = ref(false)
const locationSearchQuery = ref('')
const sortColumn = ref<'name' | 'coordinates' | 'type' | 'year' | 'description' | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')
const duplicateWarning = ref<{ location: Location; distance: number } | null>(null)
let map: google.maps.Map | null = null
let marker: google.maps.Marker | null = null
let autocompleteService: google.maps.places.AutocompleteService | null = null
let placesService: google.maps.places.PlacesService | null = null
let searchTimeout: NodeJS.Timeout | null = null
let currentSearchQuery: string | null = null // Track the query for the current search to prevent race conditions

// Google Authentication
const { user, isAuthenticated, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()

const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      resolve()
      return
    }

    // Check if script is already being loaded
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existing) {
      const script = existing as HTMLScriptElement
      // Check if it includes places library
      if (script.src.includes('libraries=places')) {
        // Wait for it to load
        if (script.readyState === 'complete' || script.readyState === 'loaded') {
          if (window.google && window.google.maps && window.google.maps.places) {
            resolve()
            return
          }
          // Poll for API availability
          const checkInterval = setInterval(() => {
            if (window.google && window.google.maps && window.google.maps.places) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)
          setTimeout(() => {
            clearInterval(checkInterval)
            reject(new Error('Google Maps Places API failed to load'))
          }, 10000)
          return
        }
        // Script is loading, wait for it
        existing.addEventListener('load', () => {
          const checkInterval = setInterval(() => {
            if (window.google && window.google.maps && window.google.maps.places) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)
          setTimeout(() => {
            clearInterval(checkInterval)
            reject(new Error('Google Maps Places API failed to load'))
          }, 10000)
        })
        existing.addEventListener('error', () => {
          reject(new Error('Failed to load Google Maps script'))
        })
        return
      } else {
        // Script exists but doesn't have places library - need to load new one
        existing.remove()
      }
    }

    // Load Google Maps script with Places library
    const config = useRuntimeConfig()
    const apiKey = config.public.googleMapsApiKey
    if (!apiKey) {
      reject(
        new Error(
          'Google Maps API key is not configured. Please set NUXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.',
        ),
      )
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      // Wait a bit for the API to initialize
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
      setTimeout(() => {
        clearInterval(checkInterval)
        if (window.google && window.google.maps && window.google.maps.places) {
          resolve()
        } else {
          reject(new Error('Google Maps Places API not available after script load'))
        }
      }, 5000)
    }

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'))
    }

    document.head.appendChild(script)
  })
}

const loadMap = async () => {
  if (!mapContainer.value) return

  // Load Google Maps script with Places library
  try {
    await loadGoogleMapsScript()
  } catch (error) {
    console.error('[Locations] Failed to load Google Maps API:', error)
    errorMessage.value = 'Failed to load Google Maps. Please refresh the page.'
    return
  }

  // Re-verify that Google Maps is available before using it
  if (!window.google || !window.google.maps || !window.google.maps.Map) {
    console.error('[Locations] Google Maps API is not available')
    errorMessage.value =
      'Google Maps API is not available. Please check your API key configuration.'
    return
  }

  if (!map) {
    try {
      map = new window.google.maps.Map(mapContainer.value, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
      })

      // Initialize Places services
      if (window.google.maps.places) {
        autocompleteService = new window.google.maps.places.AutocompleteService()
        placesService = new window.google.maps.places.PlacesService(map)
        console.log('[Locations] Places services initialized')
      } else {
        console.error('[Locations] Google Maps Places API not available')
        errorMessage.value =
          'Google Maps Places API is not available. Please check your API key includes Places API.'
      }
    } catch (error) {
      console.error('[Locations] Failed to initialize map:', error)
      errorMessage.value = 'Failed to initialize map. Please check your Google Maps API key.'
      return
    }
  } else {
    // Map already exists, ensure services are initialized
    if (window.google.maps.places) {
      if (!autocompleteService) {
        autocompleteService = new window.google.maps.places.AutocompleteService()
        console.log('[Locations] AutocompleteService re-initialized')
      }
      if (!placesService && map) {
        placesService = new window.google.maps.places.PlacesService(map)
        console.log('[Locations] PlacesService re-initialized')
      }
    }
  }

  updateMarker()
}

const updateMarker = () => {
  // Check for null or undefined explicitly (not truthiness) to allow valid 0 coordinates
  // This ensures locations on equator (lat=0) or prime meridian (lng=0) are handled correctly
  if (!map || form.value.lat == null || form.value.lng == null) {
    if (marker) {
      marker.setMap(null)
      marker = null
    }
    return
  }

  // Verify Google Maps API is still available
  if (!window.google?.maps?.Marker) {
    console.error('[Locations] Google Maps Marker API is not available')
    return
  }

  const position = { lat: form.value.lat, lng: form.value.lng }

  try {
    if (marker) {
      // Update existing marker position and title
      marker.setPosition(position)
      marker.setTitle(form.value.name || 'Location')
    } else {
      // Create new marker
      marker = new window.google.maps.Marker({
        position,
        map,
        title: form.value.name || 'Location',
        animation: window.google.maps.Animation.DROP, // Add drop animation for better visibility
      })
    }

    // Center and zoom map to show the marker clearly
    map.setCenter(position)
    map.setZoom(12) // Increased zoom for better visibility of the selected location
  } catch (error) {
    console.error('[Locations] Failed to update marker:', error)
  }
}

const onSearchInput = () => {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  // Clear suggestions if search is empty
  if (!searchQuery.value.trim()) {
    searchSuggestions.value = []
    isSearching.value = false
    currentSearchQuery = null
    return
  }

  // Debounce search requests
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300)
}

const onSearchFocus = () => {
  // If there's a query, show suggestions again
  if (searchQuery.value.trim() && searchSuggestions.value.length === 0) {
    performSearch()
  }
}

const performSearch = () => {
  if (!searchQuery.value.trim()) {
    searchSuggestions.value = []
    isSearching.value = false
    return
  }

  if (!autocompleteService) {
    console.warn('[Locations] AutocompleteService not available. Attempting to initialize...')
    // Try to initialize if map exists
    if (map && window.google?.maps?.places) {
      autocompleteService = new window.google.maps.places.AutocompleteService()
      placesService =
        placesService || (map ? new window.google.maps.places.PlacesService(map) : null)
      console.log('[Locations] AutocompleteService initialized during search')
    } else {
      console.error(
        '[Locations] Cannot initialize AutocompleteService - map or Google Maps API not available',
      )
      isSearching.value = false
      return
    }
  }

  // Capture the current query to track which search this response belongs to
  const queryForThisSearch = searchQuery.value.trim()
  currentSearchQuery = queryForThisSearch
  isSearching.value = true

  autocompleteService.getPlacePredictions(
    {
      input: queryForThisSearch,
      types: ['geocode', 'establishment'],
    },
    (predictions, status) => {
      // Check if this response is still relevant (user hasn't changed the query)
      if (currentSearchQuery !== queryForThisSearch) {
        // This response is stale, ignore it
        return
      }

      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        // Get details for each prediction to get lat/lng
        const promises = predictions.slice(0, 5).map((prediction) => {
          return new Promise<PlaceSuggestion>((resolve) => {
            if (!placesService) {
              // placesService unavailable - still show prediction but without coordinates
              // This is not an error, just a limitation (user can manually enter coordinates)
              resolve({
                name: prediction.description,
                address: prediction.description,
                lat: null, // Coordinates not available
                lng: null, // Coordinates not available
                placeId: prediction.place_id,
                // Don't mark as error - this is a valid prediction without coordinates
              })
              return
            }

            placesService.getDetails(
              {
                placeId: prediction.place_id,
                fields: ['name', 'formatted_address', 'geometry'],
              },
              (place, placeStatus) => {
                if (placeStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                  const location = place.geometry?.location
                  // Check if location and coordinates are valid
                  const lat = location?.lat()
                  const lng = location?.lng()
                  const hasValidCoordinates =
                    typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)

                  resolve({
                    name: place.name || prediction.description,
                    address: place.formatted_address || prediction.description,
                    // Use null if coordinates are missing/invalid (user can enter manually)
                    // Don't use (0, 0) as fallback to avoid fake Gulf of Guinea locations
                    lat: hasValidCoordinates ? lat : null,
                    lng: hasValidCoordinates ? lng : null,
                    placeId: prediction.place_id,
                    // Don't mark as error - API call succeeded, just missing coordinate data
                  })
                } else {
                  resolve({
                    name: prediction.description,
                    address: prediction.description,
                    lat: 0,
                    lng: 0,
                    placeId: prediction.place_id,
                    isError: true, // Mark as error case (API call failed)
                  })
                }
              },
            )
          })
        })

        Promise.all(promises).then((suggestions) => {
          // Double-check the query hasn't changed before updating suggestions
          // This prevents stale responses from overwriting newer results
          if (currentSearchQuery === queryForThisSearch) {
            // Filter out only actual error cases (marked with isError flag)
            // Keep suggestions even if coordinates are null (placesService unavailable)
            // This preserves legitimate places at (0, 0) while removing API error cases
            const filteredSuggestions = suggestions.filter((s) => !s.isError)
            searchSuggestions.value = filteredSuggestions
            isSearching.value = false
            console.log('[Locations] Search results:', {
              query: queryForThisSearch,
              total: suggestions.length,
              filtered: filteredSuggestions.length,
              suggestions: filteredSuggestions,
            })
          }
        })
      } else {
        // Only clear suggestions if this is still the current search
        if (currentSearchQuery === queryForThisSearch) {
          searchSuggestions.value = []
          isSearching.value = false
        }
      }
    },
  )
}

const selectSuggestion = async (suggestion: PlaceSuggestion) => {
  // Fill form with selected suggestion
  form.value.name = suggestion.name
  // Only set coordinates if they're available (not null)
  form.value.lat = suggestion.lat ?? null
  form.value.lng = suggestion.lng ?? null

  // Clear search
  searchQuery.value = ''
  searchSuggestions.value = []

  // Ensure map is loaded before updating marker
  if (!map) {
    await loadMap()
  }

  // Update map marker (will only show if coordinates are available)
  // Use nextTick to ensure form values are updated
  await nextTick()
  updateMarker()
}

watch(
  () => [form.value.lat, form.value.lng],
  () => {
    updateMarker()
  },
)

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * Returns distance in kilometers
 */
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Check if a location is within 10km of any existing location
 */
const checkForDuplicate = (): { location: Location; distance: number } | null => {
  if (form.value.lat === null || form.value.lng === null) {
    return null // Can't check duplicates without coordinates
  }

  const DUPLICATE_THRESHOLD_KM = 10

  for (const location of locations.value) {
    const distance = calculateDistance(form.value.lat!, form.value.lng!, location.lat, location.lng)

    if (distance < DUPLICATE_THRESHOLD_KM) {
      return { location, distance }
    }
  }

  return null
}

const proceedWithDuplicate = async () => {
  duplicateWarning.value = null
  await submitPlaceInternal()
}

const submitPlaceInternal = async () => {
  isSubmitting.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<{ success: boolean; place?: { name: string }; error?: string }>(
      '/api/travel/places',
      {
        method: 'POST',
        body: form.value,
      },
    )

    if (response.success) {
      successMessage.value = `Location "${response.place?.name}" added successfully!`
      form.value = {
        name: '',
        lat: null,
        lng: null,
        year: null,
        description: '',
        blog_slug: '',
        type: '',
      }
      if (marker) {
        marker.setMap(null)
        marker = null
      }
      // Reload locations list
      await loadLocations()
    } else {
      errorMessage.value = response.error || 'Failed to add location'
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to add location'
  } finally {
    isSubmitting.value = false
  }
}

const submitPlace = async () => {
  // Check for duplicates before submitting
  const duplicate = checkForDuplicate()
  if (duplicate) {
    duplicateWarning.value = duplicate
    return
  }

  // No duplicate found, proceed with submission
  await submitPlaceInternal()
}

const loadLocations = async () => {
  isLoadingLocations.value = true
  try {
    const data = await $fetch<Location[]>('/api/travel/places')
    locations.value = data || []
  } catch (err) {
    console.error('[Locations] Failed to load locations:', err)
    errorMessage.value = 'Failed to load locations'
  } finally {
    isLoadingLocations.value = false
  }
}

const startEdit = (location: Location) => {
  // If another location is being edited, cancel it first to prevent data loss
  if (editingId.value !== null && editingId.value !== location.id) {
    cancelEdit()
  }

  editingId.value = location.id
  // Store edit state per location ID to prevent overwriting unsaved edits
  // Use object property assignment for Vue 3 reactivity
  // Name and coordinates are not editable - only type, year, and description
  editForms.value[location.id] = {
    name: location.name, // Not editable, but needed for API
    lat: location.lat, // Not editable, but needed for API
    lng: location.lng, // Not editable, but needed for API
    year: location.year ?? null, // Use ?? to preserve 0 (falsy but valid)
    description: location.description ?? '', // Use ?? to preserve empty string if needed
    blog_slug: location.blog_slug ?? '', // Keep for API, but not editable in UI
    type: (location.type as 'home' | 'trip' | '') ?? '',
  }
}

const cancelEdit = () => {
  if (editingId.value !== null) {
    // Remove edit state for the location being cancelled
    // Use object destructuring to create new object without the property (Vue 3 reactivity)
    const { [editingId.value]: _, ...rest } = editForms.value
    editForms.value = rest
  }
  editingId.value = null
}

const saveEdit = async (id: number) => {
  isSaving.value = true
  try {
    // Get edit state for this specific location ID
    const editForm = editForms.value[id]
    if (!editForm) {
      errorMessage.value = 'Edit state not found. Please try editing again.'
      editingId.value = null
      return
    }

    // Use values from editForm which were captured when editing started
    // This ensures we have valid values even if the location was deleted/refreshed
    // Name and coordinates are not editable, so they should always be valid from startEdit()
    // Validate that required fields are present
    if (!editForm.name || editForm.lat == null || editForm.lng == null) {
      errorMessage.value = 'Name, latitude, and longitude are required.'
      return
    }

    const updateData = {
      name: editForm.name, // Not editable, but required for API
      lat: editForm.lat, // Not editable, but required for API
      lng: editForm.lng, // Not editable, but required for API
      type: editForm.type,
      year: editForm.year,
      description: editForm.description,
      blog_slug: editForm.blog_slug || null,
    }

    const response = await $fetch<{ success: boolean; place?: Location; error?: string }>(
      `/api/travel/places/${id}`,
      {
        method: 'PUT',
        body: updateData,
      },
    )

    if (response.success) {
      successMessage.value = `Location "${response.place?.name}" updated successfully!`
      // Remove edit state for this location after successful save
      // Use object destructuring to create new object without the property (Vue 3 reactivity)
      const { [id]: _, ...rest } = editForms.value
      editForms.value = rest
      editingId.value = null
      await loadLocations()
    } else {
      errorMessage.value = response.error || 'Failed to update location'
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to update location'
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (location: Location) => {
  deleteConfirm.value = location
}

const deleteLocation = async (id: number) => {
  isDeleting.value = true
  try {
    const response = await $fetch<{ success: boolean; error?: string }>(
      `/api/travel/places/${id}`,
      {
        method: 'DELETE',
      },
    )

    if (response.success) {
      successMessage.value = 'Location deleted successfully!'
      deleteConfirm.value = null
      await loadLocations()
    } else {
      errorMessage.value = response.error || 'Failed to delete location'
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to delete location'
  } finally {
    isDeleting.value = false
  }
}

// Filter and sort locations
const filteredLocations = computed(() => {
  if (!locationSearchQuery.value.trim()) {
    return locations.value
  }

  const query = locationSearchQuery.value.toLowerCase().trim()
  return locations.value.filter((location) => {
    const name = location.name?.toLowerCase() || ''
    const description = location.description?.toLowerCase() || ''
    const type = location.type?.toLowerCase() || ''
    const coordinates = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`
    const year = location.year?.toString() || ''

    return (
      name.includes(query) ||
      description.includes(query) ||
      type.includes(query) ||
      coordinates.includes(query) ||
      year.includes(query)
    )
  })
})

const filteredAndSortedLocations = computed(() => {
  const result = [...filteredLocations.value]

  if (!sortColumn.value) {
    return result
  }

  result.sort((a, b) => {
    let aValue: string | number | null | undefined
    let bValue: string | number | null | undefined

    switch (sortColumn.value) {
      case 'name':
        aValue = a.name?.toLowerCase() || ''
        bValue = b.name?.toLowerCase() || ''
        break
      case 'coordinates': {
        // Sort by latitude first, then longitude (proper secondary sorting)
        // Check for null/undefined coordinates to prevent NaN
        const aLatValid =
          typeof a.lat === 'number' && !isNaN(a.lat) && typeof a.lng === 'number' && !isNaN(a.lng)
        const bLatValid =
          typeof b.lat === 'number' && !isNaN(b.lat) && typeof b.lng === 'number' && !isNaN(b.lng)

        if (!aLatValid && !bLatValid) {
          return 0 // Both invalid, equal
        }
        if (!aLatValid) {
          return 1 // a is invalid, sort it last
        }
        if (!bLatValid) {
          return -1 // b is invalid, sort it last
        }

        // Compare latitude first
        if (a.lat !== b.lat) {
          return sortDirection.value === 'asc' ? a.lat - b.lat : b.lat - a.lat
        }

        // If latitudes are equal, compare longitude
        return sortDirection.value === 'asc' ? a.lng - b.lng : b.lng - a.lng
      }
      case 'type':
        aValue = a.type?.toLowerCase() || ''
        bValue = b.type?.toLowerCase() || ''
        break
      case 'year':
        aValue = a.year ?? -Infinity // Treat null/undefined as smallest
        bValue = b.year ?? -Infinity
        break
      case 'description':
        aValue = a.description?.toLowerCase() || ''
        bValue = b.description?.toLowerCase() || ''
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

  return result
})

const sortBy = (column: 'name' | 'coordinates' | 'type' | 'year' | 'description') => {
  if (sortColumn.value === column) {
    // Toggle direction if clicking the same column
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // Set new column and default to ascending
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

onMounted(async () => {
  initializeGoogleSignIn()
  loadStoredUser()

  // Only load map and locations if authenticated
  if (isAuthenticated.value) {
    // Wait a bit for DOM to be ready
    await nextTick()
    setTimeout(async () => {
      try {
        await loadMap()
        loadLocations()
      } catch (error) {
        console.error('[Locations] Failed to initialize on mount:', error)
      }
    }, 100)
  }

  // Render sign-in button if not authenticated
  if (typeof window !== 'undefined' && !isAuthenticated.value) {
    // Wait for Google script to load, then render button
    let retryCount = 0
    const maxRetries = 50
    const retryInterval = 100

    const attemptRender = () => {
      if (typeof window === 'undefined' || !window.google || !window.google.accounts) {
        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(attemptRender, retryInterval)
        }
        return
      }

      const clientId = useRuntimeConfig().public.googleClientId
      if (!clientId) {
        console.error('[Locations] Google Client ID not configured')
        return
      }

      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            const result = await $fetch<{
              user: { email: string; name: string; picture: string; sub: string }
            }>('/api/auth/google', {
              method: 'POST',
              body: { token: response.credential },
            })
            if (result && result.user) {
              user.value = result.user
              localStorage.setItem('google_user', JSON.stringify(result.user))

              if (typeof window !== 'undefined') {
                const { trackLogin } = await import('~/utils/analytics/trackLogin')
                await trackLogin(result.user.email, result.user.name, window.location.pathname)
                window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
              }
            }
          } catch (error) {
            console.error('[Locations] Authentication failed:', error)
          }
        },
      })

      const buttonElement = document.getElementById('google-signin-button-locations')
      if (buttonElement && window.google && window.google.accounts) {
        buttonElement.innerHTML = ''
        window.google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: 250,
        })
      }
    }

    attemptRender()
  }
})

// Watch for authentication changes to re-render button
watch(isAuthenticated, async (newValue) => {
  if (newValue) {
    // When authenticated, ensure map and services are loaded
    await nextTick()
    // Wait for DOM to be ready and map container to exist
    let retries = 0
    const maxRetries = 20
    const checkAndLoad = async () => {
      if (mapContainer.value) {
        try {
          console.log('[Locations] Authentication changed to true, reloading map...')
          await loadMap()
          loadLocations()
          console.log('[Locations] Map and services loaded after authentication')
        } catch (error) {
          console.error('[Locations] Failed to reload map after authentication:', error)
        }
      } else if (retries < maxRetries) {
        retries++
        setTimeout(checkAndLoad, 100)
      } else {
        console.error('[Locations] Map container not found after authentication')
      }
    }
    checkAndLoad()
  } else if (typeof window !== 'undefined') {
    // When not authenticated, render sign-in button
    nextTick(() => {
      if (typeof window === 'undefined' || !window.google || !window.google.accounts) return

      const buttonElement = document.getElementById('google-signin-button-locations')
      if (!buttonElement) return

      buttonElement.innerHTML = ''
      const clientId = useRuntimeConfig().public.googleClientId
      if (!clientId) {
        console.error('[Locations] Google Client ID not configured')
        return
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            const result = await $fetch<{
              user: { email: string; name: string; picture: string; sub: string }
            }>('/api/auth/google', {
              method: 'POST',
              body: { token: response.credential },
            })
            if (result && result.user) {
              user.value = result.user
              localStorage.setItem('google_user', JSON.stringify(result.user))

              if (typeof window !== 'undefined') {
                const { trackLogin } = await import('~/utils/analytics/trackLogin')
                await trackLogin(result.user.email, result.user.name, window.location.pathname)
                window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
              }
            }
          } catch (error) {
            console.error('[Locations] Authentication failed:', error)
          }
        },
      })

      if (window.google && window.google.accounts) {
        window.google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: 250,
        })
      }
    })
  }
})

onUnmounted(() => {
  if (marker) {
    marker.setMap(null)
  }
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>
