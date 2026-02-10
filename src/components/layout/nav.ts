export type NavItem = { label: string; href: string };

export const PUBLIC_NAV: NavItem[] = [
  { label: "Início", href: "/home" },
  { label: "Serviços", href: "/servicos" },
  { label: "Planos", href: "/planos" },
  { label: "Galeria", href: "/galeria" },
  { label: "Equipe", href: "/equipe" },
  { label: "Sobre", href: "/sobre" },
  { label: "Produtos", href: "/produtos" },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Painel", href: "/admin" },
  { label: "Agendamentos", href: "/admin/agendamentos" },
  { label: "Planos Mensais", href: "/admin/planos" },
  { label: "Produtos", href: "/admin/produtos" },
  { label: "Encomendas", href: "/admin/encomendas" },
  { label: "Avisos", href: "/admin/avisos" },
  { label: "Clientes", href: "/admin/clientes" },
];
