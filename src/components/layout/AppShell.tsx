import { Outlet } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-6xl px-3 pb-12 pt-16 sm:px-4 sm:pt-20 md:pb-16 md:pt-24 lg:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
