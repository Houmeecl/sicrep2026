import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function Postular() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          companyName: form.get("companyName"),
          rut: form.get("rut"),
          region: form.get("region"),
          industry: form.get("industry"),
          contactName: form.get("contactName"),
          contactEmail: form.get("contactEmail"),
          contactPhone: form.get("contactPhone"),
        }),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? "No pudimos enviar tu postulación");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>¡Postulación recibida!</CardTitle>
            <CardDescription>
              Un ejecutivo del Centro Proveedor Regional se pondrá en contacto contigo para validar tu empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className="font-semibold text-primary underline">Volver al inicio</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold">Postula al Programa Proveedor Regional</h1>
      <p className="mt-1 text-muted-foreground">Cuéntanos sobre tu empresa y te contactaremos.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="companyName">Razón social</Label>
          <Input id="companyName" name="companyName" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rut">RUT empresa</Label>
            <Input id="rut" name="rut" required placeholder="76.123.456-7" />
          </div>
          <div>
            <Label htmlFor="region">Región</Label>
            <Input id="region" name="region" required placeholder="Antofagasta" />
          </div>
        </div>
        <div>
          <Label htmlFor="industry">Rubro</Label>
          <Input id="industry" name="industry" required placeholder="Transporte, servicios, construcción..." />
        </div>
        <div>
          <Label htmlFor="contactName">Nombre de contacto</Label>
          <Input id="contactName" name="contactName" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactEmail">Correo</Label>
            <Input id="contactEmail" name="contactEmail" type="email" required />
          </div>
          <div>
            <Label htmlFor="contactPhone">Teléfono</Label>
            <Input id="contactPhone" name="contactPhone" required placeholder="+56 9..." />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Enviando..." : "Enviar postulación"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-primary underline">Inicia sesión</Link>
      </p>
    </div>
  );
}
