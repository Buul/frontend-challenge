/** JSON values persisted in `localStorage` so mock state survives reloads. Corrupt entries fall back to `fallback`. */
export function persisted<T>(key: string, fallback: () => T, isValid: (value: unknown) => boolean) {
  return {
    read(): T {
      try {
        const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
        return isValid(value) ? (value as T) : fallback()
      } catch {
        return fallback()
      }
    },
    write(value: T) {
      localStorage.setItem(key, JSON.stringify(value))
    },
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
