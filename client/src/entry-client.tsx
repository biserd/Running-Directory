import { createRoot, hydrateRoot } from "react-dom/client";
import type { DehydratedState } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const { __REACT_QUERY_STATE__: dehydratedState } = window as Window & {
  __REACT_QUERY_STATE__?: DehydratedState;
};
const root = document.getElementById("root")!;
const app = <App dehydratedState={dehydratedState} />;

if (root.hasChildNodes()) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
