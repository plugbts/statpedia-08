import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug logging
console.log("🚀 Main.tsx: Starting app initialization");
console.log("🚀 Main.tsx: Root element:", document.getElementById("root"));

// Ensure root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("❌ Root element not found!");
  document.body.innerHTML = `
    <div style="
      min-height: 100vh; 
      background-color: #0a0a0a; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      color: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div>Error: Root element not found</div>
    </div>
  `;
} else {
  console.log("✅ Root element found, creating React root");
  try {
    const root = createRoot(rootElement);
    console.log("✅ React root created, rendering App");
    root.render(<App />);
    console.log("✅ App rendered successfully");
  } catch (error) {
    console.error("❌ Error creating React root or rendering App:", error);
    rootElement.innerHTML = `
      <div style="
        min-height: 100vh; 
        background-color: #0a0a0a; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        color: #f5f5f5;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div>Error: Failed to render app - ${error.message}</div>
      </div>
    `;
  }
}
