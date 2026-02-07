import { hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const dehydratedState = (window as any).__REACT_QUERY_STATE__;

hydrateRoot(
  document.getElementById("root")!,
  <App dehydratedState={dehydratedState} />
);
