// Configuracion de IndexedDB: nombre de la base, version, almacen y etiqueta de sincronizacion.
const DB_NAME = "techvolt-pwa";
const DB_VERSION = 1;
const STORE_NAME = "acciones";
const SYNC_TAG = "sincronizar-pedidos";

// Abre IndexedDB y crea el almacen de acciones la primera vez que se utiliza.
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

// Guarda temporalmente una accion para que pueda sincronizarse mas adelante.
async function savePendingAction(action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(action);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

// Busca las acciones pendientes y cambia su estado a "sincronizada".
async function processPendingActions() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    let processed = 0;

    request.onsuccess = () => {
      request.result
        .filter((action) => action.estado === "pendiente")
        .forEach((action) => {
          store.put({
            ...action,
            estado: "sincronizada",
            sincronizadaEn: new Date().toISOString()
          });
          processed += 1;
        });
    };

    transaction.oncomplete = () => {
      database.close();
      resolve(processed);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

function updateText(selector, text, state = "") {
  const element = document.querySelector(selector);
  if (!element) return;
  element.textContent = text;
  if (state) element.dataset.state = state;
  else delete element.dataset.state;
}

function showResult(message, state = "") {
  updateText("#pwa-result", message, state);
}

function updateConnectionStatus() {
  updateText(
    "#connection-status",
    navigator.onLine ? "Con conexión" : "Sin conexión",
    navigator.onLine ? "success" : "warning"
  );
}

function updateNotificationStatus() {
  if (!("Notification" in window)) {
    updateText("#notification-status", "No compatible", "error");
    return;
  }

  const labels = { granted: "Autorizadas", denied: "Rechazadas", default: "No autorizadas" };
  const states = { granted: "success", denied: "error", default: "warning" };
  updateText("#notification-status", labels[Notification.permission], states[Notification.permission]);
}

// Actualiza en la interfaz el estado del Service Worker.
async function updateServiceWorkerStatus() {
  if (!("serviceWorker" in navigator)) {
    updateText("#sw-status", "No compatible", "error");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const active = registration?.active || navigator.serviceWorker.controller;
    updateText("#sw-status", active ? "Activo" : "Registrando…", active ? "success" : "warning");
  } catch {
    updateText("#sw-status", "Error de registro", "error");
  }
}

// Solicita permiso y muestra una notificacion mediante el Service Worker.
async function enableNotifications() {
  if (!("Notification" in window)) {
    showResult("Este navegador no soporta la API de notificaciones.", "error");
    updateNotificationStatus();
    return;
  }

  if (!("serviceWorker" in navigator)) {
    showResult("No se puede mostrar la notificación porque el navegador no admite Service Workers.", "error");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const wasAlreadyGranted = Notification.permission === "granted";
    // Abre la solicitud de permiso solamente si el usuario aun no lo ha concedido.
    const permission = wasAlreadyGranted ? "granted" : await Notification.requestPermission();
    updateNotificationStatus();

    if (permission === "denied") {
      showResult("Permiso rechazado. Puedes cambiarlo desde la configuración del navegador.", "error");
      return;
    }
    if (permission !== "granted") {
      showResult("No se concedió permiso para mostrar notificaciones.", "warning");
      return;
    }

    // Muestra la notificacion local desde el registro del Service Worker.
    await registration.showNotification("Ecommerce PWA", {
      body: "¡Notificaciones activadas correctamente!",
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      tag: "techvolt-notifications-enabled",
      data: { url: registration.scope }
    });

    showResult(
      wasAlreadyGranted
        ? "El permiso ya estaba concedido. Se mostró una notificación de prueba."
        : "Permiso concedido. Se mostró una notificación de prueba.",
      "success"
    );
  } catch (error) {
    console.error("No se pudo mostrar la notificación:", error);
    showResult("Ocurrió un error al intentar mostrar la notificación.", "error");
  }
}

// Crea un pedido de prueba y demuestra Background Sync o su alternativa.
async function testBackgroundSync() {
  if (!("indexedDB" in window)) {
    showResult("Este navegador no permite guardar acciones en IndexedDB.", "error");
    return;
  }

  const action = {
    id: Date.now(),
    accion: "pedido-prueba",
    estado: "pendiente",
    creadaEn: new Date().toISOString()
  };

  try {
    await savePendingAction(action);
    updateText("#sync-status", "Acción pendiente", "warning");

    // Comprueba si el navegador incluye la API Background Sync.
    const supportsBackgroundSync = "SyncManager" in window;
    if (supportsBackgroundSync && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      // Registra la tarea que despues recibira el evento "sync" en el Service Worker.
      await registration.sync.register(SYNC_TAG);
      showResult(
        navigator.onLine
          ? "Acción guardada. El Service Worker procesará la sincronización."
          : "Acción guardada sin conexión. Se sincronizará cuando regrese Internet.",
        "warning"
      );
      return;
    }

    if (navigator.onLine) {
      const processed = await processPendingActions();
      updateText("#sync-status", "Sincronizada (fallback)", "success");
      showResult(`Background Sync no está disponible. El fallback sincronizó ${processed} acción(es).`, "success");
    } else {
      showResult("Acción guardada. El fallback la procesará cuando regrese la conexión.", "warning");
    }
  } catch (error) {
    console.error("No se pudo preparar la sincronización:", error);
    updateText("#sync-status", "Error", "error");
    showResult("No se pudo guardar o registrar la acción de sincronización.", "error");
  }
}

// Al recuperar Internet, procesa la cola si Background Sync no esta disponible.
async function handleOnline() {
  updateConnectionStatus();

  if (!("SyncManager" in window) && "indexedDB" in window) {
    try {
      const processed = await processPendingActions();
      if (processed > 0) {
        updateText("#sync-status", "Sincronizada (fallback)", "success");
        showResult(`Conexión recuperada: ${processed} acción(es) sincronizada(s).`, "success");
      }
    } catch (error) {
      console.error("Falló la sincronización alternativa:", error);
      showResult("Regresó la conexión, pero no se pudieron procesar las acciones pendientes.", "error");
    }
  }
}

function refreshVisibleStatus() {
  updateConnectionStatus();
  updateNotificationStatus();
  updateServiceWorkerStatus();
}

// Inicializa los estados y conecta los botones con las funciones de la demostracion.
export function initializePwaDemo() {
  refreshVisibleStatus();
  document.addEventListener("techvolt:route-rendered", refreshVisibleStatus);
  document.addEventListener("click", (event) => {
    if (event.target.closest("#enable-notifications")) enableNotifications();
    if (event.target.closest("#test-sync")) testBackgroundSync();
  });

  // Estos eventos actualizan la interfaz cuando la conexion cambia.
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", updateConnectionStatus);
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type !== "SYNC_COMPLETE") return;
    updateText("#sync-status", "Sincronizada", "success");
    showResult(`El Service Worker sincronizó ${event.data.processed} acción(es).`, "success");
  });

  navigator.serviceWorker?.ready.then(updateServiceWorkerStatus).catch(() => {
    updateText("#sw-status", "Error de registro", "error");
  });
}
