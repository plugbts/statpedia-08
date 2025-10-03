// Test if we can access the DOM at all
console.log("=== SCRIPT START ===");
console.log("Document ready state:", document.readyState);
console.log("Window loaded:", window);

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  console.log("DOM still loading, waiting...");
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, attempting render...");
    renderContent();
  });
} else {
  console.log("DOM already ready, attempting render...");
  renderContent();
}

function renderContent() {
  console.log("=== RENDER FUNCTION START ===");
  const rootElement = document.getElementById("root");
  console.log("Root element:", rootElement);
  
  if (rootElement) {
    console.log("Root element found, rendering content...");
    rootElement.innerHTML = `
      <div style="padding: 20px; color: white; background: black; min-height: 100vh;">
        <h1>DOM Ready Test</h1>
        <p>If you see this, the script is working!</p>
        <p>Current time: ${new Date().toLocaleTimeString()}</p>
        <button onclick="alert('Button clicked!')" style="padding: 10px 20px; font-size: 16px; margin: 10px;">
          Test Button
        </button>
      </div>
    `;
    console.log("Content rendered successfully");
  } else {
    console.error("Root element not found!");
  }
  console.log("=== RENDER FUNCTION END ===");
}

console.log("=== SCRIPT END ===");
