import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { GateForm } from "./gate-form";
import { Dashboard } from "./dashboard";
import { DIRETORIA_COOKIE_NAME } from "./constants";

export const metadata: Metadata = {
  title: "Painel da Diretoria",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function DiretoriaPage() {
  const supabase = await createClient();

  const { data: sorteios } = await supabase
    .from("sorteios")
    .select("*")
    .order("created_at", { ascending: false });

  const sorteio = sorteios?.find((s) => s.status === "em_andamento") ?? sorteios?.[0];

  if (!sorteio) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#2a0d13] px-6 text-center text-bege">
        <Image
          src="/brand/logo-simbolo-mono-claro.svg"
          alt="Sorteios Bom Jesus"
          width={44}
          height={44}
        />
        <p className="text-sm text-bege/70">Nenhum sorteio cadastrado no momento.</p>
      </div>
    );
  }

  const cookieStore = await cookies();
  const codigoCookie = cookieStore.get(DIRETORIA_COOKIE_NAME)?.value;

  let autorizado = false;
  if (codigoCookie) {
    const { data } = await supabase.rpc("fn_confirmar_acesso_diretoria", {
      p_sorteio_id: sorteio.id,
      p_codigo: codigoCookie,
    });
    autorizado = data === true;
  }

  if (!autorizado) {
    return <GateForm sorteioId={sorteio.id} />;
  }

  return <Dashboard sorteio={sorteio} />;
}
