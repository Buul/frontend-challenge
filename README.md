# Kurio · Marketplace de NFTs

Marketplace de NFTs com catálogo, detalhe, carrinho, pagamento com carteira, recibo e conta do colecionador, em desktop, tablet e mobile. O backend (REST e Socket.IO) é simulado pelo MSW dentro do navegador, então o projeto roda inteiro a partir de um checkout limpo, sem serviços externos.

**Aplicação publicada:** https://frontend-challenge.paulodev.com.br (Vercel, com os mocks e o tempo real rodando no navegador). Contas fictícias: `ana@kurio.dev` / `Kurio@123` e `bruno@kurio.dev` / `Kurio@456`.

Contratos, eventos, sessão, carrinho, cache, reconciliação, decisões de UX, desvios do Figma e limitações estão em [ARCHITECTURE.md](ARCHITECTURE.md).

## Stack

| Responsabilidade                     | Tecnologia                                     |
| ------------------------------------ | ---------------------------------------------- |
| Interface                            | React 19 + Vite                                |
| Linguagem                            | TypeScript                                     |
| Roteamento                           | TanStack Router (rotas por arquivo, type-safe) |
| Estado remoto                        | TanStack Query                                 |
| Cliente HTTP                         | Axios                                          |
| Tempo real                           | Socket.IO                                      |
| Estilização                          | Tailwind CSS v4                                |
| Componentes                          | shadcn/ui                                      |
| Mocking                              | MSW                                            |
| Testes E2E e regressão visual        | Playwright                                     |
| Auditoria de performance e qualidade | Lighthouse (Lighthouse CI)                     |

## Como rodar

Requisitos: Node.js 20.19+ (ou 22+) e pnpm 11 (a versão está fixada em `packageManager`; com Corepack basta `corepack enable`).

```bash
pnpm install
pnpm dev
```

Acesse <http://localhost:4317>.

- O **MSW** é iniciado no navegador com os handlers de `src/mocks/handlers.ts` (REST) e `src/mocks/realtime.ts` (Socket.IO). Não há backend: o estado do mock (contas, sessões, carrinho, pedidos, preços e estoque) fica no `localStorage`, sob chaves `kurio:mock*`.
- Cenários do mock são ativados por `localStorage['kurio:mock-scenarios']` (lista separada por vírgula), antes de carregar a página:
  - Falhas `503`: `favorites-error` (favoritar/desfavoritar), `login-error`, `signup-error`, `cart-error` (alterar o carrinho), `checkout-error` (`POST /orders`), `profile-error` (salvar o perfil ou o avatar), `wallets-error` (salvar a carteira) e `catalog-error` (`GET /nfts`).
  - `catalog-empty`: o catálogo não encontra nada.
  - `slow-network`: toda requisição demora 1,5 s a mais (para ver os skeletons); `out-of-order`: cada requisição espera 0–1,2 s aleatórios, então as respostas chegam fora de ordem; `network-offline`: toda requisição falha como se não houvesse rede. `localStorage['kurio:mock:latency-ms']` soma uma latência fixa.
  - `checkout-timeout`: `POST /orders` cria o pedido, mas só responde depois de 60 s, além do timeout de 10 s do app; o app repete com a mesma `Idempotency-Key` e recupera o pedido, sem comprar duas vezes.
  - `payment-refused`: a carteira recusa o pagamento; o pedido termina `refused` e os NFTs voltam ao carrinho.
  - `wallet-disconnected`: a carteira se desconecta antes de assinar; o pedido termina `refused` com `failureCode: "disconnected"` e os NFTs voltam ao carrinho.
  - `realtime-offline`: o servidor Socket.IO recusa conexões; o app mostra o aviso de reconexão e continua tentando.
  - `realtime-duplicates`: todo `nft.updated` é entregue duas vezes.
  - `market-live`: a cada 8 s o preço de um NFT em destaque muda, para ver o tempo real sem DevTools.
- `localStorage['kurio:mock:order-settle-ms']` define quanto a carteira simulada leva para responder a um pedido (padrão `1500`).
- `window.kurioMock.reset()` apaga todo o estado do mock (inclusive os cenários) e recarrega a página.

### Sessão

Contas fictícias: `ana@kurio.dev` / `Kurio@123` e `bruno@kurio.dev` / `Kurio@456`. Contas criadas pelo cadastro ficam em `localStorage['kurio:mock:users']`. O mock guarda só hash PBKDF2-SHA256 com salt aleatório por conta, nunca a senha.

| Endpoint | Resposta |
| --- | --- |
| `POST /auth/login` `{ email, password }` | `200 { token, expiresAt, user }`, `422` com `fieldErrors` ou `401` (mesma mensagem para e-mail inexistente e senha errada) |
| `POST /auth/register` `{ name, email, password }` | `201 { token, expiresAt, user }` (já entra na conta), `422` com `fieldErrors` ou `409` se o e-mail já existe |
| `GET /auth/session` | `200 { expiresAt, user }` ou `401` |
| `POST /auth/logout` | `204`, idempotente |
| `GET /auth/profile` | Exige login. Devolve o perfil do colecionador (`displayName`, `username`, `email`, `ensName`, `ensSuffix`, `walletNickname`); campos ainda não salvos vêm vazios |
| `PATCH /auth/profile` | Exige login. Atualiza nome, e-mail e perfil. Senha só muda se `currentPassword` e `newPassword` vierem juntos; `422` se a senha atual não conferir, `409` se o e-mail já existir |
| `PUT /auth/profile/avatar` `{ image }`, `DELETE /auth/profile/avatar` | Exige login. Troca ou remove o avatar (`image` é um data URL PNG, JPEG ou WebP; o app recorta e reduz para 256 px antes de enviar) e devolve o perfil; `422` se a imagem for inválida |
| `GET /auth/wallets` | Exige login. Devolve `{ primary, secondary, mirrorPrimary }`; carteiras ainda não salvas vêm `null` |
| `POST /auth/wallets/:slot`, `PUT /auth/wallets/:slot` | Exige login. `slot` é `primary` ou `secondary`. `POST` cria (`201`; `409` se já existe), `PUT` substitui (`404` se ainda não existe); `422` se os dados forem inválidos |
| `PATCH /auth/wallets` `{ mirrorPrimary }` | Exige login. Faz a secundária repetir a principal (ou deixar de repetir); `422` se a principal ainda não existe |
| `GET /favorites`, `PUT`/`DELETE /favorites/:nftId` | `{ data: string[] }` do usuário autenticado, ou `401` |
| `GET /cart` | `{ items, itemCount, subtotal, discount, networkFee, total, promoCode? }` do dono: o usuário autenticado ou, sem token, o visitante deste navegador. Ao entrar ou criar a conta, o carrinho do visitante passa para a conta |
| `POST /cart/items` `{ nftId, editionId, quantity }` | Soma à linha existente (mesmo NFT e edição), respeitando estoque e o máximo por pedido; `409` se esgotado ou no limite |
| `PATCH /cart/items` `{ nftId, editionId, quantity }` | Define a quantidade; `0` remove a linha |
| `DELETE /cart/items/:nftId/:editionId` | Remove a linha; `404` se ela não está no carrinho |
| `POST /cart/promo` `{ code }` | Aplica um código (`KURIO10` dá 10% sobre o subtotal); `409` se o código for inválido ou expirado (`LANCAMENTO20`) |
| `DELETE /cart/promo` | Remove o cupom do carrinho (idempotente) |
| `GET /cart/quote` | Cotação atual do carrinho sem alterá-lo: linhas com preço e disponibilidade (`ok`, `reduced`, `sold-out`), cupom (`applied` ou `expired`), desconto, taxa e total. O pagamento a consulta antes de confirmar, e `POST /orders` só aceita esse total |
| `POST /orders` `{ ...perfil, expectedTotal }` + cabeçalho `Idempotency-Key` | Exige login. Repetir com a mesma chave e o mesmo corpo devolve o mesmo pedido; a mesma chave com outro corpo é `409`. Copia o carrinho para um pedido `pending` (`id`, `status`, `version`, totais, itens), esvazia o carrinho e responde `202`. A carteira simulada responde depois, por `order.updated`: `confirmed` (com `txId`) ou `refused` (com `failureReason`; os itens voltam ao carrinho). `409` se o carrinho estiver vazio ou se `expectedTotal` não for mais o total do carrinho (preço ou estoque mudou), `422` se o perfil for inválido |
| `GET /orders/:id` | Exige login. O pedido no estado atual; `404` se não existir, `403` se for de outra conta |

- O token vai em `Authorization: Bearer` e fica em `localStorage['kurio:session-token']`, para sobreviver ao refresh e valer entre abas (diferente de um cookie httpOnly, é legível por scripts, aceitável nesta demo).
- Login e cadastro são um diálogo aberto por `?auth=login` ou `?auth=signup` em qualquer tela, com `redirect=/caminho` opcional (apenas caminhos internos). Alternar entre os dois substitui a entrada do histórico, mantendo o `redirect`. Ações que exigem login (favoritar) abrem o diálogo e são retomadas ao entrar ou ao criar a conta.
- `/checkout`, `/profile` e `/wallets` são protegidas no router (`beforeLoad`): um visitante vai para o carrinho (pagamento) ou para o início (perfil e carteiras) com o login aberto, e volta à tela pedida, com a busca, depois de entrar.
- Comprar no detalhe adiciona ao carrinho (`/cart`). Visitantes podem montar o carrinho; **Conectar e finalizar** pede login e abre `/checkout`. Quem já entrou vê **Finalizar** e segue direto. No desktop o colecionador preenche o perfil; no mobile escolhe uma carteira salva e a rede. **Confirmar compra** envia o pedido com o total exibido e abre o diálogo em **Confirmando o pagamento**; o pedido fica na URL (`/checkout?order=KR-…`), então um refresh ou uma reconexão retomam o acompanhamento. Quando a carteira responde, o diálogo vira o recibo (com link para o Etherscan) ou **Pagamento recusado**.
- O perfil do colecionador fica em `/profile`, pelo menu da conta (**Meu perfil**) ou pelo rodapé. Visitante vê o pedido de login. **Salvar** grava nome, usuário, e-mail, ENS e apelido da carteira. **Alterar**/**Remover** salvam o avatar na hora. A troca de senha só vale quando os três campos são preenchidos. **Carteiras** (`/wallets`) guarda a carteira principal e, se quiser, uma secundária ou a cópia da principal.
- Os formulários de login e cadastro usam TanStack Form, validados por schemas Zod em `src/lib/validation.ts`. O mock valida o corpo das requisições com os mesmos schemas. Regras do cadastro: nome de usuário com 2 a 40 caracteres, e-mail válido, senha com pelo menos 8 caracteres incluindo letras e números, e confirmação igual à senha.
- Sessão expira em 30 min. Um `401` em requisição autenticada, ou o `expiresAt` vencendo, encerra a sessão e reabre o login sobre a mesma tela. Para simular a expiração no servidor, apague `localStorage['kurio:mock:sessions']`.
- Dados privados ficam sob a chave de query `['me', userId, ...]`; logout, expiração, troca de usuário e login/logout em outra aba removem essas queries e as mutations pendentes.
- Em desenvolvimento, os devtools do TanStack Query e do TanStack Router aparecem nos cantos inferiores.
- Novos componentes shadcn/ui: `pnpm dlx shadcn@latest add <componente>`.

### Estado, cache e reconciliação

- **Carrinho:** vive no servidor (mock), um por dono: o usuário autenticado ou o visitante do navegador. Ao entrar, o carrinho do visitante passa para a conta. Totais, descontos e taxa são sempre calculados pelo servidor; o app só exibe. O cache do carrinho é descartado quando muda o dono (logout, outro usuário) e só revalidado quando a mesma pessoa entra de novo.
- **Cache (TanStack Query):** `staleTime` padrão de 30 s; destaques, relacionados e sugeridos 5 min; facetas e pedidos sem expiração (pedidos mudam por evento). Dados de usuário ficam sob `['me', userId, …]` e são removidos no logout, na expiração e na troca de usuário. Mutations devolvem o recurso inteiro, que substitui o cache; favoritos são otimistas com rollback.
- **Retries:** consultas repetem falhas transitórias (rede, timeout, 429, 5xx) duas vezes; mutations só repetem quando idempotentes (o pedido, com a mesma `Idempotency-Key`).
- **REST × Socket.IO:** eventos atualizam o cache só se trouxerem versão mais nova que a que ele tem (do REST ou de outro evento); duplicados são ignorados pelo `id`. Ao reconectar, o app rebusca pelo REST NFTs, carrinho e pedidos em tela. Detalhes em [ARCHITECTURE.md](ARCHITECTURE.md).

### Tempo real (Socket.IO)

O app usa o `socket.io-client` de verdade. O servidor é simulado pelo MSW (`src/mocks/socket-io.ts`): ele intercepta o WebSocket e fala o protocolo Socket.IO (handshake do Engine.IO, `auth` no CONNECT, ping e eventos) com os parsers oficiais (`engine.io-parser` e `socket.io-parser`), sobre o mesmo estado do REST. O `@mswjs/socket.io-binding` não foi usado porque só suporta o MSW 2 e não lê o `auth` do handshake.

| Evento | Quem recebe | Efeito no app |
| --- | --- | --- |
| `nft.updated` `{ price, previousPrice?, editions[{ id, available }], updatedAt }` | Todos | Atualiza catálogo, destaque, relacionados e detalhe; refaz o carrinho pelo REST se o NFT estiver nele. Avisa (região `aria-live`) quando o preço muda no detalhe aberto, ou quando um item do carrinho muda de preço, esgota ou tem a quantidade ajustada. No checkout, um total novo gera o aviso para revisar antes de confirmar |
| `order.updated` `{ userId, order }` | Só os sockets do dono do pedido | Move o pedido em cache para `confirmed`/`refused`; o diálogo do checkout mostra o recibo ou a recusa. Fora do checkout, um aviso informa o desfecho |

- Todo evento traz `id` (único por emissão), `type`, `resource { type, id }`, `version` (versão do recurso após a mudança) e `occurredAt`. O cliente ignora um `id` repetido e qualquer `version` menor ou igual à que já conhece, seja de outro evento ou da resposta REST em cache, então duplicados e atrasados nunca regridem a tela.
- O socket se autentica pelo `auth: { token }` do handshake, lido a cada (re)conexão. O servidor confere a sessão a cada entrega de `order.updated`: depois do logout, o token antigo não recebe mais nada. Ao trocar de usuário, o app refaz o handshake, e ainda descarta `order.updated` cujo `userId` não seja o da sessão atual.
- Ao reconectar, o app refaz pelo REST as consultas de NFTs, do carrinho e dos pedidos em tela, para recuperar o que foi perdido enquanto esteve desconectado. Depois de 3 s sem conexão, um aviso informa que as atualizações em tempo real estão indisponíveis.
- O `socket.io-client` é carregado sob demanda, depois do MSW: o `engine.io-client` guarda o `WebSocket` global quando o módulo é avaliado.
- Controles do servidor simulado, usados pelos testes e úteis no DevTools (`window.kurioMock.realtime`):
  - `updateNft(id, { price?, available? })` muda preço e/ou estoque e emite `nft.updated`.
  - `updateNftSilently(id, …)` muda o mesmo sem emitir nada, como um evento perdido.
  - `redeliver(eventId)` reenvia um evento já emitido; `deliver(event)` envia um evento arbitrário, como uma versão antiga atrasada.
  - `disconnectAll()` derruba as conexões; `setOnline(false | true)` derruba e recusa novas conexões até voltar.
  - `settleOrders()` responde agora os pedidos pendentes; `connections()` conta os sockets conectados.

Exemplo: `kurioMock.realtime.updateNft('nft-1', { price: '1.47', available: { '1-50': 0 } })`.

### Variáveis de ambiente

Copie `.env.example` para `.env.local`:

| Variável           | Padrão           | Descrição                             |
| ------------------ | ---------------- | ------------------------------------- |
| `VITE_API_URL`     | `/api`           | URL base da API REST usada pelo Axios |
| `VITE_SOCKET_URL`  | origem da página | URL do servidor Socket.IO (simulado pelo MSW) |
| `VITE_API_MOCKING` | `enabled`        | Use `disabled` para desligar o MSW    |

## Scripts

| Comando                | O que faz                                           |
| ---------------------- | --------------------------------------------------- |
| `pnpm dev`             | Servidor de desenvolvimento em `:4317`              |
| `pnpm build`           | Type-check + build de produção em `dist/`           |
| `pnpm preview`         | Serve o build em `:4318`                            |
| `pnpm lint`            | Lint com oxlint                                     |
| `pnpm typecheck`       | Type-check com `tsc -b`                             |
| `pnpm test:e2e`        | Testes E2E e de regressão visual (1440, 768 e 390)  |
| `pnpm test:e2e:prod`   | Mesma suíte contra a produção (https://frontend-challenge.paulodev.com.br) |
| `pnpm test:e2e:update` | Regrava os screenshots de referência                |
| `pnpm test:e2e:ui`     | Abre o modo UI do Playwright                        |
| `pnpm lighthouse`      | Lighthouse CI desktop + mobile e resumo das medianas |
| `pnpm lighthouse:desktop` / `pnpm lighthouse:mobile` | Só um dos perfis                     |

### Playwright

Na primeira execução, instale o navegador:

```bash
pnpm exec playwright install --with-deps chromium
```

Os testes sobem automaticamente `build + preview` na porta 4318 (se já houver um servidor nessa porta, ele é reaproveitado; pare-o antes para testar um build novo). Rodam em Chromium nos projetos `desktop` (1440×900) e `mobile` (390×844), que executam todos os fluxos, e `tablet` (768×1024), que executa as specs sensíveis a layout (visual, acessibilidade, catálogo, detalhe). Geram relatório HTML (`pnpm exec playwright show-report`) e guardam o trace de toda falha. A regressão visual (`e2e/visual.spec.ts`) compara home, detalhe, carrinho e pagamento com as baselines de `e2e/__screenshots__/` nas três larguras; depois de uma mudança visual intencional, rode `pnpm test:e2e:update`.

Para rodar contra uma aplicação já publicada, sem build local, defina `E2E_BASE_URL` (`pnpm test:e2e:prod` já aponta para a produção). Como o MSW roda no navegador, a versão publicada é testada exatamente como a local:

```bash
E2E_BASE_URL=https://frontend-challenge.paulodev.com.br pnpm exec playwright test
```

Para reproduzir os fluxos de falha à mão, ative um cenário e recarregue, por exemplo:

```js
localStorage.setItem('kurio:mock-scenarios', 'checkout-timeout')
```

Depois, `kurioMock.reset()` limpa tudo.

### Lighthouse

`pnpm lighthouse` faz o build, sobe o preview e audita `/` e `/nfts/nft-1` nos perfis desktop e mobile, 3 vezes cada, falhando se a mediana ficar abaixo das metas (Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90). No fim copia os relatórios HTML e JSON da execução mediana de cada página e perfil para [`lighthouse/`](lighthouse/RESULTS.md), versionada, e escreve `lighthouse/RESULTS.md` com as notas, LCP, CLS, TBT, versões das ferramentas, ambiente e condições. As execuções brutas ficam em `.lighthouseci/` (ignorada). Por padrão usa o Chromium instalado pelo Playwright; defina `CHROME_PATH` para usar outro navegador. A análise está em [ARCHITECTURE.md](ARCHITECTURE.md#performance).

## Deploy

O build é estático (`dist/`) e o MSW roda em produção, então qualquer host de arquivos estáticos serve. O que importa é o fallback de SPA, para que acesso direto e refresh em qualquer rota funcionem:

- **Vercel:** `vercel.json` já define o build, o fallback para `index.html` e o cache dos assets. Basta importar o repositório.
- **Netlify:** `public/_redirects` (copiado para `dist/`) faz o fallback. Build: `pnpm build`; diretório: `dist`.
- **Cloudflare Pages:** build `pnpm build`, saída `dist`; o fallback de SPA é automático.

`mockServiceWorker.js` precisa ser servido na raiz, o que já acontece porque ele está em `public/`.

## Estrutura

```
src/
  main.tsx                QueryClient, Router e inicialização do MSW
  routes/                 Rotas do TanStack Router (a árvore é gerada em routeTree.gen.ts)
  lib/api/client.ts       Instância do Axios
  lib/socket.ts           Cliente Socket.IO tipado (carregado sob demanda)
  lib/realtime/           Contrato dos eventos e aplicação deles no cache do TanStack Query
  components/realtime/    Conexão do socket, reconciliação e avisos de tempo real
  mocks/                  Worker e handlers do MSW (REST e Socket.IO), stores e cenários
  components/ui/          Componentes shadcn/ui
  components/devtools.tsx Devtools do TanStack (apenas em dev)
e2e/                      Testes Playwright (fluxos, tempo real, acessibilidade, visual)
lighthouserc.cjs          Configuração do Lighthouse CI (perfil por LHCI_FORM_FACTOR)
scripts/                  Exportação das medianas do Lighthouse
lighthouse/               Relatórios HTML/JSON medianos e RESULTS.md (versionados)
ARCHITECTURE.md           Contratos, políticas, decisões e limitações
```
