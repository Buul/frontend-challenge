import { delay, http, HttpResponse, type RequestHandler } from 'msw'
import {
  COLLECTIONS,
  NETWORKS,
  WALLETS,
  NFT_SEARCH_MAX_LENGTH,
  NFT_SORTS,
  NFT_TABS,
  type Cart,
  type CartItemInput,
  type CartQuote,
  type Order,
  type CollectionId,
  type FavoriteList,
  type FeaturedNftList,
  type LoginRequest,
  type NetworkId,
  type NftDetail,
  type NftFacets,
  type NftPage,
  type RelatedNftList,
  type ProfileUpdateRequest,
  type ProfileUpdateResponse,
  type Session,
  type SessionInfo,
  type SignupRequest,
  type AvatarUpdateRequest,
  type CollectorProfile,
  type CollectorWallets,
  type CollectorWallet,
  type WalletSettingsRequest,
} from '@/lib/api/types'
import type { ApiErrorBody } from '@/lib/api/errors'
import { compareEth, isEthAmount } from '@/lib/eth'
import { shortenAddress } from '@/lib/format'
import type { PlaceOrderRequest } from '@/lib/api/orders'
import { avatarSchema, cartItemSchema, cartPromoSchema, cartQuantitySchema, checkoutSchema, EMAIL_PATTERN, loginSchema, profileUpdateSchema, signupSchema, toFieldErrors, walletSchema } from '@/lib/validation'
import { authenticate, collectorProfile, registerUser, sessionStore, setAvatar, toPublicUser, updateCollectorProfile, verifyCredentials } from './auth'
import { cartStore, GUEST_CART } from './cart-store'
import { featuredNfts, nftDetails, nfts, relatedNfts } from './data'
// Applies the persisted live prices and supply to the fixtures before any handler reads them.
import './market-store'
import { idempotencyKeys, ordersStore } from './orders-store'
import { placeOrder, settleDueOrders } from './realtime'
import { favoritesStore } from './favorites-store'
import { conflict, forbidden, notFound, serviceUnavailable, unauthenticated, validationError } from './http'
import { extraLatency, isScenarioActive } from './scenarios'
import { isRecord } from './storage'
import { readWallets, saveWallet, setWalletMirror, toCollectorWallet } from './wallets-store'

const API = import.meta.env.VITE_API_URL ?? '/api'
const PAGE_SIZE = 9
/** How long `POST /orders` takes to answer under `checkout-timeout`: well past the client's 10 s timeout. */
const CHECKOUT_TIMEOUT_DELAY_MS = 60_000

const countBy = <K extends string>(ids: readonly { id: K }[], key: (nft: (typeof nfts)[number]) => K) =>
  Object.fromEntries(ids.map(({ id }) => [id, nfts.filter((nft) => key(nft) === id).length])) as Record<K, number>

function parseListParams(params: URLSearchParams) {
  const errors: Record<string, string> = {}

  const option = <T extends string>(name: string, options: readonly { id: T }[]) => {
    const value = params.get(name)
    if (value === null || value === '') return undefined
    const match = options.find((item) => item.id === value)?.id
    if (!match) errors[name] = `Valor inválido: ${value}`
    return match
  }

  const eth = (name: string) => {
    const value = params.get(name)
    if (value === null || value === '') return undefined
    if (!isEthAmount(value)) errors[name] = 'Informe um valor decimal em ETH.'
    return isEthAmount(value) ? value : undefined
  }

  const rawPage = params.get('page') ?? '1'
  const page = Number(rawPage)
  if (!Number.isInteger(page) || page < 1) errors.page = 'A página deve ser um inteiro maior ou igual a 1.'

  const q = params.get('q')?.trim() ?? ''
  if (q.length > NFT_SEARCH_MAX_LENGTH) errors.q = `A busca aceita até ${NFT_SEARCH_MAX_LENGTH} caracteres.`

  const query = {
    q: q.toLocaleLowerCase('pt-BR'),
    tab: option('tab', NFT_TABS) ?? 'all',
    sort: option('sort', NFT_SORTS) ?? 'recent',
    collection: option('collection', COLLECTIONS),
    network: option('network', NETWORKS),
    minPrice: eth('minPrice'),
    maxPrice: eth('maxPrice'),
    page,
  }

  if (query.minPrice && query.maxPrice && compareEth(query.minPrice, query.maxPrice) > 0) {
    errors.minPrice = 'O preço mínimo não pode ser maior que o máximo.'
  }

  return { query, errors }
}

/**
 * The cart a request works on: the signed-in user's, or the visitor's when no token is sent.
 * A token that no longer resolves is a `401`, so an expired session is noticed instead of silently showing the visitor cart.
 */
function cartOwner(request: Request) {
  if (!request.headers.has('Authorization')) return { owner: GUEST_CART }
  const session = authenticate(request)
  return session ? { owner: session.user.id } : { error: unauthenticated() }
}

export const handlers: RequestHandler[] = [
  // Network conditions for every endpoint: extra or random latency, or no network at all.
  // Returning nothing lets the request fall through to the endpoint's own handler.
  http.all(`${API}/*`, async () => {
    const latency = extraLatency()
    if (latency > 0) await delay(latency)
    if (isScenarioActive('network-offline')) return HttpResponse.error()
  }),

  http.get(`${API}/nfts/featured`, async () => {
    await delay(100)
    // Prices are live (they move with `nft.updated`); the rest of the featured entry is static.
    return HttpResponse.json<FeaturedNftList>({ data: featuredNfts.map((nft) => ({ ...nft, price: nftDetails.get(nft.id)?.price ?? nft.price })) })
  }),

  http.get(`${API}/nfts/facets`, async () => {
    await delay(150)
    const prices = nfts.map((nft) => nft.price).toSorted(compareEth)
    return HttpResponse.json<NftFacets>({
      collections: countBy<CollectionId>(COLLECTIONS, (nft) => nft.collection),
      networks: countBy<NetworkId>(NETWORKS, (nft) => nft.network),
      price: { min: prices[0], max: prices[prices.length - 1] },
    })
  }),

  http.get(`${API}/nfts/suggested`, async () => {
    await delay(250)
    return HttpResponse.json<RelatedNftList>({ data: nfts.slice(3, 13) })
  }),

  http.get<never, never, NftPage | ApiErrorBody>(`${API}/nfts`, async ({ request }) => {
    await delay(150)
    if (isScenarioActive('catalog-error')) return serviceUnavailable()
    const { query, errors } = parseListParams(new URL(request.url).searchParams)
    if (Object.keys(errors).length > 0) return validationError(errors)
    if (isScenarioActive('catalog-empty')) {
      return HttpResponse.json<NftPage>({ data: [], page: query.page, pageSize: PAGE_SIZE, total: 0, totalPages: 1 })
    }

    const filtered = nfts
      .filter((nft) => !query.q || nft.name.toLocaleLowerCase('pt-BR').includes(query.q))
      .filter((nft) => query.tab === 'all' || (query.tab === 'new' ? nft.isNew : nft.isTrending))
      .filter((nft) => !query.collection || nft.collection === query.collection)
      .filter((nft) => !query.network || nft.network === query.network)
      .filter((nft) => !query.minPrice || compareEth(nft.price, query.minPrice) >= 0)
      .filter((nft) => !query.maxPrice || compareEth(nft.price, query.maxPrice) <= 0)
      .toSorted((a, b) => {
        if (query.sort === 'price-asc') return compareEth(a.price, b.price)
        if (query.sort === 'price-desc') return compareEth(b.price, a.price)
        return b.listedAt.localeCompare(a.listedAt)
      })

    return HttpResponse.json<NftPage>({
      data: filtered.slice((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE),
      page: query.page,
      pageSize: PAGE_SIZE,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    })
  }),

  // Registered after the static `/nfts/*` routes so `featured` and `facets` are never read as ids.
  http.get<{ id: string }, never, NftDetail | ApiErrorBody>(`${API}/nfts/:id`, async ({ params }) => {
    await delay(150)
    const detail = nftDetails.get(params.id)
    return detail ? HttpResponse.json<NftDetail>(detail) : notFound('NFT não encontrado.')
  }),

  http.get<{ id: string }, never, RelatedNftList | ApiErrorBody>(`${API}/nfts/:id/related`, async ({ params }) => {
    await delay(250)
    if (!nftDetails.has(params.id)) return notFound('NFT não encontrado.')
    return HttpResponse.json<RelatedNftList>({ data: relatedNfts(params.id) })
  }),

  http.post<never, Partial<LoginRequest>, Session | ApiErrorBody>(`${API}/auth/login`, async ({ request }) => {
    await delay(600)
    if (isScenarioActive('login-error')) return serviceUnavailable()
    const parsed = loginSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return validationError(toFieldErrors(parsed.error), 'Verifique os dados informados.')

    const user = await verifyCredentials(parsed.data.email, parsed.data.password)
    // Same answer for unknown e-mail and wrong password, so accounts can't be enumerated.
    if (!user) return unauthenticated('E-mail ou senha incorretos.')
    cartStore.adoptGuestCart(user.id)
    return HttpResponse.json<Session>({ ...sessionStore.create(user.id), user: toPublicUser(user) })
  }),

  // Signs the new account in right away, answering with the same session shape as login.
  http.post<never, Partial<SignupRequest>, Session | ApiErrorBody>(`${API}/auth/register`, async ({ request }) => {
    await delay(700)
    if (isScenarioActive('signup-error')) return serviceUnavailable()
    const parsed = signupSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return validationError(toFieldErrors(parsed.error), 'Verifique os dados informados.')

    const user = await registerUser(parsed.data)
    if (!user) {
      const message = 'Já existe uma conta com este e-mail. Entre ou use outro e-mail.'
      return conflict(message, { email: message })
    }
    cartStore.adoptGuestCart(user.id)
    return HttpResponse.json<Session>({ ...sessionStore.create(user.id), user: toPublicUser(user) }, { status: 201 })
  }),

  http.get<never, never, SessionInfo | ApiErrorBody>(`${API}/auth/session`, async ({ request }) => {
    await delay(150)
    const session = authenticate(request)
    if (!session) return unauthenticated()
    return HttpResponse.json<SessionInfo>({ user: toPublicUser(session.user), expiresAt: session.expiresAt })
  }),

  // Idempotent: logging out with an unknown or expired token still succeeds.
  http.post(`${API}/auth/logout`, async ({ request }) => {
    await delay(200)
    const session = authenticate(request)
    if (session) sessionStore.revoke(session.token)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get<never, never, CollectorProfile | ApiErrorBody>(`${API}/auth/profile`, async ({ request }) => {
    await delay(200)
    const session = authenticate(request)
    if (!session) return unauthenticated()
    return HttpResponse.json<CollectorProfile>(collectorProfile(session.user))
  }),

  http.patch<never, Partial<ProfileUpdateRequest>, ProfileUpdateResponse | ApiErrorBody>(`${API}/auth/profile`, async ({ request }) => {
    await delay(400)
    if (isScenarioActive('profile-error')) return serviceUnavailable()
    const session = authenticate(request)
    if (!session) return unauthenticated()

    const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return validationError(toFieldErrors(parsed.error), 'Verifique os dados informados.')

    const ensSuffix = parsed.data.ensSuffix === 'sol' ? 'sol' : parsed.data.ensSuffix === 'eth' ? 'eth' : undefined
    if (!ensSuffix) return validationError({ ensSuffix: 'Selecione o sufixo ENS.' }, 'Verifique os dados informados.')

    const result = await updateCollectorProfile(session.user.id, { ...parsed.data, ensSuffix })
    if ('error' in result) {
      if (result.error === 'email-taken') {
        const message = 'Já existe uma conta com este e-mail. Use outro e-mail.'
        return conflict(message, { email: message })
      }
      if (result.error === 'wrong-password') {
        return validationError({ currentPassword: 'A senha atual não confere.' }, 'Verifique os dados informados.')
      }
      return unauthenticated()
    }

    return HttpResponse.json<ProfileUpdateResponse>({ user: toPublicUser(result.user), profile: result.profile })
  }),

  http.put<never, Partial<AvatarUpdateRequest>, CollectorProfile | ApiErrorBody>(`${API}/auth/profile/avatar`, async ({ request }) => {
    await delay(400)
    if (isScenarioActive('profile-error')) return serviceUnavailable()
    const session = authenticate(request)
    if (!session) return unauthenticated()
    const parsed = avatarSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return validationError(toFieldErrors(parsed.error), 'Não foi possível usar esta imagem.')
    setAvatar(session.user.id, parsed.data.image)
    return HttpResponse.json<CollectorProfile>(collectorProfile(session.user))
  }),

  // Idempotent: removing an avatar that is not there still answers with the profile.
  http.delete<never, never, CollectorProfile | ApiErrorBody>(`${API}/auth/profile/avatar`, async ({ request }) => {
    await delay(300)
    if (isScenarioActive('profile-error')) return serviceUnavailable()
    const session = authenticate(request)
    if (!session) return unauthenticated()
    setAvatar(session.user.id, null)
    return HttpResponse.json<CollectorProfile>(collectorProfile(session.user))
  }),

  http.get<never, never, Cart | ApiErrorBody>(`${API}/cart`, async ({ request }) => {
    await delay(150)
    const cart = cartOwner(request)
    if ('error' in cart) return cart.error
    return HttpResponse.json<Cart>(cartStore.get(cart.owner))
  }),

  http.post<never, Partial<CartItemInput>, Cart | ApiErrorBody>(`${API}/cart/items`, async ({ request }) => {
    await delay(400)
    if (isScenarioActive('cart-error')) return serviceUnavailable()
    const cart = cartOwner(request)
    if ('error' in cart) return cart.error
    const parsed = cartItemSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return validationError(toFieldErrors(parsed.error), 'Verifique os dados informados.')
    const result = cartStore.add(cart.owner, parsed.data)
    if ('error' in result) {
      if (result.error === 'not-found') return notFound('NFT não encontrado.')
      if (result.error === 'sold-out') return conflict('Esta edição está esgotada.')
      return conflict(`Limite de ${result.max} ${result.max === 1 ? 'unidade' : 'unidades'} para esta edição no carrinho.`)
    }
    return HttpResponse.json<Cart>(result.cart)
  }),

  http.patch<never, Partial<CartItemInput>, Cart | ApiErrorBody>(`${API}/cart/items`, async ({ request }) => {
    await delay(250)
    if (isScenarioActive('cart-error')) return serviceUnavailable()
    const cart = cartOwner(request)
    if ('error' in cart) return cart.error
    const parsed = cartQuantitySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return validationError(toFieldErrors(parsed.error), 'Verifique os dados informados.')
    const result = cartStore.setQuantity(cart.owner, parsed.data)
    if ('error' in result) {
      if (result.error === 'not-found') return notFound('Este item não está no carrinho.')
      if (result.error === 'sold-out') return conflict('Esta edição está esgotada.')
      return conflict(`Limite de ${result.max} ${result.max === 1 ? 'unidade' : 'unidades'} para esta edição no carrinho.`)
    }
    return HttpResponse.json<Cart>(result.cart)
  }),

  http.post<never, { code?: unknown }, Cart | ApiErrorBody>(`${API}/cart/promo`, async ({ request }) => {
    await delay(350)
    if (isScenarioActive('cart-error')) return serviceUnavailable()
    const cart = cartOwner(request)
    if ('error' in cart) return cart.error
    const parsed = cartPromoSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return validationError(toFieldErrors(parsed.error), 'Verifique o código informado.')
    const result = cartStore.applyPromo(cart.owner, parsed.data.code)
    if ('error' in result) {
      const message = result.error === 'expired' ? 'Este código promocional expirou.' : 'Código promocional inválido.'
      return conflict(message, { code: message })
    }
    return HttpResponse.json<Cart>(result.cart)
  }),

  // Idempotent: removing a coupon that is not there still answers with the cart.
  http.delete<never, never, Cart | ApiErrorBody>(`${API}/cart/promo`, async ({ request }) => {
    await delay(250)
    if (isScenarioActive('cart-error')) return serviceUnavailable()
    const cart = cartOwner(request)
    if ('error' in cart) return cart.error
    return HttpResponse.json<Cart>(cartStore.removePromo(cart.owner))
  }),

  http.delete<{ nftId: string; editionId: string }, never, Cart | ApiErrorBody>(`${API}/cart/items/:nftId/:editionId`, async ({ params, request }) => {
    await delay(250)
    if (isScenarioActive('cart-error')) return serviceUnavailable()
    const cart = cartOwner(request)
    if ('error' in cart) return cart.error
    const result = cartStore.removeItem(cart.owner, params.nftId, params.editionId)
    return 'error' in result ? notFound('Este item não está no carrinho.') : HttpResponse.json<Cart>(result.cart)
  }),

  // The current price of the cart (availability, coupon, discount, fee and total), computed without changing it.
  http.get<never, never, CartQuote | ApiErrorBody>(`${API}/cart/quote`, async ({ request }) => {
    await delay(150)
    const cart = cartOwner(request)
    if ('error' in cart) return cart.error
    return HttpResponse.json<CartQuote>(cartStore.quote(cart.owner))
  }),

  http.post<never, PlaceOrderRequest, Order | ApiErrorBody>(`${API}/orders`, async ({ request }) => {
    await delay(500)
    const session = authenticate(request)
    if (!session) return unauthenticated('Entre para finalizar a compra.')
    if (isScenarioActive('checkout-error')) return serviceUnavailable()

    const key = request.headers.get('Idempotency-Key')?.trim()
    if (!key) return validationError({ idempotencyKey: 'Envie o cabeçalho Idempotency-Key.' }, 'Tentativa de compra sem identificação.')

    const body: unknown = await request.json().catch(() => ({}))
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) return validationError(toFieldErrors(parsed.error), 'Verifique os dados informados.')
    const expectedTotal = isRecord(body) ? body.expectedTotal : undefined
    const fingerprint = JSON.stringify({ ...parsed.data, expectedTotal })

    // A retry of an attempt that already created an order gets that order back, whatever happened to the cart since.
    const previous = idempotencyKeys.get(key)
    if (previous) {
      if (previous.userId !== session.user.id || previous.fingerprint !== fingerprint) {
        return conflict('Esta tentativa de compra já foi usada com outros dados. Confirme a compra novamente.')
      }
      const found = ordersStore.get(session.user.id, previous.orderId)
      return 'order' in found ? HttpResponse.json<Order>(found.order) : notFound('Pedido não encontrado.')
    }

    // The client sends the total it showed; if prices or supply moved since, the collector must review it first.
    const current = cartStore.get(session.user.id)
    if (current.itemCount === 0) return conflict('Seu carrinho está vazio.')
    if (!isEthAmount(expectedTotal) || compareEth(expectedTotal, current.total) !== 0) {
      return conflict('Os preços ou a disponibilidade mudaram. Revise o novo total antes de confirmar.')
    }

    const taken = cartStore.take(session.user.id)
    if ('error' in taken) return conflict('Seu carrinho está vazio.')

    const network = NETWORKS.find((item) => item.id === parsed.data.network)
    const wallet = WALLETS.find((item) => item.id === parsed.data.walletType)
    const { cart } = taken
    const now = new Date().toISOString()
    const order: Order = {
      id: `KR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now,
      walletLabel: parsed.data.walletAddress.includes('.') ? parsed.data.walletAddress : shortenAddress(parsed.data.walletAddress),
      walletName: wallet?.label ?? 'Carteira',
      network: network?.id ?? 'ethereum',
      networkLabel: network?.label ?? 'Ethereum',
      items: cart.items.map(({ name, image, tokenId, editionLabel, quantity, lineTotal }) => ({
        name,
        image,
        tokenId,
        editionLabel,
        quantity,
        lineTotal,
      })),
      subtotal: cart.subtotal,
      discount: cart.discount,
      networkFee: cart.networkFee,
      total: cart.total,
    }
    placeOrder({
      userId: session.user.id,
      order,
      lines: cart.items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity })),
      promoCode: cart.promoCode,
    })

    idempotencyKeys.save(key, { userId: session.user.id, fingerprint, orderId: order.id })
    // The order exists, but the answer outlives the client's 10 s timeout: only a retry with the same key recovers it.
    if (isScenarioActive('checkout-timeout')) await delay(CHECKOUT_TIMEOUT_DELAY_MS)

    // 202: the wallet answer arrives later through `order.updated` (or `GET /orders/:id`).
    return HttpResponse.json<Order>(order, { status: 202 })
  }),

  http.get<{ id: string }, never, Order | ApiErrorBody>(`${API}/orders/:id`, async ({ params, request }) => {
    await delay(200)
    const session = authenticate(request)
    if (!session) return unauthenticated()
    settleDueOrders()
    const found = ordersStore.get(session.user.id, params.id)
    if ('order' in found) return HttpResponse.json<Order>(found.order)
    return found.error === 'forbidden' ? forbidden('Este pedido pertence a outra conta.') : notFound('Pedido não encontrado.')
  }),

  http.get<never, never, FavoriteList | ApiErrorBody>(`${API}/favorites`, async ({ request }) => {
    await delay(200)
    const session = authenticate(request)
    if (!session) return unauthenticated()
    return HttpResponse.json<FavoriteList>({ data: favoritesStore.list(session.user.id) })
  }),

  // PUT and DELETE are idempotent: repeating either leaves the same list.
  ...(['put', 'delete'] as const).map((method) =>
    http[method]<{ nftId: string }, never, FavoriteList | ApiErrorBody>(`${API}/favorites/:nftId`, async ({ params, request }) => {
      await delay(500)
      const session = authenticate(request)
      if (!session) return unauthenticated()
      if (isScenarioActive('favorites-error')) return serviceUnavailable()
      if (!nftDetails.has(params.nftId)) return notFound('NFT não encontrado.')
      const { id } = session.user
      const ids = method === 'put' ? favoritesStore.add(id, params.nftId) : favoritesStore.remove(id, params.nftId)
      return HttpResponse.json<FavoriteList>({ data: ids })
    }),
  ),

  http.get<never, never, CollectorWallets | ApiErrorBody>(`${API}/auth/wallets`, async ({ request }) => {
    await delay(200)
    const session = authenticate(request)
    if (!session) return unauthenticated()
    return HttpResponse.json<CollectorWallets>(readWallets(session.user.id))
  }),

  // Creates (`POST`) or replaces (`PUT`) the primary or the secondary wallet.
  ...(['post', 'put'] as const).map((method) =>
    http[method]<{ slot: string }, CollectorWallet, CollectorWallets | ApiErrorBody>(`${API}/auth/wallets/:slot`, async ({ params, request }) => {
      await delay(400)
      if (isScenarioActive('wallets-error')) return serviceUnavailable()
      const session = authenticate(request)
      if (!session) return unauthenticated()
      const slot = params.slot
      if (slot !== 'primary' && slot !== 'secondary') return notFound('Carteira não encontrada.')

      const parsed = walletSchema.safeParse(await request.json().catch(() => null))
      if (!parsed.success) return validationError(toFieldErrors(parsed.error), 'Verifique os dados informados.')
      const wallet = toCollectorWallet(parsed.data)
      if (!wallet) return validationError({ walletType: 'Selecione uma carteira.' }, 'Verifique os dados informados.')

      const exists = readWallets(session.user.id)[slot] !== null
      if (method === 'post' && exists) return conflict('Esta carteira já existe. Atualize-a em vez de criar outra.')
      if (method === 'put' && !exists) return notFound('Esta carteira ainda não existe. Crie-a primeiro.')
      return HttpResponse.json<CollectorWallets>(saveWallet(session.user.id, slot, wallet), { status: method === 'post' ? 201 : 200 })
    }),
  ),

  // The secondary wallet can mirror the primary instead of being its own.
  http.patch<never, Partial<WalletSettingsRequest>, CollectorWallets | ApiErrorBody>(`${API}/auth/wallets`, async ({ request }) => {
    await delay(300)
    if (isScenarioActive('wallets-error')) return serviceUnavailable()
    const session = authenticate(request)
    if (!session) return unauthenticated()
    const body: unknown = await request.json().catch(() => null)
    if (!isRecord(body) || typeof body.mirrorPrimary !== 'boolean') {
      return validationError({ mirrorPrimary: 'Informe se a carteira secundária repete a principal.' }, 'Verifique os dados informados.')
    }
    const result = setWalletMirror(session.user.id, body.mirrorPrimary)
    if (result === 'missing-primary') {
      const message = 'Salve a carteira principal antes de copiá-la.'
      return validationError({ mirrorPrimary: message }, message)
    }
    return HttpResponse.json<CollectorWallets>(result)
  }),

  http.post(`${API}/newsletter`, async ({ request }) => {
    await delay(400)
    const { email } = (await request.json()) as { email?: unknown }
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
      return validationError({ email: 'Informe um e-mail válido.' }, 'Informe um e-mail válido.')
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
