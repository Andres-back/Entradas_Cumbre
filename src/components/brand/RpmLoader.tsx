import { cn } from "@/lib/utils";

interface RpmLoaderProps {
  label?: string;
  className?: string;
}

/**
 * Loader con forma de indicador de carga.
 * Aguja oscila simulando RPM, marcas 0-8 (rojas las altas).
 * Usado en estados de loading (registro, validacion, etc).
 */
export function RpmLoader({
  label = "Preparando acceso...",
  className,
}: RpmLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <svg viewBox="0 0 200 130" className="w-48" aria-label="Cargando">
        {/* Arco del tacometro */}
        <path
          d="M 20 110 A 80 80 0 0 1 180 110"
          fill="none"
          stroke="var(--color-taller-iron)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Marcas 0-8 */}
        {Array.from({ length: 9 }).map((_, i) => {
          const angle = ((180 - i * 22.5) * Math.PI) / 180;
          const x1 = 100 + 70 * Math.cos(angle);
          const y1 = 110 - 70 * Math.sin(angle);
          const x2 = 100 + 80 * Math.cos(angle);
          const y2 = 110 - 80 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i >= 6 ? "var(--color-ember-bright)" : "var(--color-ash)"}
              strokeWidth="2"
            />
          );
        })}
        {/* Numeros 0, 4, 8 */}
        <text x="20" y="128" fill="var(--color-ash)" fontSize="10" textAnchor="middle">
          0
        </text>
        <text x="100" y="22" fill="var(--color-ash)" fontSize="10" textAnchor="middle">
          4
        </text>
        <text x="180" y="128" fill="var(--color-ember-bright)" fontSize="10" textAnchor="middle">
          8
        </text>
        {/* Aguja animada */}
        <g
          style={{ transformOrigin: "100px 110px" }}
          className="animate-rpm-needle"
        >
          <line
            x1="100"
            y1="110"
            x2="100"
            y2="40"
            stroke="var(--color-ember-bright)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        {/* Centro */}
        <circle cx="100" cy="110" r="6" fill="var(--color-ember-rust)" />
        <circle cx="100" cy="110" r="2" fill="var(--color-taller-shadow)" />
      </svg>
      <p className="font-subhead text-sm uppercase tracking-widest text-ash">
        {label}
      </p>
    </div>
  );
}


