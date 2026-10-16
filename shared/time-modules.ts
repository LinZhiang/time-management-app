import {
  CATEGORY_LABELS,
  DELETABLE_BUILTIN_CATEGORIES,
  TIME_CATEGORIES,
  UNDELETABLE_TIME_CATEGORIES,
  type CustomTimeModule,
  type HiddenTimeCategory,
  type TimeCategory,
  type TimerCategory,
  type VisibleTimeModule,
} from './types.ts'

export function isTimeCategory(value: string): value is TimeCategory {
  return (TIME_CATEGORIES as readonly string[]).includes(value)
}

export function isHiddenTimeCategory(value: string): value is HiddenTimeCategory {
  return (DELETABLE_BUILTIN_CATEGORIES as readonly string[]).includes(value)
}

export function isUndeletableTimeModule(id: string) {
  return (UNDELETABLE_TIME_CATEGORIES as readonly string[]).includes(id)
}

export function moduleTitle(id: string, customModules: CustomTimeModule[]): string {
  if (id === 'exercise' || isTimeCategory(id)) return CATEGORY_LABELS[id as TimerCategory]
  return customModules.find((item) => item.id === id)?.title || id
}

export function listVisibleTimeModules(
  customModules: CustomTimeModule[] = [],
  hiddenCategories: string[] = [],
): VisibleTimeModule[] {
  const hidden = new Set(hiddenCategories)
  const items: VisibleTimeModule[] = []
  for (const id of TIME_CATEGORIES) {
    if (id === 'other' || hidden.has(id)) continue
    items.push({
      id,
      title: CATEGORY_LABELS[id],
      deletable: !isUndeletableTimeModule(id),
    })
  }
  for (const module of customModules) {
    items.push({
      id: module.id,
      title: module.title,
      deletable: true,
    })
  }
  items.push({
    id: 'other',
    title: CATEGORY_LABELS.other,
    deletable: false,
  })
  return items
}
