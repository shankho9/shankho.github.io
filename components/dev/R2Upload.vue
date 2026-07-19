<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const bucket = ref('')
const folder = ref('')
const objectFileName = ref('')
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const isLoadingConfig = ref(true)
const isUploading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const uploadedObjectKey = ref('')
const uploadedBucketPath = ref('')
const copiedField = ref<'objectKey' | 'bucketPath' | null>(null)

watch(selectedFile, (file) => {
  if (file && !objectFileName.value.trim()) {
    objectFileName.value = file.name
  }
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  errorMessage.value = ''
  successMessage.value = ''
  uploadedObjectKey.value = ''
  uploadedBucketPath.value = ''
  if (selectedFile.value) {
    objectFileName.value = selectedFile.value.name
  }
}

function clearFile() {
  selectedFile.value = null
  objectFileName.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function loadConfig() {
  isLoadingConfig.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ success: boolean; defaultBucket: string }>('/api/admin/r2/config')
    if (res.defaultBucket) bucket.value = res.defaultBucket
  } catch (err: unknown) {
    const msg =
      err && typeof err === 'object' && 'data' in err
        ? (err as { data?: { statusMessage?: string } }).data?.statusMessage
        : undefined
    errorMessage.value = msg || (err instanceof Error ? err.message : 'Failed to load R2 config.')
  } finally {
    isLoadingConfig.value = false
  }
}

async function copyText(text: string, field: 'objectKey' | 'bucketPath') {
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => {
      if (copiedField.value === field) copiedField.value = null
    }, 2000)
  } catch {
    errorMessage.value = 'Could not copy to clipboard.'
  }
}

async function upload() {
  errorMessage.value = ''
  successMessage.value = ''
  uploadedObjectKey.value = ''
  uploadedBucketPath.value = ''

  const file = selectedFile.value
  if (!file) {
    errorMessage.value = 'Select a file to upload.'
    return
  }

  const folderValue = folder.value.trim()
  const fileName = objectFileName.value.trim() || file.name
  if (!folderValue) {
    errorMessage.value = 'Enter a folder (e.g. Android, Desktop, Resources).'
    return
  }
  if (!fileName) {
    errorMessage.value = 'Enter an object file name.'
    return
  }

  isUploading.value = true
  try {
    const contentType = file.type || 'application/octet-stream'
    const presign = await $fetch<{
      success: boolean
      bucket: string
      objectKey: string
      uploadUrl: string
      expiresIn: number
    }>('/api/admin/r2/presign-upload', {
      method: 'POST',
      body: {
        bucket: bucket.value.trim() || undefined,
        folder: folderValue,
        fileName,
        contentType,
      },
    })

    const putResponse = await fetch(presign.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': contentType,
      },
    })

    if (!putResponse.ok) {
      const detail = await putResponse.text().catch(() => '')
      throw new Error(
        `R2 upload failed (${putResponse.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      )
    }

    uploadedObjectKey.value = presign.objectKey
    uploadedBucketPath.value = `${presign.bucket}/${presign.objectKey}`
    successMessage.value =
      'Upload complete. Copy the object key into Tina apkKey / msixKey if needed.'
  } catch (err: unknown) {
    const msg =
      err && typeof err === 'object' && 'data' in err
        ? (err as { data?: { statusMessage?: string; message?: string } }).data?.statusMessage ||
          (err as { data?: { message?: string } }).data?.message
        : undefined
    errorMessage.value = msg || (err instanceof Error ? err.message : 'Upload failed.')
  } finally {
    isUploading.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div class="space-y-6 w-full">
    <div
      class="rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-900/20"
    >
      <p class="text-sky-800 dark:text-sky-200">
        <Icon name="mdi:information" class="mr-2 inline" />
        Upload a local app binary or resource into Cloudflare R2. The browser sends the file
        directly to R2 using a short-lived admin-only URL. Paste the returned object key into Tina
        (<code class="text-xs">apkKey</code> / <code class="text-xs">msixKey</code>).
      </p>
    </div>

    <div
      class="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-slate-600 dark:bg-slate-700"
    >
      <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Upload to R2</h3>

      <div v-if="isLoadingConfig" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <Icon name="svg-spinners:180-ring" class="mb-2 text-2xl text-sky-600" />
        <p>Loading R2 config…</p>
      </div>

      <form v-else class="space-y-4" @submit.prevent="upload">
        <div>
          <label
            for="r2-bucket"
            class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Bucket
          </label>
          <input
            id="r2-bucket"
            v-model="bucket"
            type="text"
            autocomplete="off"
            placeholder="nomadic-notions-apps"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-500 dark:bg-slate-800 dark:text-gray-100"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Defaults to <code class="text-xs">R2_BUCKET_NAME</code>; override if needed.
          </p>
        </div>

        <div>
          <label
            for="r2-folder"
            class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Folder
          </label>
          <input
            id="r2-folder"
            v-model="folder"
            type="text"
            autocomplete="off"
            required
            placeholder="Android, Desktop, iOS, Resources…"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-500 dark:bg-slate-800 dark:text-gray-100"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Top-level path segment (letters, numbers, dash, underscore).
          </p>
        </div>

        <div>
          <label
            for="r2-file"
            class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Local file
          </label>
          <input
            id="r2-file"
            ref="fileInputRef"
            type="file"
            class="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-700 dark:text-gray-300"
            @change="onFileChange"
          />
          <div
            v-if="selectedFile"
            class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
          >
            <span>
              {{ selectedFile.name }}
              ({{ (selectedFile.size / (1024 * 1024)).toFixed(2) }} MB)
            </span>
            <button
              type="button"
              class="text-sky-600 hover:underline dark:text-sky-400"
              @click="clearFile"
            >
              Clear
            </button>
          </div>
        </div>

        <div>
          <label
            for="r2-object-name"
            class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Object file name
          </label>
          <input
            id="r2-object-name"
            v-model="objectFileName"
            type="text"
            autocomplete="off"
            placeholder="Taskora_Android_v1.0.0.apk"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-500 dark:bg-slate-800 dark:text-gray-100"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Defaults to the selected file name. Override to match Tina naming.
          </p>
        </div>

        <button
          type="submit"
          :disabled="isUploading || !selectedFile"
          class="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon
            :name="isUploading ? 'svg-spinners:180-ring' : 'mdi:cloud-upload'"
            class="mr-2"
            size="18"
          />
          {{ isUploading ? 'Uploading…' : 'Upload to R2' }}
        </button>
      </form>
    </div>

    <div
      v-if="successMessage"
      class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
    >
      <p class="text-green-800 dark:text-green-200">
        <Icon name="mdi:check-circle" class="mr-2 inline" />
        {{ successMessage }}
      </p>

      <div v-if="uploadedObjectKey" class="mt-4 space-y-3">
        <div>
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-green-700 dark:text-green-300"
          >
            Object key (for Tina)
          </p>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code
              class="block flex-1 break-all rounded-md bg-white/80 px-3 py-2 text-sm text-zinc-800 dark:bg-slate-900/60 dark:text-zinc-100"
            >
              {{ uploadedObjectKey }}
            </code>
            <button
              type="button"
              class="inline-flex shrink-0 items-center justify-center rounded-md bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
              @click="copyText(uploadedObjectKey, 'objectKey')"
            >
              <Icon
                :name="copiedField === 'objectKey' ? 'mdi:check' : 'mdi:content-copy'"
                class="mr-1"
                size="14"
              />
              {{ copiedField === 'objectKey' ? 'Copied' : 'Copy' }}
            </button>
          </div>
        </div>

        <div>
          <p
            class="mb-1 text-xs font-medium uppercase tracking-wide text-green-700 dark:text-green-300"
          >
            Bucket path
          </p>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code
              class="block flex-1 break-all rounded-md bg-white/80 px-3 py-2 text-sm text-zinc-800 dark:bg-slate-900/60 dark:text-zinc-100"
            >
              {{ uploadedBucketPath }}
            </code>
            <button
              type="button"
              class="inline-flex shrink-0 items-center justify-center rounded-md bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
              @click="copyText(uploadedBucketPath, 'bucketPath')"
            >
              <Icon
                :name="copiedField === 'bucketPath' ? 'mdi:check' : 'mdi:content-copy'"
                class="mr-1"
                size="14"
              />
              {{ copiedField === 'bucketPath' ? 'Copied' : 'Copy' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
    >
      <p class="text-red-800 dark:text-red-200">
        <Icon name="mdi:alert-circle" class="mr-2 inline" />
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>
