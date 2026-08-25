"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TIPOS_CHAVE_PIX } from "@/lib/pix";
import { criarChavePix, type PixFormState } from "./actions";

const initialState: PixFormState = {};

export function PixForm() {
  const [state, formAction, pending] = useActionState(criarChavePix, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      toast.success("Chave Pix cadastrada.");
      formRef.current?.reset();
      setMensagem("");
    }
    wasPending.current = pending;
  }, [pending, state]);

  const err = (campo: string) => state.fieldErrors?.[campo];

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Apelido" error={err("apelido")}>
          <Input name="apelido" placeholder="Ex.: Conta da paróquia" required />
        </Field>
        <Field label="Tipo da chave" error={err("tipo")}>
          {/* <select> nativo de propósito: o Select do Base UI precisa de
              resolução manual de rótulo (ver 09 na documentação), e aqui
              o valor já é legível. */}
          <select
            name="tipo"
            defaultValue="aleatoria"
            required
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
          >
            {TIPOS_CHAVE_PIX.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Chave Pix" error={err("chave")}>
        <Input name="chave" placeholder="Ex.: 12345678000190 ou uma chave aleatória" required />
      </Field>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field
          label="Nome do recebedor (máx. 25)"
          error={err("nome_recebedor")}
          hint="Aparece no app de quem paga."
        >
          <Input name="nome_recebedor" maxLength={25} placeholder="PAROQUIA SENHOR BOM JESUS" required />
        </Field>
        <Field label="Cidade (máx. 15)" error={err("cidade")} hint="Limite do padrão Pix.">
          <Input name="cidade" maxLength={15} placeholder="ITABIRINHA" required />
        </Field>
      </div>

      <Field
        label="Mensagem (opcional)"
        error={err("mensagem")}
        hint="Vira a referência no extrato, junto do número da cartela. Só letras e números, sem espaço nem acento."
      >
        <Input
          name="mensagem"
          maxLength={20}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
          placeholder="BINGO26"
        />
      </Field>

      {mensagem ? (
        <p className="-mt-2 text-[12px] text-muted-foreground">
          Na cartela nº 42 a referência sairá como{" "}
          <strong className="font-mono text-foreground">{mensagem}42</strong>.
        </p>
      ) : null}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Banco (opcional)" error={err("banco")}>
          <Input name="banco" placeholder="Ex.: Sicoob" />
        </Field>
        <Field label="Observações (opcional)" error={err("observacoes")}>
          <Input name="observacoes" placeholder="Ex.: conta usada nas festas" />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-[13px] font-semibold">
        <input type="checkbox" name="padrao" className="size-4" />
        Usar como chave padrão
      </label>

      {state.error ? (
        <p className="rounded-md bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {state.error}
        </p>
      ) : null}

      <div className="mt-1">
        <Button
          type="submit"
          disabled={pending}
          className="bg-cereja font-extrabold text-white hover:bg-[var(--brand-vinho-deep)]"
        >
          {pending ? "Cadastrando..." : "Cadastrar chave"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11.5px] text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs font-semibold text-bad">{error}</p> : null}
    </div>
  );
}
