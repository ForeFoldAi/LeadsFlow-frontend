import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/web-push";

// Register service worker for web push notifications
if ('serviceWorker' in navigator) {
  registerServiceWorker()
    .then((registration) => {
      if (registration) {
        console.log('[Main] Service worker registered successfully');
      }
    })
    .catch((error) => {
      console.error("[Main] Failed to register service worker:", error);
    });
}

createRoot(document.getElementById("root")!).render(<App />);
