// /pages/Landing.jsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  // ✅ FIX: si el navegador vuelve con back/forward cache, forzar reload
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const bubbles = [
    {
      title: "Link único para reservas",
      desc: "Link unico de empresa.",
    },
    {
      title: "Control de señas",
      desc: "Gestioná señas y comprobantes dentro de la app.",
    },
    {
      title: "Ingresos y gastos",
      desc: "Control total en ingresos y gastos de la empresa.",
    },
    {
      title: "Emails automáticos",
      desc: "Confirmación y recordatorio para evitar faltas del cliente.",
    },
    {
      title: "30 días gratis",
      desc: "Probalo gratis simplemente creando tu cuenta.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070A16] text-white relative overflow-hidden">
      {/* Fondo suave azul/negro (sin verde) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 -left-44 h-[560px] w-[560px] rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute -bottom-56 -right-56 h-[680px] w-[680px] rounded-full bg-sky-400/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_85%_25%,rgba(59,130,246,0.12),transparent_48%)]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        {/* NAVBAR */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
              <span className="text-sm font-semibold">R</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Ritto</p>
              <p className="text-[11px] text-white/55">Agenda inteligente</p>
            </div>
          </div>

          {/* ✅ SOLO 2 botones + Link (React Router) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-[12px] sm:text-sm px-3 sm:px-4 py-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition"
            >
              Iniciar sesión
            </Link>

            <Link
              to="/register"
              className="text-[12px] sm:text-sm px-3 sm:px-4 py-2 rounded-2xl bg-white text-[#070A16] font-semibold hover:bg-white/90 transition"
            >
              Registrarse
            </Link>
          </div>
        </header>

        {/* HERO */}
        <section className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Texto */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              Tu agenda y tu negocio bajo control
            </div>

            <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
              Tu agenda automatizada{" "}
              <span className="text-white/70">hecha a tu medida</span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-white/70 max-w-xl">
              Hecha para simplificar tu negocio.
            </p>

            {/* ✅ Burbujas SIN numeritos */}
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bubbles.slice(0, 4).map((b) => (
                <div
                  key={b.title}
                  className="rounded-3xl border border-white/10 bg-white/5 hover:bg-white/7 transition p-4"
                >
                  <p className="text-[12px] font-semibold">{b.title}</p>
                  <p className="mt-1 text-[11px] text-white/60">{b.desc}</p>
                </div>
              ))}
            </div>

            {/* 5ta burbuja */}
            <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 p-4 max-w-xl">
              <p className="text-[12px] font-semibold">{bubbles[4].title}</p>
              <p className="mt-1 text-[11px] text-white/60">{bubbles[4].desc}</p>
            </div>
          </div>

          {/* Preview liviano (no es tu dashboard real) */}
          <div className="lg:justify-self-end w-full">
            <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/8 to-white/3 backdrop-blur-xl shadow-[0_18px_80px_rgba(0,0,0,0.55)] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/50 uppercase tracking-[0.22em]">
                    Panel
                  </p>
                  <p className="text-sm font-semibold">Vista previa</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[12px]">
                  R
                </div>
              </div>

              <div className="p-5 grid grid-cols-2 gap-3">
                <MiniCard label="Turnos" value="12" sub="Próx. 7 días" />
                <MiniCard label="Ingresos" value="$ 61.000" sub="Este mes" />
                <MiniCard label="Gastos" value="$ 18.400" sub="Este mes" />
                <MiniCard label="Ocupación" value="76%" sub="Hoy" />
              </div>

              <div className="px-5 pb-6">
                <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                  <div className="grid grid-cols-3 text-[10px] text-white/50 border-b border-white/10 bg-white/5">
                    <div className="px-3 py-2">Fecha</div>
                    <div className="px-3 py-2">Hora</div>
                    <div className="px-3 py-2">Estado</div>
                  </div>
                  {["Confirmado", "Pendiente", "Confirmado"].map((st, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 text-[11px] border-b border-white/5 last:border-b-0"
                    >
                      <div className="px-3 py-2 text-white/80">
                        2026-01-2{i + 4}
                      </div>
                      <div className="px-3 py-2 text-white/80">15:{i}0</div>
                      <div className="px-3 py-2">
                        <span className="inline-flex px-2 py-1 rounded-2xl border border-white/10 bg-white/5 text-white/80">
                          {st}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Soporte técnico abajo a la izquierda (1 sola vez) */}
        <footer className="mt-10 sm:mt-14 flex items-center justify-start">
          <div className="text-[11px] text-white/55 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            Soporte técnico:{" "}
            <span className="text-white/80 font-medium">093403706</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function MiniCard({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] text-white/55">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-[10px] text-white/45">{sub}</p>
    </div>
  );
}
