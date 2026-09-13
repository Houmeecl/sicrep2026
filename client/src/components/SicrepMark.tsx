let gradientCounter = 0;

/** Isotipo de SICREP: dos montañas superpuestas (azul → violeta → coral) y un sol. */
export function SicrepMark({ className = "h-7 w-7" }: { className?: string }) {
  const id = `sicrep-mark-${++gradientCounter}`;

  return (
    <svg viewBox="0 0 64 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-back`} x1="0" y1="40" x2="34" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E2A78" />
          <stop offset="100%" stopColor="#8B3DFF" />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="18" y1="40" x2="58" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B3DFF" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
      </defs>
      <circle cx="52" cy="10" r="7" fill="#FF7A00" />
      <path
        d="M2 40 L20 8 L30 24 L38 12 L54 40 Z"
        fill={`url(#${id}-back)`}
        opacity="0.9"
      />
      <path
        d="M14 40 L32 8 L50 40 Z"
        fill={`url(#${id}-front)`}
      />
    </svg>
  );
}
