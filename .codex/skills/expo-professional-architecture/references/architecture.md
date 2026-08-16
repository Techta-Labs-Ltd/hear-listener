# Canonical Architecture

Use this tree as a default, then omit folders the product does not need.

```text
src/
  app/                         # Expo Router filesystem boundary
    _layout.tsx
    index.tsx
    (tabs)/
      _layout.tsx
      home.tsx
  components/
    ui/                        # Branded primitives
    layout/                    # Screen/container/header primitives
    navigation/                # Shared navigation presentation
    content/                   # Cross-feature product composites
  constants/
    theme.ts
  data/                        # Bundled immutable fixtures or seed input
  features/
    home/
      screens/
        HomeScreen.tsx
      hooks/
      use-cases/
  hooks/                       # Truly cross-feature hooks
  navigation/
    routes.ts                  # Typed builders and allowlists
    screen-options.ts
    tabs.ts
  services/                    # Platform, native, network, and repository adapters
  stores/                      # Cross-screen client state
  types/                       # Shared exported contracts
    components.ts
    navigation.ts
    preferences.ts
  utils/                       # Pure deterministic helpers
tests/                         # Mirrors src paths if project policy centralizes tests
```

## Placement Test

| Code | Destination |
| --- | --- |
| Route registration or nested navigator options | Nearest `src/app/**/_layout.tsx` |
| One-line route-to-screen export | `src/app/<route>.tsx` |
| Screen orchestration | `src/features/<feature>/screens` |
| Reused visual primitive | `src/components/ui` |
| Reused page geometry | `src/components/layout` |
| Cross-feature product component | Appropriate `src/components/<domain>` |
| Feature-only controller or use case | `src/features/<feature>` |
| Cross-screen state | `src/stores` |
| Native/platform side effect | `src/services` |
| Pure transformation or formatter | `src/utils` |
| Shared exported TypeScript contract | `src/types` |
| Theme/design token | `src/constants/theme.ts` |

## Dependency Direction

Keep dependencies pointing inward toward stable contracts:

```text
app routes -> feature screens -> components/hooks -> stores/services -> types/utils/constants
```

Services may implement interfaces consumed by use cases. UI modules must not import route files. Stores must not import screen components. Types and pure utilities must not import React Native runtime modules unless the contract specifically models a platform API.

Avoid mirrored abstractions. One route source, one theme source, one contract owner, and one storage adapter should exist for each responsibility.

