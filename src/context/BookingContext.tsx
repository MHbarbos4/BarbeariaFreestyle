import * as React from "react";
import { z } from "zod";
import { getMyPlan, calculatePlanUsage, type Plan, type PlanType, type PlanUsage } from "@/services/api/planService";
import { getMyAppointments } from "@/services/api/appointmentService";

export type BookingType = "avulso" | "duplo" | "triplo" | null;

export type BookingData = {
  type: BookingType;
  serviceId: string | null;
  serviceName: string;
  price: number;
  duration: number;
  date: string | null; // ISO date
  time: string | null; // HH:mm
  // Informações do plano (se assinante)
  isPlanBooking: boolean; // true se está usando o plano
};

type BookingState = {
  bookingData: BookingData;
  updateBooking: (patch: Partial<BookingData>) => void;
  resetBooking: () => void;
  // Informações do plano do usuário
  userPlan: Plan | null;
  userPlanType: PlanType | null;
  loadingPlan: boolean;
  refreshPlan: () => Promise<void>;
  // Uso do plano no mês
  planUsage: PlanUsage | null;
};

const STORAGE_KEY = "bf_booking";

const bookingSchema = z.object({
  type: z.enum(["avulso", "duplo", "triplo"]).nullable(),
  serviceId: z.string().nullable(),
  serviceName: z.string(),
  price: z.number(),
  duration: z.number(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  isPlanBooking: z.boolean().optional(),
});

const defaultBooking: BookingData = {
  type: null,
  serviceId: null,
  serviceName: "",
  price: 0,
  duration: 0,
  date: null,
  time: null,
  isPlanBooking: false,
};

const BookingContext = React.createContext<BookingState | undefined>(undefined);

function readStored(): BookingData {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBooking;
    const parsed = JSON.parse(raw);
    const res = bookingSchema.safeParse(parsed);
    return res.success ? (res.data as BookingData) : defaultBooking;
  } catch {
    return defaultBooking;
  }
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookingData, setBookingData] = React.useState<BookingData>(() => readStored());
  const [userPlan, setUserPlan] = React.useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = React.useState(true); // Começa true até verificar
  const [planUsage, setPlanUsage] = React.useState<PlanUsage | null>(null);

  // Carrega o plano do usuário e calcula uso
  const refreshPlan = React.useCallback(async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setUserPlan(null);
      setPlanUsage(null);
      setLoadingPlan(false);
      return;
    }

    setLoadingPlan(true);
    try {
      const [plan, appointments] = await Promise.all([
        getMyPlan(userId),
        getMyAppointments(userId),
      ]);
      
      // Só considera planos aprovados
      if (plan?.status === "approved") {
        setUserPlan(plan);
        // Calcula uso do plano
        const usage = calculatePlanUsage(plan, appointments);
        setPlanUsage(usage);
      } else {
        setUserPlan(null);
        setPlanUsage(null);
      }
    } catch {
      setUserPlan(null);
      setPlanUsage(null);
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  // Carrega plano ao montar
  React.useEffect(() => {
    refreshPlan();
  }, [refreshPlan]);

  // Recarrega plano quando a janela ganha foco (usuário pode ter aprovado em outra aba)
  React.useEffect(() => {
    const onFocus = () => {
      refreshPlan();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshPlan]);

  const userPlanType = userPlan?.planType ?? null;

  const updateBooking = React.useCallback((patch: Partial<BookingData>) => {
    setBookingData((prev) => {
      const next: BookingData = { ...prev, ...patch };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const resetBooking = React.useCallback(() => {
    setBookingData(defaultBooking);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = React.useMemo<BookingState>(
    () => ({ 
      bookingData, 
      updateBooking, 
      resetBooking,
      userPlan,
      userPlanType,
      loadingPlan,
      refreshPlan,
      planUsage,
    }),
    [bookingData, resetBooking, updateBooking, userPlan, userPlanType, loadingPlan, refreshPlan, planUsage],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = React.useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
