import { defineNuxtPlugin, useRouter, useRuntimeConfig } from "nuxt/app";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig();
  const id = runtimeConfig.public.googleAnalytics.id;

  if (!id) return;

  const script = document.createElement('script');
  script.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;
  document.head.appendChild(script);

  if (runtimeConfig.public.googleAnalytics.debug) {
    console.log('[GA] Google Analytics initialized with ID:', id);
  }

  const router = useRouter();
  router.afterEach((to) => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', id, { page_path: to.fullPath });
    }
  });
});
