import { PRODUCTOS } from "./products.js";

const formatPrice = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0
});

function productCard(product, highPriority = false) {
  const imagePriority = highPriority
    ? 'loading="eager" fetchpriority="high"'
    : 'loading="lazy"';

  return `
    <article class="product-card">
      <a class="product-image-link" href="/producto/${product.id}" aria-label="Ver ${product.name}">
        <img src="${product.image}" alt="${product.name}" width="600" height="600" ${imagePriority} />
      </a>
      <div class="product-card-body">
        <p class="product-category">Accesorio tecnológico</p>
        <h3><a href="/producto/${product.id}">${product.name}</a></h3>
        <p class="product-description">${product.description}</p>
        <div class="product-card-footer">
          <strong>${formatPrice.format(product.price)}</strong>
          <button class="button button-small add-to-cart" type="button" data-product-id="${product.id}">
            Agregar al carrito
          </button>
        </div>
      </div>
    </article>
  `;
}

function homeView() {
  const featured = PRODUCTOS[0];

  return `
    <div class="page-wrapper">
      <section class="hero section-container">
        <div class="hero-content">
          <p class="eyebrow">Tecnología esencial</p>
          <h1>Mejora tu espacio con los accesorios correctos.</h1>
          <p class="hero-copy">
            Descubre productos prácticos para trabajar, crear y mantenerte conectado todos los días.
          </p>
          <div class="hero-actions">
            <a class="button" href="/catalogo">Explorar catálogo</a>
            <a class="button button-secondary" href="/producto/${featured.id}">Ver destacado</a>
          </div>
        </div>
        <div class="hero-product">
          <span class="hero-badge">Producto destacado</span>
          <a class="product-image-link" href="/producto/${featured.id}" aria-label="Ver ${featured.name}">
            <img
              src="${featured.image}"
              alt="${featured.name}"
              width="600"
              height="600"
              fetchpriority="high"
            />
          </a>
          <div class="hero-product-info">
            <div>
              <p class="hero-product-title">${featured.name}</p>
              <strong>${formatPrice.format(featured.price)}</strong>
            </div>
            <button class="button button-small add-to-cart" type="button" data-product-id="${featured.id}">
              Agregar al carrito
            </button>
          </div>
        </div>
      </section>

      <section class="featured-section section-container" aria-labelledby="featured-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Selección TechVolt</p>
            <h2 id="featured-title">Productos destacados</h2>
          </div>
          <a class="text-link" href="/catalogo">Ver catálogo completo <span aria-hidden="true">→</span></a>
        </div>
        <div class="product-grid product-grid-featured">
          ${PRODUCTOS.slice(0, 3).map((product, index) => productCard(product, index === 0)).join("")}
        </div>
      </section>

      <section class="pwa-demo-section section-container" aria-labelledby="pwa-demo-title">
        <div class="pwa-demo-card">
          <div class="pwa-demo-copy">
            <p class="eyebrow">Práctica académica</p>
            <h2 id="pwa-demo-title">Funciones PWA</h2>
            <p>Prueba las notificaciones, la conexión y una acción que puede sincronizarse en segundo plano.</p>
            <div class="pwa-demo-actions">
              <button class="button" id="enable-notifications" type="button">🔔 Activar notificaciones</button>
              <button class="button button-secondary" id="test-sync" type="button">🔄 Probar sincronización</button>
            </div>
          </div>
          <div class="pwa-status-panel" aria-label="Estado de las funciones PWA">
            <dl>
              <div><dt>Service Worker</dt><dd id="sw-status">Comprobando…</dd></div>
              <div><dt>Notificaciones</dt><dd id="notification-status">Comprobando…</dd></div>
              <div><dt>Conexión</dt><dd id="connection-status">Comprobando…</dd></div>
              <div><dt>Sincronización</dt><dd id="sync-status">Sin acciones pendientes</dd></div>
            </dl>
            <p class="pwa-result" id="pwa-result" role="status" aria-live="polite">
              Usa los botones para iniciar la demostración.
            </p>
          </div>
        </div>
      </section>

      <section class="benefits" aria-label="Beneficios de TechVolt">
        <div class="section-container benefits-grid">
          <div>
            <strong>Productos seleccionados</strong>
            <span>Accesorios útiles y confiables para tu espacio</span>
          </div>
          <div>
            <strong>Compra sencilla</strong>
            <span>Encuentra lo que necesitas con total claridad</span>
          </div>
          <div>
            <strong>Siempre disponible</strong>
            <span>Consulta el catálogo incluso sin conexión a internet</span>
          </div>
        </div>
      </section>
    </div>
  `;
}

function catalogView() {
  return `
    <div class="page-wrapper">
      <section class="page-section section-container" aria-labelledby="catalog-title">
        <div class="page-heading">
          <p class="eyebrow">Colección completa</p>
          <h1 id="catalog-title">Catálogo TechVolt</h1>
          <p class="page-copy">Seis accesorios elegidos para mejorar tu escritorio, entrenamiento y entretenimiento diario.</p>
        </div>
        <div class="catalog-summary" aria-label="Resumen del catálogo">
          <span>${PRODUCTOS.length} productos disponibles</span>
          <span>Precios en pesos mexicanos (MXN)</span>
        </div>
        <div class="product-grid">
          ${PRODUCTOS.map((product, index) => productCard(product, index === 0)).join("")}
        </div>
      </section>

      <section class="benefits" aria-label="Beneficios de TechVolt">
        <div class="section-container benefits-grid">
          <div>
            <strong>Garantía oficial</strong>
            <span>12 meses de cobertura en todos los productos</span>
          </div>
          <div>
            <strong>Envío inmediato</strong>
            <span>Preparación y despacho rápido de tu pedido</span>
          </div>
          <div>
            <strong>Soporte continuo</strong>
            <span>Atención y asistencia técnica personalizada</span>
          </div>
        </div>
      </section>
    </div>
  `;
}

function detailView(id) {
  const product = PRODUCTOS.find((item) => item.id === Number(id));

  if (!product) {
    return `
      <section class="empty-state section-container">
        <p class="eyebrow">Error 404</p>
        <h1>Producto no encontrado</h1>
        <p>El producto que buscas no existe o ya no está disponible en nuestro catálogo.</p>
        <a class="button" href="/catalogo">Volver al catálogo</a>
      </section>
    `;
  }

  const related = PRODUCTOS.filter((item) => item.id !== product.id).slice(0, 3);

  return `
    <div class="page-wrapper">
      <section class="detail-page section-container">
        <nav class="breadcrumb" aria-label="Ruta de navegación">
          <a href="/">Inicio</a>
          <span class="breadcrumb-separator" aria-hidden="true">/</span>
          <a href="/catalogo">Catálogo</a>
          <span class="breadcrumb-separator" aria-hidden="true">/</span>
          <span aria-current="page">${product.name}</span>
        </nav>

        <div class="detail-layout">
          <div class="detail-image">
            <img src="${product.image}" alt="${product.name}" width="600" height="600" fetchpriority="high" />
          </div>
          <div class="detail-content">
            <p class="eyebrow">Accesorio tecnológico</p>
            <h1>${product.name}</h1>
            <p class="detail-price">${formatPrice.format(product.price)}</p>
            <p class="detail-description">${product.description}</p>
            
            <ul class="detail-features">
              <li>Diseño funcional optimizado para uso continuo</li>
              <li>Materiales resistentes con acabado minimalista</li>
              <li>Garantía oficial TechVolt de 12 meses</li>
            </ul>

            <div class="detail-actions">
              <button class="button detail-button add-to-cart" type="button" data-product-id="${product.id}">
                Agregar al carrito
              </button>
            </div>
            <p class="detail-note">Disponibilidad inmediata con entrega rápida</p>
          </div>
        </div>
      </section>

      <section class="featured-section section-container" aria-labelledby="related-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Recomendaciones</p>
            <h2 id="related-title">Otros productos del catálogo</h2>
          </div>
          <a class="text-link" href="/catalogo">Ver todos <span aria-hidden="true">→</span></a>
        </div>
        <div class="product-grid">
          ${related.map((item) => productCard(item, false)).join("")}
        </div>
      </section>
    </div>
  `;
}

export function getNormalizedPath() {
  if (window.location.hash) {
    const hashPath = window.location.hash.replace(/^#/, "");
    if (hashPath.startsWith("/")) {
      window.history.replaceState({}, "", hashPath);
      return hashPath;
    }
  }

  const base = import.meta.env.BASE_URL || "/";
  let pathname = window.location.pathname;

  if (base !== "/" && base !== "./" && pathname.startsWith(base)) {
    pathname = "/" + pathname.slice(base.length);
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  return pathname || "/";
}

function currentRoute() {
  const path = getNormalizedPath();
  const productMatch = path.match(/^\/producto\/(\d+)$/);

  if (productMatch) return { name: "detail", id: productMatch[1] };
  if (path === "/catalogo" || path.includes("catalogo")) return { name: "catalog" };
  if (path === "/" || path === "" || path.includes("index")) return { name: "home" };

  return { name: "not-found" };
}

export function navigateTo(url) {
  const targetUrl = url.startsWith("/") ? url : "/" + url;
  if (targetUrl !== window.location.pathname) {
    window.history.pushState({}, "", targetUrl);
  }
  renderRoute();
}

export function renderRoute(manageFocus = true) {
  const app = document.querySelector("#app");
  const route = currentRoute();

  if (route.name === "home") app.innerHTML = homeView();
  else if (route.name === "catalog") app.innerHTML = catalogView();
  else if (route.name === "detail") app.innerHTML = detailView(route.id);
  else app.innerHTML = detailView(null);

  const currentPath = getNormalizedPath();
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const href = link.getAttribute("href");
    const isActive = href === currentPath || (href === "/" && (currentPath === "" || currentPath === "/"));
    link.classList.toggle("active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  document.title = route.name === "catalog"
    ? "Catálogo | TechVolt"
    : route.name === "detail"
      ? "Detalle de producto | TechVolt"
      : "TechVolt | Tecnología para tu día";

  document.dispatchEvent(new CustomEvent("techvolt:route-rendered"));

  if (manageFocus) {
    requestAnimationFrame(() => {
      app.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }
}
