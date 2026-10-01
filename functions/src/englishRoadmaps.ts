import { outputLanguage } from "./outputLanguage";

interface EnglishOutline {
  title: string;
  summary: string;
  steps: string[][];
}

const outlines: Record<string, EnglishOutline> = {
  "android-activity-lifecycle": {
    "title": "Activity lifecycle and entry points",
    "summary": "Explore Activity entry points, lifecycle callbacks, resource management, state restoration, tasks and navigation.",
    "steps": [
      [
        "Activities and entry points",
        "Where an app starts"
      ],
      [
        "Lifecycle callbacks",
        "Signals from creation to destruction"
      ],
      [
        "Visibility and resource management",
        "Acquire and release resources together"
      ],
      [
        "Saving and restoring state",
        "State that survives configuration changes"
      ],
      [
        "Tasks and the back stack",
        "How screens stack up"
      ],
      [
        "Intents and results",
        "Navigate between screens and receive results"
      ]
    ]
  },
  "android-app-architecture": {
    "title": "App architecture patterns",
    "summary": "Explore separation of concerns, MVC, MVP, MVVM, MVI, Clean Architecture and their trade-offs.",
    "steps": [
      [
        "Why separate concerns?",
        "Why application structure matters"
      ],
      [
        "MVC and MVP",
        "Early separation patterns"
      ],
      [
        "MVVM",
        "Update views through observation"
      ],
      [
        "MVI and unidirectional data flow",
        "One state, one direction"
      ],
      [
        "Clean Architecture layers",
        "Point dependencies inward"
      ],
      [
        "Choosing patterns and trade-offs",
        "When to use each approach"
      ]
    ]
  },
  "android-app-components": {
    "title": "App components and intents",
    "summary": "Understand Android components, the manifest, Activities, Services, receivers, providers and intents.",
    "steps": [
      [
        "App components and the manifest",
        "The entry points of an app"
      ],
      [
        "Activities",
        "The screen component users interact with"
      ],
      [
        "Services",
        "Work without a user interface"
      ],
      [
        "Broadcast receivers",
        "Respond to system and app events"
      ],
      [
        "Content providers",
        "Share data between apps"
      ],
      [
        "Intents",
        "Messages that invoke components"
      ]
    ]
  },
  "android-architecture-components": {
    "title": "Architecture components and dependency injection",
    "summary": "Explore lifecycle-aware components, ViewModel, LiveData, StateFlow, dependency injection and Hilt.",
    "steps": [
      [
        "Lifecycle-aware components",
        "Objects that observe lifecycle changes"
      ],
      [
        "ViewModel",
        "Own state across configuration changes"
      ],
      [
        "LiveData and StateFlow",
        "Observe state updates"
      ],
      [
        "Lifecycle-safe state collection",
        "Collect only while the screen can use updates"
      ],
      [
        "Dependency injection principles",
        "Provide dependencies from outside"
      ],
      [
        "Automating DI with Hilt",
        "Dependency injection for Android"
      ]
    ]
  },
  "android-async-coroutines": {
    "title": "Asynchronous work and coroutines",
    "summary": "Explore the main thread, ANRs, coroutine suspension, structured concurrency, dispatchers, Flow and WorkManager.",
    "steps": [
      [
        "The main thread and ANRs",
        "Keep the UI thread responsive"
      ],
      [
        "Coroutines and suspension",
        "Wait without blocking a thread"
      ],
      [
        "Structured concurrency and scopes",
        "Manage coroutine lifetimes"
      ],
      [
        "Dispatchers and thread switching",
        "Choose where work runs"
      ],
      [
        "Flow: asynchronous streams",
        "Emit values over time"
      ],
      [
        "WorkManager: persistent background work",
        "Schedule work that survives app restarts"
      ]
    ]
  },
  "android-compose-basics": {
    "title": "Jetpack Compose fundamentals",
    "summary": "Learn declarative UI, composables, state, recomposition, state restoration, hoisting, modifiers and layouts.",
    "steps": [
      [
        "Declarative UI and composables",
        "Describe the UI with functions"
      ],
      [
        "State and recomposition",
        "Update the UI when state changes"
      ],
      [
        "rememberSaveable and state restoration",
        "Keep state across configuration changes"
      ],
      [
        "State hoisting",
        "Move state to its owner"
      ],
      [
        "Modifier",
        "Style and position composables"
      ],
      [
        "Layouts: Column, Row and Box",
        "The basic layout containers"
      ]
    ]
  },
  "android-fragments-navigation": {
    "title": "Fragments and navigation",
    "summary": "Explore Fragments, view lifecycles, transactions, navigation graphs, arguments and deep links.",
    "steps": [
      [
        "What is a Fragment?",
        "A reusable piece of a screen"
      ],
      [
        "Fragment and view lifecycles",
        "Two overlapping lifecycles"
      ],
      [
        "FragmentManager and transactions",
        "Attach and replace Fragments"
      ],
      [
        "Navigation Component and graphs",
        "Define navigation in one place"
      ],
      [
        "Passing arguments between screens",
        "Pass values safely"
      ],
      [
        "Deep links and app links",
        "Open a specific screen from outside"
      ]
    ]
  },
  "android-local-storage": {
    "title": "Local data storage",
    "summary": "Choose between preferences, DataStore, SQLite, Room and files, and understand relationships and migrations.",
    "steps": [
      [
        "Choosing a storage option",
        "What to store and where"
      ],
      [
        "SharedPreferences and DataStore",
        "Simple key-value storage"
      ],
      [
        "SQLite and relational storage",
        "Foundations of structured data"
      ],
      [
        "Room: a SQLite abstraction",
        "A type-safe database layer"
      ],
      [
        "Room relationships and migrations",
        "As the schema evolves"
      ],
      [
        "Files and storage locations",
        "Internal and external storage"
      ]
    ]
  },
  "android-networking": {
    "title": "Android networking",
    "summary": "Explore HTTP, networking permissions, OkHttp, Retrofit, JSON serialization, error handling and repositories.",
    "steps": [
      [
        "HTTP and network permissions",
        "How apps communicate with servers"
      ],
      [
        "OkHttp: the HTTP client",
        "The layer that sends requests"
      ],
      [
        "Retrofit: declarative APIs",
        "Define APIs with interfaces"
      ],
      [
        "JSON serialization",
        "Convert between JSON and objects"
      ],
      [
        "Handling errors and results",
        "Deal with failure explicitly"
      ],
      [
        "The data layer and repositories",
        "A boundary around networking"
      ]
    ]
  },
  "android-platform-fundamentals": {
    "title": "Android platform and app fundamentals",
    "summary": "Explore platform layers, ART, APK and AAB packaging, sandboxing, permissions, processes and resources.",
    "steps": [
      [
        "Platform architecture layers",
        "From the kernel to applications"
      ],
      [
        "ART and app execution",
        "How app code runs"
      ],
      [
        "APK and AAB packaging",
        "How apps are packaged and distributed"
      ],
      [
        "App sandboxing and permissions",
        "Isolation and access between apps"
      ],
      [
        "Processes and app lifecycle",
        "When app processes live and die"
      ],
      [
        "Resources and configuration qualifiers",
        "Choose resources for each device"
      ]
    ]
  }
};

/** English copies retain the curated step order; lesson bodies are generated on demand. */
export function localizeRoadmap<T extends { title?: string; summary?: string; subject?: string; steps?: unknown[]; prereqTree?: unknown[] }>(
  id: string, roadmap: T, language: unknown,
): T | null {
  if (outputLanguage(language) === "ko") return roadmap;
  const outline = outlines[id];
  // Do not silently present an untranslated future roadmap as an English lesson.
  if (!outline) return null;
  return {
    ...roadmap,
    title: outline.title,
    summary: outline.summary,
    subject: "Android",
    steps: outline.steps.map(([title, desc], index) => ({ id: index + 1, title, desc, body: "", questions: [] })),
    prereqTree: [],
  };
}
