import * as React from "react";
import { Navigate } from "react-router-dom";

/**
 * Redireciona para MyAppointments que já possui a aba de histórico
 */
export default function History() {
  return <Navigate to="/meus-agendamentos" replace />;
}
