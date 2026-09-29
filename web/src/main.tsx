import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./theme/tokens.css";
import "./theme/motion.css";
import "./theme/ui.css";
import "./theme/creatures.css";
import "./theme/station.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
