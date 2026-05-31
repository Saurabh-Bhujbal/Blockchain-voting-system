// ── Face Recognition Import Begin ──
import { FaceRecognition } from './faceRecognition.js';
import { getBackendUrl } from './config.js';
// ── Face Recognition Import End ──

const loginForm = document.getElementById('loginForm');
const msgDiv = document.getElementById('msg');
const faceLoginSection = document.getElementById('face-login-section');
const stepIndicator = document.getElementById('login-step-indicator');

// Determine expected role based on the page
const isVoterPage = window.location.pathname.includes('voterLogin.html') || window.location.pathname === '/';
const expectedRole = isVoterPage ? 'user' : 'admin';

// Variable to hold voter_id across both steps
let verifiedVoterId = null;

// ── Step 1: Password verification ──
loginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const voter_id = document.getElementById('voter-id').value;
  const password = document.getElementById('password').value;
  const token = voter_id;

  if (msgDiv) msgDiv.innerHTML = "Authenticating...";

  const headers = {
    'method': "GET",
    'Authorization': `Bearer ${token}`,
  };

  fetch(`${getBackendUrl()}/login?voter_id=${voter_id}&password=${password}&expected_role=${expectedRole}`, { headers })
  .then(async response => {
    if (response.ok) {
      return response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }
  })
  .then(data => {
    if (data.status === 'password_verified') {
      // ── Both Admin & Voter: Proceed to Step 2 (Face Recognition) ──
      verifiedVoterId = voter_id;

      // Hide the password form, reveal face capture section
      loginForm.style.display = 'none';
      if (faceLoginSection) faceLoginSection.style.display = 'block';
      if (stepIndicator) stepIndicator.textContent = 'Step 2 of 2: Verify your face';
      if (msgDiv) msgDiv.innerHTML = '';

      // Automatically start the webcam
      initFaceVerification();
    }
  })
  .catch(error => {
    console.error('Login failed:', error.message);
    if (msgDiv) {
      msgDiv.innerHTML = `<p style="color: #ef4444; margin-top: 10px;">${error.message}</p>`;
    }
  });
});

// ── Step 2: Face verification (only after password passes) ──
async function initFaceVerification() {
  try {
    const data = await FaceRecognition.login(verifiedVoterId);

    if (data.token) {
      if (msgDiv) msgDiv.innerHTML = `<p style="color: #10b981; margin-top: 10px;">✅ Face verified! Redirecting...</p>`;
      
      if (data.role === 'admin') {
        localStorage.setItem('jwtTokenAdmin', data.token);
        window.location.replace(`./admin.html?Authorization=Bearer ${localStorage.getItem('jwtTokenAdmin')}`);
      } else {
        localStorage.setItem('jwtTokenVoter', data.token);
        window.location.replace(`./index.html?Authorization=Bearer ${localStorage.getItem('jwtTokenVoter')}`);
      }
    }
  } catch (err) {
    const faceStatus = document.getElementById('face-login-status');
    if (faceStatus) faceStatus.textContent = '';

    // ── If face not registered yet, switch to enrollment mode ──
    if (err.message && err.message.toLowerCase().includes('face not registered')) {
      if (msgDiv) msgDiv.innerHTML = '';
      initFaceEnrollment();
      return;
    }

    if (msgDiv) msgDiv.innerHTML = `<p style="color: #ef4444; margin-top: 10px;">${err.message}</p>`;

    // Allow retry of face capture only
    const retryBtn = document.getElementById('faceLoginRetryBtn');
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = () => {
        retryBtn.style.display = 'none';
        if (msgDiv) msgDiv.innerHTML = '';
        initFaceVerification();
      };
    }
  }
}

// ── Face Enrollment: triggered if face is not yet registered ──
async function initFaceEnrollment() {
  const stepIndicatorEl = document.getElementById('login-step-indicator');
  const captureBtn = document.getElementById('faceLoginCaptureBtn');
  const faceStatus = document.getElementById('face-login-status');

  if (stepIndicatorEl) stepIndicatorEl.textContent = 'Step 2 of 2: Register your face (first-time setup)';
  if (captureBtn) captureBtn.textContent = '📸 Capture & Register Face';
  if (faceStatus) faceStatus.textContent = 'No face on file. Please register your face to enable face login.';

  try {
    await FaceRecognition.register(verifiedVoterId, {
      videoId: 'face-login-preview',
      statusId: 'face-login-status',
      captureBtnId: 'faceLoginCaptureBtn'
    });


    if (faceStatus) faceStatus.textContent = '✅ Face registered! Verifying now...';
    if (captureBtn) {
      captureBtn.textContent = '📸 Capture & Verify Face';
    }
    if (stepIndicatorEl) stepIndicatorEl.textContent = 'Step 2 of 2: Verify your face';

    // After enrollment, immediately run face verification
    await initFaceVerification();

  } catch (err) {
    if (faceStatus) faceStatus.textContent = '';
    if (msgDiv) msgDiv.innerHTML = `<p style="color: #ef4444; margin-top: 10px;">Face enrollment failed: ${err.message}</p>`;

    const retryBtn = document.getElementById('faceLoginRetryBtn');
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = () => {
        retryBtn.style.display = 'none';
        if (msgDiv) msgDiv.innerHTML = '';
        initFaceEnrollment();
      };
    }
  }
}

// Dynamic backend server configuration helper
const configLink = document.getElementById('configBackendLink');
if (configLink) {
  configLink.addEventListener('click', (e) => {
    e.preventDefault();
    const current = localStorage.getItem('backendUrl') || `http://${window.location.hostname === '192.168.137.1' ? '192.168.137.1' : '127.0.0.1'}:8000`;
    const url = prompt("Enter Backend Server API URL (e.g. your Laptop's Local IP or HTTPS Tunnel):\n\nCurrently connected to:", current);
    if (url !== null) {
      const cleanUrl = url.trim();
      if (cleanUrl) {
        localStorage.setItem('backendUrl', cleanUrl);
        alert(`Server URL updated successfully!\n\nNew target: ${cleanUrl}`);
      } else {
        localStorage.removeItem('backendUrl');
        alert("Server URL reset to dynamic fallback.");
      }
      window.location.reload();
    }
  });
}
