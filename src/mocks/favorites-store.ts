import { isRecord, persisted } from './storage'

/** Favorites per user id, kept in `localStorage` so they survive reloads. */
const store = persisted<Record<string, string[]>>('kurio:mock:favorites', () => ({}), isRecord)

const listFor = (userId: string) => {
  const ids = store.read()[userId]
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
}

const writeFor = (userId: string, ids: string[]) => store.write({ ...store.read(), [userId]: ids })

export const favoritesStore = {
  list: listFor,
  add(userId: string, nftId: string) {
    const ids = listFor(userId)
    if (!ids.includes(nftId)) writeFor(userId, [...ids, nftId])
    return listFor(userId)
  },
  remove(userId: string, nftId: string) {
    writeFor(userId, listFor(userId).filter((id) => id !== nftId))
    return listFor(userId)
  },
}
