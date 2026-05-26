# FocusMind Codebase & Architecture Guide (Momentum v3)

This documentation provides a comprehensive architectural and code guide for AI agents working on this project. FocusMind is a personalized productivity center featuring a rich, interactive **Habit Tracker** with features like flexible scheduling, historical goal tracking, freeze states, anti-sabotage measures, custom sorting, and anonymous or Google authentication.

---

## 🛠️ Technology Stack & Dependencies

*   **Core**: React 18.2.0 (Single Page Application, functional components with Hooks)
*   **Routing**: React Router DOM 7.13.0 (`BrowserRouter`, `Routes`, `Route`, `useNavigate`, `useLocation`)
*   **Database & Auth**: Firebase Firestore & Auth 10.7.1
*   **Styling**: Tailwind CSS 3.3.6 (Vanilla Tailwind utility classes) & PostCSS
*   **Icons**: Lucide React 0.294.0
*   **Build Tool**: Vite 5.0.8 (runs on `npm run dev` at `http://localhost:5173`)

---

## 🗄️ Database Schema & Data Models (Firestore)

All user-specific records are stored in a single Firestore collection named `habits`. Each document corresponds to a single habit and belongs to a specific user.

### Document Fields & Structures

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier generated on creation (usually a UUID). |
| `userId` | `string` | The Firebase Auth `uid` of the owning user. |
| `name` | `string` | The display name of the habit (e.g., "Drink Water"). |
| `type` | `string` | The category of habit. Valid values: `'todo'`, `'todont'`, or `'horas'`. *(See Legacy Migration below).* |
| `goal` | `number` | Daily goal limit. Used primarily for `'todo'` and `'todont'` types. |
| `goalWorkdays` | `number` | Workday (Monday to Friday) goal in hours. Required for `'horas'` type. |
| `goalWeekends` | `number` | Weekend (Saturday & Sunday) goal in hours. Required for `'horas'` type. |
| `daysOfWeek` | `number[]` | Array of numbers `[0-6]` representing active days of the week (`0` = Sunday, `1` = Monday, ..., `6` = Saturday). |
| `createdAt` | `string` | ISO 8601 string representing document creation time. |
| `isFrozen` | `boolean` | Flag to freeze/pause the habit. Frozen habits are hidden from the active tracker list but retained in settings. |
| `order` | `number` | Sequential sorting index within the habit type (starts at 0). |
| `history` | `map` | Map matching date keys (`YYYY-MM-DD`) to user progress: `boolean` (for `'todo'` and `'todont'`) or `number` (for `'horas'`). |
| `goalHistory` | `object[]` | List of historical goal updates to maintain statistics integrity: `[{ effectiveDate: string, goalWorkdays: number, goalWeekends: number }]`. |
| `antiSabotage` | `object[]` | List of triggers and remedies: `[{ id: string, trigger: string, solution: string }]`. |

### Legacy Type Conversions
When interacting with the Firestore database, be aware of legacy data models that the application auto-migrates or handles on the fly:
*   `type === 'boolean'` is handled as `'todo'`
*   `type === 'numeric'` is handled as `'horas'`
*   If `goalWorkdays` or `goalWeekends` is missing for a `'horas'` habit, the application falls back to using the `goal` field.

---

## 📂 Codebase Directory Structure & Key Files

The project follows a standard Vite-React structure:

```
├── .cursor/               # IDE configuration logs
├── ai/                    # AI agents workspace and guides
│   └── guide.md           # This architecture guide
├── public/                # Static public assets
├── src/
│   ├── components/
│   │   └── shared/
│   │       ├── AppHeader.jsx     # Header navigation sub-component
│   │       └── Login.jsx         # Sign-in UI (Google & Anonymous Auth)
│   ├── features/
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx     # Landing feature hub routing to active features
│   │   └── habits/
│   │       ├── components/
│   │       │   ├── AddHabitModal.jsx     # Creates habits (ToDo, ToDon't, Horas)
│   │       │   ├── EditHabitModal.jsx    # Renames habits / alters workday & weekend goals
│   │       │   ├── HabitDetailModal.jsx  # Configures anti-sabotage triggers & solutions
│   │       │   ├── HabitsCalendar.jsx    # Interactive 30-day view with completion ratios
│   │       │   ├── HabitsList.jsx        # Grid weekly tracker, daily tracker, and sorting engine
│   │       │   ├── HabitsOverview.jsx    # Manage, freeze, delete, or edit habit metadata
│   │       │   ├── HabitsStats.jsx       # Completion analytics dashboard
│   │       │   └── StatsCard.jsx         # Generic stat widget
│   │       └── HabitTracker.jsx  # Core controller orchestrating data flow
│   ├── layouts/
│   │   └── AppLayout.jsx         # Authentication listener & global navigation container
│   ├── App.jsx                   # Central routing paths declaration
│   ├── ErrorBoundary.jsx         # Global error fallback component UI
│   ├── firebase.js               # Firebase configuration initialization
│   ├── index.css                 # Global styles and Tailwind setups
│   └── main.jsx                  # Main entry point mounting the React app
├── package.json                  # Script commands and dependencies
├── tailwind.config.js            # Tailwind custom extensions config
└── vite.config.js                # Vite build plugins config
```

---

## ⚡ Core Business Logic & UI Patterns

### 1. Database Sync & Auto-Migration
Inside [HabitTracker.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/features/habits/HabitTracker.jsx), a reactive Firestore snapshot listener (`onSnapshot`) listens to habits matching `userId`. Upon loading:
*   **Order Migration**: If any habit is missing an `order` property, the code calculates sequential order indexes starting from the max existing order index for that type, sorted by `createdAt`, and pushes the missing values to Firestore.
*   **Goal History Cleaning**: It detects and cleans duplicate date entries in the `goalHistory` array on the fly.

### 2. Historical Goal Logic (`getGoalForDate`)
To avoid breaking completion statistics when a user updates their habit goals, FocusMind tracks modifications via `goalHistory`. The system resolves the daily goal requirement using the following algorithm:
1. If the habit `type` is not `'horas'` or `'numeric'`, return the default `goal`.
2. Determine if the target date is a weekday (Monday to Friday) or weekend (Saturday or Sunday).
3. If `goalHistory` is empty or missing, fallback to the current `goalWorkdays` or `goalWeekends`.
4. Scan the `goalHistory` array to find entries where `effectiveDate <= targetDate`.
5. Select the closest previous entry (highest `effectiveDate` matching the condition). If multiple match the same date, choose the last index in the array.
6. Return the matching workday/weekend hour threshold.

### 3. Custom Drag & Drop / Reordering Logic
FocusMind implements custom, lightweight sorting inside [HabitsList.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/features/habits/components/HabitsList.jsx):
*   **Temporary Ordering State**: Entering "Order mode" sets `isSortingMode` to `true` and tracks edits in a `temporaryOrder` object (`{ [habitId]: order }`).
*   **Sequential Recalculation**: Clicking "Confirm" recalculates order numbers from `0` to `n-1` sequentially within each category to prevent gaps, then performs a batch upload (`onUpdateMultipleHabitOrders`) writing to Firestore.

### 4. Unsaved Hours Changes Batching
Adjusting hours on the weekly grid can lead to heavy Firestore write traffic. FocusMind optimizes this:
*   Expanding a `'horas'` habit in the weekly grid transforms cells into numeric input boxes.
*   Changes are kept in local component state `unsavedChanges` (`{ [habitId]: { [date]: value } }`).
*   An asterisk `*` highlights unsaved values.
*   Clicking **Save** pushes all changed values to Firestore in a batch and collapses the input row.

### 5. Authentication Architecture
In [AppLayout.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/layouts/AppLayout.jsx):
*   Authentication states trigger dynamically. If no user is logged in, the UI blocks rendering and displays [Login.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/components/shared/Login.jsx).
*   **Guest Access (Anonymous Auth)**: Allows instant usage using Firebase's `signInAnonymously`.
*   **Google Sign-In**: Uses standard pop-up Google Auth.

### 6. Multi-App Dashboard Hub Architecture
FocusMind is designed to serve as a **multi-app productivity suite**, not just a single Habit Tracker:
*   **Dashboard Hub Landing**: Upon successful login, users are redirected to a central [Dashboard.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/features/dashboard/Dashboard.jsx) screen where they select which productivity application they want to open.
*   **Current State**: Currently, "Habit Tracker" is the only application configured (defined under the `/habits` route).
*   **Scalability**: New applications (e.g. journal, calendar, notes) can be added simply by defining new items in the `features` array of [Dashboard.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/features/dashboard/Dashboard.jsx) and adding corresponding routes in [App.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/App.jsx).

---

## 💻 Feature Specification: Developer Hub App

The **Developer Hub** is designed as a daily, single-page dashboard for developer workflows, serving as the second application in the FocusMind suite. 

### 1. User Interface & Layout (Single-Page)

To maintain clean proportions when the **Goals** block grows vertically, the layout uses a 2-column grid system (`grid-cols-1 lg:grid-cols-12`) with independent columns:

*   **LEFT COLUMN (8/12 width - Daily Items)**: Stacks the daily-scoped blocks vertically:
    *   **A. Tareas Diarias (Daily To-Do List)**: Checkboxes, task text, a "Move to next day" button, and a "Delete" button. Persistent inline text input (`placeholder="Nueva tarea"`) for inline task creation.
    *   **B. Diario de DEV (DEV Journal)**: Scoped to the selected date. Rich textarea allowing notes (learned today, doubts, improvements) with an auto-save handler on blur and a manual "Guardar" button.
*   **RIGHT COLUMN (4/12 width - Persistent Goals)**: Houses the persistent goals list, allowing it to stretch vertically without pushing other blocks:
    *   **C. Objetivos (Goals)**: Hardcoded headers for **Liquidcars** and **Developer**. Next to each header is a `[+]` button that activates an inline input field to add new goals. Goal rows support inline editing and deletion.

### 2. Firestore Schema & Data Design (Unified in 'habits' Collection)

To bypass strict Firestore security constraints without modifying remote database rules, tasks, goals, and journal entries are stored directly inside the existing `habits` collection. The application differentiates them using the `type` field and filters them on the client side.

#### Developer Hub Tasks (Stored as `type: 'dev_task'`)
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier generated by the `generateId` fallback utility. |
| `userId` | `string` | The Firebase Auth `uid` of the owning user. |
| `name` | `string` | Task content (duplicate of `text` for safety). |
| `text` | `string` | Task content. |
| `completed` | `boolean` | Completion state. |
| `date` | `string` | Target date in `YYYY-MM-DD` format (allows shifting tasks forward and filtering by day). |
| `createdAt` | `string` | ISO 8601 string. |
| `type` | `string` | Set to `'dev_task'` |
| `order` | `number` | Set to `0` to prevent trigger loops in Habit Tracker migrations. |

#### Developer Hub Goals (Stored as `type: 'dev_goal'`)
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier generated by `generateId`. |
| `userId` | `string` | The Firebase Auth `uid` of the owning user. |
| `name` | `string` | Goal statement (duplicate of `text` for safety). |
| `text` | `string` | Goal statement. |
| `category` | `string` | Category grouping: `'liquidcars'` or `'developer'`. |
| `createdAt` | `string` | ISO 8601 string. |
| `type` | `string` | Set to `'dev_goal'` |
| `order` | `number` | Set to `0` to prevent trigger loops in Habit Tracker migrations. |

#### DEV Journal Entries (Stored as `type: 'dev_journal'`)
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Deterministic ID formatted as `${userId}_${date}_journal` to guarantee single daily records. |
| `userId` | `string` | The Firebase Auth `uid` of the owning user. |
| `name` | `string` | Helper display label (e.g. `"Journal YYYY-MM-DD"`). |
| `text` | `string` | Content text body (notes, lessons, doubts). |
| `date` | `string` | Selected date key in `YYYY-MM-DD` format. |
| `createdAt` | `string` | ISO 8601 string. |
| `type` | `string` | Set to `'dev_journal'` |
| `order` | `number` | Set to `0`. |

#### Client-side Filtering
*   **Habit Tracker**: Snapshot queries in [HabitTracker.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/features/habits/HabitTracker.jsx) read all habits, but filter out elements where `type === 'dev_task'`, `type === 'dev_goal'`, or `type === 'dev_journal'` inside the callback to avoid lists pollution.
*   **Developer Hub**: A single snapshot listener in [DeveloperHub.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/features/developer-hub/DeveloperHub.jsx) reads habits and filters them into task, goal, and journal records based on their `type` on the client side. This achieves zero-configuration index safety.

### 3. Integration & Routing Architecture
*   **New Feature Directory**: `src/features/developer-hub/DeveloperHub.jsx` contains the all-in-one page logic.
*   **Route**: Mapped in [App.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/App.jsx) under path `/developer-hub`.
*   **Dashboard Entry**: Added to the `features` array in [Dashboard.jsx](file:///c:/PersonalProjects/repos/momentum-v3/src/features/dashboard/Dashboard.jsx):
    ```javascript
    {
      id: 'developer-hub',
      title: 'Developer Hub',
      description: 'Panel de control diario para tareas de desarrollo y objetivos profesionales',
      icon: Code, // imported from lucide-react
      color: 'purple',
      route: '/developer-hub'
    }
    ```

---

## 🚦 Guidelines for AI Agent Development

When adding features or refactoring FocusMind, please adhere to these guidelines:

### 1. Code Consistency
*   **TypeScript / JSDoc**: While files are `.jsx`, write clean Javascript. Add JSDoc comments to document business logic algorithms.
*   **Framework Rules**: Do not mix routing methods. Use `react-router-dom` v7 primitives for routing.

### 2. State & Database Mutability
*   **Always Scope by User**: Ensure all Firestore queries include a `.where('userId', '==', user.uid)` clause.
*   **Prefer Batching**: For multi-row edits (e.g., ordering or hours editing), store changes locally in state and push to Firebase in one go rather than making a database call on every keystroke/interaction.
*   **Preserve History**: Never wipe out `history` or `goalHistory` fields. Changes to goals must be appended to `goalHistory` with the `effectiveDate` set to today's date (`YYYY-MM-DD`) to keep previous stats correct.

### 3. Styling Guidelines
*   **Vanilla Tailwind**: Rely entirely on Tailwind CSS utility classes. Do not write custom CSS unless absolutely necessary (add it to `src/index.css`).
*   **Aesthetics & Micro-animations**: Keep design sleek. Use the existing theme values (indigo and purple gradients, glassmorphism overlays, and smooth Tailwind duration transitions like `transition-all duration-300`).

### 4. Environmental Configuration
The app reads credentials from `.env` in the project root:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_APP_ID=habit-tracker-pro
```
If you encounter auth setup issues, remember to tell the user to enable "Anonymous" and "Google" providers in the Firebase Console under Authentication.
