// Nombre y version de la memoria cache (al cambiarla fuerza la actualizacion).
const CACHE_NAME = "techvolt-cache-v13";
const DB_NAME = "techvolt-pwa";
const DB_VERSION = 1;
const STORE_NAME = "acciones";
const SYNC_TAG = "sincronizar-pedidos";

// Archivos minimos estaticos de la interfaz (App Shell) para funcionar offline.
const APP_SHELL = [
  "./",
  "./index.html",
  "./catalogo.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable.png"
];

// Modulos y componentes que Vite sirve directamente durante desarrollo local (npm run dev).
const DEVELOPMENT_MODULES = [
  "./src/main.js",
  "./src/router.js",
  "./src/components/layout.js",
  "./src/components/header.html",
  "./src/components/footer.html",
  "./src/cart.js",
  "./src/products.js",
  "./src/pwa-demo.js"
];

// Guarda una lista de archivos en cache de forma segura sin cancelar si alguno no existe.
async function cacheAvailableResources(cache, resources) {
  // Descarga y guarda todos los recursos en paralelo
  await Promise.all(
    resources.map(async (resource) => {
      try {
        // Intenta agregar el recurso a la cache
        await cache.add(resource);
      } catch {
        // Si el archivo no existe en el entorno actual, lo ignora silenciosamente
      }
    })
  );
}

// Lee index.html y catalogo.html para detectar y guardar los archivos compilados con hash generados por Vite.
async function cacheViteBuildAssets(cache) {
  const pages = ["./index.html", "./catalogo.html"];
  for (const page of pages) {
    try {
      // 1. Descarga el archivo HTML sin guardar en cache temporal
      const pageResponse = await fetch(page, { cache: "no-store" });
      if (!pageResponse.ok) continue;

      // 2. Extrae el codigo HTML en formato texto
      const html = await pageResponse.text();

      // 3. Expresion regular para buscar rutas en etiquetas src="..." o href="..."
      const resourcePattern = /(?:src|href)=["']([^"']+)["']/g;

      // 4. Filtra unicamente las rutas que pertenezcan a la carpeta /assets/ del mismo dominio
      const assetUrls = [...html.matchAll(resourcePattern)]
        .map((match) => new URL(match[1], self.location.href))
        .filter((url) => url.origin === self.location.origin && url.pathname.includes("/assets/"));

      // 5. Guarda todos los archivos compilados encontrados en la cache
      await cacheAvailableResources(cache, assetUrls.map((url) => url.href));
    } catch {
      // Si la pagina no esta disponible, continua con la siguiente
    }
  }
}

// Evento Install: Se ejecuta al instalar el Service Worker para precargar los recursos esenciales.
self.addEventListener("install", (event) => {
  // Espera a que termine de guardar todo antes de completar la instalacion
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // 1. Guarda los archivos estaticos base del App Shell
        await cache.addAll(APP_SHELL);
        // 2. Guarda modulos y componentes de desarrollo si existen
        await cacheAvailableResources(cache, DEVELOPMENT_MODULES);
        // 3. Guarda archivos compilados de produccion si existen
        await cacheViteBuildAssets(cache);
      })
      // Activa el Service Worker de inmediato sin esperar a reiniciar la pestaña
      .then(() => self.skipWaiting())
  );
});

// Evento Activate: Se ejecuta al activar el Service Worker y elimina versiones viejas de cache.
self.addEventListener("activate", (event) => {
  // Espera a completar la limpieza de caches obsoletas
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          // Filtra las caches viejas que no coincidan con la version actual
          .filter((cacheName) => cacheName !== CACHE_NAME)
          // Borra cada cache antigua encontrada
          .map((cacheName) => caches.delete(cacheName))
      ))
      // Toma el control inmediato de todas las pestañas abiertas
      .then(() => self.clients.claim())
  );
});

// Estrategia Cache First con entrega instantánea de navegación (App Shell Architecture).
async function cacheFirst(request) {
  // 1. En navegaciones (cambios de pantalla), entrega el App Shell de inmediato desde caché
  if (request.mode === "navigate") {
    const cachedPage = await caches.match(request);
    if (cachedPage) return cachedPage;

    // Si la ruta solicitada contiene 'catalogo', usa catalogo.html o index.html
    const isCatalog = request.url.includes("catalogo");
    const shell = isCatalog
      ? (await caches.match("./catalogo.html") || await caches.match("./index.html") || await caches.match("./"))
      : (await caches.match("./index.html") || await caches.match("./") || await caches.match("./catalogo.html"));

    if (shell) return shell;
  }

  // 2. Busca recursos estáticos (imágenes, scripts, css) en caché
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // 3. Si no está en caché, solicita el recurso a la red
    const networkResponse = await fetch(request);

    // Guarda dinámicamente en caché los recursos solicitados válidos
    if (networkResponse.ok && networkResponse.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // 4. Fallback de emergencia si la red falla durante la navegación
    if (request.mode === "navigate") {
      const fallback = await caches.match("./index.html") || await caches.match("./");
      if (fallback) return fallback;
    }

    throw error;
  }
}

// Evento Fetch: Intercepta todas las peticiones de red que hace la aplicacion.
self.addEventListener("fetch", (event) => {
  // Ignora peticiones que no sean GET (como POST o PUT)
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // Ignora peticiones hacia servidores o dominios externos
  if (requestUrl.origin !== self.location.origin) return;

  // Responde a la peticion usando la estrategia Cache First con guardado dinamico
  event.respondWith(cacheFirst(event.request));
});

// Abre el mismo almacenamiento de acciones pendientes que utiliza la pagina.
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Marca como sincronizadas las acciones de demostracion que siguen pendientes.
async function processPendingActions() {
  // Accede a la base de datos compartida con pwa-demo.js.
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    // La transaccion de lectura y escritura permite consultar y actualizar cada accion.
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    let processed = 0;

    request.onsuccess = () => {
      // Selecciona unicamente las acciones que todavia no han sido sincronizadas.
      request.result
        .filter((action) => action.estado === "pendiente")
        .forEach((action) => {
          // Conserva la accion en IndexedDB, pero actualiza su estado y fecha.
          store.put({
            ...action,
            estado: "sincronizada",
            sincronizadaEn: new Date().toISOString()
          });
          processed += 1;
        });
    };

    transaction.oncomplete = () => {
      // Devuelve la cantidad de acciones procesadas para mostrarla en la interfaz.
      database.close();
      resolve(processed);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

// Background Sync procesa la cola cuando el navegador recupera conectividad.
self.addEventListener("sync", (event) => {
  // Ignora otras tareas de sincronizacion que no pertenezcan a esta practica.
  if (event.tag !== SYNC_TAG) return;

  // waitUntil mantiene activo el Service Worker hasta terminar el proceso.
  event.waitUntil(
    processPendingActions().then(async (processed) => {
      // Busca todas las ventanas abiertas de la PWA.
      const openClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Informa a la interfaz que la sincronizacion termino correctamente.
      openClients.forEach((client) => client.postMessage({ type: "SYNC_COMPLETE", processed }));
    })
  );
});

// Al pulsar la notificacion, enfoca la PWA abierta o abre su pagina principal.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const mainUrl = event.notification.data?.url || new URL("./", self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (openClients) => {
      const appClient = openClients.find((client) => new URL(client.url).origin === self.location.origin);
      if (appClient) return appClient.focus();
      return self.clients.openWindow(mainUrl);
    })
  );
});
