import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "@/lib/queries";
import { pbErrorMessage } from "@/lib/pbErrors";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

// Not routed in App.tsx — this app has exactly two users, created by hand
// from the PocketBase Admin UI (see pb_migrations/1787658780_close_registration.js,
// which locks the `users` collection's createRule to superusers only). Kept
// here rather than deleted in case self-registration ever needs to come
// back; `useRegister()` in lib/queries.ts still works if this is re-routed,
// it would just 403 against the current schema until that migration is reverted.
export function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [className, setClassName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const register = useRegister();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await register.mutateAsync({ displayName, className: className || undefined, email, password });
      navigate("/dashboard");
    } catch (err) {
      setError(pbErrorMessage(err, "Impossible de créer le compte."));
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] grid place-items-center px-5 bg-bg text-text">
      <div className="w-full max-w-[340px] animate-rise">
        <div className="flex items-center gap-[9px] mb-8">
          <div className="w-[11px] h-[11px] rotate-45 rounded-[1px]" style={{ background: "var(--accent)" }} />
          <span className="font-medium text-base tracking-tight">Repère</span>
        </div>
        <h1 className="m-0 mb-1.5 text-[30px] font-medium leading-tight tracking-tight">Créer un compte</h1>
        <p className="m-0 mb-6 text-sm text-muted">Ton espace personnel pour apprendre.</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
          <label className="block">
            <span className="block text-xs mb-1.5 text-muted">Nom</span>
            <Input required placeholder="Aylin B." value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-xs mb-1.5 text-muted">Classe (facultatif)</span>
            <Input placeholder="Terminale S" value={className} onChange={(e) => setClassName(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-xs mb-1.5 text-muted">Adresse e-mail</span>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-xs mb-1.5 text-muted">Mot de passe</span>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="m-0 text-[13px]" style={{ color: "var(--err)" }}>{error}</p>}
          <Button type="submit" variant="solid" size="lg" disabled={register.isPending} className="w-full justify-center">
            {register.isPending ? "Création…" : "Créer mon compte"}
          </Button>
          <div className="text-[12.5px] mt-0.5">
            <Link to="/login" className="no-underline" style={{ color: "var(--muted)" }}>J'ai déjà un compte</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
