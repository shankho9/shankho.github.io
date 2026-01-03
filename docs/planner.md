# Personal Planner - User Guide

A comprehensive daily planning tool based on the Eisenhower Matrix for effective task management and prioritization.

## Overview

The Personal Planner is an intelligent task management system that helps you organize your work using the Eisenhower Matrix framework. It automatically categorizes tasks into quadrants based on importance and urgency, making it easier to focus on what matters most.

## Accessing the Planner

1. **Navigate to Planner**: Click "Planner" in the Quick Links section of the footer, or go to `/dev/planner`
2. **Authentication Required**: You must be signed in with Google to access the planner
3. **First Time Access**: If not authenticated, you'll see a sign-in prompt with a Google authentication button

## Core Concepts

### Eisenhower Matrix

The planner uses the Eisenhower Matrix to categorize tasks into four quadrants:

#### **Q1: Do Now** (Important & Urgent)

- Tasks that are both important (marked as MIT) and urgent (due today or overdue)
- These should be tackled immediately
- Examples: Critical deadlines, urgent MITs, emergency tasks

#### **Q2: Schedule** (Important & Not Urgent)

- Important tasks (marked as MIT) that are not yet urgent
- These should be scheduled for later
- Examples: Strategic planning, important projects with future deadlines, deep work sessions

#### **Q3: Defer / Batch** (Not Important & Urgent)

- Tasks that are urgent but not important
- Can be batched, delegated, or handled when convenient
- Includes tasks with Q3 tags (meetings, emails, admin tasks) due within 3 days
- Examples: Routine meetings, administrative tasks, emails requiring quick response

#### **Q4: Later / Parking Lot** (Not Important & Not Urgent)

- Tasks that can be deferred indefinitely
- These are typically hidden from the main view to reduce clutter
- Examples: Nice-to-have items, low-priority tasks, future considerations

## Matrix Logic

The planner automatically assigns tasks to quadrants using this logic:

1. **Importance**: Determined by the MIT (Most Important Task) flag
   - If `is_mit = true` → Task is important
   - If `is_mit = false` → Task is not important

2. **Urgency**: Determined by the planned date
   - If `planned_date <= today` → Task is urgent
   - If `planned_date > today` → Task is not urgent

3. **Tag Overrides**: Special tags can override standard quadrant assignment:
   - `@quick-win` + urgent → Q1 (quick wins done immediately when urgent)
   - `@deep-work` + not urgent → Q2 (deep work needs scheduled time)
   - Q3 tags (see Tags section) + due within 3 days → Q3

4. **Standard Assignment**:
   - Important + Urgent → Q1
   - Important + Not Urgent → Q2
   - Not Important + Urgent → Q3
   - Not Important + Not Urgent → Q4

## Tags System

Tags help categorize tasks and influence quadrant placement. Add tags in the task notes field using `@tag` or `#tag` format (case-insensitive).

### Q1 Tags

- **`@quick-win`** - Quick tasks that can be completed fast
  - When urgent: Forces Q1 placement
  - Use for: Small tasks that provide immediate value

### Q2 Tags

- **`@deep-work`** - Requires focused, uninterrupted time
  - When not urgent: Forces Q2 placement
  - Use for: Complex tasks requiring concentration, writing, analysis

### Q3 Tags (Batching & Delegation)

Tasks with these tags are placed in Q3 if due within the next 3 days:

- **`@delegate`** - Should be assigned to someone else
- **`@depends-on`** or `@depends` - Waiting on another task or person
- **`@waiting`** - Waiting for response or action
- **`@blocked`** - Cannot proceed until unblocked
- **`@support`** - Needs support from team
- **`@batch`** - Can be grouped with similar tasks
- **`@meeting`** - Meeting or call related
- **`@email`** - Email-related task
- **`@admin`** - Administrative or routine task

### Q4 Tags

- **`@low-energy`** - Can be done when energy is low
  - Use for: Mindless tasks, routine work, low-effort items

## Priority Scoring

Tasks are ranked within quadrants using a priority score:

- **+50 points**: Marked as MIT (Most Important Task)
- **+30 points**: Overdue tasks
- **+20 points**: Due today
- **-20 points**: Marked as "can wait" or `@defer`
- **-30 points**: Blocked or waiting tasks
- **-100 points**: Q4 tasks (automatically hidden)

Tasks are sorted by quadrant first (Q1 > Q2 > Q3 > Q4), then by priority score within each quadrant.

## Features

### Dashboard (`/dev/planner`)

The main planning interface provides:

- **Eisenhower Matrix View**: See all tasks organized by quadrant
- **Buckets View**: View tasks grouped by theme/bucket
- **Statistics Cards**: Quick overview of total tasks, today's tasks, MITs, and completion status
- **Date Selection**: View tasks for any date using the date picker
- **Ranked Execution Order**: See tasks prioritized for today's execution
- **Delegated/Waiting Tasks**: Separate section for tasks that can't be executed yet

### Daily Planner (`/dev/planner/daily`)

Kanban-style board for daily task management:

- **Three Columns**: Today, Doing, Done
- **Quick Add**: Add tasks directly to any column
- **Drag & Drop**: Move tasks between columns (if enabled)
- **Task Details**: View and edit task information
- **Theme Filtering**: Filter tasks by bucket/theme
- **Date Navigation**: View tasks for different dates

### Task Management (`/dev/planner/tasks`)

Comprehensive task management interface:

- **All Tasks View**: See all tasks in one place
- **Filtering & Sorting**: Filter by status, theme, date; sort by various fields
- **Bulk Operations**: Export tasks, manage multiple tasks at once
- **Tag Suggestions**: Autocomplete for tags with descriptions
- **Tag Legend**: Reference guide for available tags
- **Quick Add**: Fast task creation with auto-complete
- **Edit Tasks**: Update title, status, MIT flag, priority, theme, date, notes
- **Delete Tasks**: Remove tasks (with confirmation)
- **Auto-Cleanup**: Done tasks older than 1 day are automatically hidden

### Backlog (`/dev/planner/backlog`)

Capture tasks quickly for later planning:

- **Quick Capture**: Add tasks without planning dates
- **Filter by Priority**: View high, medium, or low priority tasks
- **Move to Today**: One-click action to move tasks to today's plan
- **Edit Tasks**: Update task details before planning

### Weekly Review (`/dev/planner/review`)

Reflect on your week and plan ahead:

- **Completed Tasks**: View all tasks completed during the week
- **Unfinished MITs**: See MITs that weren't completed
- **Weekly Insights**: Record wins, improvements, and lessons learned
- **Next Week Planning**: Set MITs for the upcoming week
- **Week Navigation**: Navigate between different weeks
- **Weekly Statistics**: See completion rates and task distribution

### Printable Daily Plan (`/dev/planner/print/today`)

Generate a clean, print-friendly daily plan:

- **Top MITs**: Your 3 most important tasks highlighted
- **Task List**: All tasks organized by status
- **Matrix View**: Compact Eisenhower Matrix
- **Administrative Tasks**: All tasks tagged with administrative tags (meetings, emails)
- **Back Button**: Return to planner after printing
- **Print/Save**: Use browser's Print function (Ctrl/Cmd + P) to save as PDF

## Task Properties

Each task can have the following properties:

- **Title**: Task description (required)
- **Status**: `backlog`, `today`, `doing`, or `done`
- **MIT Flag**: Mark as Most Important Task (affects importance)
- **Priority**: `high`, `medium`, or `low`
- **Planned Date**: When the task should be completed (YYYY-MM-DD format)
- **Theme/Bucket**: Optional categorization for grouping related tasks
- **Notes**: Free-form text field for tags, details, context

## Workflow Recommendations

### Daily Planning

1. **Morning Review**: Start by viewing the Dashboard to see your matrix
2. **Identify Q1 Tasks**: Focus on important and urgent tasks first
3. **Schedule Q2 Tasks**: Plan time for important but not urgent work
4. **Batch Q3 Tasks**: Group similar administrative tasks together
5. **Review Q4**: Consider if any deferred tasks should be promoted

### Task Creation

1. **Quick Capture**: Add tasks to backlog when they come up
2. **Tag Appropriately**: Use tags to help with categorization
3. **Set Planned Dates**: Assign dates to make tasks appear in the matrix
4. **Mark MITs**: Identify your most important tasks for the day/week
5. **Add Context**: Use notes field for additional details and tags

### Weekly Review

1. **Review Completed Tasks**: Celebrate wins and learn from patterns
2. **Analyze Unfinished MITs**: Understand why important tasks weren't completed
3. **Record Insights**: Document what went well and what to improve
4. **Plan Ahead**: Set MITs for the upcoming week
5. **Clean Up**: Archive or delete tasks that are no longer relevant

### Using Tags Effectively

- **Time-Based Tags**: Use `@quick-win`, `@deep-work`, `@low-energy` to match tasks with your energy levels
- **Delegation Tags**: Use `@delegate`, `@waiting`, `@blocked` to track dependencies
- **Batch Tags**: Use `@batch`, `@meeting`, `@email`, `@admin` to group similar tasks
- **Combine Tags**: You can use multiple tags in notes, but only the first matching tag affects quadrant placement

## Best Practices

1. **Mark MITs Carefully**: Only mark 2-3 tasks as MIT per day to maintain focus
2. **Use Planned Dates**: Set realistic dates to help with urgency calculation
3. **Leverage Tags**: Tags help with automatic categorization and filtering
4. **Regular Reviews**: Use weekly review to reflect and improve
5. **Keep Backlog Clean**: Regularly review and plan backlog items
6. **Batch Similar Tasks**: Group administrative tasks to improve efficiency
7. **Use Themes**: Organize related tasks using themes/buckets
8. **Print Daily Plan**: Use the printable view to stay focused offline

## Keyboard Shortcuts

- **Enter**: Save task when editing
- **Esc**: Cancel editing or close dialogs
- **Tab**: Navigate between form fields
- **Arrow Keys**: Navigate tag suggestions (when visible)

## Tips & Tricks

- **Quick Wins**: Start your day with a `@quick-win` task to build momentum
- **Deep Work**: Schedule `@deep-work` tasks for times when you have uninterrupted focus
- **Batch Processing**: Group `@email`, `@admin`, and `@meeting` tasks together
- **Theme Organization**: Use themes to organize tasks by project, area, or category
- **Date Planning**: Set planned dates even for future tasks to see them in the matrix
- **Weekly Review**: Make weekly review a habit to improve your planning over time

## Understanding the Matrix Visualization

- **Q1 (Red)**: High priority, immediate action needed
- **Q2 (Blue)**: Important but can be scheduled
- **Q3 (Yellow)**: Urgent but less important, can be batched
- **Q4 (Gray)**: Low priority, can be deferred

Tasks within each quadrant are sorted by priority score, with the highest priority tasks appearing first.

## Export & Reporting

- **Task Export**: Export all tasks to CSV for external analysis
- **Print View**: Generate printable daily plans for offline use
- **Weekly Review**: Document weekly progress and insights

## Getting Started

1. Sign in with Google authentication
2. Start by adding a few tasks to the backlog
3. Mark 2-3 tasks as MITs for today
4. Set planned dates for tasks
5. View the Dashboard to see your Eisenhower Matrix
6. Start working through Q1 tasks
7. Schedule time for Q2 tasks
8. Batch Q3 tasks together
9. Review weekly to improve your system

## Support

For technical issues or questions about the planner implementation, refer to the codebase documentation or contact @Siddhartha Basu
