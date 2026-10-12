import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { rememberToken } from "@/lib/preinscripcion";
import { formatRut, isValidRut } from "@shared/rut";
import { PREINSCRIPCION_TERMINOS_VERSION } from "@shared/terminos";
import logoProveedorRegional from "@/assets/logo-proveedor-regional.png";
import { ShieldCheck, Mail, FileCheck2, CreditCard, Wallet, Plus, Trash2, ArrowRight } from "lucide-react";

const COMUNAS = [
  "Antofagasta",
  "Mejillones",
  "Sierra Gorda",
  "Taltal",
  "Calama",
  "Ollagüe",
  "San Pedro de Atacama",
  "Tocopilla",
  "María Elena",
];

const PASOS = [
  { icon: ShieldCheck, t: "Datos y declaraciones" },
  { icon: Mail, t: "Verifica tu correo" },
  { icon: FileCheck2, t: "Sube tus documentos" },
  { icon: CreditCard, t: "Paga $20.000" },
  { icon: Wallet, t: "Recibe tu tarjeta" },
];

interface Beneficiario {
  nombre: string;
  rut: string;
  porcentaje: string;
}

function RutInput({ name, id, required = true, placeholder = "76.123.456-7" }: { name: string; id: string; required?: boolean; placeholder?: string }) {
  const [v, setV] = useState("");
  const invalid = v.length > 3 && !isValidRut(v);
  return (
    <>
      <Input
        id={id}
        name={name}
        required={required}
        value={v}
        inputMode="text"
        autoComplete="off"
        placeholder={placeholder}
        aria-invalid={invalid}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => isValidRut(v) && setV(formatRut(v))}
        className={invalid ? "border-destructive" : ""}
      />
      {invalid && <p className="mt-1 text-xs text-destructive">RUT inválido (revisa el dígito verificador)</p>}
    </>
  );
}

export default function Preinscripcion() {
  const [, navigate] = useLocation();
  const [tipo, setTipo] = useState<"persona_juridica" | "persona_natural">("persona_juridica");
  const [esPep, setEsPep] = useState(false);
  const [benef, setBenef] = useState<Beneficiario[]>([{ nombre: "", rut: "", porcentaje: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const beneficiariosFinales =
      tipo === "persona_juridica"
        ? benef.filter((b) => b.nombre || b.rut).map((b) => ({ nombre: b.nombre, rut: b.rut, porcentaje: Number(b.porcentaje) }))
        : [];
    setLoading(true);
    try {
      const res = await api<{ id: number; accessToken: string }>("/api/preinscripcion", {
        method: "POST",
        body: JSON.stringify({
          tipoContribuyente: tipo,
          razonSocial: get("razonSocial"),
          rut: get("rut"),
          giro: get("giro"),
          comuna: get("comuna"),
          direccion: get("direccion"),
          repNombre: get("repNombre"),
          repRut: tipo === "persona_natural" ? get("rut") : get("repRut"),
          repCargo: tipo === "persona_natural" ? "Titular" : get("repCargo"),
          email: get("email"),
          telefono: get("telefono"),
          esPep,
          pepDetalle: esPep ? get("pepDetalle") : "",
          beneficiariosFinales,
          declaraVeracidad: f.get("declaraVeracidad") === "on",
          aceptaTerminos: f.get("aceptaTerminos") === "on",
          aceptaTratamientoDatos: f.get("aceptaTratamientoDatos") === "on",
        }),
      });
      rememberToken(res.id, res.accessToken);
      navigate(`/preinscripcion/estado?id=${res.id}`);
    } catch (err: any) {
      setError(err.message ?? "No pudimos registrar la preinscripción");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <img src={logoProveedorRegional} alt="Proveedor Regional" className="h-14 w-14 rounded-lg" />
          </Link>
          <span className="text-sm font-semibold text-muted-foreground">Preinscripción · Membresía</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Preinscripción Proveedor Regional</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Valor único de preinscripción: <strong className="text-foreground">$20.000</strong>. Verificamos tu identidad y la de tu
          empresa antes de emitir tu tarjeta de membresía para Apple Wallet y Google Wallet.
        </p>

        <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PASOS.map((p, i) => (
            <li key={p.t} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
              <p.icon className="h-5 w-5 shrink-0 text-violet" aria-hidden="true" />
              <span>
                <span className="text-muted-foreground">{i + 1}. </span>
                {p.t}
              </span>
            </li>
          ))}
        </ol>

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contribuyente</CardTitle>
              <CardDescription>Datos tal como aparecen ante el SII.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="tipo">Tipo de contribuyente</Label>
                <Select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                  <option value="persona_juridica">Empresa (persona jurídica: SpA, Ltda., EIRL, S.A.)</option>
                  <option value="persona_natural">Persona natural con giro</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="razonSocial">{tipo === "persona_juridica" ? "Razón social" : "Nombre completo"}</Label>
                <Input id="razonSocial" name="razonSocial" required autoComplete="organization" />
              </div>
              <div>
                <Label htmlFor="rut">RUT</Label>
                <RutInput id="rut" name="rut" />
              </div>
              <div>
                <Label htmlFor="giro">Giro o actividad principal</Label>
                <Input id="giro" name="giro" required />
              </div>
              <div>
                <Label htmlFor="comuna">Comuna</Label>
                <Select id="comuna" name="comuna" required defaultValue="">
                  <option value="" disabled>
                    Selecciona…
                  </option>
                  {COMUNAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="direccion">Dirección comercial</Label>
                <Input id="direccion" name="direccion" required autoComplete="street-address" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tipo === "persona_juridica" ? "Representante legal" : "Titular"}</CardTitle>
              <CardDescription>A esta persona se le pedirá su cédula de identidad.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="repNombre">Nombre completo</Label>
                <Input id="repNombre" name="repNombre" required autoComplete="name" />
              </div>
              {tipo === "persona_juridica" && (
                <>
                  <div>
                    <Label htmlFor="repRut">RUT del representante</Label>
                    <RutInput id="repRut" name="repRut" placeholder="12.345.678-5" />
                  </div>
                  <div>
                    <Label htmlFor="repCargo">Cargo</Label>
                    <Input id="repCargo" name="repCargo" required placeholder="Gerente general" />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email">Correo</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono móvil</Label>
                <Input id="telefono" name="telefono" type="tel" required placeholder="+56 9 1234 5678" autoComplete="tel" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Declaraciones</CardTitle>
              <CardDescription>Exigidas para conocer a nuestros socios (debida diligencia).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <fieldset>
                <legend className="mb-2 text-sm font-medium">
                  ¿El representante, o algún beneficiario final, es Persona Expuesta Políticamente (PEP) o familiar directo de una?
                </legend>
                <div className="flex gap-6 text-sm">
                  <label className="flex min-h-11 items-center gap-2">
                    <input type="radio" name="pep" checked={!esPep} onChange={() => setEsPep(false)} /> No
                  </label>
                  <label className="flex min-h-11 items-center gap-2">
                    <input type="radio" name="pep" checked={esPep} onChange={() => setEsPep(true)} /> Sí
                  </label>
                </div>
                {esPep && (
                  <div className="mt-3">
                    <Label htmlFor="pepDetalle">Cargo, institución y vínculo</Label>
                    <Textarea id="pepDetalle" name="pepDetalle" required minLength={5} />
                  </div>
                )}
              </fieldset>

              {tipo === "persona_juridica" && (
                <fieldset>
                  <legend className="mb-1 text-sm font-medium">Beneficiarios finales</legend>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Personas naturales que poseen, directa o indirectamente, 10% o más de la empresa, o que la controlan.
                  </p>
                  <div className="space-y-3">
                    {benef.map((b, i) => (
                      <div key={i} className="grid gap-2 sm:grid-cols-[1fr_180px_110px_44px]">
                        <Input
                          aria-label={`Nombre beneficiario ${i + 1}`}
                          placeholder="Nombre completo"
                          value={b.nombre}
                          required
                          onChange={(e) => setBenef(benef.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))}
                        />
                        <Input
                          aria-label={`RUT beneficiario ${i + 1}`}
                          placeholder="RUT"
                          value={b.rut}
                          required
                          onChange={(e) => setBenef(benef.map((x, j) => (j === i ? { ...x, rut: e.target.value } : x)))}
                        />
                        <Input
                          aria-label={`Porcentaje beneficiario ${i + 1}`}
                          placeholder="%"
                          type="number"
                          min={10}
                          max={100}
                          value={b.porcentaje}
                          required
                          onChange={(e) => setBenef(benef.map((x, j) => (j === i ? { ...x, porcentaje: e.target.value } : x)))}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          aria-label={`Quitar beneficiario ${i + 1}`}
                          disabled={benef.length === 1}
                          onClick={() => setBenef(benef.filter((_, j) => j !== i))}
                          className="h-11 px-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {benef.length < 10 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setBenef([...benef, { nombre: "", rut: "", porcentaje: "" }])}
                    >
                      <Plus className="h-4 w-4" /> Agregar beneficiario
                    </Button>
                  )}
                </fieldset>
              )}

              <div className="space-y-3 text-sm">
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="declaraVeracidad" required className="mt-1 h-4 w-4" />
                  <span>Declaro que la información entregada es verdadera y completa, y que informaré cualquier cambio.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="aceptaTerminos" required className="mt-1 h-4 w-4" />
                  <span>
                    Acepto los{" "}
                    <a
                      href={`/preinscripcion/terminos/${PREINSCRIPCION_TERMINOS_VERSION}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-primary underline"
                    >
                      términos y condiciones de la preinscripción
                    </a>{" "}
                    a la membresía Proveedor Regional (versión {PREINSCRIPCION_TERMINOS_VERSION}).
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="aceptaTratamientoDatos" required className="mt-1 h-4 w-4" />
                  <span>
                    Autorizo el tratamiento de mis datos personales y de los documentos que adjunte, con el único fin de verificar mi
                    identidad y administrar la membresía, conforme a la Ley N° 19.628 sobre protección de la vida privada.
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Enviando…" : "Continuar"} <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground">Siguiente paso: código de verificación en tu correo.</p>
          </div>
        </form>
      </main>
    </div>
  );
}
