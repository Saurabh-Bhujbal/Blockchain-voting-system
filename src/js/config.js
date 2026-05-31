export function getBackendUrl() {
  // Check URL query parameters for override
  const urlParams = new URLSearchParams(window.location.search);
  const backendParam = urlParams.get('backend');
  if (backendParam) {
    localStorage.setItem('backendUrl', backendParam);
  }

  const saved = localStorage.getItem('backendUrl');
  if (saved) return saved.replace(/\/$/, ""); // Strip trailing slash if present

  // Dynamic fallback based on hostname
  const hostIp = (window.location.hostname === '192.168.137.1') ? '192.168.137.1' : '127.0.0.1';
  return `http://${hostIp}:8000`;
}
