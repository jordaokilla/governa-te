"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  code: string;
  holder: string;
  product: string;
  status: "valid" | "used" | "cancelled";
  when?: string;
  where?: string;
  children?: React.ReactNode;
}

const STATUS = {
  valid: { label: "Válido", cls: "border-ok/50 text-ok" },
  used: { label: "Já utilizado", cls: "border-mute/50 text-mute" },
  cancelled: { label: "Cancelado", cls: "border-ember/60 text-ember" },
};

/** Bilhete com código QR. O QR leva só o código; quem valida é a equipa, no painel. */
export function TicketCard({ code, holder, product, status, when, where, children }: Props) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(code, { margin: 1, width: 440, errorCorrectionLevel: "M", color: { dark: "#0a0a0b", light: "#ffffff" } })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [code]);

  return (
    <article className="overflow-hidden rounded-2xl border border-gold/40 bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black px-5 py-3.5">
        <span className="inline-flex items-center gap-2">
          <Image src="/img/emblema.png" alt="" width={412} height={432} className="h-7 w-auto" />
          <span className="font-display text-sm font-bold tracking-wide text-white">GOVERNA-TE</span>
        </span>
        <span className={`badge ${STATUS[status].cls}`}>{STATUS[status].label}</span>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className={`mx-auto w-44 rounded-xl bg-white p-2 ${status !== "valid" ? "opacity-40" : ""}`}>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`Código QR do bilhete ${code}`} className="h-auto w-full" />
          ) : (
            <div className="aspect-square w-full animate-pulse rounded-lg bg-neutral-200" />
          )}
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{product}</p>
          <p className="mt-1.5 font-display text-xl font-medium break-words text-white">{holder}</p>
          <p className="mt-2 font-mono text-lg tracking-widest text-paper">{code}</p>
          {(when || where) && (
            <p className="mt-3 text-sm leading-relaxed text-paper/70">
              {when}
              {when && where && <br />}
              {where}
            </p>
          )}
          {children && <div className="no-print mt-4">{children}</div>}
        </div>
      </div>
    </article>
  );
}
