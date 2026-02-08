import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root")!;
createRoot(root).render(<App />);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    root.classList.add("hydrated");
  });
});
