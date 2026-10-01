/** Visitor favorites kept in `localStorage` so they survive reloads; there is no user account yet. */
const STORAGE_KEY = 'kurio:mock:favorites'

function read(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

const write = (ids: string[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))

export const favoritesStore = {
  list: read,
  add(id: string) {
    const ids = read()
    if (!ids.includes(id)) write([...ids, id])
    return read()
  },
  remove(id: string) {
    write(read().filter((current) => current !== id))
    return read()
  },
}
