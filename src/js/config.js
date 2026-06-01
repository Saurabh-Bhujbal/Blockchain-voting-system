export function getBackendUrl() {
  // Check URL query parameters for override
  const urlParams = new URLSearchParams(window.location.search);
  const backendParam = urlParams.get('backend');
  if (backendParam) {
    localStorage.setItem('backendUrl', backendParam);
  }

  const saved = localStorage.getItem('backendUrl');
  if (saved) return saved.replace(/\/$/, ""); // Strip trailing slash

  // ── PRODUCTION: Use deployed Render backend ──
  return "https://blockchain-voting-system-2-hkad.onrender.com";
}
