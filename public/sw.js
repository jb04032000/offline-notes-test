const CACHE_NAME = "offline-notes-cache-v1";
const OFFLINE_REQUESTS_DB = "offlineRequestsDB";
const OFFLINE_REQUESTS_STORE = "requests";
const API_URLS = ["/api/save-note", "/api/edit-note", "/api/delete-note"];

// Cacheable assets for offline UI
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/_next/static/chunks/main.js",
  "/_next/static/chunks/webpack.js",
  "/_next/static/chunks/pages/_app.js",
  "/_next/static/chunks/pages/index.js",
  "/_next/static/css/styles.css",
];

// Initialize IndexedDB
function initDatabase() {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(OFFLINE_REQUESTS_DB, 1);

    openRequest.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_REQUESTS_STORE)) {
        db.createObjectStore(OFFLINE_REQUESTS_STORE, { keyPath: "id" });
      }
    };

    openRequest.onsuccess = (event) => {
      resolve(event.target.result);
    };

    openRequest.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Install event: Cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.error("Error caching assets:", error);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Handle GET and POST/DELETE requests
self.addEventListener("fetch", (event) => {
  const { method, url } = event.request;

  if (method === "GET" && !API_URLS.some((apiUrl) => url.includes(apiUrl))) {
    event.respondWith(
      caches
        .match(event.request)
        .then((response) => {
          return (
            response ||
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse.clone());
                });
              }
              return networkResponse;
            })
          );
        })
        .catch(() => {
          return caches.match("/index.html");
        })
    );
  } else if (API_URLS.some((apiUrl) => url.includes(apiUrl))) {
    event.respondWith(handleApiRequest(event.request));
  }
});

// Handle API requests (POST, PUT, DELETE)
async function handleApiRequest(request) {
  try {
    if (navigator.onLine) {
      const response = await fetch(request);
      if (response.ok) {
        return response;
      } else {
        throw new Error(`Request failed: ${response.statusText}`);
      }
    } else {
      await storeOfflineRequest(request);
      return new Response(JSON.stringify({ status: "queued" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    await storeOfflineRequest(request);
    return new Response(
      JSON.stringify({ status: "queued", error: error.message }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Store offline requests in IndexedDB
async function storeOfflineRequest(request) {
  const url = new URL(request.url);
  let noteId;
  if (request.method === "DELETE") {
    noteId = url.searchParams.get("id");
  } else {
    const body = await request.text();
    noteId = body ? JSON.parse(body).localId : null;
  }
  if (!noteId) {
    console.error(
      "storeOfflineRequest: No noteId found for request",
      request.url
    );
    return;
  }
  const requestId = `${request.method}-${noteId}`;
  const requestData = {
    id: requestId,
    method: request.method,
    url: request.url,
    body: request.method !== "DELETE" ? await request.text() : null,
    timestamp: Date.now(),
    noteId,
  };

  try {
    const db = await initDatabase();
    const transaction = db.transaction(OFFLINE_REQUESTS_STORE, "readwrite");
    const store = transaction.objectStore(OFFLINE_REQUESTS_STORE);
    store.put(requestData);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Failed to store offline request:", error);
    throw error;
  }
}

// Sync event: Process queued requests
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notes") {
    event.waitUntil(syncNotes());
  }
});

async function syncNotes() {
  try {
    const db = await initDatabase();
    const transaction = db.transaction(OFFLINE_REQUESTS_STORE, "readwrite");
    const store = transaction.objectStore(OFFLINE_REQUESTS_STORE);
    const requests = await new Promise((resolve, reject) => {
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });

    // Deduplicate requests by noteId and method
    const requestMap = new Map();
    requests.forEach((req) => {
      const key = `${req.noteId}-${req.method}`;
      if (requestMap.has(key)) {
        const existing = requestMap.get(key);
        if (req.timestamp > existing.timestamp) {
          requestMap.set(key, req);
        }
      } else {
        requestMap.set(key, req);
      }
    });
    const dedupedRequests = Array.from(requestMap.values());

    // Sort to prioritize DELETE requests
    dedupedRequests.sort((a, b) => {
      if (a.method === "DELETE" && b.method !== "DELETE") return -1;
      if (b.method === "DELETE" && a.method !== "DELETE") return 1;
      return a.timestamp - b.timestamp;
    });

    for (const req of dedupedRequests) {
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          const fetchOptions = {
            method: req.method,
            headers: { "Content-Type": "application/json" },
            body: req.body || undefined,
          };

          const [response] = await Promise.all([
            fetch(req.url, fetchOptions),
            new Promise((resolve) => setTimeout(resolve, 1000)),
          ]);
          if (!response.ok) {
            throw new Error(
              `Failed to sync request ${req.id}: ${response.statusText}`
            );
          }

          await new Promise((resolve, reject) => {
            const deleteRequest = store.delete(req.id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
          break;
        } catch (error) {
          attempts++;
          console.error(
            `Service Worker: Error syncing request ${req.id} (attempt ${attempts}/${maxAttempts}):`,
            error
          );
          if (attempts >= maxAttempts) {
            console.error(
              `Service Worker: Max attempts reached for request ${req.id}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({ type: "SYNC_NOTES" });
    }
  } catch (error) {
    console.error("Service Worker: Error syncing notes:", error);
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({ type: "SYNC_FAILED", error: error.message });
    }
  }
}
