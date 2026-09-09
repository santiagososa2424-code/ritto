import { useEffect, useState } from 'react';

const TEXT = 'ritto.lat';

// Escribe y borra el dominio en bucle, con cursor. La animación arranca recién en el
// cliente: si el servidor entregara un texto a medio escribir, React lo marcaría como
// diferencia al hidratar.
export default function TypedDomain() {
  const [shown, setShown] = useState(TEXT);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let i = TEXT.length;
    let writing = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      i += writing ? 1 : -1;
      setShown(TEXT.slice(0, i));

      let wait = writing ? 110 : 55;           // borrar siempre se siente más rápido
      if (i >= TEXT.length) { writing = false; wait = 2200; }  // se deja leer completo
      else if (i <= 0) { writing = true; wait = 650; }

      timer = setTimeout(step, wait);
    };

    timer = setTimeout(step, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="typed" aria-label={TEXT}>
      <style>{`
        .typed {
          font-family: ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace;
          font-size: 15px; letter-spacing: 0.5px; color: var(--dark, #111);
          height: 22px; display: flex; align-items: center; justify-content: center;
        }
        /* El cursor no parpadea mientras se escribe, igual que en una terminal */
        .typed-caret {
          display: inline-block; width: 8px; height: 16px; margin-left: 3px;
          background: var(--dark, #111); vertical-align: middle;
          animation: caret 1.05s steps(1) infinite;
        }
        @keyframes caret { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .typed-caret { animation: none; } }
      `}</style>
      <span>{shown}</span>
      <span className="typed-caret" />
    </div>
  );
}
