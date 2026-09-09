import { useEffect, useRef, useState } from 'react';

// Fondo de hoja de cálculo: la grilla de fondo y celdas que se encienden en verde,
// como si la planilla se fuera llenando sola. Se usa igual en la home, en el login y
// en el registro. Todo CSS: no descarga ningún archivo.

// La celda es cuadrada y de tamaño fijo, no un porcentaje del ancho. Con porcentajes,
// en un celular angosto las columnas quedaban como rayas verticales.
const CELL_DESKTOP = 92;
const CELL_MOBILE = 62;

// Cuánto vive cada celda encendida. Coincide con la animación `rbCell`, que es lo que
// decide cuándo sacarla del DOM.
const CELL_LIFE_MS = 4200;

type Cell = { id: number; row: number; col: number };

export default function HeroBackground({ soft = false }: { soft?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [cells, setCells] = useState<Cell[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let nextId = 0;
    let addTimer: ReturnType<typeof setTimeout>;
    const lifeTimers: ReturnType<typeof setTimeout>[] = [];

    const addOne = () => {
      // Se mide en cada vuelta: así, al rotar el teléfono o achicar la ventana, las
      // celdas siguen cayendo dentro de lo que se ve.
      const box = host.current;
      const size = window.innerWidth <= 560 ? CELL_MOBILE : CELL_DESKTOP;
      const cols = Math.max(1, Math.floor((box?.clientWidth ?? window.innerWidth) / size));
      const rows = Math.max(1, Math.floor((box?.clientHeight ?? 600) / size));

      const cell = { id: nextId++, row: Math.floor(Math.random() * rows), col: Math.floor(Math.random() * cols) };
      setCells((prev) => {
        // Sin esto dos celdas pueden caer en el mismo casillero y se ve el doble de
        // verde en un solo cuadrado.
        if (prev.some((c) => c.row === cell.row && c.col === cell.col)) return prev;
        return [...prev.slice(-9), cell];
      });
      lifeTimers.push(setTimeout(() => setCells((prev) => prev.filter((c) => c.id !== cell.id)), CELL_LIFE_MS));
      // Intervalo irregular: con uno fijo el ojo le encuentra el pulso enseguida.
      addTimer = setTimeout(addOne, 500 + Math.random() * 900);
    };

    addTimer = setTimeout(addOne, 400);
    return () => {
      clearTimeout(addTimer);
      lifeTimers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div ref={host} className={`rb${soft ? ' rb-soft' : ''}`} aria-hidden="true">
      <style>{`
        .rb { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; --cell: ${CELL_DESKTOP}px; }
        @media (max-width: 560px) { .rb { --cell: ${CELL_MOBILE}px; } }

        /* Sobresale una celda de cada lado: la grilla se desplaza una celda entera y,
           si midiera lo mismo que el contenedor, dejaría una franja sin líneas contra
           el borde. */
        .rb-grid {
          position: absolute;
          left: calc(-1 * var(--cell)); top: calc(-1 * var(--cell));
          width: calc(100% + 2 * var(--cell)); height: calc(100% + 2 * var(--cell));
          background-image:
            linear-gradient(to right, rgba(10,124,89,.13) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(10,124,89,.10) 1px, transparent 1px);
          background-size: var(--cell) var(--cell);
          animation: rbPan 34s linear infinite;
        }
        /* Se corre exactamente una celda: al terminar, la grilla quedó igual que al
           empezar, así que el ciclo reinicia sin salto. */
        @keyframes rbPan {
          from { transform: translate(0, 0); }
          to   { transform: translate(var(--cell), var(--cell)); }
        }

        .rb-cell {
          position: absolute; width: var(--cell); height: var(--cell);
          background: var(--green, #0a7c59); opacity: 0;
          animation: rbCell ${CELL_LIFE_MS}ms ease-in-out forwards;
        }
        @keyframes rbCell {
          0% { opacity: 0; }
          14% { opacity: .22; }
          62% { opacity: .13; }
          100% { opacity: 0; }
        }

        /* Aclara el centro para que el texto de arriba siempre tenga contraste */
        .rb-veil {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 72% 62% at 50% 42%, rgba(245,245,247,.72) 0%, transparent 55%);
        }

        /* En login y registro va más tenue: ahí el protagonista es el formulario */
        .rb-soft .rb-grid { opacity: .55; }
        .rb-soft .rb-cell { animation-name: rbCellSoft; }
        @keyframes rbCellSoft {
          0% { opacity: 0; }
          14% { opacity: .14; }
          62% { opacity: .08; }
          100% { opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) { .rb-grid { animation: none; } }
      `}</style>

      {/* Las celdas van dentro de la grilla, no al lado: así se desplazan con ella y
          quedan siempre encajadas en un casillero. Sueltas, se iban corriendo. */}
      <div className="rb-grid">
        {cells.map((c) => (
          <span
            key={c.id}
            className="rb-cell"
            style={{ top: `calc(${c.row + 1} * var(--cell))`, left: `calc(${c.col + 1} * var(--cell))` }}
          />
        ))}
      </div>
      <div className="rb-veil" />
    </div>
  );
}
