import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { BookingProvider } from "@/context/BookingContext";
import AppShell from "@/components/layout/AppShell";
import ScrollToTop from "@/components/common/ScrollToTop";

import Home from "@/pages/public/Home";
import Services from "@/pages/public/Services";
import Gallery from "@/pages/public/Gallery";
import Team from "@/pages/public/Team";
import About from "@/pages/public/About";
import Products from "@/pages/public/Products";
import Plans from "@/pages/public/Plans";

import Login from "@/pages/auth/Login";

import Booking from "@/pages/client/Booking";
import SelectType from "@/pages/client/booking/SelectType";
import SelectService from "@/pages/client/booking/SelectService";
import SelectDateTime from "@/pages/client/booking/SelectDateTime";
import Dashboard from "@/pages/client/Dashboard";
import MyAppointments from "@/pages/client/MyAppointments";
import MyPlan from "@/pages/client/MyPlan";
import History from "@/pages/client/History";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import ManageAppointments from "@/pages/admin/ManageAppointments";
import ManageClients from "@/pages/admin/ManageClients";
import ApprovePlans from "@/pages/admin/ApprovePlans";
import ManageProducts from "@/pages/admin/ManageProducts";
import ManageOrders from "@/pages/admin/ManageOrders";
import ManageNotices from "@/pages/admin/ManageNotices";

import RequireAuth from "@/components/auth/RequireAuth";
import RequireAdmin from "@/components/auth/RequireAdmin";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BookingProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Layout público */}
              <Route element={<AppShell />}>
                {/* Home */}
                <Route index element={<Home />} />

                {/* Públicas */}
                <Route path="/home" element={<Home />} />
                <Route path="/servicos" element={<Services />} />
                <Route path="/galeria" element={<Gallery />} />
                <Route path="/equipe" element={<Team />} />
                <Route path="/sobre" element={<About />} />
                <Route path="/produtos" element={<Products />} />
                <Route path="/planos" element={<Plans />} />

                {/* Protegidas (cliente) */}
                <Route element={<RequireAuth />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/agendar" element={<SelectType />} />
                  <Route path="/agendar/tipo" element={<SelectType />} />
                  <Route path="/agendar/servico" element={<SelectService />} />
                  <Route path="/agendar/data-hora" element={<SelectDateTime />} />
                  <Route path="/meus-agendamentos" element={<MyAppointments />} />
                  <Route path="/meu-plano" element={<MyPlan />} />
                  <Route path="/historico" element={<History />} />
                </Route>

                {/* Admin */}
                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/agendamentos" element={<ManageAppointments />} />
                  <Route path="/admin/clientes" element={<ManageClients />} />
                  <Route path="/admin/planos" element={<ApprovePlans />} />
                  <Route path="/admin/produtos" element={<ManageProducts />} />
                  <Route path="/admin/encomendas" element={<ManageOrders />} />
                  <Route path="/admin/avisos" element={<ManageNotices />} />
                </Route>
              </Route>

              {/* Sem header/footer */}
              <Route path="/login" element={<Login />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </BookingProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
