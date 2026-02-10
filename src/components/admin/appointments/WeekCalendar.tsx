import * as React from "react";
import { addDays, addMinutes, format, isSameDay, parseISO, startOfWeek } from "date-fns";

import { cn } from "@/lib/utils";
import type { Appointment } from "@/services/api/appointmentService";
import { appointmentStatusMeta } from "@/components/admin/appointments/AppointmentStatusBadge";

function ymd(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export default function WeekCalendar({
  anchorDate,
  appointments,
  resolveClient,
  onSelect,
  onPrevWeek,
  onNextWeek,
}: {
  anchorDate: Date;
  appointments: Appointment[];
  resolveClient: (userId: string) => { name: string; phone?: string };
  onSelect: (apt: Appointment) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  const start = React.useMemo(() => startOfWeek(anchorDate, { weekStartsOn: 1 }), [anchorDate]);
  const days = React.useMemo(() => {
    // seg-sab (domingo fechado)
    return Array.from({ length: 6 }).map((_, i) => addDays(start, i));
  }, [start]);

  const label = `${format(days[0], "dd/MM")} - ${format(days[days.length - 1], "dd/MM")}`;

  return (
    <div className="rounded-lg border border-border bg-card shadow-card">
      <div className="flex flex-col gap-3 border-b border-border bg-background/40 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPrevWeek}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-extrabold text-foreground hover:bg-accent"
          >
            ← Semana Anterior
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-extrabold text-foreground hover:bg-accent"
          >
            Próxima →
          </button>
        </div>
        <p className="text-sm font-extrabold tracking-wide text-foreground">SEMANA DE {label}</p>
      </div>

      <div className="grid min-w-[980px] grid-cols-6">
        {days.map((d) => (
          <div key={ymd(d)} className="border-r border-border last:border-r-0">
            <div className="bg-card p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-foreground">
                {format(d, "EEE").toUpperCase()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{format(d, "dd/MM")}</p>
            </div>

            <div className="min-h-[420px] p-3">
              {appointments
                .filter((a) => isSameDay(parseISO(a.startsAt), d))
                .sort((a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime())
                .map((a) => {
                  const s = parseISO(a.startsAt);
                  const e = addMinutes(s, a.durationMinutes);
                  const client = resolveClient(a.userId);
                  const meta = appointmentStatusMeta(a.status);
                  const bg =
                    a.status === "completed"
                      ? "bg-brand-green/15"
                      : a.status === "canceled"
                        ? "bg-muted"
                        : a.status === "no_show"
                          ? "bg-destructive/15"
                          : "bg-primary/15";

                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a)}
                      className={cn(
                        "mb-3 w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-accent",
                        "border-l-4",
                        meta.leftBorder,
                        bg,
                      )}
                    >
                      <p className="text-xs font-extrabold text-foreground">{format(s, "HH:mm")}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-foreground">{client.name}</p>
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">✂️ {a.serviceName}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {format(s, "HH:mm")} - {format(e, "HH:mm")}
                      </p>
                    </button>
                  );
                })}

              {appointments.filter((a) => isSameDay(parseISO(a.startsAt), d)).length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-center">
                  <p className="text-xs italic text-muted-foreground">⏸️ LIVRE</p>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
