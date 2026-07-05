export type MusicTypeKey = 'lyrics' | 'instrumental' | 'notation' | string

const typeConfig: Record<
  string,
  { label: string; icon: string; accent: string; badge: string; staff: string }
> = {
  lyrics: {
    label: 'Lyrics',
    icon: 'mdi:music-note',
    accent: 'from-violet-600 to-purple-700',
    badge: 'bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-200',
    staff: '♪ ♫ ♪',
  },
  instrumental: {
    label: 'Instrumental',
    icon: 'mdi:music-box-outline',
    accent: 'from-amber-500 to-orange-600',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
    staff: '♩ ♪ ♩',
  },
  notation: {
    label: 'Notation',
    icon: 'mdi:music-clef-treble',
    accent: 'from-emerald-600 to-teal-700',
    badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200',
    staff: '𝄞 ♬ 𝄢',
  },
}

export function useMusicTypeInfo(musicType?: MaybeRefOrGetter<MusicTypeKey | undefined>) {
  const typeInfo = computed(() => {
    const key = toValue(musicType) || ''
    return (
      typeConfig[key] || {
        label: key || 'Music',
        icon: 'mdi:music',
        accent: 'from-sky-600 to-indigo-700',
        badge: 'bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-200',
        staff: '♪ ♫ ♪',
      }
    )
  })

  const contentSectionTitle = computed(() => {
    const label = typeInfo.value.label
    if (label === 'Notation') return 'Notation'
    if (label === 'Lyrics') return 'Lyrics'
    return 'Score'
  })

  return { typeInfo, contentSectionTitle, typeConfig }
}
