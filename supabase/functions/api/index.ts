// Servidor do GOVERNA-TE: uma só função com rotas.
//   POST /api/checkout          compra e pagamento (AppyPay)
//   GET  /api/order-status      estado do pedido, bilhetes
//   POST /api/public-forms      lista de espera, propostas, «os meus bilhetes»
//   POST /api/appypay-webhook   aviso de pagamento da AppyPay (?secret=…)
//   POST /api/reconcile         tarefa periódica (cabeçalho x-cron-secret)
//   POST /api/admin             convites do painel e teste da AppyPay
// A função é pública (sem verificação de JWT à entrada): cada rota faz a sua própria validação.
import { cors, fail } from "../_shared/db.ts";
import { handle as checkout } from "./handlers/checkout.ts";
import { handle as orderStatus } from "./handlers/order-status.ts";
import { handle as publicForms } from "./handlers/public-forms.ts";
import { handle as appypayWebhook } from "./handlers/appypay-webhook.ts";
import { handle as reconcile } from "./handlers/reconcile.ts";
import { handle as admin } from "./handlers/admin-api.ts";

const routes: Record<string, (req: Request) => Promise<Response>> = {
  "checkout": checkout,
  "order-status": orderStatus,
  "public-forms": publicForms,
  "appypay-webhook": appypayWebhook,
  "reconcile": reconcile,
  "admin": admin,
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  const handler = routes[route];
  return handler ? handler(req) : fail("Rota desconhecida", 404);
});
