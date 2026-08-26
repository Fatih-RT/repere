export interface NavItem {
  to: string;
  label: string;
  icon: string;
  match: (pathname: string) => boolean;
}

export const sidebarNav: NavItem[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: "ph ph-house", match: (p) => p === "/dashboard" },
  { to: "/subjects", label: "Matières", icon: "ph ph-books", match: (p) => p.startsWith("/subjects") },
  { to: "/review", label: "Révisions", icon: "ph ph-cards-three", match: (p) => p.startsWith("/review") || p === "/create" },
  { to: "/pomodoro", label: "Pomodoro", icon: "ph ph-timer", match: (p) => p === "/pomodoro" },
  { to: "/stats", label: "Statistiques", icon: "ph ph-chart-bar", match: (p) => p === "/stats" },
  { to: "/settings", label: "Paramètres", icon: "ph ph-sliders-horizontal", match: (p) => p === "/settings" },
];

// Cours (notes) live inside each matière's own page (SubjectDetailPage),
// not as a separate top-level destination — no nav entry for them here.
export const bottomNav: NavItem[] = [
  { to: "/dashboard", label: "Accueil", icon: "ph ph-house", match: (p) => p === "/dashboard" },
  { to: "/subjects", label: "Matières", icon: "ph ph-books", match: (p) => p.startsWith("/subjects") },
  { to: "/review", label: "Réviser", icon: "ph ph-cards-three", match: (p) => p.startsWith("/review") || p === "/create" },
  { to: "/pomodoro", label: "Pomodoro", icon: "ph ph-timer", match: (p) => p === "/pomodoro" },
  { to: "/stats", label: "Stats", icon: "ph ph-chart-bar", match: (p) => p === "/stats" },
];
