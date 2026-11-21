# GOVERNA-TE

Plataforma do encontro GOVERNA-TE: site público, venda de bilhetes, espaços de expositor e patrocínios, com pagamento pela AppyPay (Multicaixa Express e referência), bilhetes com código QR e painel de administração.

## Como está montada

| Parte | Onde | O que faz |
| --- | --- | --- |
| Site e painel | `app/`, `components/` (Next.js, publicado no Vercel) | Páginas públicas, compra, página do pedido, bilhetes e `/admin` |
| Servidor | `supabase/functions/api/` (uma função com rotas) | Compra, estado do pedido, formulários, webhook e reconciliação da AppyPay, convites do painel |
| Base de dados | `supabase/migrations/` (Supabase) | Catálogo, pedidos, pagamentos, bilhetes, equipa, administradores e regras de acesso |

Regras que o código segue:

- O público só lê por `public_site()`. As tabelas não têm leitura anónima.
- Preço e stock são conferidos na base (`service_create_order`), nunca no navegador.
- Um pedido só fica pago com uma resposta da AppyPay (confirmada por consulta directa, nunca pelo corpo do webhook) ou por um administrador no painel. `service_mark_order_paid` emite os bilhetes uma só vez.
- Quem não está revelado na equipa sai do servidor só como silhueta: sem nome, sem fotografia.
- As credenciais (AppyPay, Resend) ficam no Supabase Vault e gravam-se no painel, em Definições. Nunca entram no repositório.

## Páginas

- `/`, `/bilhetes`, `/expositores`, `/patrocinadores`: site público.
- `/comprar?p=…`: compra. `/pedido?t=…`: pagamento, referência e bilhetes. `/bilhete?t=…`: um bilhete. `/meus-bilhetes`: procura por email e telemóvel.
- `/admin`: resumo, pedidos, bilhetes, entrada (leitor de QR), contactos, catálogo, equipa e definições.
- `/activar?c=…`: activação de um convite de administrador.

## Desenvolvimento

```bash
npm install
npm run dev
```

O site usa por omissão o projecto Supabase de produção (endereço e chave publicável em `lib/config.ts`). Para outro projecto, defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Verificações antes de enviar:

```bash
npx tsc --noEmit
npx eslint .
npx next build
```

Para a função do Supabase:

```bash
cd supabase/functions && npx deno check api/index.ts
```

## Pagamentos

A função `api` fala com a AppyPay em `lib/appypay.ts`. O estado dos pagamentos chega por três caminhos, todos a acabar em `applyOutcome` (`lib/payments.ts`):

1. A resposta à própria cobrança (Multicaixa Express).
2. O webhook `POST /api/appypay-webhook?secret=…` (o endereço completo está em Definições, no painel).
3. A consulta à AppyPay quando o comprador abre o pedido e a tarefa `governa-te-reconcile` (pg_cron, de 5 em 5 minutos).

O webhook é opcional: sem ele, os caminhos 1 e 3 confirmam os pagamentos.
