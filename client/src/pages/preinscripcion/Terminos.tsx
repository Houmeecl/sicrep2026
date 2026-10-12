import { useParams, Link } from "wouter";
import { TERMINOS, PREINSCRIPCION_TERMINOS_VERSION } from "@shared/terminos";
import logoProveedorRegional from "@/assets/logo-proveedor-regional.png";

export default function Terminos() {
  const { version } = useParams<{ version?: string }>();
  const v = version ?? PREINSCRIPCION_TERMINOS_VERSION;
  const doc = TERMINOS[v];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/preinscripcion">
          <img src={logoProveedorRegional} alt="Proveedor Regional" className="h-16 w-16 rounded-lg" />
        </Link>
        {!doc ? (
          <p className="mt-6">No existe la versión {v} de los términos.</p>
        ) : (
          <article className="mt-6">
            <h1 className="text-3xl font-extrabold tracking-tight">Términos y condiciones de la preinscripción</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Versión {v} · vigente desde {doc.vigenteDesde}
            </p>
            {doc.secciones.map((s) => (
              <section key={s.titulo} className="mt-8">
                <h2 className="text-lg font-bold">{s.titulo}</h2>
                {s.parrafos.map((p, i) => (
                  <p key={i} className="mt-3 leading-relaxed">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </article>
        )}
      </main>
    </div>
  );
}
