import * as React from "react";
import { Check } from "lucide-react";

type Step = {
  number: 1 | 2 | 3;
  label: string;
};

const steps: Step[] = [
  { number: 1, label: "Tipo" },
  { number: 2, label: "Serviço" },
  { number: 3, label: "Data/Hora" },
];

export default function ProgressBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="mx-auto max-w-[800px]">
      <div className="grid grid-cols-3 items-start gap-0">
        {steps.map((s, idx) => {
          const active = s.number === current;
          const done = s.number < current;
          const circleClass = active
            ? "bg-primary text-primary-foreground border-primary"
            : done
              ? "bg-brand-green text-background border-brand-green"
              : "bg-transparent text-muted-foreground border-border";
          const labelClass = active
            ? "text-primary font-extrabold"
            : done
              ? "text-brand-green font-extrabold"
              : "text-muted-foreground font-semibold";

          return (
            <div key={s.number} className="relative flex flex-col items-center">
              {/* Linha (metade esquerda/direita) */}
              {idx !== 0 ? (
                <span
                  className={
                    "absolute left-0 top-5 h-[2px] w-1/2 -translate-x-1/2 " +
                    (done ? "bg-brand-green" : "bg-border")
                  }
                  aria-hidden
                />
              ) : null}
              {idx !== steps.length - 1 ? (
                <span
                  className={
                    "absolute right-0 top-5 h-[2px] w-1/2 translate-x-1/2 " +
                    (s.number < current ? "bg-brand-green" : "bg-border")
                  }
                  aria-hidden
                />
              ) : null}

              <div
                className={
                  "grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-extrabold " + circleClass
                }
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="h-5 w-5" aria-hidden /> : s.number}
              </div>

              <div className="mt-3 text-center">
                <p className={"text-xs tracking-[0.14em] " + labelClass}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
