// ── Face Recognition Import Begin ──
import { FaceRecognition } from './faceRecognition.js';
// ── Face Recognition Import End ──

const registerForm = document.getElementById('registerForm');
const msgDiv = document.getElementById('msg');
// ── Face Recognition Element Begin ──
const faceSection = document.getElementById('faceSection');
// ── Face Recognition Element End ──

let currentVoterId = null;

registerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('name').value;
  const voter_id = document.getElementById('voter-id').value;
  const password = document.getElementById('password').value;

  if (msgDiv) msgDiv.innerHTML = "Creating account...";

  const body = {
    name: name,
    voter_id: voter_id,
    password: password
  };

  fetch(`http://${window.location.hostname === '192.168.137.1' ? '192.168.137.1' : '127.0.0.1'}:8000/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  .then(async response => {
    if (response.ok) {
      return response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Registration failed');
    }
  })
  .then(data => {
    currentVoterId = voter_id;
    if (msgDiv) {
      msgDiv.innerHTML = `<p style="color: #10b981; margin-top: 10px;">Account created! Now please register your face below.</p>`;
    }
    // Hide form, show face registration
    registerForm.style.display = 'none';
    faceSection.style.display = 'block';

    // ── Face Recognition Flow Begin ──
    FaceRecognition.register(currentVoterId)
      .then(faceResult => {
        msgDiv.innerHTML = `<p style="color: #10b981; margin-top: 10px;">Face registered successfully! Redirecting to login...</p>`;
        setTimeout(() => {
            window.location.replace('./voterLogin.html');
        }, 2000);
      })
      .catch(faceErr => {
        msgDiv.innerHTML = `<p style="color: #ef4444; margin-top: 10px;">Face registration failed: ${faceErr.message}. You can still login with password.</p>`;
        setTimeout(() => {
            window.location.replace('./voterLogin.html');
        }, 3000);
      });
    // ── Face Recognition Flow End ──
  })
  .catch(error => {
    console.error('Registration failed:', error.message);
    if (msgDiv) {
      msgDiv.innerHTML = `<p style="color: #ef4444; margin-top: 10px;">${error.message}</p>`;
    }
  });
});
