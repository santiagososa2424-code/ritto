import { useRouter } from 'next/router';

// Página temporal para comparar fondos del hero. Se entra con /fondos?v=1..5.
// Cuando elijamos uno, ese fondo se mueve a index/login/register y esta página se borra.

function Aurora() {
  return (
    <div className="bg-layer" aria-hidden="true">
      <span className="au au1" />
      <span className="au au2" />
      <span className="au au3" />
      <span className="au au4" />
    </div>
  );
}

function Planilla() {
  const cells = [
    { r: 2, c: 3, d: 0 }, { r: 4, c: 7, d: 1.4 }, { r: 6, c: 2, d: 2.8 },
    { r: 3, c: 11, d: 4.2 }, { r: 7, c: 9, d: 5.6 }, { r: 5, c: 14, d: 7 },
    { r: 1, c: 8, d: 8.4 }, { r: 8, c: 5, d: 9.8 },
  ];
  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="grid-lines" />
      {cells.map((c, i) => (
        <span key={i} className="cell" style={{ top: `${c.r * 11}%`, left: `${c.c * 6.6}%`, animationDelay: `${c.d}s` }} />
      ))}
      <div className="grid-glow" />
    </div>
  );
}

function Puntos() {
  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="dots" />
      <span className="halo halo1" />
      <span className="halo halo2" />
    </div>
  );
}

function Ondas() {
  return (
    <div className="bg-layer" aria-hidden="true">
      <svg className="waves" viewBox="0 0 1440 700" preserveAspectRatio="none">
        <path className="w w1" d="M0,210 C240,140 480,280 720,215 C960,150 1200,285 1440,220 L1440,700 L0,700 Z" />
        <path className="w w2" d="M0,330 C300,255 540,395 780,330 C1020,265 1260,400 1440,335 L1440,700 L0,700 Z" />
        <path className="w w3" d="M0,470 C260,395 520,540 760,475 C1000,410 1240,545 1440,480 L1440,700 L0,700 Z" />
        <path className="ln l1" d="M0,180 C240,110 480,250 720,185 C960,120 1200,255 1440,190" />
        <path className="ln l2" d="M0,410 C280,335 520,475 780,410 C1040,345 1260,480 1440,415" />
      </svg>
    </div>
  );
}

function Constelacion() {
  const pts = [
    [6, 22], [18, 8], [31, 30], [9, 48], [24, 63], [41, 12], [38, 46], [52, 70],
    [57, 26], [72, 48], [64, 8], [86, 20], [79, 66], [46, 88], [15, 82], [93, 42],
  ];
  const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7], [6, 8], [8, 9], [9, 10], [8, 11], [9, 12], [7, 13], [4, 14], [12, 15]];
  return (
    <div className="bg-layer" aria-hidden="true">
      <svg className="constel" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="cg">
          {links.map(([a, b], i) => (
            <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} />
          ))}
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="0.5" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </g>
      </svg>
      <span className="halo halo1" />
    </div>
  );
}

const VARIANTS: Record<string, { name: string; node: JSX.Element }> = {
  '1': { name: 'Aurora', node: <Aurora /> },
  '2': { name: 'Planilla', node: <Planilla /> },
  '3': { name: 'Puntos', node: <Puntos /> },
  '4': { name: 'Ondas', node: <Ondas /> },
  '5': { name: 'Constelación', node: <Constelacion /> },
};

export default function Fondos() {
  const router = useRouter();
  const v = String(router.query.v ?? '1');
  const variant = VARIANTS[v] ?? VARIANTS['1'];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7; --dark: #111; --gray: #6b6b6b; --border: #e0e0e0; }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .shell { position: relative; overflow: hidden; min-height: 100vh; }
        .bg-layer { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        .hero { position: relative; z-index: 1; max-width: 880px; margin: 0 auto; padding: 120px 2rem 90px; text-align: center; }
        .badge { display: inline-flex; align-items: center; gap: 7px; background: var(--green-light); color: var(--green); border: 1px solid rgba(10,124,89,.22); border-radius: 20px; padding: 5px 15px; font-size: 13px; font-weight: 500; margin-bottom: 32px; }
        .dot { width: 7px; height: 7px; background: var(--green); border-radius: 50%; }
        h1 { font-family: 'DM Serif Display', serif; font-size: clamp(40px,6vw,68px); line-height: 1.08; margin-bottom: 24px; letter-spacing: -1.5px; }
        h1 em { font-style: italic; color: var(--green); }
        .sub { font-size: 19px; color: var(--gray); max-width: 540px; margin: 0 auto 44px; line-height: 1.65; }
        .btns { display: flex; gap: 12px; justify-content: center; }
        .b1 { background: var(--green); color: #fff; border: none; padding: 14px 34px; border-radius: 10px; font-size: 16px; font-weight: 600; font-family: inherit; }
        .b2 { background: transparent; border: 1.5px solid var(--border); padding: 14px 28px; border-radius: 10px; font-size: 16px; font-family: inherit; }
        .tag { position: fixed; left: 16px; bottom: 16px; z-index: 5; background: var(--dark); color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }

        /* 1 — Aurora: manchas de color muy grandes que se deforman despacio */
        .au { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .55; }
        .au1 { width: 700px; height: 700px; background: radial-gradient(circle, #6fd0ab, transparent 68%); top: -280px; left: -180px; animation: au 26s ease-in-out infinite; }
        .au2 { width: 620px; height: 620px; background: radial-gradient(circle, #a8e3cd, transparent 70%); top: -120px; right: -200px; animation: au 33s ease-in-out infinite reverse; }
        .au3 { width: 560px; height: 560px; background: radial-gradient(circle, #cfe9ff, transparent 72%); bottom: -260px; left: 30%; animation: au 29s ease-in-out infinite; }
        .au4 { width: 420px; height: 420px; background: radial-gradient(circle, #0a7c59, transparent 74%); opacity: .18; bottom: -160px; right: 12%; animation: au 37s ease-in-out infinite reverse; }
        @keyframes au { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,40px) scale(1.18); } }

        /* 2 — Planilla: la grilla de una hoja de cálculo con celdas que se van llenando */
        .grid-lines { position: absolute; inset: -2px; background-image:
            linear-gradient(to right, rgba(10,124,89,.13) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(10,124,89,.10) 1px, transparent 1px);
          background-size: 6.6% 11%; animation: gridPan 40s linear infinite; }
        @keyframes gridPan { from { transform: translate(0,0); } to { transform: translate(6.6%, 11%); } }
        .cell { position: absolute; width: 6.6%; height: 11%; background: var(--green); opacity: 0; animation: cellOn 11s ease-in-out infinite; }
        @keyframes cellOn { 0%,100% { opacity: 0; } 8% { opacity: .22; } 26% { opacity: .14; } 44% { opacity: 0; } }
        .grid-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 72% 62% at 50% 42%, rgba(245,245,247,.72) 0%, transparent 55%); }

        /* 3 — Puntos: malla de puntos con dos halos verdes que la recorren */
        .dots { position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(10,124,89,.26) 1.6px, transparent 1.6px); background-size: 24px 24px; animation: gridPan 55s linear infinite; }
        .halo { position: absolute; border-radius: 50%; filter: blur(80px); }
        .halo1 { width: 620px; height: 620px; background: radial-gradient(circle, rgba(111,208,171,.75), transparent 68%); top: -180px; left: -120px; animation: au 30s ease-in-out infinite; }
        .halo2 { width: 520px; height: 520px; background: radial-gradient(circle, rgba(168,227,205,.7), transparent 70%); bottom: -200px; right: -120px; animation: au 38s ease-in-out infinite reverse; }

        /* 4 — Ondas: capas curvas que se desplazan a distinta velocidad */
        .waves { position: absolute; inset: 0; width: 100%; height: 100%; }
        .w { fill: var(--green); transform-origin: center; }
        .w1 { opacity: .045; animation: wave 22s ease-in-out infinite; }
        .w2 { opacity: .035; animation: wave 30s ease-in-out infinite reverse; }
        .w3 { opacity: .03; animation: wave 38s ease-in-out infinite; }
        .ln { fill: none; stroke: var(--green); stroke-width: 1.4; }
        .l1 { opacity: .20; animation: wave 26s ease-in-out infinite; }
        .l2 { opacity: .14; animation: wave 34s ease-in-out infinite reverse; }
        @keyframes wave { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-40px,-18px); } }

        /* 5 — Constelación: nodos unidos que derivan juntos */
        .constel { position: absolute; inset: 0; width: 100%; height: 100%; }
        .cg line { stroke: var(--green); stroke-width: .12; opacity: .22; }
        .cg circle { fill: var(--green); opacity: .35; animation: pulse 6s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: .22; } 50% { opacity: .5; } }
        /* Dentro del SVG las unidades son las del viewBox (0–100), no píxeles: mover
           "60px" acá desplazaría el 60% del ancho. Por eso lleva su propia animación. */
        .cg { animation: drift 45s ease-in-out infinite; transform-origin: center; }
        @keyframes drift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(2.5px,1.8px) scale(1.04); } }

        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>

      <div className="shell">
        {variant.node}
        <section className="hero">
          <div className="badge"><span className="dot" />Hecho para empresas uruguayas</div>
          <h1>Tus facturas,<br />procesadas en <em>segundos</em></h1>
          <p className="sub">Subí tus facturas y Ritto extrae automáticamente todos los datos fiscales — RUT, IVA, totales — listos para exportar a Excel.</p>
          <div className="btns">
            <button className="b1" onClick={() => router.push('/login?signup=true')}>Probar gratis 14 días</button>
            <button className="b2" onClick={() => router.push('/login')}>Iniciar sesión</button>
          </div>
        </section>
        <div className="tag">{v} · {variant.name}</div>
      </div>
    </>
  );
}
