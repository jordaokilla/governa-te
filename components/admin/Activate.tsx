"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";

/** Activação de um convite de administrador: a pessoa escolhe a sua palavra-passe. */
export function Activate() {
  const code = useSearchParams().get("c") ?? "";
  const router = useRouter();
  const [info, setInfo] = useState<{ email: string; name: string | null } | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.admin<{ email: string; name: string | null }>({ action: "invite-info", code })
      .then((r) => {
        if (!alive) return;
        setInfo(r);
        setName(r.name ?? "");
      })
      .catch((e) => alive && setInvalid(e instanceof Error ? e.message : "Ligação inválida."));
    return () => {
      alive = false;
    };
  }, [code]);

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="card w-full max-w-sm p-7">
        <Logo />
        {invalid ? (
          <>
            <h1 className="mt-5 font-display text-xl font-medium text-white">Ligação inválida</h1>
            <p className="mt-2 text-sm text-paper/75">{invalid} Peça uma ligação nova a um administrador.</p>
          </>
        ) : !info ? (
          <p className="mt-5 text-sm text-mute" role="status">A verificar a ligação…</p>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              if (password.length < 10) return setError("A palavra-passe deve ter pelo menos 10 caracteres.");
              if (password !== confirm) return setError("As duas palavras-passe não coincidem.");
              setBusy(true);
              try {
                await api.admin({ action: "activate", code, password, name });
                const { error: signErr } = await supabase().auth.signInWithPassword({ email: info.email, password });
                if (signErr) throw new Error("Conta activada. Entre no painel com a palavra-passe que escolheu.");
                router.push("/admin");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Ocorreu um erro.");
                setBusy(false);
              }
            }}
          >
            <div>
              <h1 className="font-display text-xl font-medium text-white">Activar o acesso ao painel</h1>
              <p className="mt-1 text-sm text-paper/70">Conta: {info.email}</p>
            </div>
            <div>
              <label className="field-label" htmlFor="ac-name">Nome</label>
              <input id="ac-name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="ac-pass">Palavra-passe</label>
              <input id="ac-pass" className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="field-hint">Pelo menos 10 caracteres.</p>
            </div>
            <div>
              <label className="field-label" htmlFor="ac-pass2">Repita a palavra-passe</label>
              <input id="ac-pass2" className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && <p className="text-sm text-ember" role="alert">{error}</p>}
            <button type="submit" className="btn btn-gold w-full" disabled={busy}>{busy ? "A activar…" : "Activar e entrar"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
