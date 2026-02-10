import * as React from "react";
import { format, parseISO, addMinutes } from "date-fns";
import { EllipsisVertical, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Appointment } from "@/services/api/appointmentService";
import AppointmentStatusBadge, { appointmentStatusMeta } from "@/components/admin/appointments/AppointmentStatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AppointmentAction = "details" | "complete" | "absent" | "cancel";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function canMutate(status: Appointment["status"]) {
  // Permite marcar como falta em agendamentos pendentes, confirmados ou já completados
  // (admin pode corrigir se o cliente não compareceu após auto-conclusão)
  return status === "pending" || status === "confirmed" || status === "completed";
}

export default function AppointmentCard({
  apt,
  clientName,
  clientPhone,
  onAction,
}: {
  apt: Appointment;
  clientName: string;
  clientPhone?: string;
  onAction: (action: AppointmentAction, apt: Appointment) => void;
}) {
  const start = parseISO(apt.startsAt);
  const end = addMinutes(start, apt.durationMinutes);
  const statusMeta = appointmentStatusMeta(apt.status);

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        "border-l-4",
        statusMeta.leftBorder,
      )}
    >
      <div className="absolute right-4 top-4">
        <AppointmentStatusBadge status={apt.status} />
      </div>

      <p className="text-sm font-semibold text-muted-foreground">
        {format(start, "EEEE, dd 'de' MMMM 'de' yyyy")}
      </p>

      <p className="mt-3 text-xl font-extrabold tracking-tight text-primary">
        🕐 {format(start, "HH:mm")} - {format(end, "HH:mm")}
      </p>

      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm font-extrabold tracking-[0.16em] text-muted-foreground">CLIENTE</p>
        <p className="mt-2 text-base font-semibold text-foreground">{clientName}</p>
        {clientPhone ? (
          <a
            className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
            href={`tel:${clientPhone}`}
          >
            <Phone className="h-4 w-4" aria-hidden /> {clientPhone}
          </a>
        ) : null}
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm font-extrabold tracking-[0.16em] text-muted-foreground">SERVIÇO</p>
        <p className="mt-2 text-base font-semibold text-foreground">✂️ {apt.serviceName}</p>
        <p className="mt-1 text-sm text-muted-foreground">{apt.durationMinutes} min</p>
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm font-extrabold tracking-[0.16em] text-muted-foreground">VALOR</p>
        <p className="mt-2 text-lg font-extrabold text-brand-green">💰 {formatBRL(apt.price)}</p>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground hover:bg-accent"
              aria-label="Abrir ações"
            >
              <EllipsisVertical className="h-4 w-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem onSelect={() => onAction("details", apt)}>👁️ Ver Detalhes</DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canMutate(apt.status)}
              onSelect={() => onAction("absent", apt)}
            >
              ❌ Marcar Falta
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canMutate(apt.status)}
              className="text-destructive focus:text-destructive"
              onSelect={() => onAction("cancel", apt)}
            >
              🗑️ Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
