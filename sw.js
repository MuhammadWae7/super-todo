const CACHE_NAME = "task-planner-v4";
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap",
];

// Install event - cache initial resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Force activation
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Force clients to update
        self.clients.claim();
        // Reload all open pages
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
      })
  );
});

// Fetch event - serve cached content or fetch new
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      // Make network request
      return fetch(fetchRequest)
        .then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the fetched response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Return offline fallback for HTML requests
          if (event.request.headers.get("accept").includes("text/html")) {
            return new Response(
              `
                            <!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Offline - Weekly Task Planner</title>
                                <style>
                                    body {
                                        font-family: system-ui, -apple-system, sans-serif;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        height: 100vh;
                                        margin: 0;
                                        background: #f8f9fd;
                                        color: #2d3436;
                                    }
                                    .offline-message {
                                        text-align: center;
                                        padding: 2rem;
                                        background: white;
                                        border-radius: 12px;
                                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                                    }
                                    h1 { color: #6c5ce7; }
                                </style>
                            </head>
                            <body>
                                <div class="offline-message">
                                    <h1>You're Offline</h1>
                                    <p>Please check your internet connection and try again.</p>
                                </div>
                            </body>
                            </html>
                            `,
              {
                headers: {
                  "Content-Type": "text/html",
                  "Cache-Control": "no-store",
                },
              }
            );
          }
          return new Response("Offline content not available.");
        });
    })
  );
});
