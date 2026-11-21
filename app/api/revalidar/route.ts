import { revalidateTag } from "next/cache";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/config";

/** Depois de o painel gravar algo que o site mostra, limpa a cópia guardada. Só para administradores. */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: auth, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok || (await res.json()) !== true) return Response.json({ error: "Não autorizado" }, { status: 403 });
  revalidateTag("site", { expire: 0 });
  return Response.json({ ok: true });
}
