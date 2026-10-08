import { initializeCart } from "./cart.js";
import { renderRoute, navigateTo } from "./router.js";
import { renderHeader, renderFooter } from "./components/layout.js";
import { initializePwaDemo } from "./pwa-demo.js";

// Renderiza los componentes compartidos de Header y Footer
renderHeader();
renderFooter();

function closeMenu() {
  const mainNav = document.querySelector("#main-nav");
  const menuButton = document.querySelector("#menu-toggle");
  if (mainNav) mainNav.classList.remove("is-open");
  if (menuButton) {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Abrir menú");
  }
}

// Soporte para navegación con History API (botones atrás / adelante del navegador)
window.addEventListener("popstate", () => {
  closeMenu();
  renderRoute();
});

// Retrocompatibilidad con hashes
window.addEventListener("hashchange", () => {
  closeMenu();
  renderRoute();
});

// Interceptar clics en enlaces internos para navegación fluida SPA sin recargas de página
document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href) return;

  if (
    (href.startsWith("/") || href.startsWith("./") || href.endsWith(".html")) &&
    !href.startsWith("//") &&
    !href.startsWith("http") &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey &&
    event.button === 0
  ) {
    event.preventDefault();
    closeMenu();
    navigateTo(href);
  }
});

// Renderiza la vista inicial basada en la URL actual y activa el carrito
renderRoute(false);
initializeCart();
initializePwaDemo();

// Registro del Service Worker para funcionamiento PWA y soporte offline
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const serviceWorkerUrl = `${import.meta.env.BASE_URL}service-worker.js`;
      const registration = await navigator.serviceWorker.register(serviceWorkerUrl);
      console.log("Service Worker registrado correctamente:", registration.scope);
    } catch (error) {
      console.error("Error al registrar el Service Worker:", error);
    }
  });
} else {
  console.log("Este navegador no soporta Service Workers.");
}
