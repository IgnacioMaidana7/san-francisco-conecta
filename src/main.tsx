import React from "react";
import ReactDOM from "react-dom/client";
import { setupIonicReact } from "@ionic/react";
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import App from "./App";
import { createRepository } from "./services";
import "./styles.css";
setupIonicReact({ mode: "md" });
const root = ReactDOM.createRoot(document.getElementById("root")!);
try {
  const repo = createRepository();
  root.render(
    <React.StrictMode>
      <App repo={repo} />
    </React.StrictMode>,
  );
} catch (error) {
  root.render(
    <main className="login-wrap">
      <h1>Revisá la configuración</h1>
      <p role="alert">
        {error instanceof Error
          ? error.message
          : "No se pudo abrir el almacenamiento del navegador."}
      </p>
      <p>
        El archivo .env.example incluye las opciones para iniciar en modo demo.
      </p>
    </main>,
  );
}
