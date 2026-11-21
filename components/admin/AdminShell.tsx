"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BarChart3, Inbox, LogOut, Package, QrCode, Receipt, Settings as SettingsIcon, Ticket, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  { href: "/admin", label: "Resumo", icon: BarChart3 },
  { href: "/admin/pedidos", label: "Pedidos", icon: Receipt },
  { href: "/admin/bilhetes", label: "Bilhetes", icon: Ticket },
  { href: "/admin/entrada", label: "Entrada", icon: QrCode },
  { href: "/admin/contactos", label: "Contactos", icon: Inbox },
  { href: "/admin/catalogo", label: "Catálogo", icon: Package },
  { href: "/admin/equipa", label: "Equipa", icon: Users },
  { href: "/admin/definicoes", label: "Definições", icon: SettingsIcon },
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <form
        className="card w-full max-w-sm space-y-5 p-7"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const { error: err } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
          if (err) setError("Email ou palavra-passe incorrectos.");
          setBusy(false);
        }}
      >
        <Logo />
        <div>
          <h1 className="font-display text-xl font-medium text-white">Painel de administração</h1>
          <p className="mt-1 text-sm text-paper/70">Entre com a conta de administrador.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="adm-email">Email</label>
          <input id="adm-email" className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="field-label" htmlFor="adm-pass">Palavra-passe</label>
          <input id="adm-pass" className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-ember" role="alert">{error}</p>}
        <button type="submit" className="btn btn-gold w-full" disabled={busy}>{busy ? "A entrar…" : "Entrar"}</button>
        <p className="text-xs leading-relaxed text-mute">
          Sem acesso ou esqueceu-se da palavra-passe? Peça a outro administrador uma ligação de activação nova.
        </p>
      </form>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const db = supabase();
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase().rpc("is_admin").then(({ data }) => alive && setIsAdmin(data === true));
    return () => {
      alive = false;
    };
  }, [userId]);

  if (session === undefined || (session && isAdmin === undefined)) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-mute" role="status">A carregar…</div>;
  }
  if (!session) return <Login />;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="card max-w-sm p-7 text-center">
          <h1 className="font-display text-xl text-white">Sem acesso</h1>
          <p className="mt-2 text-sm text-paper/75">A conta {session.user.email} não é de administrador.</p>
          <button type="button" className="btn btn-ghost mt-5" onClick={() => supabase().auth.signOut()}>Sair</button>
        </div>
      </div>
    );
  }

  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="border-b border-white/5 bg-coal lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/admin" aria-label="Painel GOVERNA-TE"><Logo /></Link>
          <button type="button" className="rounded-lg p-2 text-paper/70 hover:text-white lg:hidden" onClick={() => supabase().auth.signOut()} aria-label="Sair">
            <LogOut size={18} />
          </button>
        </div>
        <nav aria-label="Painel" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${active(item.href) ? "bg-gold/10 font-medium text-gold" : "text-paper/75 hover:bg-white/5 hover:text-white"}`}
            >
              <item.icon size={17} aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/5 p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="truncate text-xs text-mute">{session.user.email}</p>
          <div className="mt-2 flex gap-3 text-xs">
            <Link href="/" className="text-paper/70 hover:text-gold">Ver o site</Link>
            <button type="button" className="text-paper/70 hover:text-gold" onClick={() => supabase().auth.signOut()}>Sair</button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-7 sm:px-8 lg:py-9">{children}</main>
    </div>
  );
}
