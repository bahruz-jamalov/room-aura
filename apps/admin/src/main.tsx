import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@room-aura/ui/tokens.css";
import App from "./App";

document.documentElement.setAttribute("data-app", "admin");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
