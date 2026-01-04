/**
 * Eisenhower Matrix and Priority Scoring Utilities
 *
 * This module implements the Eisenhower Matrix classification and priority scoring
 * system for task prioritization.
 */

import type { Task } from '~/server/api/planner/tasks.get'
import { getLocalDateString } from '~/utils/common/dateParser'

export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4'
export type DelegationStatus =
  | 'none'
  | 'delegate'
  | 'waiting'
  | 'blocked'
  | 'support'
  | 'depends-on'
  | 'batch'
  | 'low-energy'
  | 'quick-win'
  | 'deep-work'
  | 'meeting'
  | 'email'
  | 'admin'

export interface TaskWithQuadrant extends Task {
  quadrant: Quadrant
  isImportant: boolean
  isUrgent: boolean
  priorityScore: number
  delegationStatus: DelegationStatus
}

export interface QuadrantData {
  quadrant: Quadrant
  label: string
  description: string
  tasks: TaskWithQuadrant[]
}

/**
 * Parse notes to detect tags and status indicators
 * Tags are case-insensitive and can be @tag or #tag format
 */
export function parseDelegationStatus(notes: string | null): DelegationStatus {
  if (!notes) return 'none'

  const lowerNotes = notes.toLowerCase()

  // Delegation and dependency tags (Q3/Q4)
  if (lowerNotes.includes('@delegate') || lowerNotes.includes('#delegate')) return 'delegate'
  if (lowerNotes.includes('@waiting') || lowerNotes.includes('#waiting')) return 'waiting'
  if (lowerNotes.includes('@blocked') || lowerNotes.includes('#blocked')) return 'blocked'
  if (lowerNotes.includes('@support') || lowerNotes.includes('#support')) return 'support'
  if (
    lowerNotes.includes('@depends-on') ||
    lowerNotes.includes('#depends-on') ||
    lowerNotes.includes('@depends') ||
    lowerNotes.includes('#depends')
  )
    return 'depends-on'

  // Batching tags (Q3)
  if (lowerNotes.includes('@batch') || lowerNotes.includes('#batch')) return 'batch'
  if (lowerNotes.includes('@meeting') || lowerNotes.includes('#meeting')) return 'meeting'
  if (lowerNotes.includes('@email') || lowerNotes.includes('#email')) return 'email'
  if (lowerNotes.includes('@admin') || lowerNotes.includes('#admin')) return 'admin'

  // Energy and work style tags
  if (
    lowerNotes.includes('@low-energy') ||
    lowerNotes.includes('#low-energy') ||
    lowerNotes.includes('@lowenergy')
  )
    return 'low-energy'
  if (
    lowerNotes.includes('@quick-win') ||
    lowerNotes.includes('#quick-win') ||
    lowerNotes.includes('@quickwin')
  )
    return 'quick-win'
  if (
    lowerNotes.includes('@deep-work') ||
    lowerNotes.includes('#deep-work') ||
    lowerNotes.includes('@deepwork')
  )
    return 'deep-work'

  return 'none'
}

/**
 * Determine if a task is urgent (due today or overdue)
 */
export function isUrgent(
  plannedDate: string | null,
  todayDate: string = getLocalDateString(),
): boolean {
  if (!plannedDate) return false

  // Compare dates (YYYY-MM-DD format)
  return plannedDate <= todayDate
}

/**
 * Determine if a task is due within the next N days (including today)
 */
export function isDueWithinDays(
  plannedDate: string | null,
  days: number,
  todayDate: string = getLocalDateString(),
): boolean {
  if (!plannedDate) return false

  const today = new Date(todayDate + 'T00:00:00')
  const taskDate = new Date(plannedDate + 'T00:00:00')
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + days)

  // Task is due within the next N days (including today and up to N days ahead)
  return taskDate >= today && taskDate <= futureDate
}

/**
 * Determine importance based on MIT flag
 */
export function isImportant(isMit: boolean): boolean {
  return isMit
}

/**
 * Calculate quadrant for a task
 */
export function calculateQuadrant(task: Task, todayDate: string = getLocalDateString()): Quadrant {
  const important = isImportant(task.is_mit)
  const urgent = isUrgent(task.planned_date, todayDate)
  const delegationStatus = parseDelegationStatus(task.notes)

  // Tag overrides (apply before standard logic)
  // @quick-win + urgent → Q1 (quick wins should be done immediately when urgent)
  if (delegationStatus === 'quick-win' && urgent) return 'Q1'

  // @deep-work + not urgent → Q2 (deep work needs scheduled time, even if not MIT)
  if (delegationStatus === 'deep-work' && !urgent) return 'Q2'

  // Tags that force Q3 for non-important tasks (batching/delegation)
  // Q3 tags force Q3 if the task is due within the next 3 days (including today)
  // Note: Administrative tags (meeting, email, admin) are mapped to Q2, not Q3
  const q3Tags = ['delegate', 'depends-on', 'depends', 'batch', 'waiting', 'blocked', 'support']
  const hasQ3Tag = q3Tags.includes(delegationStatus)

  // Administrative tags force Q2 (Important & Not Urgent)
  const adminTags = ['meeting', 'email', 'admin']
  const hasAdminTag = adminTags.includes(delegationStatus)

  // Administrative tags override: always Q2 (Important & Not Urgent)
  if (hasAdminTag) return 'Q2'

  // Standard quadrant logic (after tag overrides)
  if (important && urgent) return 'Q1'
  if (important && !urgent) return 'Q2'
  // Non-important tasks go to Q3 if:
  // 1. Urgent (due today/overdue), OR
  // 2. Has Q3 tags AND due within next 3 days
  if (!important && urgent) return 'Q3'
  if (!important && hasQ3Tag && isDueWithinDays(task.planned_date, 3, todayDate)) return 'Q3'
  // Otherwise → Q4
  return 'Q4'
}

/**
 * Get all available tags with descriptions
 */
export type TagCategory = 'support-needed' | 'time-effort' | 'administrative'

export interface TagInfo {
  tag: string
  description: string
  quadrant: Quadrant | 'any'
  examples: string[]
  category: TagCategory
}

export function getAvailableTags(): TagInfo[] {
  return [
    // Q1 - Do Now (Important & Urgent)
    {
      tag: '@quick-win',
      description: 'Quick task that can be completed fast',
      quadrant: 'Q1',
      examples: ['@quick-win', '#quick-win'],
      category: 'time-effort',
    },

    // Q2 - Schedule (Important & Not Urgent)
    {
      tag: '@deep-work',
      description: 'Requires focused, uninterrupted time',
      quadrant: 'Q2',
      examples: ['@deep-work', '#deep-work'],
      category: 'time-effort',
    },

    // Q3 - Defer/Batch (Not Important & Urgent)
    {
      tag: '@delegate',
      description: 'Should be assigned to someone else',
      quadrant: 'Q3',
      examples: ['@delegate', '#delegate'],
      category: 'support-needed',
    },
    {
      tag: '@depends-on',
      description: 'Waiting on another task or person',
      quadrant: 'Q3',
      examples: ['@depends-on', '#depends-on', '@depends', '#depends'],
      category: 'support-needed',
    },
    {
      tag: '@waiting',
      description: 'Waiting for response or action',
      quadrant: 'Q3',
      examples: ['@waiting', '#waiting'],
      category: 'support-needed',
    },
    {
      tag: '@blocked',
      description: 'Cannot proceed until unblocked',
      quadrant: 'Q3',
      examples: ['@blocked', '#blocked'],
      category: 'support-needed',
    },
    {
      tag: '@support',
      description: 'Needs support from team',
      quadrant: 'Q3',
      examples: ['@support', '#support'],
      category: 'support-needed',
    },
    {
      tag: '@batch',
      description: 'Can be grouped with similar tasks',
      quadrant: 'Q3',
      examples: ['@batch', '#batch'],
      category: 'time-effort',
    },
    {
      tag: '@meeting',
      description: 'Meeting or call related',
      quadrant: 'Q2',
      examples: ['@meeting', '#meeting'],
      category: 'administrative',
    },
    {
      tag: '@email',
      description: 'Email-related task',
      quadrant: 'Q2',
      examples: ['@email', '#email'],
      category: 'administrative',
    },
    {
      tag: '@admin',
      description: 'Administrative or routine task',
      quadrant: 'Q2',
      examples: ['@admin', '#admin'],
      category: 'administrative',
    },

    // Q4 - Later/Parking Lot (Not Important & Not Urgent)
    {
      tag: '@low-energy',
      description: 'Can be done when energy is low',
      quadrant: 'Q4',
      examples: ['@low-energy', '#low-energy', '@lowenergy'],
      category: 'time-effort',
    },
  ]
}

/**
 * Calculate priority score for a task due today
 *
 * Formula:
 * priority_score =
 *   (importance_weight)
 *   + (urgency_weight)
 *   - (deferral_penalty)
 */
export function calculatePriorityScore(
  task: TaskWithQuadrant,
  todayDate: string = getLocalDateString(),
): number {
  let score = 0

  // Importance weight: +50 if MIT
  if (task.is_mit) {
    score += 50
  }

  // Urgency weight: +30 if overdue, +20 if due today
  if (task.planned_date) {
    if (task.planned_date < todayDate) {
      score += 30 // Overdue
    } else if (task.planned_date === todayDate) {
      score += 20 // Due today
    }
  }

  // Deferral penalty: -20 if marked as "can wait"
  const lowerNotes = (task.notes || '').toLowerCase()
  if (lowerNotes.includes('can wait') || lowerNotes.includes('@defer')) {
    score -= 20
  }

  // Q4 penalty: -100 (tasks in Q4 should be hidden/deferred)
  if (task.quadrant === 'Q4') {
    score -= 100
  }

  // Blocked/waiting penalty: -30 (can't execute)
  if (task.delegationStatus === 'blocked' || task.delegationStatus === 'waiting') {
    score -= 30
  }

  return score
}

/**
 * Enrich task with quadrant and priority information
 */
export function enrichTaskWithQuadrant(
  task: Task,
  todayDate: string = getLocalDateString(),
): TaskWithQuadrant {
  const isImportantValue = isImportant(task.is_mit)
  const isUrgentValue = isUrgent(task.planned_date, todayDate)
  const quadrant = calculateQuadrant(task, todayDate)
  const delegationStatus = parseDelegationStatus(task.notes)

  const enrichedTask: TaskWithQuadrant = {
    ...task,
    quadrant,
    isImportant: isImportantValue,
    isUrgent: isUrgentValue,
    delegationStatus,
    priorityScore: 0, // Will be calculated after enrichment
  }

  // Calculate priority score
  enrichedTask.priorityScore = calculatePriorityScore(enrichedTask, todayDate)

  return enrichedTask
}

/**
 * Group tasks by quadrant
 */
export function groupTasksByQuadrant(
  tasks: Task[],
  todayDate: string = getLocalDateString(),
): QuadrantData[] {
  const enriched = tasks.map((t) => enrichTaskWithQuadrant(t, todayDate))

  const quadrants: Record<Quadrant, QuadrantData> = {
    Q1: {
      quadrant: 'Q1',
      label: 'Do Now',
      description: 'Important & Urgent',
      tasks: [],
    },
    Q2: {
      quadrant: 'Q2',
      label: 'Schedule',
      description: 'Important & Not Urgent',
      tasks: [],
    },
    Q3: {
      quadrant: 'Q3',
      label: 'Defer / Batch',
      description: 'Not Important & Urgent',
      tasks: [],
    },
    Q4: {
      quadrant: 'Q4',
      label: 'Later / Parking Lot',
      description: 'Not Important & Not Urgent (Deferred)',
      tasks: [],
    },
  }

  enriched.forEach((task) => {
    quadrants[task.quadrant].tasks.push(task)
  })

  // Sort tasks within each quadrant by priority score (descending)
  Object.values(quadrants).forEach((quadrantData) => {
    quadrantData.tasks.sort((a, b) => b.priorityScore - a.priorityScore)
  })

  return [quadrants.Q1, quadrants.Q2, quadrants.Q3, quadrants.Q4]
}

/**
 * Get ranked execution order for tasks due today
 * Filters out delegated tasks and returns sorted by priority score
 */
export function getRankedExecutionOrder(
  tasks: Task[],
  todayDate: string = getLocalDateString(),
): TaskWithQuadrant[] {
  const enriched = tasks
    .filter((t) => t.planned_date === todayDate) // Only tasks due today
    .map((t) => enrichTaskWithQuadrant(t, todayDate))
    .filter((t) => t.delegationStatus !== 'delegate') // Remove delegated tasks
    .sort((a, b) => {
      // First sort by quadrant (Q1 > Q2 > Q3 > Q4)
      const quadrantOrder: Record<Quadrant, number> = { Q1: 4, Q2: 3, Q3: 2, Q4: 1 }
      const quadrantDiff = quadrantOrder[b.quadrant] - quadrantOrder[a.quadrant]
      if (quadrantDiff !== 0) return quadrantDiff

      // Then by priority score (descending)
      return b.priorityScore - a.priorityScore
    })

  return enriched
}

/**
 * Get delegated/waiting tasks (separate section)
 */
export function getDelegatedWaitingTasks(
  tasks: Task[],
  todayDate: string = getLocalDateString(),
): TaskWithQuadrant[] {
  const enriched = tasks
    .map((t) => enrichTaskWithQuadrant(t, todayDate))
    .filter((t) => {
      const status = t.delegationStatus
      return (
        status === 'delegate' ||
        status === 'waiting' ||
        status === 'blocked' ||
        status === 'support' ||
        status === 'depends-on'
      )
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)

  return enriched
}
