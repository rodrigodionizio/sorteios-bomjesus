"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalação/PWA continua funcionando sem o service worker;
        // só perde o cache offline dos ícones/assets estáticos.
      });
    }
  }, []);

  return null;
}
