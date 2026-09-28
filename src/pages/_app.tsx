import type { AppProps } from 'next/app';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

// El hash se lee acá arriba, apenas carga el módulo, porque el cliente de Supabase lo
// consume y lo borra de la URL en cuanto termina de procesarlo. Si esperamos a un efecto
// de React, a veces ya no está.
const HASH_INICIAL = typeof window !== 'undefined' ? window.location.hash : '';
const esRecuperacion = (hash: string) => hash.includes('type=recovery');

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const recuperando = useRef(esRecuperacion(HASH_INICIAL));

  useEffect(() => {
    // Un link de "restablecer contraseña" no siempre aterriza en /reset-password: si esa
    // dirección no está en la lista de URLs permitidas del proyecto, Supabase manda al
    // inicio. Y ahí el redirect automático de más abajo lo llevaba a /app, con la sesión
    // ya abierta: el usuario nunca veía el formulario de contraseña nueva y parecía que
    // el link no servía. Lo reconocemos nosotros y lo mandamos a donde corresponde, así
    // el flujo funciona sin depender de esa configuración.
    if (recuperando.current && window.location.pathname !== '/reset-password') {
      window.location.replace(`/reset-password${HASH_INICIAL}`);
    }
  }, []);

  useEffect(() => {
    // Auto-redirect after sign-in using full page navigation to avoid stale chunk errors
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Segunda oportunidad de agarrar la recuperación: si el hash ya se había borrado
      // cuando cargó el módulo, este evento sigue llegando.
      if (event === 'PASSWORD_RECOVERY') {
        recuperando.current = true;
        if (window.location.pathname !== '/reset-password') {
          window.location.href = '/reset-password';
        }
        return;
      }
      // Durante una recuperación también llega SIGNED_IN, y mandarlo a /app es
      // justamente lo que rompía el flujo.
      if (event === 'SIGNED_IN' && !recuperando.current) {
        const path = window.location.pathname;
        if (path === '/' || path === '/login') {
          window.location.href = '/app';
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // When a route change fails (e.g. stale JS chunk after new deploy), force a hard reload
    const handleRouteChangeError = (err: Error & { cancelled?: boolean }) => {
      if (err.cancelled) return;
      window.location.reload();
    };
    router.events.on('routeChangeError', handleRouteChangeError);
    return () => router.events.off('routeChangeError', handleRouteChangeError);
  }, [router.events]);

  return <Component {...pageProps} />;
}
