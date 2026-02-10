import { useMemo, useState } from "react";
import { Menu, Shield, ChevronDown, LogOut, User, Crown, CalendarDays } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import Drawer from "@/components/layout/Drawer";
import { ADMIN_NAV, PUBLIC_NAV } from "@/components/layout/nav";
import Logo from "@/components/branding/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdminArea = isAdmin && location.pathname.startsWith("/admin");

  // Navegação: apenas links públicos (não adiciona extras de cliente quando logado)
  const navItems = useMemo(() => {
    if (isAdminArea) return ADMIN_NAV;
    return PUBLIC_NAV;
  }, [isAdminArea]);

  const onAgendar = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/agendar" } });
      return;
    }
    navigate("/agendar");
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background shadow-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 md:px-6 lg:h-20 lg:px-8">
          {/* Esquerda: Menu Hamburguer (mobile) + Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Menu Hamburguer - Mobile apenas */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10 md:hidden"
              aria-label="Abrir menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            {/* Logo */}
            <Logo />
          </div>

          {/* Menu Desktop */}
          <nav className="hidden items-center md:flex md:gap-6 lg:gap-8">
            {isAdminArea ? (
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-extrabold tracking-wide text-foreground">Painel Admin</span>
              </div>
            ) : (
              navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    "relative pb-1 text-sm tracking-wide text-foreground transition-colors duration-300 hover:text-primary " +
                    (isActive
                      ? "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-primary"
                      : "")
                  }
                >
                  {item.label}
                </NavLink>
              ))
            )}
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {/* Botão Agendar - sempre visível (mobile e desktop) */}
            {!isAdminArea && (
              <button
                type="button"
                onClick={onAgendar}
                className="whitespace-nowrap rounded-tight bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-transform duration-200 hover:scale-105 hover:shadow-md sm:px-4 sm:py-2 sm:text-sm md:px-8 md:py-3"
              >
                AGENDAR
              </button>
            )}

            {/* Menu do usuário - apenas desktop */}
            <div className="hidden md:flex md:items-center md:gap-3">
              {isAdminArea ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-tight border border-border bg-background px-5 py-3 text-sm font-extrabold text-foreground transition-colors hover:bg-accent"
                      aria-label="Abrir menu admin"
                    >
                      Admin <ChevronDown className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-56">
                    {ADMIN_NAV.map((i) => (
                      <DropdownMenuItem key={i.href} onSelect={() => navigate(i.href)}>
                        {i.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate("/home")}>Ver Site</DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        logout();
                        navigate("/home");
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <LogOut className="h-4 w-4" /> Sair
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  {isAuthenticated && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-tight border border-border bg-background px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-accent"
                        >
                          <User className="h-4 w-4" />
                          {user?.name?.split(" ")[0] || "Minha Conta"}
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-48">
                        {isAdmin && (
                          <DropdownMenuItem onSelect={() => navigate("/admin")}>
                            <Shield className="mr-2 h-4 w-4" /> Painel Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => navigate("/meu-plano")}>
                          <Crown className="mr-2 h-4 w-4" /> Meu Plano
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate("/meus-agendamentos")}>
                          <CalendarDays className="mr-2 h-4 w-4" /> Meus Agendamentos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => {
                            logout();
                            navigate("/home");
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" /> Sair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
