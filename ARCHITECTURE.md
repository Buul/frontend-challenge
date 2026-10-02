# Arquitetura

Kurio é um marketplace de NFTs em React 19 + TypeScript. Não existe backend: o MSW faz o papel do servidor (REST e Socket.IO) dentro do navegador, sobre um estado persistido em `localStorage`. Este documento cobre os contratos, as políticas de sessão, carrinho, pedidos e cache, a reconciliação entre REST e tempo real, as decisões de UX, os desvios do Figma e as limitações. Como rodar e os comandos estão no [README](README.md).

## Visão geral

```
navegador
├── app (React)
│   ├── TanStack Router ── rotas por arquivo, estado de busca/filtros na URL
│   ├── TanStack Query ─── cache de servidor; dados privados em ['me', userId, …]
│   ├── Axios ──────────── /api, Bearer token, erros normalizados em ApiError
│   └── socket.io-client ─ nft.updated, order.updated
└── MSW (service worker + interceptador de WebSocket)
    ├── handlers REST ─── src/mocks/handlers.ts
    ├── servidor Socket.IO ─ src/mocks/socket-io.ts (protocolo) + realtime.ts (domínio)
    └── stores ─────────── auth, carrinho, mercado, pedidos, favoritos, carteiras (localStorage)
```

O app só conversa com a rede. Ele não importa nada de `src/mocks`, e o mock não chama funções do app. Desligar o MSW (`VITE_API_MOCKING=disabled`) e apontar `VITE_API_URL`/`VITE_SOCKET_URL` para um backend real que siga os mesmos contratos não exige mudar o app.

| Pasta | Responsabilidade |
| --- | --- |
| `src/routes/` | Rotas, `validateSearch` (URL como estado), loaders que pré-carregam queries |
| `src/components/` | UI por domínio (`home`, `nft`, `cart`, `checkout`, `auth`, `profile`, `realtime`, `layout`, `ui`) |
| `src/lib/api/` | Contratos (`types.ts`), cliente HTTP, erros, query options e mutations por recurso |
| `src/lib/realtime/` | Contrato dos eventos (`events.ts`) e aplicação deles no cache (`apply.ts`) |
| `src/lib/validation.ts` | Schemas Zod compartilhados pelos formulários e pelo mock |
| `src/mocks/` | Servidor simulado: handlers, stores, cenários, Socket.IO |
| `e2e/` | Playwright: fluxos, falhas, tempo real, acessibilidade e regressão visual |

## Contratos REST

Base: `VITE_API_URL` (padrão `/api`). Corpo JSON. Autenticação: `Authorization: Bearer <token>`.

**Erro (qualquer status não-2xx):** `{ code, message, fieldErrors? }`. Os códigos possíveis são `VALIDATION_ERROR` (400/422), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500) e `SERVICE_UNAVAILABLE` (503). O cliente normaliza tudo em `ApiError` ([errors.ts](src/lib/api/errors.ts)) e acrescenta `NETWORK_ERROR` e `TIMEOUT` para falhas sem resposta. `retryable` vale para rede, timeout, 429 e 5xx.

| Recurso | Endpoint | Sucesso | Erros relevantes |
| --- | --- | --- | --- |
| Sessão | `POST /auth/register` `{ name, email, password }` | `201 Session`, já autenticado; adota o carrinho de visitante | `422`, `409` e-mail em uso |
| | `POST /auth/login` `{ email, password }` | `200 Session`; adota o carrinho de visitante | `422`, `401` (mesma mensagem para e-mail e senha) |
| | `GET /auth/session` | `200 { user, expiresAt }` | `401` |
| | `POST /auth/logout` | `204`, idempotente | — |
| NFTs | `GET /nfts?q&tab&sort&page&collection&network&minPrice&maxPrice` | `200 { data, page, pageSize, total, totalPages }` | `422` parâmetro inválido, `503` (cenário) |
| | `GET /nfts/:id`, `GET /nfts/:id/related` | `200` | `404` |
| | `GET /nfts/featured`, `/facets`, `/suggested` | `200` | — |
| Favoritos | `GET /favorites`, `PUT`/`DELETE /favorites/:nftId` | `200 { data: string[] }`; `PUT`/`DELETE` idempotentes | `401`, `404`, `503` |
| Carrinho | `GET /cart` | `200 Cart` do dono (usuário ou visitante) | `401` se o token não vale mais |
| | `POST /cart/items` `{ nftId, editionId, quantity }` | `200 Cart`; soma à linha existente | `404`, `409` esgotado ou no limite |
| | `PATCH /cart/items` `{ nftId, editionId, quantity }` | `200 Cart`; `0` remove | `404`, `409` |
| | `DELETE /cart/items/:nftId/:editionId` | `200 Cart` | `404` |
| Preço | `POST /cart/promo` `{ code }` | `200 Cart` com `discount` | `409` código inválido ou expirado |
| | `DELETE /cart/promo` | `200 Cart` sem cupom; idempotente | `503` |
| Cotação | `GET /cart/quote` | `200 { lines[{ …, unitPrice, lineTotal, available, status }], subtotal, discount, networkFee, total, promo, quotedAt }`, sem alterar o carrinho | `401` |
| Pedidos | `POST /orders` + `Idempotency-Key` `{ …perfil, expectedTotal }` | `202 Order` `pending`; retentativa com a mesma chave e o mesmo corpo → `200` o mesmo pedido | `401`, `422` sem chave ou perfil inválido, `409` carrinho vazio, total mudou ou chave reutilizada com outro corpo, `503` |
| | `GET /orders/:id` | `200 Order` no estado atual | `401`, `403` (pedido de outra conta), `404` |
| Perfil | `GET /auth/profile`, `PATCH /auth/profile` | `200` | `422` (inclusive senha atual errada), `409` e-mail em uso, `503` |
| | `PUT /auth/profile/avatar` `{ image }`, `DELETE /auth/profile/avatar` | `200 CollectorProfile` | `422` imagem inválida, `503` |
| Carteiras | `GET /auth/wallets` | `200 { primary, secondary, mirrorPrimary }` | `401` |
| | `POST /auth/wallets/:slot` (`primary` ou `secondary`) | `201` com as carteiras | `409` se já existe, `404` slot inválido, `422`, `503` |
| | `PUT /auth/wallets/:slot` | `200` com as carteiras | `404` se ainda não existe, `422`, `503` |
| | `PATCH /auth/wallets` `{ mirrorPrimary }` | `200` | `422` sem carteira principal, `503` |

**Preço e totais.** O servidor calcula subtotal, desconto, taxa de rede e total; o cliente só exibe. Valores em ETH trafegam como strings decimais e são somados e multiplicados como inteiros de 18 casas (`lib/eth.ts`), sem ponto flutuante; quantidades são inteiras. Antes de confirmar, o pagamento consulta `GET /cart/quote`: se o total mudou (preço, estoque, cupom vencido ou taxa), mostra o novo total e pede nova confirmação, sem enviar o pedido. O `expectedTotal` do pedido é o total que o colecionador viu. Se o preço ou o estoque mudou desde então, o servidor responde `409` antes de mexer no carrinho, e o checkout mostra o total novo para nova confirmação.

## Tempo real

Cliente: `socket.io-client`, só WebSocket, autenticado pelo `auth: { token }` do handshake, lido a cada (re)conexão. Servidor: MSW intercepta o WebSocket e [socket-io.ts](src/mocks/socket-io.ts) fala o protocolo (handshake do Engine.IO, CONNECT, ping a cada 25 s, eventos) com `engine.io-parser` e `socket.io-parser`. O `@mswjs/socket.io-binding` não serve: ele só suporta MSW 2, finge o handshake sem ler o `auth` e não envia heartbeat, então o cliente cairia a cada 45 s.

Envelope de todo evento ([events.ts](src/lib/realtime/events.ts)):

```ts
{ id: string; type: 'nft.updated' | 'order.updated'; resource: { type: 'nft' | 'order'; id: string }; version: number; occurredAt: string; data }
```

| Evento | `data` | Destino | Efeito |
| --- | --- | --- | --- |
| `nft.updated` | `{ price, previousPrice?, editions: [{ id, available }], updatedAt }` | Todos os sockets | Atualiza listas, relacionados, sugeridos e detalhe no cache; invalida destaques e, se o NFT estiver no carrinho, o carrinho |
| `order.updated` | `{ userId, order }` | Só sockets cuja sessão é do dono, conferida a cada entrega | Substitui o pedido em cache; em `confirmed`/`refused` invalida o carrinho |

**Identidade, versão e ordem.** Cada recurso tem `version` monotônica (NFTs e pedidos também a trazem no REST). O `EventLedger` ([apply.ts](src/lib/realtime/apply.ts)) descarta um `id` já visto (duplicado) e qualquer `version` menor ou igual à maior já vista para o recurso (atrasado). Na aplicação ao cache, a comparação é feita de novo contra a `version` do dado em cache, que pode ter vindo do REST. Por isso, um evento antigo nunca sobrescreve uma resposta REST mais nova, e vice-versa.

**Sessões.** O servidor resolve o token a cada entrega de `order.updated`, então um token revogado no logout não recebe mais nada. Quando o usuário muda, o cliente refaz o handshake e ainda descarta `order.updated` com `userId` diferente da sessão atual.

**Reconexão e reconciliação.** Ao reconectar, o app invalida `['nfts']`, `['cart']` e `['me', userId, 'orders']`: o que estiver na tela é rebuscado pelo REST, recuperando eventos perdidos. Pedidos pendentes também se resolvem quando lidos (`GET /orders/:id`) ou quando um socket conecta, então um reload nunca vê um `pending` vencido. Depois de 3 s sem conexão, um aviso informa que o tempo real está indisponível. O backoff de reconexão vai de 0,5 s a 2 s.

**Carregamento.** O `socket.io-client` é importado sob demanda, depois do MSW: o `engine.io-client` guarda `globalThis.WebSocket` quando o módulo é avaliado. Isso também o tira do bundle inicial.

## Sessão

- `POST /auth/login|register` devolvem `{ token, expiresAt, user }`. O token fica em `localStorage['kurio:session-token']`: sobrevive ao refresh e vale entre abas. Diferente de um cookie httpOnly, é legível por scripts, o que é aceitável numa demo sem backend.
- Expiração em 30 min. Há três gatilhos: um `401` numa requisição autenticada, o timer de `expiresAt` e o evento `storage` de outra aba. Em todos, a sessão termina, os dados privados são removidos e o login reabre sobre a mesma tela. A ação interrompida (favoritar, finalizar compra) é retomada depois de entrar.
- **Rotas privadas:** `/checkout`, `/profile` e `/wallets` têm um `beforeLoad` (`lib/auth/require-session.ts`) que manda o visitante ao login (no carrinho ou no início) com `redirect` para a tela pedida, busca incluída, sem levar junto os parâmetros do diálogo. Se a sessão expira com a tela aberta, ela continua lá e pede login no lugar.
- O login e o cadastro são um diálogo endereçável por `?auth=login|signup&redirect=`, que aceita só caminhos internos. Fechar volta ao histórico anterior e devolve o foco.
- **Isolamento.** Todo dado de usuário fica sob `['me', userId, …]`. Login, logout, expiração e troca de usuário cancelam e removem essas queries e as mutations pendentes, e callbacks tardios conferem `currentUserId` antes de escrever. O carrinho, que não é privado na chave, é resetado em toda troca de identidade, depois de o token novo valer.

## Carrinho

- O servidor guarda um carrinho por dono: o usuário autenticado ou o visitante do navegador (`kurio:mock:carts`). O visitante monta o carrinho sem login.
- **Merge.** Ao entrar (login ou cadastro), o servidor move as linhas do visitante para a conta, somando quantidades e respeitando estoque e limite por pedido, e esvazia o carrinho de visitante. Depois do logout o navegador começa um carrinho de visitante novo, e o próximo usuário não vê o carrinho do anterior.
- **Persistência e consistência.** Cada leitura reidrata as linhas com preço e estoque atuais: quantidades são limitadas ao disponível, linhas esgotadas somem e cupons expirados caem. Mutations devolvem o carrinho inteiro, que substitui o cache.
- **Cupons.** `KURIO10` dá 10%; `LANCAMENTO20` existe mas expirou, para exercitar a mensagem própria. O cupom aplicado pode ser removido (`DELETE /cart/promo`).

## Pedidos

- **Estados.** `pending` → `confirmed` (com `txId`) ou `refused` (com `failureCode` `rejected` ou `disconnected` e `failureReason`). A carteira simulada responde depois de `kurio:mock:order-settle-ms` (padrão 1,5 s). Os cenários `payment-refused` e `wallet-disconnected` forçam cada tipo de falha, e os itens voltam ao carrinho do dono. Um pedido resolvido nunca muda. O pedido guarda a rede, e o recibo aponta para o explorador dela (Etherscan, Polygonscan ou Solscan).
- **Recibo imutável.** O pedido copia itens, preços e totais do carrinho no momento da criação. Mudanças posteriores de preço não o alteram.
- **Idempotência.** O checkout gera uma `Idempotency-Key` por tentativa (mesmos dados → mesma chave; sucesso → chave nova). Falhas transitórias (rede, timeout, 5xx) são repetidas duas vezes com a mesma chave. O servidor guarda `chave → { usuário, corpo, pedido }`: repetir devolve o mesmo pedido, e outro corpo com a mesma chave é `409`. O cenário `checkout-timeout` cria o pedido e só responde depois de 60 s; o timeout de 10 s do axios dispara, e a retentativa recupera o pedido. Cliques repetidos não duplicam: o botão fica desabilitado, a função ignora chamadas com outra em andamento e a chave cobre o resto.
- **Recuperação.** O id do pedido vai para a URL (`/checkout?order=KR-…`). Refresh, reconexão ou voltar à página remontam o diálogo a partir de `GET /orders/:id`. Um id de outra conta dá `403` ("Este pedido pertence a outra conta") e um inexistente dá `404`; nos dois casos o id sai da URL.
- **Sessão expirada no pagamento.** O formulário guarda o que foi digitado mesmo se desmontar (o carrinho do visitante aparece enquanto a sessão está expirada), e o carrinho da conta só é descartado se outra pessoa entrar. Quem volta a entrar encontra o pagamento como deixou.

## Estratégia de cache (TanStack Query)

| Chave | `staleTime` | Atualização |
| --- | --- | --- |
| `['session']` | 5 min | login/logout escrevem direto; `401` encerra |
| `['nfts', 'list', query]` | 30 s, `keepPreviousData` | patch por `nft.updated`; reconexão invalida |
| `['nfts', 'detail', id]` | 30 s | patch por `nft.updated` |
| `['nfts', 'related' \| 'suggested' \| 'featured']` | 5 min | patch ou invalidação por `nft.updated` |
| `['nfts', 'facets']` | ∞ | — |
| `['cart']` | 30 s | mutations substituem; `nft.updated` de item do carrinho, desfecho de pedido e troca de identidade rebuscam |
| `['me', userId, 'favorites' \| 'profile' \| 'wallets']` | 30 s | mutations escrevem a resposta; favoritos têm atualização otimista com rollback |
| `['me', userId, 'orders', id]` | ∞ | `POST /orders` semeia; `order.updated` substitui; reconexão invalida |

Loaders de rota pré-carregam as queries da tela (`prefetchQuery`), e os links pré-carregam a rota no hover/foco. As consultas repetem falhas transitórias duas vezes. As mutations repetem só quando são idempotentes: o pedido, com chave.

## Mocking (MSW)

- **Estado:** `localStorage` sob `kurio:mock*`: usuários, sessões, perfis, avatares, carrinhos, mercado (preço e estoque versionados), pedidos, chaves de idempotência, favoritos e carteiras. `window.kurioMock.reset()` apaga tudo e recarrega.
- **Condições de rede:** um handler na frente de todos aplica `kurio:mock:latency-ms` (latência fixa), `slow-network` (+1,5 s), `out-of-order` (0–1,2 s aleatórios, respostas fora de ordem) e `network-offline` (falha de rede).
- **Cenários** (`kurio:mock-scenarios`, separados por vírgula):
  - falhas `503` por recurso;
  - `catalog-empty` e `catalog-error`;
  - `checkout-timeout`, `payment-refused` e `wallet-disconnected`;
  - `realtime-offline` e `realtime-duplicates`;
  - `market-live`.
  
  A lista completa está no README.
- **Controles** (`window.kurioMock.realtime`): mudar preço ou estoque com ou sem evento, reenviar ou injetar eventos, derrubar ou recusar conexões, resolver pedidos. Eles mudam o estado do servidor; o app sempre fica sabendo pelo `socket.io-client` ou pelo REST.
- **Validação:** o mock valida corpos com os mesmos schemas Zod dos formulários e responde `422` com `fieldErrors`, que os formulários mapeiam para os campos.

## Testes

Playwright, Chromium, nas larguras do desafio: `desktop` (1440×900) e `mobile` (390×844) executam todos os fluxos; `tablet` (768×1024) executa as specs sensíveis a layout (visual, acessibilidade, catálogo, detalhe). Cada teste começa num contexto limpo, e cenários, latência e eventos são controlados pelo `localStorage` e pelo `kurioMock`; o relógio é controlado com `page.clock` onde o tempo decide (expiração da sessão por `expiresAt`). Toda falha guarda o trace, e os passos do fluxo de compra ficam em `e2e/flows.ts`.

| Grupo pedido | Onde |
| --- | --- |
| 1. Busca, filtros combinados, ordenação, paginação, histórico | `catalog.spec.ts` |
| 2. Acesso direto ao detalhe e recurso inexistente | `nft-detail.spec.ts` |
| 3. Cadastro, login, expiração (inclusive por relógio e no meio do pagamento), logout, troca de usuário | `auth.spec.ts`, `checkout.spec.ts` |
| 4. Favoritos com falha e recuperação | `favorites.spec.ts` |
| 5. Carrinho: quantidades, remoção, cupons (aplicar, inválido, expirado, remover), persistência, merge, isolamento | `cart.spec.ts` |
| 6. Compra do catálogo ao recibo | `checkout.spec.ts`, `realtime.spec.ts` |
| 7. Falha de pagamento, cliques repetidos, timeout | `checkout.spec.ts`, `realtime.spec.ts` (recusa, carteira desconectada) |
| 8. Perfil, avatar, senha e carteiras (principal, secundária, espelho, contrato REST) com erros | `profile.spec.ts`, `wallets.spec.ts` |
| 9. Preço e disponibilidade via Socket.IO durante o checkout (esgotar e reduzir), cotação revalidada | `realtime.spec.ts` |
| 10. Duplicados (eventos e cenário), atrasados, desconexão, servidor offline, pedido pendente | `realtime.spec.ts` |
| 11. Teclado, foco em diálogos (login e recibo) e no drawer de filtros, validação com erro associado ao campo, rotas privadas | `a11y.spec.ts`, `auth.spec.ts`, `catalog.spec.ts`, `checkout.spec.ts`, `profile.spec.ts` |
| 12. Skeletons, erro, rede offline, respostas fora de ordem e retry | `catalog.spec.ts`, `favorites.spec.ts` |
| Também | Ações do card no hover, galeria, abas, compartilhar, newsletter | `catalog.spec.ts`, `nft-detail.spec.ts` |
| Regressão visual: home, detalhe, carrinho, pagamento | `visual.spec.ts`, em 1440, 768 e 390 (baselines em `e2e/__screenshots__/`) |

## Performance

`pnpm lighthouse` audita `/` e `/nfts/nft-1` no build de produção, com o mock padrão, 3 execuções por página e perfil, e afirma sobre a mediana. Os relatórios HTML e JSON das medianas, as versões (Lighthouse 12.6.1, Lighthouse CI 0.15.1, HeadlessChrome 153), o ambiente e as condições de execução estão em [`lighthouse/RESULTS.md`](lighthouse/RESULTS.md). Medianas da última execução:

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop | `/` | 100 | 100 | 100 | 100 | 0,7 s | 0 | 0 ms |
| desktop | `/nfts/nft-1` | 100 | 100 | 100 | 100 | 0,8 s | 0 | 0 ms |
| mobile | `/` | 91 | 100 | 100 | 100 | 3,2 s | 0 | 0 ms |
| mobile | `/nfts/nft-1` | 90 | 100 | 100 | 100 | 3,4 s | 0,004 | 0 ms |

O que levou o mobile de 79 para 90+:

- **Bundles em paralelo:** o app e o MSW são baixados ao mesmo tempo. Antes, o MSW só começava depois do app.
- **`tldts` trocado por um substituto mínimo:** o `tough-cookie` do MSW só usa `getDomain`, e o mock não usa cookies. O bundle do MSW caiu de 165 kB para 53 kB gzip.
- **A home vai no bundle principal:** sem o code split dela, some uma ida e volta antes da primeira pintura.
- **Login e cadastro carregados depois:** o diálogo e o TanStack Form saem do caminho crítico e carregam quando o navegador fica ocioso ou quando o diálogo abre. O mesmo vale para o `socket.io-client`.
- **Latência padrão do mock mais realista** nas leituras críticas (150 ms). O cenário `slow-network` continua disponível.

No mobile, a margem é pequena (90–91). O LCP fica em ~3,3 s porque o app só renderiza depois que o MSW está ativo. Sem MSW, num backend real, o primeiro paint não esperaria o worker. Os outros fatores são o Zod, usado pelo mock e pelos formulários, e o 4G simulado com CPU 4× mais lenta.

## Acessibilidade

- **Navegação:** skip link em todas as telas (inclusive as mobile sem header), foco visível em todos os controles, `main#conteudo` focável.
- **Diálogos:** login, cadastro e recibo prendem o foco e o devolvem ao fechar.
- **Formulários:** todo campo associa seu erro ao controle por `aria-describedby` e marca `aria-invalid` (perfil, carteiras e pagamento pelo `FormField` compartilhado; login e cadastro pelos campos de `auth-form-parts`, com o visual próprio do diálogo); no envio inválido o foco vai ao primeiro campo com erro.
- **Anúncios:** regiões `role=status`/`alert` para resultados de busca, mutations, mudanças em tempo real e estados do pedido.
- **Imagens e estados:** imagens com texto alternativo (decorativas com `alt=""`). Estados não dependem só de cor: edição esgotada tem "(esgotada)" e `disabled`, e botões ativos usam `aria-pressed`/`aria-current`.
- **Toque, movimento e reflow:** alvos de toque de 24 px (pontos de carrosséis e da galeria), `prefers-reduced-motion` desliga shimmer e transições, e não há rolagem horizontal a 320 px (zoom de 400%), coberto por teste.

## Assets

- **Origem:** os 77 arquivos de `src/assets/figma/` foram exportados do arquivo do Figma: ícones em SVG (navegação, carrinho, favoritos, carteiras, perfil, login social), as 4 artes dos NFTs em JPG, a ilustração "Thank you" do recibo e as máscaras decorativas do hero. Nada vem de CDN: tudo entra no build e roda localmente.
- **Fonte:** Roboto Mono, a do design, vem empacotada pelo `@fontsource-variable/roboto-mono` (woff2 no próprio build) em vez do Google Fonts, para funcionar offline e não depender de terceiros na auditoria.
- **Substituições:** o Figma tem 4 artes; os 36 NFTs das fixtures reaproveitam essas 4, com nomes e preços próprios para exercitar filtros e paginação (alguns nomes do Figma, como "Golden Frequency #071", não existem nas fixtures). As imagens da galeria do detalhe repetem a arte principal, como no design. O favicon é o do template inicial.
- **Ajustes de acessibilidade sobre o design:** alvos de toque de 24 px nos pontos de carrossel e galeria, foco visível em todos os controles, o "Avatar" como grupo rotulado e textos alternativos nas artes (descrições escritas para as 4 artes do Figma). Os demais estão em [Acessibilidade](#acessibilidade) e [Desvios do Figma](#desvios-do-figma).

## Componentes compartilhados

| Componente | Onde fica | Usado por |
| --- | --- | --- |
| `FormField`, `TextField`, `SelectField`, `EnsField`, `PasswordField` | `components/ui/form-field.tsx` | Perfil, carteiras e pagamento (duas variantes de layout do design: `account` e `checkout`) |
| `fieldProps` | `lib/forms.ts` | Liga um campo do TanStack Form aos componentes acima numa linha |
| `Breadcrumb` | `components/layout/breadcrumb.tsx` | Detalhe, carrinho e pagamento |
| `BackButton` | `components/ui/back-button.tsx` | Detalhe, carrinho e pagamento no mobile (inclusive nos skeletons) |
| `SignInRequired` | `components/auth/sign-in-required.tsx` | Perfil e carteiras para visitantes |
| `CardActions` | `components/home/card-actions.tsx` | Cards do catálogo no desktop |
| Passos do fluxo de compra | `e2e/flows.ts` | Specs de carrinho, pagamento, tempo real, visual e acessibilidade |

## Decisões de UX

- **Estado na URL:** busca, filtros, ordenação, página, edição selecionada, diálogo de auth e pedido em andamento ficam na URL. Mudar um filtro volta à página 1.
- **Visitante compra até o fim:** o visitante monta o carrinho, e o login só é pedido no checkout. A ação continua depois de entrar.
- **Mudanças ao vivo são explicadas:** preço que muda no detalhe ou no carrinho, item que esgota e total que muda no checkout geram um aviso. O total só é aceito se for o mostrado (`expectedTotal`).
- **O pagamento tem estados visíveis:** "Confirmando o pagamento", recibo, ou "Pagamento recusado" com o carrinho restaurado e o botão "Revisar e tentar de novo".
- **Avatar imediato:** o avatar é salvo na hora (Alterar/Remover), sem depender do "Salvar" do formulário. A imagem é recortada em quadrado e reduzida a 256 px no navegador.
- **Ações rápidas no card (desktop):** adicionar ao carrinho (a primeira edição à venda), favoritar e abrir o detalhe aparecem no hover, como no Figma, e também com o foco do teclado; o resultado é anunciado.
- **Skeletons:** os skeletons ocupam o tamanho final, então não há layout shift.

## Desvios do Figma

- **Telas sem Figma:** o tablet (768) não tem tela própria no Figma. O layout é derivado do mobile e do desktop: abaixo de 1440 os grids passam a colunas fluidas (a largura fixa dos cards só vale a 1440), e abaixo de 1024 o logo perde a largura fixa que centraliza o menu no desktop, e a busca aberta ocupa o lugar do menu. Os estados de pedido pendente, recusado e carteira desconectada, o aviso de offline e os toasts também não existem no Figma e seguem a mesma linguagem visual.
- **Pontos dos carrosséis e da galeria:** os pontos de relacionados (12 px) e da galeria do detalhe mobile (7 px) mantêm o tamanho, mas cada um fica numa área de toque de 24 px (WCAG 2.5.8), então o espaçamento entre eles aumenta.
- **Footer:** Perfil e Carteiras mantêm o footer, que o Figma não mostra, porque ele traz links de navegação da conta.
- **Nome ENS no pagamento:** usa a mesma ordem do Perfil e das Carteiras (sufixo `.eth` antes do nome).

## Limitações

- **O backend é o navegador.** Cada aba roda sua própria instância do MSW: o estado é compartilhado pelo `localStorage`, mas um evento emitido numa aba não chega a outra. Ela vê a mudança na próxima leitura REST.
- **Sem cookies:** como o mock não usa cookies, o `tldts` real foi trocado por um `getDomain` simplificado.
- **Senhas e avatares:** as senhas são guardadas como hash PBKDF2 no `localStorage`, e os avatares como data URL de ~20 kB.
- **Um carrinho de visitante por navegador.**
- **Visual regression:** as baselines foram geradas no macOS. Em outro sistema, regenere com `pnpm test:e2e:update`, porque a fonte renderiza diferente.
