import * as React from "react";
import { addMinutes, format, parseISO } from "date-fns";
import { EllipsisVertical } from "lucide-react";

import type { Appointment } from "@/services/api/appointmentService";
import AppointmentStatusBadge, { appointmentStatusMeta } from "@/components/admin/appointments/AppointmentStatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AppointmentAction } from "@/components/admin/appointments/AppointmentCard";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function canMutate(status: Appointment["status"]) {
  // Permite marcar como falta em agendamentos pendentes, confirmados ou já completados
  // (admin pode corrigir se o cliente não compareceu após auto-conclusão)
  return status === "pending" || status === "confirmed" || status === "completed";
}

export default function AppointmentTable({
  items,
  resolveClient,
  onAction,
}: {
  items: Appointment[];
  resolveClient: (userId: string) => { name: string; phone?: string };
  onAction: (action: AppointmentAction, apt: Appointment) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="rounded-lg border border-border bg-card shadow-card min-w-[800px]">
        <Table>
        <TableHeader>
          <TableRow className="bg-background/50">
            <TableHead className="w-[110px] text-xs font-extrabold uppercase tracking-[0.18em]">Horário</TableHead>
            <TableHead className="w-[260px] text-xs font-extrabold uppercase tracking-[0.18em]">Cliente</TableHead>
            <TableHead className="min-w-[260px] text-xs font-extrabold uppercase tracking-[0.18em]">Serviço</TableHead>
            <TableHead className="w-[140px] text-xs font-extrabold uppercase tracking-[0.18em]">Valor</TableHead>
            <TableHead className="w-[150px] text-xs font-extrabold uppercase tracking-[0.18em]">Status</TableHead>
            <TableHead className="w-[90px] text-right text-xs font-extrabold uppercase tracking-[0.18em]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((apt) => {
            const start = parseISO(apt.startsAt);
            const end = addMinutes(start, apt.durationMinutes);
            const client = resolveClient(apt.userId);
            const statusMeta = appointmentStatusMeta(apt.status);

            return (
              <TableRow
                key={apt.id}
                className={cn("border-border hover:bg-accent/40", "border-l-4", statusMeta.leftBorder)}
              >
                <TableCell className="font-extrabold text-foreground">{format(start, "HH:mm")}</TableCell>
                <TableCell>
                  <p className="text-sm font-semibold text-foreground">{client.name}</p>
                  {client.phone ? (
                    <a className="text-xs text-muted-foreground underline-offset-4 hover:underline" href={`tel:${client.phone}`}>
                      {client.phone}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">Telefone não cadastrado</p>
                  )}
                </TableCell>
                <TableCell>
                  <p className="text-sm font-semibold text-foreground">{apt.serviceName}</p>
                  <p className="text-xs text-muted-foreground">{apt.durationMinutes}min</p>
                </TableCell>
                <TableCell className="font-extrabold text-brand-green">{formatBRL(apt.price)}</TableCell>
                <TableCell>
                  <AppointmentStatusBadge status={apt.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-border bg-background px-2 py-2 text-foreground hover:bg-accent"
                        aria-label="Abrir ações"
                      >
                        <EllipsisVertical className="h-4 w-4" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-56">
                      <DropdownMenuItem onSelect={() => onAction("details", apt)}>👁️ Ver Detalhes</DropdownMenuItem>
                      <DropdownMenuItem disabled={!canMutate(apt.status)} onSelect={() => onAction("absent", apt)}>
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
