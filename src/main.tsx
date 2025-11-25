import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerFirebaseServiceWorker } from "./lib/firebase";

// Register service worker and send config when ready
registerFirebaseServiceWorker()
  .then((registration) => {
    if (registration) {
      // Wait for service worker to be ready, then send config
      if (registration.active) {
        // Service worker is already active
        setTimeout(() => {
          registration.active?.postMessage({
            type: 'FIREBASE_CONFIG',
            config: {
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
              authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
              projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
              storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
              messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
              appId: import.meta.env.VITE_FIREBASE_APP_ID,
            },
          });
        }, 1000);
      } else if (registration.installing) {
        registration.installing.addEventListener('statechange', () => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'FIREBASE_CONFIG',
              config: {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID,
              },
            });
          }
        });
      }
    }
  })
  .catch((error) => {
    console.error("Failed to register Firebase service worker:", error);
  });

createRoot(document.getElementById("root")!).render(<App />);
