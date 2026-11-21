import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { INSTAGRAM_URL } from "@/lib/config";
import { phone } from "@/lib/format";
import type { Settings } from "@/lib/types";

export function Footer({ settings }: { settings?: Settings }) {
  const instagram = settings?.instagram_url || INSTAGRAM_URL;
  const whatsapp = settings?.contact_whatsapp?.replace(/\D/g, "");
  return (
    <footer className="no-print mt-auto border-t border-white/5 bg-coal">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-mute">
            Movimento de desenvolvimento pessoal e iniciativa empreendedora em Angola. A geração por quem se espera.
          </p>
        </div>
        <div>
          <h2 className="eyebrow">O encontro</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-paper/80">
            <li><Link className="hover:text-gold" href="/bilhetes">Bilhetes</Link></li>
            <li><Link className="hover:text-gold" href="/expositores">Expositores</Link></li>
            <li><Link className="hover:text-gold" href="/patrocinadores">Patrocinadores</Link></li>
            <li><Link className="hover:text-gold" href="/meus-bilhetes">Os meus bilhetes</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow">Contactos</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-paper/80">
            <li>
              <a className="hover:text-gold" href={instagram} target="_blank" rel="noopener noreferrer">
                Instagram @governa_te
              </a>
            </li>
            {whatsapp && (
              <li>
                <a className="hover:text-gold" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp {phone(whatsapp)}
                </a>
              </li>
            )}
            {settings?.contact_phone && <li>Telefone {phone(settings.contact_phone)}</li>}
            {settings?.contact_email && (
              <li>
                <a className="hover:text-gold" href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-mute sm:flex-row sm:items-center sm:justify-between">
          <span>© GOVERNA-TE · {settings?.edition ?? "Edição 2027"} · {settings?.city ?? "Luanda"}, Angola</span>
          <span>Pagamentos por Multicaixa Express e por referência.</span>
        </div>
      </div>
    </footer>
  );
}
