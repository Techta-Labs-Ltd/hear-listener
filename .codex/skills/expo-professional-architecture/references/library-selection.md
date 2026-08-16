# Library Selection

Choose from product requirements, not popularity.

| Need | Preferred tool | Boundary |
| --- | --- | --- |
| Local component interaction | React state/reducer | Component or feature hook |
| Cross-screen client state | Zustand | Domain store with selectors |
| Durable non-secret preferences | Zustand persist + AsyncStorage | Versioned, partial persistence |
| Remote API cache | TanStack Query | Query hooks and API client |
| Relational/offline/full-text data | `expo-sqlite` | Typed repository |
| Tokens and credentials | `expo-secure-store` | Authentication service |
| Form state with substantial validation | React Hook Form plus schema validator when justified | Feature form hook |
| Navigation | Expo Router | Filesystem routes plus typed builders |
| Motion | React Native/Reanimated when the interaction requires it | Reusable component; reduced-motion path |

## Rules

- Do not use a remote-data cache before a backend exists.
- Do not persist transient overlays, microphone sessions, errors, or navigation state without a recovery requirement.
- Do not put platform side effects inside Zustand actions when a controller/service can keep the store deterministic.
- Do not expose raw SQLite rows. Map them to validated domain types in the repository.
- Do not store secrets in AsyncStorage or SQLite.
- Do not add a library for a helper that is small, tested, and maintainable locally.
- Before adding a native library, check the exact Expo SDK documentation and confirm development-build requirements.
