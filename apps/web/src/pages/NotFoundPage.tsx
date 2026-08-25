import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="grid place-items-center text-center py-20">
      <h1 className="text-2xl font-medium mb-2">Page introuvable</h1>
      <p className="text-sm text-muted mb-4">Cette page n'existe pas ou plus.</p>
      <Link to="/dashboard">
        <Button variant="solid">Retour au tableau de bord</Button>
      </Link>
    </div>
  );
}
