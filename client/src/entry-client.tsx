import { hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const dehydratedState = (window as any).__REACT_QUERY_STATE__;
const root = document.getElementById("root")!;

hydrateRoot(
  root,
  <App dehydratedState={dehydratedState} />
);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    root.classList.add("hydrated");
  });
});
