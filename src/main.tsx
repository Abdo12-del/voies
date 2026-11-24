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
import "./map.css";
import "./map-responsive.css";
import "./classroom.css";
import "./city-map.css";
import App from "./App";
import { initializeClassroom } from "./lib/classroom";
import { initializeProgress } from "./lib/progress";

initializeProgress();
initializeClassroom();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
