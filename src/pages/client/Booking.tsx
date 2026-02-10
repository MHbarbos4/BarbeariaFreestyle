import { addDays, format } from "date-fns";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import SectionHeading from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";

export default function Booking() {
  const location = useLocation() as any;
  const preselected = location?.state?.service as
    | { name: string; price?: number; minutes?: number; kind?: string }
    | undefined;

  const next7 = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i)), []);

  return (
    <section>
      <SectionHeading kicker="AGENDAMENTO" title="Escolha um horário" description="Fluxo completo vem na próxima etapa (API + disponibilidade)." />

      {preselected ? (
        <div className="mb-4 rounded-lg border border-border bg-accent p-4 shadow-card">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">SERVIÇO SELECIONADO</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{preselected.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {typeof preselected.minutes === "number" ? `${preselected.minutes} min` : ""}
            {typeof preselected.price === "number" ? ` • R$ ${preselected.price.toFixed(2)}`.replace(".", ",") : ""}
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold tracking-wide">Dias</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {next7.map((d) => (
              <button
                key={d.toISOString()}
                className="rounded-md border border-border bg-background px-3 py-3 text-left text-xs transition-colors hover:bg-accent"
                type="button"
              >
                <span className="block text-muted-foreground">{format(d, "EEE")}</span>
                <span className="mt-1 block font-semibold">{format(d, "dd/MM")}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold tracking-wide">Horários</p>
          <p className="mt-2 text-sm text-muted-foreground">Exemplo visual (sem persistência ainda).</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {["10:00", "11:00", "14:00", "15:00", "16:00", "18:00"].map((h) => (
              <button
                key={h}
                className="rounded-md border border-border bg-background px-3 py-3 text-xs transition-colors hover:bg-accent"
                type="button"
              >
                {h}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <Button variant="hero" className="w-full">CONFIRMAR (mock)</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
