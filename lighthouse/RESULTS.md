# Lighthouse

Mediana de 3 execuções por página e perfil (`pnpm lighthouse`), no build de produção (`pnpm build && pnpm preview`) com o cenário padrão dos mocks.
Cada linha é a execução representativa (mediana) escolhida pelo Lighthouse CI; os relatórios completos estão ao lado.

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | Relatório |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop | `/` | 100 | 100 | 100 | 100 | 0.7 s | 0 | 0 ms | [HTML](desktop-home.report.html) · [JSON](desktop-home.report.json) |
| desktop | `/nfts/nft-1` | 100 | 100 | 100 | 100 | 0.8 s | 0 | 0 ms | [HTML](desktop-detail.report.html) · [JSON](desktop-detail.report.json) |
| mobile | `/` | 91 | 100 | 100 | 100 | 3.2 s | 0 | 0 ms | [HTML](mobile-home.report.html) · [JSON](mobile-home.report.json) |
| mobile | `/nfts/nft-1` | 90 | 100 | 100 | 100 | 3.4 s | 0.004 | 0 ms | [HTML](mobile-detail.report.html) · [JSON](mobile-detail.report.json) |

## Ferramentas e ambiente

- Lighthouse CI 0.15.1, Node v22.19.0, darwin/arm64.
- **desktop:** Lighthouse 12.6.1; Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36; tela 1350×940 @1x (desktop); simulate: RTT 40 ms, 10240 kbps, CPU 1×; benchmark index 3891.5; medido em 2026-10-02T11:39:10.662Z.
- **mobile:** Lighthouse 12.6.1; Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36; tela 412×823 @1.75x (mobile); simulate: RTT 150 ms, 1638 kbps, CPU 4×; benchmark index 3893; medido em 2026-10-02T11:40:43.936Z.

## Condições

- Servidor local (`vite preview` em 127.0.0.1:4318), sem rede externa: imagens, fontes e scripts vêm do próprio build.
- MSW ativo e com o estado limpo (cada execução abre um perfil novo do Chrome); o tempo real conecta normalmente.
- Desktop usa o preset `desktop` do Lighthouse; mobile usa a emulação e o throttling padrão (Moto G Power, 4G lento, CPU 4×).
