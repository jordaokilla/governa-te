import Image from "next/image";
import { AtSign } from "lucide-react";
import type { TeamMember } from "@/lib/types";

function Revealed({ m }: { m: TeamMember }) {
  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-raise to-coal">
        <div aria-hidden className="glow-gold absolute inset-0" />
        {m.photo_url && (
          <Image
            src={m.photo_url}
            alt={`Retrato de ${m.name}`}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            className="object-contain object-bottom"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="rule-ember" />
        <h3 className="mt-4 font-display text-2xl font-medium text-white">{m.name}</h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">{m.role}</p>
        {m.bio && <p className="mt-3 text-[15px] leading-relaxed text-paper/80">{m.bio}</p>}
        {m.topic_title && (
          <div className="mt-5 border-t border-white/5 pt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-mute">{m.section_label}</p>
            <p className="mt-1.5 font-display text-lg text-white">{m.topic_title}</p>
            {m.topic_description && <p className="mt-2 text-sm leading-relaxed text-paper/70">{m.topic_description}</p>}
            {m.takeaway && <p className="mt-2.5 text-sm text-gold">{m.takeaway}</p>}
          </div>
        )}
        {m.instagram && (
          <a
            href={`https://www.instagram.com/${m.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm text-paper/70 hover:text-gold"
          >
            <AtSign size={15} aria-hidden />
            {m.instagram}
            <span className="sr-only"> no Instagram</span>
          </a>
        )}
      </div>
    </article>
  );
}

function Hidden({ m }: { m: TeamMember }) {
  return (
    <article className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border border-line bg-black">
      <div aria-hidden className="glow-gold absolute inset-0" />
      {m.silhouette_url && (
        <Image
          src={m.silhouette_url}
          alt="Silhueta de um membro ainda por revelar"
          fill
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"
          className="silhouette object-contain object-bottom px-2 pt-6"
        />
      )}
      <div className="relative bg-gradient-to-t from-black via-black/80 to-transparent px-4 pt-12 pb-4 text-center">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-gold-soft">Por revelar</p>
      </div>
    </article>
  );
}

export function TeamGrid({ team }: { team: TeamMember[] }) {
  const revealed = team.filter((m) => m.is_revealed);
  const hidden = team.filter((m) => !m.is_revealed);
  if (!team.length) return null;
  return (
    <div className="space-y-8">
      {revealed.length > 0 && (
        <div className={`grid gap-5 ${revealed.length === 1 ? "mx-auto max-w-md" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {revealed.map((m) => <Revealed key={m.id} m={m} />)}
        </div>
      )}
      {hidden.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {hidden.map((m) => <Hidden key={m.id} m={m} />)}
        </div>
      )}
    </div>
  );
}
