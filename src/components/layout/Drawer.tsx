import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut, X, User, Crown, CalendarDays, Shield } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { PUBLIC_NAV } from "@/components/layout/nav";
import { ADMIN_NAV } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function Drawer({ open, onClose }: Props) {
  const location = useLocation();
  const reduce = useReducedMotion();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

  const isAdminArea = isAdmin && location.pathname.startsWith("/admin");

  // Fecha automaticamente ao mudar de rota
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Navegação principal (sem extras de cliente)
  const mainNav = isAdminArea ? ADMIN_NAV : PUBLIC_NAV;

  // Itens de conta do usuário (Meu Plano, Meus Agendamentos)
  // Nota: Painel Admin só aparece quando NÃO está na área admin (para evitar duplicação)
  const userMenuItems = [
    ...(isAdmin && !isAdminArea ? [{ label: "Painel Admin", href: "/admin", icon: Shield }] : []),
    { label: "Meu Plano", href: "/meu-plano", icon: Crown },
    { label: "Meus Agendamentos", href: "/meus-agendamentos", icon: CalendarDays },
  ];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60]"
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* overlay */}
           <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-background/50"
            onClick={onClose}
            type="button"
          />

          {/* panel */}
          <motion.aside
            className="absolute left-0 top-0 h-full w-[90vw] max-w-sm border-r border-border bg-background shadow-md sm:w-[85vw]"
            initial={reduce ? false : { x: -24, opacity: 0 }}
            animate={reduce ? undefined : { x: 0, opacity: 1 }}
            exit={reduce ? undefined : { x: -24, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4 sm:h-16 sm:px-5">
              <p className="text-base font-extrabold tracking-wide text-primary sm:text-lg">MENU</p>
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" aria-label="Fechar" onClick={onClose}>
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            <nav className="px-4 sm:px-5">
              {/* Navegação principal */}
              {mainNav.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    "block border-b border-border px-1 py-3 text-xs tracking-wide text-foreground transition-colors duration-300 hover:bg-accent sm:py-4 sm:text-sm " +
                    (isActive ? "bg-accent" : "")
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {isAdminArea ? (
                <>
                  <div className="my-2 h-px bg-border" aria-hidden />
                  <NavLink
                    to="/home"
                    onClick={onClose}
                    className={({ isActive }) =>
                      "block border-b border-border px-1 py-4 text-sm tracking-wide text-foreground transition-colors duration-300 hover:bg-accent " +
                      (isActive ? "bg-accent" : "")
                    }
                  >
                    Ver Site
                  </NavLink>
                </>
              ) : null}

              {/* Menu do usuário logado (não admin area) */}
              {isAuthenticated && !isAdminArea ? (
                <>
                  <div className="my-4 h-px bg-border" aria-hidden />
                  <div className="mb-2 flex items-center gap-2 px-1 py-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">
                      {user?.name?.split(" ")[0] || "Minha Conta"}
                    </span>
                  </div>
                  {userMenuItems.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={({ isActive }) =>
                        "flex items-center gap-2 border-b border-border px-1 py-4 text-sm tracking-wide text-foreground transition-colors duration-300 hover:bg-accent " +
                        (isActive ? "bg-accent" : "")
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  ))}
                </>
              ) : null}

              {isAuthenticated ? (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="flex w-full items-center gap-2 border-b border-border px-1 py-4 text-sm tracking-wide text-foreground transition-colors duration-300 hover:bg-accent"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              ) : null}

              {!isAdminArea ? (
                <div className="mt-6 pb-6">
                  <Link to={isAuthenticated ? "/agendar" : "/login"} onClick={onClose}>
                    <Button variant="hero" size="xl" className="w-full rounded-tight">
                      AGENDAR
                    </Button>
                  </Link>
                </div>
              ) : null}
            </nav>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
