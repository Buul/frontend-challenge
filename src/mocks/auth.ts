import type { User } from '@/lib/api/types'
import { isRecord, persisted } from './storage'

type UserRecord = User & {
  /** PBKDF2-SHA256, 100k iterations, hex encoded; the mock never keeps passwords in clear text. */
  passwordHash: string
  salt: string
}

/** Fixture accounts. Passwords (for demo and tests only): `Kurio@123` and `Kurio@456`. */
export const users: UserRecord[] = [
  {
    id: 'user-ana',
    name: 'Ana Souza',
    email: 'ana@kurio.dev',
    salt: 'fbc4f622d93e2de9aedc8ce0e5924e3f',
    passwordHash: '6a58e84581983ceae7a3e8dd561a44ccf20c3fcf1e510221419065a6751c536c',
  },
  {
    id: 'user-bruno',
    name: 'Bruno Lima',
    email: 'bruno@kurio.dev',
    salt: 'a7e69de91a97a14242c4bd6919a138dd',
    passwordHash: '2a8bd19a444bc2658dec41a6fa4e559ac9c88dc48942b34db0b8632635f340eb',
  },
]

const SESSION_TTL_MS = 30 * 60 * 1000

const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
const fromHex = (hex: string) => new Uint8Array(hex.match(/../g)!.map((pair) => Number.parseInt(pair, 16)))

async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations: 100_000 }, key, 256)
  return toHex(bits)
}

export const toPublicUser = ({ id, name, email }: UserRecord): User => ({ id, name, email })

export async function verifyCredentials(email: string, password: string) {
  const user = users.find((candidate) => candidate.email === email.trim().toLowerCase())
  // Hashes even for unknown e-mails so response time doesn't reveal which accounts exist.
  const hash = await hashPassword(password, user?.salt ?? '00'.repeat(16))
  return user && hash === user.passwordHash ? user : undefined
}

type StoredSession = { userId: string; expiresAt: string }

/** Remove this key (or let `expiresAt` pass) to simulate the server expiring every session. */
export const SESSIONS_STORAGE_KEY = 'kurio:mock:sessions'

const sessions = persisted<Record<string, StoredSession>>(SESSIONS_STORAGE_KEY, () => ({}), isRecord)

export const sessionStore = {
  create(userId: string) {
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
    const now = Date.now()
    // Drops expired sessions so the store doesn't grow forever.
    const live = Object.fromEntries(Object.entries(sessions.read()).filter(([, session]) => Date.parse(session.expiresAt) > now))
    sessions.write({ ...live, [token]: { userId, expiresAt } })
    return { token, expiresAt }
  },
  revoke(token: string) {
    const { [token]: _revoked, ...rest } = sessions.read()
    sessions.write(rest)
  },
}

/** Resolves the bearer token of a request to its live session, or `undefined` when missing, unknown or expired. */
export function authenticate(request: Request) {
  const token = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1]
  if (!token) return undefined
  const session = sessions.read()[token]
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    sessionStore.revoke(token)
    return undefined
  }
  const user = users.find((candidate) => candidate.id === session.userId)
  return user && { token, user, expiresAt: session.expiresAt }
}
