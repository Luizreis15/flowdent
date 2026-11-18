import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { isSiteDomain } from "./config/domains";
import "./index.css";

const Landing = lazy(() => import("./pages/Landing"));
const App = lazy(() => import("./App"));
const isPublicHome = isSiteDomain() && window.location.pathname === "/";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Suspense fallback={<p role="status">Carregando Flowdent…</p>}>
      {isPublicHome ? <BrowserRouter><Landing /></BrowserRouter> : <App />}
    </Suspense>
  </ErrorBoundary>,
);
