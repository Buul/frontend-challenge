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
- Cenários de falha do mock são ativados por `localStorage['kurio:mock-scenarios']` (lista separada por vírgula): `favorites-error` (favoritar/desfavoritar responde 503) e `login-error` (login responde 503).

### Sessão

Contas fictícias: `ana@kurio.dev` / `Kurio@123` e `bruno@kurio.dev` / `Kurio@456`. O mock guarda só hash PBKDF2-SHA256 com salt, nunca a senha.

| Endpoint | Resposta |
| --- | --- |
| `POST /auth/login` `{ email, password }` | `200 { token, expiresAt, user }`, `422` com `fieldErrors` ou `401` (mesma mensagem para e-mail inexistente e senha errada) |
| `GET /auth/session` | `200 { expiresAt, user }` ou `401` |
| `POST /auth/logout` | `204`, idempotente |
| `GET /favorites`, `PUT`/`DELETE /favorites/:nftId` | `{ data: string[] }` do usuário autenticado, ou `401` |

- O token vai em `Authorization: Bearer` e fica em `localStorage['kurio:session-token']`, para sobreviver ao refresh e valer entre abas (diferente de um cookie httpOnly, é legível por scripts, aceitável nesta demo).
- O login é um diálogo aberto por `?auth=login` em qualquer tela, com `redirect=/caminho` opcional (apenas caminhos internos). Ações que exigem login (favoritar) abrem o diálogo e são retomadas ao entrar.
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
