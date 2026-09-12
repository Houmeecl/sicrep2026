import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

export default function Register() {
  const { user, register } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const isCompany = new URLSearchParams(search).get("tipo") === "empresa";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === "company_admin" ? "/empresa" : "/app");
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await register({
        email: String(form.get("email")),
        password: String(form.get("password")),
        fullName: String(form.get("fullName")),
        role: isCompany ? "company_admin" : "provider",
        companyName: String(form.get("companyName")),
        rut: String(form.get("rut")),
        region: String(form.get("region") ?? ""),
        industry: String(form.get("industry") ?? ""),
      });
    } catch (err: any) {
      setError(err.message ?? "No pudimos crear tu cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isCompany ? "Registra tu empresa" : "Crea tu cuenta de proveedor"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div>
              <Label htmlFor="companyName">{isCompany ? "Nombre de la empresa" : "Razón social"}</Label>
              <Input id="companyName" name="companyName" required />
            </div>
            <div>
              <Label htmlFor="rut">RUT</Label>
              <Input id="rut" name="rut" required />
            </div>
            {!isCompany && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region">Región</Label>
                  <Input id="region" name="region" placeholder="Antofagasta" />
                </div>
                <div>
                  <Label htmlFor="industry">Rubro</Label>
                  <Input id="industry" name="industry" placeholder="Transporte" />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email">Correo</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-primary underline">Inicia sesión</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
