"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { dateTime } from "@/lib/format";
import { errorText, PageTitle } from "./ui";

interface Result { result: "ok" | "already_used" | "not_found" | "cancelled" | "error"; code?: string; holder_name?: string; product_name?: string; checked_in_at?: string; checked_in_by?: string; message?: string }

const TITLE = { ok: "Entrada validada", already_used: "Bilhete já utilizado", not_found: "Bilhete não encontrado", cancelled: "Bilhete cancelado", error: "Não foi possível validar" };

/** Validação à porta: lê o QR com a câmara ou aceita o código escrito. */
export function CheckIn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const refreshCount = useCallback(async () => {
    const { count: c } = await supabase().from("tickets").select("id", { count: "exact", head: true }).eq("status", "used");
    setCount(c ?? 0);
  }, []);

  const validate = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const now = Date.now();
    if (lastRef.current.code === value && now - lastRef.current.at < 4000) return; // a câmara lê o mesmo QR várias vezes
    lastRef.current = { code: value, at: now };
    setBusy(true);
    const { data, error } = await supabase().rpc("admin_check_in", { p_code: value });
    setBusy(false);
    if (error) setResult({ result: "error", message: errorText(error) });
    else {
      setResult(data as Result);
      if ((data as Result).result === "ok") {
        navigator.vibrate?.(120);
        refreshCount();
      } else navigator.vibrate?.([80, 60, 80]);
    }
    setCode("");
  }, [refreshCount]);

  useEffect(() => {
    const t = setTimeout(refreshCount, 0);
    return () => clearTimeout(t);
  }, [refreshCount]);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    (async () => {
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (cancelled || !videoRef.current) return;
        const scanner = new QrScanner(videoRef.current, (r) => validate(r.data), { preferredCamera: "environment", highlightScanRegion: true, maxScansPerSecond: 5 });
        scannerRef.current = scanner;
        await scanner.start();
        setCamError(null);
      } catch {
        setCamError("Não foi possível abrir a câmara. Dê permissão ao navegador ou escreva o código.");
        setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [scanning, validate]);

  const good = result?.result === "ok";

  return (
    <>
      <PageTitle title="Entrada" text="Leia o código QR do bilhete ou escreva o código. Cada bilhete só entra uma vez." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="relative aspect-square bg-black sm:aspect-[4/3]">
              <video ref={videoRef} className={`h-full w-full object-cover ${scanning ? "" : "hidden"}`} muted playsInline />
              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <CameraOff size={34} className="text-mute" aria-hidden />
                  <p className="text-sm text-paper/70">A câmara está desligada.</p>
                </div>
              )}
            </div>
            <div className="p-4">
              <button type="button" className={`btn w-full ${scanning ? "btn-ghost" : "btn-gold"}`} onClick={() => setScanning((v) => !v)}>
                <Camera size={18} aria-hidden />
                {scanning ? "Desligar a câmara" : "Ler código QR"}
              </button>
              {camError && <p className="mt-3 text-sm text-ember" role="alert">{camError}</p>}
            </div>
          </div>
          <form className="card flex gap-2 p-4" onSubmit={(e) => { e.preventDefault(); validate(code); }}>
            <label className="sr-only" htmlFor="ci-code">Código do bilhete</label>
            <input id="ci-code" className="field font-mono uppercase" placeholder="GT-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" />
            <button type="submit" className="btn btn-gold shrink-0" disabled={busy || !code.trim()}>Validar</button>
          </form>
        </div>

        <div className="space-y-4">
          <div aria-live="assertive" className={`card min-h-52 p-6 ${result ? (good ? "border-ok bg-ok/10" : "border-ember bg-ember/10") : ""}`}>
            {!result ? (
              <p className="text-sm text-paper/60">O resultado da leitura aparece aqui.</p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {good ? <CheckCircle2 size={34} className="text-ok" aria-hidden /> : <XCircle size={34} className="text-ember" aria-hidden />}
                  <h2 className="font-display text-2xl font-semibold text-white">{TITLE[result.result]}</h2>
                </div>
                {result.holder_name && <p className="mt-4 font-display text-xl text-white">{result.holder_name}</p>}
                {result.product_name && <p className="mt-1 text-sm text-paper/80">{result.product_name}</p>}
                {result.code && <p className="mt-2 font-mono text-sm text-paper/70">{result.code}</p>}
                {result.result === "already_used" && result.checked_in_at && (
                  <p className="mt-3 text-sm text-paper/90">Entrou em {dateTime(result.checked_in_at)}{result.checked_in_by ? `, validado por ${result.checked_in_by}` : ""}.</p>
                )}
                {result.result === "not_found" && <p className="mt-3 text-sm text-paper/90">Confirme o código ou procure o nome em «Bilhetes».</p>}
                {result.message && <p className="mt-3 text-sm text-paper/90">{result.message}</p>}
              </>
            )}
          </div>
          <div className="card p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-mute">Entradas validadas</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{count ?? "—"}</p>
          </div>
        </div>
      </div>
    </>
  );
}
