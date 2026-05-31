// ── SECURITY BLOCK: Admin Registration Disabled ──
// This script should never be loaded in production.
// The Express server returns 403 for this file.
// This guard is a final safety fallback only.
(function() {
  'use strict';
  alert('Admin registration is not allowed. This page has been disabled.');
  // Prevent the rest of the script from executing
  throw new Error('[SECURITY] Admin registration is permanently disabled. Access denied.');
})();

// ── Face Recognition Import Begin ──
import { FaceRecognition } from './faceRecognition.js';
// ── Face Recognition Import End ──

const registerForm = document.getElementById('registerForm');
const msgDiv = document.getElementById('msg');
const faceSection = document.getElementById('faceSection');

let currentAdminId = null;

registerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('name').value;
  const voter_id = document.getElementById('voter-id').value;
  const password = document.getElementById('password').value;
  const admin_passcode = document.getElementById('admin-passcode').value;

  if (msgDiv) msgDiv.innerHTML = "Creating admin account...";

  const body = {
    name: name,
    voter_id: voter_id,
    password: password,
    admin_passcode: admin_passcode
  };

  fetch(`http://${window.location.hostname === '192.168.137.1' ? '192.168.137.1' : '127.0.0.1'}:8000/register-admin`, {
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
    currentAdminId = voter_id;
    if (msgDiv) {
      msgDiv.innerHTML = `<p style="color: #10b981; margin-top: 10px;">Admin account created! Now please register your face below.</p>`;
    }
    // Hide form, show face registration
    registerForm.style.display = 'none';
    if (faceSection) faceSection.style.display = 'block';

    // ── Face Recognition Flow Begin ──
    FaceRecognition.register(currentAdminId)
      .then(faceResult => {
        if (msgDiv) {
          msgDiv.innerHTML = `<p style="color: #10b981; margin-top: 10px;">Face registered successfully! Redirecting to login...</p>`;
        }
        setTimeout(() => {
            window.location.replace('./adminLogin.html');
        }, 2000);
      })
      .catch(faceErr => {
        if (msgDiv) {
          msgDiv.innerHTML = `<p style="color: #ef4444; margin-top: 10px;">Face registration failed: ${faceErr.message}. You can retry or go to login.</p>`;
        }
        // Let them proceed to login or retry
        setTimeout(() => {
            window.location.replace('./adminLogin.html');
        }, 3000);
      });
    // ── Face Recognition Flow End ──
  })
  .catch(error => {
    console.error('Admin registration failed:', error.message);
    if (msgDiv) {
      msgDiv.innerHTML = `<p style="color: #ef4444; margin-top: 10px;">${error.message}</p>`;
    }
  });
});
