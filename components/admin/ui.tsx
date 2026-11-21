"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function PageTitle({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-medium text-white">{title}</h1>
        {text && <p className="mt-1.5 max-w-2xl text-sm text-paper/70">{text}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-mute">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-paper/60">{hint}</p>}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="card p-8 text-center text-sm text-paper/70">{text}</p>;
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="card border-ember/50 p-5 text-sm text-paper/90" role="alert">
      <p>{text}</p>
      {onRetry && <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={onRetry}>Tentar de novo</button>}
    </div>
  );
}

export function Loading() {
  return <div className="card h-40 animate-pulse" role="status" aria-label="A carregar" />;
}

export function Modal({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-1.5rem)] rounded-2xl border border-line bg-panel p-0 text-paper backdrop:bg-black/70 ${wide ? "max-w-3xl" : "max-w-xl"}`}
    >
      {open && (
        <div className="max-h-[88vh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-panel px-5 py-4">
            <h2 className="font-display text-lg font-medium text-white">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-paper/70 hover:text-white"><X size={20} /></button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition disabled:opacity-50 ${checked ? "border-gold bg-gold" : "border-line bg-coal"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full transition ${checked ? "translate-x-6 bg-ink" : "translate-x-1 bg-mute"}`} />
    </button>
  );
}

const ORDER_BADGE: Record<string, string> = {
  paid: "border-ok/50 text-ok",
  processing: "border-gold/60 text-gold",
  awaiting_payment: "border-line text-paper/80",
  expired: "border-line text-mute",
  cancelled: "border-ember/50 text-ember",
};
export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`badge whitespace-nowrap ${ORDER_BADGE[status] ?? ""}`}>{label}</span>;
}

/** Limpa a cópia guardada do site público depois de uma alteração no painel. */
export async function refreshSite(): Promise<void> {
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (token) await fetch("/api/revalidar", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  } catch {
    /* o site actualiza sozinho dentro de um minuto */
  }
}

export function errorText(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Ocorreu um erro. Tente de novo.";
}
