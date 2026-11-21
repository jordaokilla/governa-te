"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  { href: "/#movimento", label: "O movimento" },
  { href: "/#encontro", label: "O encontro" },
  { href: "/#oradores", label: "Oradores" },
  { href: "/expositores", label: "Expositores" },
  { href: "/patrocinadores", label: "Patrocinadores" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="no-print sticky top-0 z-40 border-b border-white/5 bg-ink/85 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="GOVERNA-TE, página inicial" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-paper/80 transition hover:text-gold">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/bilhetes" className="btn btn-gold btn-sm sm:min-h-10 sm:px-5 sm:text-sm">
            Bilhetes
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-paper lg:hidden"
            aria-expanded={open}
            aria-controls="menu-movel"
            aria-label={open ? "Fechar o menu" : "Abrir o menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="menu-movel" aria-label="Principal" className="fixed inset-x-0 top-16 bottom-0 overflow-y-auto border-t border-white/5 bg-ink px-5 pt-4 pb-10 lg:hidden">
          <ul className="flex flex-col">
            {[...NAV, { href: "/bilhetes", label: "Bilhetes" }, { href: "/meus-bilhetes", label: "Os meus bilhetes" }].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-white/5 py-4 font-display text-lg text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
