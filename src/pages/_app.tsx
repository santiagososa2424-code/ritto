import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after sign-in using full page navigation to avoid stale chunk errors
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
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
