import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/lib/queries";
import { pbErrorMessage } from "@/lib/pbErrors";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email, password });
      navigate("/dashboard");
    } catch (err) {
      setError(pbErrorMessage(err, "Impossible de se connecter."));
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 bg-bg text-text">
      <div className="w-full max-w-[340px] animate-rise">
        <div className="flex items-center gap-[9px] mb-8">
          <div className="w-[11px] h-[11px] rotate-45 rounded-[1px]" style={{ background: "var(--accent)" }} />
          <span className="font-medium text-base tracking-tight">Repère</span>
        </div>
        <h1 className="m-0 mb-1.5 text-[30px] font-medium leading-tight tracking-tight">Bienvenue</h1>
        <p className="m-0 mb-6 text-sm text-muted">Reprends là où tu t'es arrêtée.</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
          <label className="block">
            <span className="block text-xs mb-1.5 text-muted">Adresse e-mail</span>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-xs mb-1.5 text-muted">Mot de passe</span>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="m-0 text-[13px]" style={{ color: "var(--err)" }}>{error}</p>}
          <Button type="submit" variant="solid" size="lg" disabled={login.isPending} className="w-full justify-center">
            {login.isPending ? "Connexion…" : "Se connecter"}
          </Button>
          <div className="flex justify-between text-[12.5px] mt-0.5">
            <a href="#" className="no-underline">Mot de passe oublié ?</a>
          </div>
        </form>
      </div>
    </div>
  );
}
