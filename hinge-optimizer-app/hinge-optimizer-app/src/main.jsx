import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { installStorage } from "./storage.js";

installStorage();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // L'app fonctionne même si le service worker échoue à s'enregistrer,
      // elle ne sera juste pas installable hors-ligne.
    });
  });
}
