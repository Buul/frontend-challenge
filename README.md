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
- **Favoritos** são do visitante (ainda não há login): `GET /favorites`, `PUT /favorites/:nftId` e `DELETE /favorites/:nftId`, todos respondendo `{ data: string[] }`. O mock persiste a lista em `localStorage['kurio:mock:favorites']`.
- Cenários de falha do mock são ativados por `localStorage['kurio:mock-scenarios']` (lista separada por vírgula). Disponível: `favorites-error`, em que favoritar/desfavoritar responde 503.
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
