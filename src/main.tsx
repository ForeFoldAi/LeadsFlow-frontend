import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerFirebaseServiceWorker } from "./lib/firebase";

registerFirebaseServiceWorker().catch((error) => {
  console.error("Failed to register Firebase service worker:", error);
});

createRoot(document.getElementById("root")!).render(<App />);
