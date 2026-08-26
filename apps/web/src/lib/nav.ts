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
  { to: "/notes", label: "Notes", icon: "ph ph-note", match: (p) => p === "/notes" },
  { to: "/pomodoro", label: "Pomodoro", icon: "ph ph-timer", match: (p) => p === "/pomodoro" },
  { to: "/stats", label: "Statistiques", icon: "ph ph-chart-bar", match: (p) => p === "/stats" },
  { to: "/settings", label: "Paramètres", icon: "ph ph-sliders-horizontal", match: (p) => p === "/settings" },
];

// Notes isn't in the bottom bar: on a phone the bar already carries 5 items
// (see sidebarNav above minus Notes/Settings), and this feature is a stub
// today — it's reachable from the sidebar on larger screens and from
// /notes directly until it's a first-class mobile destination.
export const bottomNav: NavItem[] = [
  { to: "/dashboard", label: "Accueil", icon: "ph ph-house", match: (p) => p === "/dashboard" },
  { to: "/subjects", label: "Matières", icon: "ph ph-books", match: (p) => p.startsWith("/subjects") },
  { to: "/review", label: "Réviser", icon: "ph ph-cards-three", match: (p) => p.startsWith("/review") || p === "/create" },
  { to: "/pomodoro", label: "Pomodoro", icon: "ph ph-timer", match: (p) => p === "/pomodoro" },
  { to: "/stats", label: "Stats", icon: "ph ph-chart-bar", match: (p) => p === "/stats" },
];
