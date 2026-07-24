import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface LocationState { from?: { pathname: string } }

export default function LoginPage() {
  const { user, login, loading, enforcement } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (user) {
    const dest = (location.state as LocationState)?.from?.pathname ?? "/today";
    return <Navigate to={dest} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(loginVal.trim(), password);
      const dest = (location.state as LocationState)?.from?.pathname ?? "/today";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm" data-testid="card-login">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-card">
                <span className="text-sm font-bold">A</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">AgrosBO</h1>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Iniciar sesión</p>
              </div>
            </div>
            {enforcement === "off" && (
              <p className="text-[11px] text-status-warn pt-1" data-testid="text-auth-off-hint">
                Modo desarrollo · auth desactivada (puedes entrar sin sesión)
              </p>
            )}
          </div>
          <form onSubmit={onSubmit} className="space-y-4" data-testid="form-login">
            <div className="space-y-1.5">
              <Label htmlFor="login">Email o usuario</Label>
              <Input
                id="login"
                data-testid="input-login"
                autoComplete="username"
                value={loginVal}
                onChange={(e) => setLoginVal(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-xs text-status-critical" data-testid="text-login-error">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting} data-testid="button-login-submit">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
