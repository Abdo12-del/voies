import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/tajawal/arabic-400.css";
import "@fontsource/tajawal/arabic-500.css";
import "@fontsource/tajawal/arabic-700.css";
import "@fontsource/tajawal/latin-400.css";
import "@fontsource/tajawal/latin-700.css";
import "@fontsource/baloo-bhaijaan-2/arabic-600.css";
import "@fontsource/baloo-bhaijaan-2/arabic-800.css";
import "@fontsource/baloo-bhaijaan-2/latin-600.css";
import "@fontsource/baloo-bhaijaan-2/latin-800.css";
import "./styles.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
