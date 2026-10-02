# Frontend Challenge

Base limpa com a stack abaixo já configurada e integrada, pronta para começar a implementar.

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

- O **MSW** é iniciado no navegador com os handlers de `src/mocks/handlers.ts`.
- Cenários de falha do mock são ativados por `localStorage['kurio:mock-scenarios']` (lista separada por vírgula): `favorites-error` (favoritar/desfavoritar responde 503), `login-error` (login responde 503), `signup-error` (cadastro responde 503), `cart-error` (carrinho responde 503), `checkout-error` (pagamento responde 503), `profile-error` (salvar o perfil responde 503) e `wallets-error` (salvar a carteira responde 503).

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
| `GET /auth/wallets` | Exige login. Devolve `{ primary, secondary, mirrorPrimary }`; carteiras ainda não salvas vêm `null` |
| `PUT /auth/wallets` | Exige login. `action: "save"` grava a carteira `primary` ou `secondary`; `action: "mirror"` copia a principal para a secundária. `422` se os dados forem inválidos ou se a principal ainda não existir |
| `GET /favorites`, `PUT`/`DELETE /favorites/:nftId` | `{ data: string[] }` do usuário autenticado, ou `401` |
| `GET /cart` | `{ items, itemCount, subtotal, discount, networkFee, total, promoCode? }` — o carrinho vive neste navegador e não exige login |
| `POST /cart/items` `{ nftId, editionId, quantity }` | Soma à linha existente (mesmo NFT e edição), respeitando estoque e o máximo por pedido; `409` se esgotado ou no limite |
| `PATCH /cart/items` `{ nftId, editionId, quantity }` | Define a quantidade; `0` remove a linha |
| `POST /cart/promo` `{ code }` | Aplica um código (`KURIO10` dá 10% sobre o subtotal); `409` se o código for inválido |
| `POST /orders` | Exige login. Copia o carrinho para um recibo (`id`, `txId`, totais, itens), esvazia o carrinho e devolve o recibo; `409` se o carrinho estiver vazio, `422` se o perfil for inválido |

- O token vai em `Authorization: Bearer` e fica em `localStorage['kurio:session-token']`, para sobreviver ao refresh e valer entre abas (diferente de um cookie httpOnly, é legível por scripts, aceitável nesta demo).
- Login e cadastro são um diálogo aberto por `?auth=login` ou `?auth=signup` em qualquer tela, com `redirect=/caminho` opcional (apenas caminhos internos). Alternar entre os dois substitui a entrada do histórico, mantendo o `redirect`. Ações que exigem login (favoritar) abrem o diálogo e são retomadas ao entrar ou ao criar a conta.
- Comprar no detalhe adiciona ao carrinho (`/cart`). Visitantes podem montar o carrinho; **Conectar e finalizar** pede login e abre `/checkout`. Quem já entrou vê **Finalizar** e segue direto. **Confirmar compra** envia o pedido e abre o recibo, com link para o Etherscan. No desktop o colecionador preenche o perfil; no mobile escolhe uma carteira salva e a rede.
- O perfil do colecionador fica em `/profile`, pelo menu da conta (**Meu perfil**) ou pelo rodapé. Visitante vê o pedido de login. **Salvar** grava nome, usuário, e-mail, ENS e apelido da carteira. A troca de senha só vale quando os três campos são preenchidos. **Carteiras** (`/wallets`) guarda a carteira principal e, se quiser, uma secundária ou a cópia da principal.
- Os formulários de login e cadastro usam TanStack Form, validados por schemas Zod em `src/lib/validation.ts`. O mock valida o corpo das requisições com os mesmos schemas. Regras do cadastro: nome de usuário com 2 a 40 caracteres, e-mail válido, senha com pelo menos 8 caracteres incluindo letras e números, e confirmação igual à senha.
- Sessão expira em 30 min. Um `401` em requisição autenticada, ou o `expiresAt` vencendo, encerra a sessão e reabre o login sobre a mesma tela. Para simular a expiração no servidor, apague `localStorage['kurio:mock:sessions']`.
- Dados privados ficam sob a chave de query `['me', userId, ...]`; logout, expiração, troca de usuário e login/logout em outra aba removem essas queries e as mutations pendentes.
- O **Socket.IO** roda dentro do próprio servidor do Vite (plugin em `server/realtime.ts`), tanto em `pnpm dev` quanto em `pnpm preview`.
- Em desenvolvimento, os devtools do TanStack Query e do TanStack Router aparecem nos cantos inferiores.
- Novos componentes shadcn/ui: `pnpm dlx shadcn@latest add <componente>`.

### Variáveis de ambiente

Copie `.env.example` para `.env.local`:

| Variável           | Padrão           | Descrição                             |
| ------------------ | ---------------- | ------------------------------------- |
| `VITE_API_URL`     | `/api`           | URL base da API REST usada pelo Axios |
| `VITE_SOCKET_URL`  | origem da página | URL do servidor Socket.IO             |
| `VITE_API_MOCKING` | `enabled`        | Use `disabled` para desligar o MSW    |

## Scripts

| Comando                | O que faz                                           |
| ---------------------- | --------------------------------------------------- |
| `pnpm dev`             | Servidor de desenvolvimento em `:4317`              |
| `pnpm build`           | Type-check + build de produção em `dist/`           |
| `pnpm preview`         | Serve o build em `:4318` (com Socket.IO)            |
| `pnpm lint`            | Lint com oxlint                                     |
| `pnpm typecheck`       | Type-check com `tsc -b`                             |
| `pnpm test:e2e`        | Testes E2E e de regressão visual (desktop e mobile) |
| `pnpm test:e2e:update` | Regrava os screenshots de referência                |
| `pnpm test:e2e:ui`     | Abre o modo UI do Playwright                        |
| `pnpm lighthouse`      | Auditoria Lighthouse CI sobre o build de produção   |

### Playwright

Na primeira execução, instale o navegador:

```bash
pnpm exec playwright install --with-deps chromium
```

Os testes sobem automaticamente `build + preview` na porta 4318. Screenshots de referência ficam em `e2e/__screenshots__/`.

### Lighthouse

`pnpm lighthouse` faz o build, sobe o preview e audita `/` no preset desktop. Os relatórios ficam em `.lighthouseci/`. Por padrão usa o Chromium instalado pelo Playwright; defina `CHROME_PATH` para usar outro navegador.

## Estrutura

```
server/realtime.ts        Servidor Socket.IO acoplado ao Vite (dev e preview)
src/
  main.tsx                QueryClient, Router e inicialização do MSW
  routes/                 Rotas do TanStack Router (a árvore é gerada em routeTree.gen.ts)
  lib/api/client.ts       Instância do Axios
  lib/socket.ts           Cliente Socket.IO tipado
  mocks/                  Worker e handlers do MSW
  components/ui/          Componentes shadcn/ui
  components/devtools.tsx Devtools do TanStack (apenas em dev)
e2e/                      Testes Playwright
lighthouserc.cjs          Configuração do Lighthouse CI
```
