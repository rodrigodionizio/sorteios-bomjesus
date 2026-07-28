import Image from "next/image";

export function AuthShell({
  eyebrow,
  title,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-vinho to-vinho-deep px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/brand/logo-simbolo-mono-claro.svg"
            alt="Sorteios Bom Jesus"
            width={48}
            height={48}
            priority
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bege/70">
              {eyebrow}
            </p>
            <h1 className="text-2xl font-black text-bege">{title}</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-bege/15 bg-white p-7 shadow-2xl">
          {children}
        </div>

        {footer ? (
          <div className="mt-5 text-center text-[13px] text-bege/75">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
