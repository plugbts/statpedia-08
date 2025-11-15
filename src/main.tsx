import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "@/components/ErrorFallback";

// 🔍 DEBUG: Log main.tsx execution
console.log("🎬 [MAIN_DEBUG] main.tsx executing...");
console.log("🎬 [MAIN_DEBUG] About to render React app...");

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
  </ErrorBoundary>,
);

console.log("✅ [MAIN_DEBUG] React render call completed");

// 🔍 DEBUG: Add timeout to detect hanging
setTimeout(() => {
  console.log("⏱️  [MAIN_DEBUG] 5 seconds elapsed - checking if app loaded");
  const root = document.getElementById("root");
  if (root && root.children.length === 0) {
    console.error("❌ [MAIN_DEBUG] ROOT IS EMPTY AFTER 5 SECONDS!");
  } else {
    console.log("✅ [MAIN_DEBUG] Root has children:", root?.children.length);
  }
}, 5000);
