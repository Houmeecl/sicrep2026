export function Isotipo({ className = 'size-10', claro = false }) {
  return (
    <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
      <circle cx="22" cy="22" r="21" fill={claro ? '#F5EFE6' : '#0D2C47'} />
      <circle cx="29" cy="15" r="5" fill="#EF7D2D" />
      <path d="M5 31 L16 17 L23 25 L28 20 L39 31 Z" fill="#C98A5B" />
      <path
        d="M10 38 C18 33 24 34 34 30"
        stroke={claro ? '#0D2C47' : '#FFFFFF'}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ claro = false, subtitulo = true }) {
  return (
    <span className="flex items-center gap-3">
      <Isotipo claro={claro} />
      <span className="flex flex-col leading-tight">
        <span className={`font-display text-lg font-extrabold ${claro ? 'text-white' : 'text-navy-900'}`}>
          Proveedor Regional
        </span>
        {subtitulo && (
          <span className={`text-[13px] ${claro ? 'text-navy-100' : 'text-tinta-600'}`}>Región de Antofagasta</span>
        )}
      </span>
    </span>
  );
}
