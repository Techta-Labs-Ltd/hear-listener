---
name: expo-professional-architecture
description: Architect, create, review, or refactor production Expo and React Native applications written in TypeScript. Use for project structure, Expo Router ownership, file and symbol naming, reusable components, state and server-data libraries, persistence, native-module integration, accessibility, dependency cleanup, and quality gates.
---

# Professional Expo Architecture

Build an editable, predictable Expo codebase in which each file has one clear responsibility. Follow the project's `AGENTS.md` and the exact documentation for its installed Expo SDK before changing code.

## Start With Evidence

1. Read `AGENTS.md`, `package.json`, app config, TypeScript config, lint config, and the current route tree.
2. Determine the installed Expo SDK from `package.json`. Read the matching versioned Expo docs; never assume the latest API applies.
3. Inspect imports and the working tree before moving or deleting files. Preserve unrelated user changes.
4. Identify the app's product constraints: supported platforms, offline requirements, authentication, accessibility, and native capabilities.
5. Read [architecture.md](references/architecture.md) before creating or moving folders. Read [library-selection.md](references/library-selection.md) before choosing state, storage, data, or native libraries.

## Establish Ownership

- Keep `src/app` as the Expo Router filesystem boundary: layouts, route groups, redirects, and thin route files only.
- Put screen orchestration in `src/features/<feature>/screens` and feature-specific hooks or use cases beside that feature.
- Put reusable components in `src/components`, grouped by stable responsibility such as `ui`, `layout`, `navigation`, `content`, or a shared product domain.
- Put shared hooks in `src/hooks`, pure helpers in `src/utils`, external/platform integrations in `src/services`, application-wide stores in `src/stores`, and immutable app configuration in `src/constants`.
- Put exported domain contracts in `src/types`. Keep a prop type local only when it is private to one implementation.
- Do not create duplicate catch-all folders (`common`, `shared`, `helpers`, and `lib`) with overlapping ownership. Adopt one destination and migrate imports completely.
- Prefer direct, editable modules. Split a file when it mixes orchestration, rendering, state, and data access—not merely because it is long.

## Apply Naming Rules

- React components and their files: `PascalCase.tsx`.
- Hooks: `useDescriptiveName.ts` and an exported `useDescriptiveName` function.
- Stores: `<domain>-store.ts`; services and repositories: `<domain>-service.ts` and `<domain>-repository.ts`.
- Utilities, constants, schemas, and domain type modules: descriptive `kebab-case.ts` names.
- Tests live in one project-selected test root and mirror source paths; use `<subject>.test.ts[x]`.
- Preserve Expo Router reserved forms: `_layout.tsx`, `index.tsx`, `[id].tsx`, `[...rest].tsx`, and `(group)`.
- Name by responsibility, not presentation accidents. Avoid `Utils.ts`, `Common.tsx`, `Misc.ts`, numbered copies, and ambiguous barrels.
- Use barrels only at deliberate public boundaries. Do not create circular imports or hide ownership behind repo-wide barrels.

## Keep TypeScript Contracts Coherent

- Enable strict TypeScript and model domain state with discriminated unions rather than parallel booleans.
- Export shared contracts from domain files under `src/types`; use `import type` for type-only imports.
- Validate untrusted boundaries—storage, deep links, SQLite rows, network responses, and voice invocations—before treating values as domain types.
- Do not use `any`, unsafe assertions, or duplicated inline public prop shapes to bypass design problems.
- Keep constants as data and behaviour in functions, hooks, services, or stores. Avoid executable logic hidden inside type or theme files.

## Choose State by Lifetime

- Keep ephemeral, local interaction state in the nearest component or hook.
- Use Zustand for cross-screen client state. Subscribe with selectors; split stores by domain, not screen.
- Persist only durable fields. With Zustand persistence, define an explicit version, migration, `partialize`, hydration state, and reset behaviour.
- Use TanStack Query only when remote server state exists and needs caching, invalidation, retries, or refetching.
- Use SQLite behind a typed repository for relational, offline, full-text, or large structured data. Keep SQL out of screens and components.
- Use SecureStore only for credentials or secrets; AsyncStorage is suitable for non-sensitive preferences.
- Use React Context for dependency or lifecycle boundaries that require a provider, not as a default global state manager.

## Design Navigation Deliberately

- Let Expo Router own route discovery. Do not create a second navigation tree that duplicates route registration.
- Centralize typed route builders, route metadata, tab definitions, and shared screen options outside individual screens.
- Keep each route module readable and thin, normally exporting one screen implementation.
- Use route groups for organization without changing URLs. Put shared stack/tab options in the nearest `_layout.tsx`.
- Validate external and database-derived destinations against an allowlist before navigation.

## Build Reusable UI and Accessibility In

- Define semantic tokens in one theme module: colors, typography, spacing, radii, elevation, breakpoints, motion, and touch targets.
- Build small primitives first, then composites. Screens compose them and do not reproduce card, row, input, empty-state, or section patterns.
- Use a shared responsive screen/container primitive. Components consume responsive state only when their own topology changes.
- Support safe areas, keyboard avoidance, split-screen resizing, orientation changes, Dynamic Type, reduced motion, and at least 48-by-48 touch targets.
- Add roles, labels, hints, visible focus, live-region behaviour, and non-colour state cues. Test with VoiceOver and TalkBack.
- Treat speech and haptics as supplemental feedback. Never require an inaccessible gesture or start microphone access without an explicit user action.

## Manage Expo Dependencies Correctly

- Install Expo and React Native packages with `npx expo install` so versions match the project SDK.
- Confirm platform support, configuration plugins, permissions, and whether a development-client rebuild is required.
- Prefer Expo SDK modules when they meet the requirement. Add third-party libraries only for a concrete capability.
- Keep `Host`-style application wrappers once at the root. Do not repeat global providers on individual screens.
- Never patch `node_modules` to silence generated build warnings. Fix app configuration, dependency versions, caches, or upstream compatibility.
- Remove a dependency only after proving no source, config plugin, build script, or generated native project uses it.

## Refactor Safely

1. Define the target ownership and migration sequence.
2. Extract reusable contracts and primitives without changing behaviour.
3. Move one boundary at a time and update all imports.
4. Replace duplicate implementations with the canonical module.
5. Run an import/reference audit, then delete only proven-unused files and packages.
6. Keep changes reviewable; avoid compressed one-line JSX and unrelated rewrites.

## Validate Before Handoff

- Run formatting, strict TypeScript, ESLint, and relevant unit/component tests.
- Run `npx expo-doctor` and verify app config.
- For native dependency or config-plugin changes, regenerate or inspect native projects and build a development client on required platforms.
- Exercise route entry, back navigation, deep links, persistence hydration, offline startup, permission denial, accessibility, and responsive layouts.
- Report commands run, failures that remain, and any native rebuild the user must perform.

