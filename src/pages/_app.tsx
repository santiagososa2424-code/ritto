import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        const path = window.location.pathname;
        if (path === '/' || path === '/login') {
          router.replace('/app');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return <Component {...pageProps} />;
}
