// Endereços públicos do projecto Supabase. A chave publicável pode estar no navegador:
// o que protege os dados são as regras da base (RLS) e as validações do servidor.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://zryznrmlesjlgufqykye.supabase.co";

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_kxatOvwVp-Noxn-D5WRjWA_-b5OXNrX";

export const API_URL = `${SUPABASE_URL}/functions/v1/api`;

export const INSTAGRAM_URL = "https://www.instagram.com/governa_te";
