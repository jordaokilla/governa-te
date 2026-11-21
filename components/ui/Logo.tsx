import Image from "next/image";

/** Emblema e nome, lado a lado (cabeçalho e rodapé). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image src="/img/emblema.png" alt="" width={412} height={432} className="h-9 w-auto" priority />
      <Image src="/img/wordmark.png" alt="GOVERNA-TE" width={900} height={114} className="h-[15px] w-auto sm:h-[17px]" priority />
    </span>
  );
}
