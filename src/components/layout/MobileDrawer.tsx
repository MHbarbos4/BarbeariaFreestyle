import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PUBLIC_NAV } from "@/components/layout/nav";

export default function MobileDrawer() {
  const location = useLocation();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Abrir menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-background text-foreground">
        <SheetHeader>
          <SheetTitle className="text-left tracking-[0.14em]">MENU</SheetTitle>
        </SheetHeader>

        <nav className="mt-6 grid gap-2">
          {PUBLIC_NAV.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={
                  "rounded-md border border-border px-4 py-3 text-sm tracking-wide transition-colors hover:bg-accent " +
                  (active ? "bg-accent" : "bg-card")
                }
              >
                {item.label}
              </Link>
            );
          })}

          <div className="mt-4">
            <Link to="/agendar">
              <Button variant="hero" size="xl" className="w-full">
                AGENDAR
              </Button>
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
