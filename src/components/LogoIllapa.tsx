/** Illapa es "rayo" en quechua: el logo es un rayo sobre fondo gris. */
export function LogoIllapa({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" role="img" aria-label="Illapa Systems" className={className}>
      <rect width="40" height="40" rx="9" fill="#3a3a3a" />
      <path d="M23.5 7 L13 21.5 h6.2 L16.5 33 L27 18.5 h-6.2 Z" fill="var(--event-yellow)" />
    </svg>
  );
}
