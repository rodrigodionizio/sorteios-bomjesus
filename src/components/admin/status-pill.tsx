import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  em_andamento: "bg-good-bg text-good",
  planejado: "bg-info-bg text-info",
  encerrado: "bg-muted text-muted-foreground",
  ativo: "bg-good-bg text-good",
  inativo: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em andamento",
  planejado: "Planejado",
  encerrado: "Encerrado",
  ativo: "Ativo",
  inativo: "Inativo",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
