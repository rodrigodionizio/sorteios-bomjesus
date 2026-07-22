import Image from "next/image";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-vinho to-vinho-deep px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="text-3xl">🎟️</span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bege/70">
              Paróquia Senhor Bom Jesus
            </p>
            <h1 className="text-2xl font-black text-bege">
              Painel de Sorteios
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-bege/15 bg-white p-7 shadow-2xl">
          <LoginForm next={next ?? "/admin"} />
        </div>

        <div className="mt-6 flex justify-center opacity-80">
          <Image
            src="/brand/wordmark.png"
            alt="Uma história de fé — Senhor Bom Jesus"
            width={220}
            height={43}
            priority
          />
        </div>
      </div>
    </div>
  );
}
