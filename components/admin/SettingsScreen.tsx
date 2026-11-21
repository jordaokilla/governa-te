"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { dateTime } from "@/lib/format";
import { ErrorBox, errorText, Loading, PageTitle, refreshSite, Toggle } from "./ui";

interface EventRow {
  event_name: string; edition: string; event_date: string | null; start_time: string | null; end_time: string | null;
  venue: string | null; city: string | null; venue_confirmed: boolean; capacity: number | null; sales_open: boolean;
  contact_phone: string | null; contact_whatsapp: string | null; contact_email: string | null; instagram_url: string | null;
  site_url: string | null; reference_hours: number;
}
interface ConfigStatus {
  appypay_client_id: boolean; appypay_client_secret: boolean; appypay_resource: boolean; appypay_api_url: string | null;
  appypay_method_express: string | null; appypay_method_reference: string | null; appypay_webhook_secret: string | null;
  resend_api_key: boolean; email_from: string | null;
}

function Section({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <section className="card mb-5 p-5 sm:p-6">
      <h2 className="font-display text-lg text-white">{title}</h2>
      {text && <p className="mt-1.5 max-w-2xl text-sm text-paper/70">{text}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EventForm() {
  const [d, setD] = useState<EventRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase().from("event_settings").select("*").single();
    if (err) setError(errorText(err));
    else setD(data as EventRow);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (error && !d) return <ErrorBox text={error} onRetry={load} />;
  if (!d) return <Loading />;
  const set = <K extends keyof EventRow>(k: K, v: EventRow[K]) => {
    setSaved(false);
    setD((cur) => (cur ? { ...cur, [k]: v } : cur));
  };
  const text = (k: keyof EventRow, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="field-label" htmlFor={`s-${k}`}>{label}</label>
      <input id={`s-${k}`} className="field" value={(d[k] as string | number | null) ?? ""} onChange={(e) => set(k, (e.target.value || null) as never)} {...props} />
    </div>
  );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const { error: err } = await supabase().from("event_settings").update({
          event_name: d.event_name || "GOVERNA-TE", edition: d.edition || "Edição 2027", event_date: d.event_date || null,
          start_time: d.start_time || null, end_time: d.end_time || null, venue: d.venue, city: d.city,
          venue_confirmed: d.venue_confirmed, capacity: d.capacity ? Number(d.capacity) : null, sales_open: d.sales_open,
          contact_phone: d.contact_phone, contact_whatsapp: d.contact_whatsapp?.replace(/\D/g, "") || null, contact_email: d.contact_email,
          instagram_url: d.instagram_url, site_url: d.site_url?.replace(/\/+$/, "") || null, reference_hours: Number(d.reference_hours) || 48,
        }).eq("id", true);
        setBusy(false);
        if (err) return setError(errorText(err));
        await refreshSite();
        setSaved(true);
      }}
    >
      <Section title="Vendas" text="Com as vendas fechadas, o site mostra os pacotes publicados mas ninguém consegue comprar.">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3.5">
          <span>
            <span className="block font-medium text-white">Vendas online {d.sales_open ? "abertas" : "fechadas"}</span>
            <span className="mt-0.5 block text-sm text-paper/70">Abra só depois de rever os preços e de configurar os pagamentos.</span>
          </span>
          <Toggle checked={d.sales_open} onChange={(v) => set("sales_open", v)} label="Vendas online abertas" />
        </div>
      </Section>

      <Section title="Encontro" text="Enquanto a data estiver vazia, o site diz «data a anunciar».">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("event_name", "Nome")}
          {text("edition", "Edição")}
          {text("event_date", "Data", { type: "date" })}
          {text("capacity", "Lotação", { type: "number", min: 1 })}
          {text("start_time", "Início", { type: "time" })}
          {text("end_time", "Fim", { type: "time" })}
          {text("venue", "Local")}
          {text("city", "Cidade")}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 sm:col-span-2">
            <span className="text-sm text-paper/85">Local confirmado (retira o aviso «sujeito a confirmação»)</span>
            <Toggle checked={d.venue_confirmed} onChange={(v) => set("venue_confirmed", v)} label="Local confirmado" />
          </div>
        </div>
      </Section>

      <Section title="Contactos e endereços">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("contact_whatsapp", "WhatsApp (com 244)", { inputMode: "tel", placeholder: "2449XXXXXXXX" })}
          {text("contact_phone", "Telefone", { inputMode: "tel" })}
          {text("contact_email", "Email", { type: "email" })}
          {text("instagram_url", "Instagram (endereço completo)")}
          {text("site_url", "Endereço do site", { placeholder: "https://governa-te.ao" })}
          <div>
            <label className="field-label" htmlFor="s-ref">Validade da referência (horas)</label>
            <input id="s-ref" className="field" type="number" min={1} max={720} value={d.reference_hours} onChange={(e) => set("reference_hours", Number(e.target.value))} />
            <p className="field-hint">O lugar fica reservado durante este tempo. A AppyPay pode aplicar o seu próprio prazo.</p>
          </div>
        </div>
        <p className="field-hint mt-3">O endereço do site é usado nas ligações dos emails enviados aos compradores.</p>
      </Section>

      {error && <p className="mb-3 text-sm text-ember" role="alert">{error}</p>}
      <div className="mb-9 flex items-center gap-4">
        <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? "A guardar…" : "Guardar definições"}</button>
        {saved && <span className="text-sm text-ok" role="status">Guardado.</span>}
      </div>
    </form>
  );
}

function Payments() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [f, setF] = useState({ appypay_client_id: "", appypay_client_secret: "", appypay_resource: "", appypay_api_url: "", appypay_method_express: "", appypay_method_reference: "", resend_api_key: "", email_from: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase().rpc("admin_config_status");
    if (error) return setMsg({ ok: false, text: errorText(error) });
    const s = data as ConfigStatus;
    setStatus(s);
    setF((cur) => ({ ...cur, appypay_api_url: s.appypay_api_url ?? "", appypay_method_express: s.appypay_method_express ?? "", appypay_method_reference: s.appypay_method_reference ?? "", email_from: s.email_from ?? "" }));
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (!status) return msg ? <ErrorBox text={msg.text} onRetry={load} /> : <Loading />;
  const webhook = `${API_URL}/appypay-webhook?secret=${status.appypay_webhook_secret ?? ""}`;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((cur) => ({ ...cur, [k]: e.target.value }));
  const secret = (k: "appypay_client_id" | "appypay_client_secret" | "appypay_resource" | "resend_api_key", label: string) => (
    <div>
      <label className="field-label" htmlFor={`pc-${k}`}>{label} <span className={status[k] ? "text-ok" : "text-mute"}>· {status[k] ? "preenchido" : "por preencher"}</span></label>
      <input id={`pc-${k}`} className="field" type="password" autoComplete="off" placeholder={status[k] ? "Deixe vazio para manter" : ""} value={f[k]} onChange={set(k)} />
    </div>
  );

  async function save(keys: (keyof typeof f)[]) {
    setBusy(true);
    setMsg(null);
    const values: Record<string, string> = {};
    for (const k of keys) {
      const isSecret = ["appypay_client_id", "appypay_client_secret", "appypay_resource", "resend_api_key"].includes(k);
      if (isSecret && !f[k].trim()) continue; // vazio = manter o que está guardado
      values[k] = f[k].trim();
    }
    const { error } = await supabase().rpc("admin_set_config", { p_values: values });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: errorText(error) });
    setF((cur) => ({ ...cur, appypay_client_id: "", appypay_client_secret: "", appypay_resource: "", resend_api_key: "" }));
    setMsg({ ok: true, text: "Guardado." });
    load();
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await supabase().auth.getSession();
      const res = await api.admin<{ ok: boolean; message: string }>({ action: "test-appypay" }, data.session?.access_token);
      setMsg({ ok: res.ok, text: res.message });
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) });
    }
    setBusy(false);
  }

  return (
    <>
      <Section title="Pagamentos · AppyPay" text="As credenciais ficam cifradas na base de dados e nunca voltam a ser mostradas. Peça-as à AppyPay (ou use as da conta que já tem).">
        <div className="grid gap-4 sm:grid-cols-2">
          {secret("appypay_client_id", "Client ID")}
          {secret("appypay_client_secret", "Client Secret")}
          {secret("appypay_resource", "Resource")}
          <div>
            <label className="field-label" htmlFor="pc-url">Endereço da API</label>
            <input id="pc-url" className="field" value={f.appypay_api_url} onChange={set("appypay_api_url")} />
          </div>
          <div>
            <label className="field-label" htmlFor="pc-gpo">Método Multicaixa Express (GPO)</label>
            <input id="pc-gpo" className="field" placeholder="GPO_…" value={f.appypay_method_express} onChange={set("appypay_method_express")} />
          </div>
          <div>
            <label className="field-label" htmlFor="pc-ref">Método Referência (REF)</label>
            <input id="pc-ref" className="field" placeholder="REF_…" value={f.appypay_method_reference} onChange={set("appypay_method_reference")} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-gold btn-sm" disabled={busy} onClick={() => save(["appypay_client_id", "appypay_client_secret", "appypay_resource", "appypay_api_url", "appypay_method_express", "appypay_method_reference"])}>Guardar credenciais</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={test}>Testar ligação</button>
        </div>
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="field-label">Endereço de aviso de pagamento (webhook)</p>
          <div className="flex gap-2">
            <input className="field min-h-10 py-2 font-mono text-xs" readOnly value={webhook} onFocus={(e) => e.target.select()} aria-label="Endereço do webhook" />
            <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={async () => { await navigator.clipboard.writeText(webhook).catch(() => undefined); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copiado" : "Copiar"}</button>
          </div>
          <p className="field-hint">Peça à AppyPay para registar este endereço na sua conta. Mesmo sem ele, os pagamentos são confirmados: o sistema pergunta à AppyPay de 5 em 5 minutos e sempre que o comprador abre o pedido.</p>
        </div>
      </Section>

      <Section title="Emails aos compradores · Resend" text="Opcional. Com a chave e o remetente preenchidos, o comprador recebe a referência e a confirmação do pagamento por email. Sem isto, tudo continua disponível na página do pedido.">
        <div className="grid gap-4 sm:grid-cols-2">
          {secret("resend_api_key", "Chave da API do Resend")}
          <div>
            <label className="field-label" htmlFor="pc-from">Remetente</label>
            <input id="pc-from" className="field" placeholder="GOVERNA-TE <bilhetes@o-seu-dominio.ao>" value={f.email_from} onChange={set("email_from")} />
          </div>
        </div>
        <button type="button" className="btn btn-gold btn-sm mt-5" disabled={busy} onClick={() => save(["resend_api_key", "email_from"])}>Guardar email</button>
      </Section>
      {msg && <p className={`mb-5 text-sm ${msg.ok ? "text-ok" : "text-ember"}`} role="status">{msg.text}</p>}
    </>
  );
}

function Admins() {
  const [admins, setAdmins] = useState<{ user_id: string; email: string; name: string | null }[]>([]);
  const [invites, setInvites] = useState<{ id: string; email: string; expires_at: string; used_at: string | null }[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const db = supabase();
    const [{ data: a }, { data: i }, { data: s }] = await Promise.all([
      db.from("admins").select("user_id, email, name").order("created_at"),
      db.from("admin_invites").select("id, email, expires_at, used_at").is("used_at", null).order("created_at", { ascending: false }),
      db.auth.getSession(),
    ]);
    setAdmins(a ?? []);
    setInvites((i ?? []).filter((x) => new Date(x.expires_at) > new Date()));
    setMe(s.session?.user.id ?? null);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <Section title="Administradores" text="Cada administrador entra com o seu email e a sua palavra-passe. O convite gera uma ligação de activação, válida 7 dias e de uso único: envie-a à pessoa por um canal seguro. Serve também para repor uma palavra-passe esquecida.">
      <ul className="divide-y divide-white/5 rounded-xl border border-line">
        {admins.map((a) => (
          <li key={a.user_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 truncate text-white">{a.name ? `${a.name} · ` : ""}{a.email}{a.user_id === me && <span className="text-mute"> (a sua conta)</span>}</span>
            {a.user_id !== me && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { if (window.confirm(`Retirar o acesso de ${a.email}?`)) { await supabase().from("admins").delete().eq("user_id", a.user_id); load(); } }}>Retirar</button>
            )}
          </li>
        ))}
        {invites.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 truncate text-paper/75">{i.email} <span className="text-mute">· convite até {dateTime(i.expires_at)}</span></span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await supabase().from("admin_invites").delete().eq("id", i.id); load(); }}>Anular</button>
          </li>
        ))}
      </ul>
      <form
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLink(null);
          setBusy(true);
          const { data, error: err } = await supabase().rpc("admin_create_invite", { p_email: email, p_name: name });
          setBusy(false);
          if (err) return setError(errorText(err));
          setLink(`${window.location.origin}/activar?c=${data}`);
          setEmail("");
          setName("");
          load();
        }}
      >
        <div>
          <label className="field-label" htmlFor="inv-email">Email</label>
          <input id="inv-email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="field-label" htmlFor="inv-name">Nome</label>
          <input id="inv-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-gold" disabled={busy}>Convidar</button>
      </form>
      {error && <p className="mt-3 text-sm text-ember" role="alert">{error}</p>}
      {link && (
        <div className="mt-4 rounded-xl border border-gold/50 p-4">
          <p className="text-sm text-paper/90">Ligação de activação (só aparece agora):</p>
          <input className="field mt-2 min-h-10 py-2 font-mono text-xs" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Ligação de activação" />
          <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => navigator.clipboard.writeText(link).catch(() => undefined)}>Copiar</button>
        </div>
      )}
    </Section>
  );
}

export function SettingsScreen() {
  return (
    <>
      <PageTitle title="Definições" text="Vendas, dados do encontro, pagamentos e quem tem acesso ao painel." />
      <EventForm />
      <Payments />
      <Admins />
    </>
  );
}
