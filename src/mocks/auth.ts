import { ENS_SUFFIXES, type CollectorProfile, type EnsSuffix, type ProfileUpdateRequest, type User } from '@/lib/api/types'
import { isRecord, persisted } from './storage'

type UserRecord = User & {
  /** PBKDF2-SHA256, 100k iterations, hex encoded; the mock never keeps passwords in clear text. */
  passwordHash: string
  salt: string
}

/** Fixture accounts. Passwords (for demo and tests only): `Kurio@123` and `Kurio@456`. */
const fixtureUsers: UserRecord[] = [
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

const isUserRecord = (value: unknown): value is UserRecord =>
  isRecord(value) && ['id', 'name', 'email', 'passwordHash', 'salt'].every((field) => typeof value[field] === 'string')

/** Accounts created through `POST /auth/register`. */
const registeredUsers = persisted<UserRecord[]>(
  'kurio:mock:users',
  () => [],
  (value) => Array.isArray(value) && value.every(isUserRecord),
)

type StoredProfile = Pick<CollectorProfile, 'username' | 'ensName' | 'ensSuffix' | 'walletNickname'>

type AccountOverride = {
  name?: string
  email?: string
  passwordHash?: string
  salt?: string
  profile?: StoredProfile
}

const isEnsSuffix = (value: unknown): value is EnsSuffix => ENS_SUFFIXES.some((item) => item.id === value)

const isStoredProfile = (value: unknown): value is StoredProfile =>
  isRecord(value) &&
  typeof value.username === 'string' &&
  typeof value.ensName === 'string' &&
  isEnsSuffix(value.ensSuffix) &&
  typeof value.walletNickname === 'string'

const isAccountOverride = (value: unknown): value is AccountOverride =>
  isRecord(value) &&
  (value.name === undefined || typeof value.name === 'string') &&
  (value.email === undefined || typeof value.email === 'string') &&
  (value.passwordHash === undefined || typeof value.passwordHash === 'string') &&
  (value.salt === undefined || typeof value.salt === 'string') &&
  (value.profile === undefined || isStoredProfile(value.profile))

/** Name, e-mail, password and collector fields saved from the profile screen, including for the fixture accounts. */
const accountOverrides = persisted<Record<string, AccountOverride>>(
  'kurio:mock:profiles',
  () => ({}),
  (value) => isRecord(value) && Object.values(value).every(isAccountOverride),
)

const materialize = (user: UserRecord): UserRecord => {
  const extra = accountOverrides.read()[user.id]
  if (!extra) return user
  return {
    ...user,
    name: extra.name ?? user.name,
    email: extra.email ?? user.email,
    passwordHash: extra.passwordHash ?? user.passwordHash,
    salt: extra.salt ?? user.salt,
  }
}

const allUsers = () => [...fixtureUsers, ...registeredUsers.read()].map(materialize)
const normalizeEmail = (email: string) => email.trim().toLowerCase()
const findByEmail = (email: string) => allUsers().find((candidate) => candidate.email === normalizeEmail(email))

const asEnsSuffix = (value: string): EnsSuffix | undefined => ENS_SUFFIXES.find((item) => item.id === value)?.id

export const toPublicUser = ({ id, name, email }: UserRecord): User => ({ id, name, email })

/** Returns `undefined` when the e-mail is already taken. */
export async function registerUser(input: { name: string; email: string; password: string }) {
  if (findByEmail(input.email)) return undefined
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const user: UserRecord = {
    id: `user-${crypto.randomUUID()}`,
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    salt,
    passwordHash: await hashPassword(input.password, salt),
  }
  // Re-checked after hashing: another tab may have registered the same e-mail meanwhile.
  if (findByEmail(user.email)) return undefined
  registeredUsers.write([...registeredUsers.read(), user])
  return user
}

/** Profile shown on `/profile`. Unset collector fields stay empty until the first save. */
export function collectorProfile(user: UserRecord): CollectorProfile {
  const stored = accountOverrides.read()[user.id]?.profile
  return {
    displayName: user.name,
    username: stored?.username ?? '',
    email: user.email,
    ensName: stored?.ensName ?? '',
    ensSuffix: stored?.ensSuffix ?? 'eth',
    walletNickname: stored?.walletNickname ?? '',
  }
}

export type ProfileUpdateResult =
  | { user: UserRecord; profile: CollectorProfile }
  | { error: 'missing' | 'email-taken' | 'wrong-password' }

/** Applies a profile save. Fixture accounts keep their original row; the override wins on the next read. */
export async function updateCollectorProfile(userId: string, input: ProfileUpdateRequest): Promise<ProfileUpdateResult> {
  const base = [...fixtureUsers, ...registeredUsers.read()].find((candidate) => candidate.id === userId)
  if (!base) return { error: 'missing' }

  const current = materialize(base)
  const email = normalizeEmail(input.email)
  if (allUsers().some((candidate) => candidate.id !== userId && candidate.email === email)) return { error: 'email-taken' }

  const ensSuffix = asEnsSuffix(input.ensSuffix)
  if (!ensSuffix) return { error: 'missing' }

  const overrides = accountOverrides.read()
  const previous = overrides[userId]
  let passwordHash = previous?.passwordHash
  let salt = previous?.salt
  if (input.newPassword) {
    const passwordOk = await verifyCredentials(current.email, input.currentPassword ?? '')
    if (!passwordOk) return { error: 'wrong-password' }
    salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
    passwordHash = await hashPassword(input.newPassword, salt)
  }

  accountOverrides.write({
    ...overrides,
    [userId]: {
      name: input.displayName.trim(),
      email,
      passwordHash,
      salt,
      profile: {
        username: input.username.trim(),
        ensName: input.ensName.trim(),
        ensSuffix,
        walletNickname: input.walletNickname.trim(),
      },
    },
  })

  return { user: materialize(base), profile: collectorProfile(materialize(base)) }
}

export async function verifyCredentials(email: string, password: string) {
  const user = findByEmail(email)
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
  const user = allUsers().find((candidate) => candidate.id === session.userId)
  return user && { token, user, expiresAt: session.expiresAt }
}
