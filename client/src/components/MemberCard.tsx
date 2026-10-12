import logoProveedorRegional from "@/assets/logo-proveedor-regional.png";

interface Props {
  razonSocial: string;
  memberCode: string;
  validaHasta: string | Date;
  estado: "vigente" | "vencida" | "revocada";
  qrSvg: string;
}

const ESTADO_STYLE: Record<Props["estado"], string> = {
  vigente: "border-[#9A7CFF] text-white",
  vencida: "border-amber-300 text-amber-200",
  revocada: "border-red-300 text-red-200",
};

/** Tarjeta de membresía en pantalla: mismo diseño que el pase de wallet. El QR lleva a la verificación pública. */
export function MemberCard({ razonSocial, memberCode, validaHasta, estado, qrSvg }: Props) {
  const vence = new Date(validaHasta).toLocaleDateString("es-CL", { timeZone: "America/Santiago" });
  return (
    <div
      className="relative mx-auto aspect-[54/85.6] w-full max-w-[300px] overflow-hidden rounded-[22px] p-6 text-white shadow-xl"
      style={{ background: "#15122A" }}
    >
      <div className="absolute -bottom-40 -right-36 h-80 w-80 rounded-full" style={{ background: "#241C52" }} />
      <div className="absolute -bottom-56 -right-10 h-80 w-80 rounded-full" style={{ background: "#3A2A8C" }} />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span className="text-3xl font-extrabold tracking-tight">
            sicr<span className="text-[#9A7CFF]">3</span>p<span className="text-[#9A7CFF]">/</span>
          </span>
          <span className="rounded-lg bg-white p-1.5">
            <img src={logoProveedorRegional} alt="Proveedor Regional" className="h-11 w-11 object-contain" />
          </span>
        </div>
        <span className="mt-2 text-[10px] font-semibold tracking-[0.2em] text-[#C9C2E8]">TARJETA DE MEMBRESÍA</span>

        <div className="mt-auto w-36 self-start rounded-xl bg-white p-2" role="img" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="Código QR de verificación" />

        <div className="mt-4">
          <div className="text-[10px] font-semibold tracking-[0.2em] text-[#C9C2E8]">TITULAR</div>
          <div className="text-base font-semibold leading-tight">{razonSocial}</div>
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.2em] text-[#C9C2E8]">CÓDIGO DE SOCIO</div>
            <div className="font-mono text-sm">{memberCode}</div>
            <div className="mt-1 text-[11px] text-[#DAD4F2]">Válida hasta {vence}</div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${ESTADO_STYLE[estado]}`}>
            {estado === "vigente" ? "Preinscripción" : estado === "vencida" ? "Vencida" : "Revocada"}
          </span>
        </div>
      </div>
    </div>
  );
}
