// ============================================================
// FACE RECOGNITION MODULE (Client-Side face-api.js Version)
// Follows the same export pattern as biometrics.js
// Provides .register() and .login() methods for face auth
// ============================================================

import { getBackendUrl } from './config.js';

export const FaceRecognition = {

    _modelsLoaded: false,

    // ── Internal: Load face-api.js models from CDN ──
    _loadModels: async (statusEl) => {
        if (FaceRecognition._modelsLoaded) return;
        const originalText = statusEl ? statusEl.textContent : "";
        if (statusEl) statusEl.textContent = "Loading face detection models (please wait)...";
        try {
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            FaceRecognition._modelsLoaded = true;
            if (statusEl) statusEl.textContent = originalText;
        } catch (err) {
            console.error("Failed to load face-api.js models:", err);
            throw new Error("Could not load face detection models. Please check your internet connection.");
        }
    },

    // ── Internal: Start webcam and attach to video element ──
    _startCamera: async (videoElement) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            await videoElement.play();
            return stream;
        } catch (err) {
            console.error("Camera access failed:", err);
            throw new Error("Could not access webcam. Please allow camera permissions.");
        }
    },

    // ── Internal: Stop all tracks of a media stream ──
    _stopCamera: (stream) => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    },

    // ── Register a voter's face ──
    register: async (voterId, opts = {}) => {
        const videoEl = document.getElementById(opts.videoId || 'face-preview');
        const statusEl = document.getElementById(opts.statusId || 'face-status');
        const captureBtn = document.getElementById(opts.captureBtnId || 'faceCaptureBtn');

        if (!videoEl) throw new Error("Face preview element not found");

        let stream = null;
        let loadingOverlay = null;

        try {
            // Load models first
            await FaceRecognition._loadModels(statusEl);

            if (statusEl) statusEl.textContent = "Starting camera...";
            stream = await FaceRecognition._startCamera(videoEl);
            if (statusEl) statusEl.textContent = "Camera ready. Position your face and click Capture.";

            // Wait for user to click capture button and extract descriptor
            const descriptorArray = await new Promise((resolve, reject) => {
                const handler = async () => {
                    captureBtn.removeEventListener('click', handler);
                    if (statusEl) statusEl.textContent = "Detecting face and extracting features...";
                    try {
                        const detection = await faceapi.detectSingleFace(videoEl)
                            .withFaceLandmarks()
                            .withFaceDescriptor();
                        
                        if (!detection) {
                            throw new Error("No face detected. Please ensure your face is clearly visible in the camera and try again.");
                        }
                        resolve(Array.from(detection.descriptor));
                    } catch (e) {
                        reject(e);
                    }
                };
                captureBtn.addEventListener('click', handler);
            });

            // Show loading overlay
            loadingOverlay = videoEl.parentElement.querySelector('.loading-overlay');
            const loadingText = videoEl.parentElement.querySelector('.loading-text-biometric');
            if (loadingOverlay) {
                if (loadingText) loadingText.textContent = "Registering Face...";
                loadingOverlay.classList.add('active');
            }

            // Stop camera after capture
            FaceRecognition._stopCamera(stream);
            stream = null;

            if (statusEl) statusEl.textContent = "Uploading face data to server...";

            const response = await fetch(`${getBackendUrl()}/face/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voter_id: voterId, face_encoding: descriptorArray }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.detail || 'Face registration failed');
            }

            return result;
        } catch (err) {
            if (stream) FaceRecognition._stopCamera(stream);
            console.error("Face registration failed:", err);
            throw err;
        } finally {
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
        }
    },

    // ── Login with face recognition ──
    login: async (voterId) => {
        const videoEl = document.getElementById('face-login-preview');
        const statusEl = document.getElementById('face-login-status');
        const captureBtn = document.getElementById('faceLoginCaptureBtn');

        if (!videoEl) throw new Error("Face login preview element not found");

        let stream = null;
        let loadingOverlay = null;

        try {
            // Load models first
            await FaceRecognition._loadModels(statusEl);

            if (statusEl) statusEl.textContent = "Starting camera...";
            stream = await FaceRecognition._startCamera(videoEl);
            if (statusEl) statusEl.textContent = "Camera ready. Position your face and click Capture.";

            // Wait for user to click capture button and extract descriptor
            const descriptorArray = await new Promise((resolve, reject) => {
                const handler = async () => {
                    captureBtn.removeEventListener('click', handler);
                    if (statusEl) statusEl.textContent = "Detecting face and verifying...";
                    try {
                        const detection = await faceapi.detectSingleFace(videoEl)
                            .withFaceLandmarks()
                            .withFaceDescriptor();
                        
                        if (!detection) {
                            throw new Error("No face detected. Please ensure your face is clearly visible in the camera and try again.");
                        }
                        resolve(Array.from(detection.descriptor));
                    } catch (e) {
                        reject(e);
                    }
                };
                captureBtn.addEventListener('click', handler);
            });

            // Show loading overlay
            loadingOverlay = videoEl.parentElement.querySelector('.loading-overlay');
            const loadingText = videoEl.parentElement.querySelector('.loading-text-biometric');
            if (loadingOverlay) {
                if (loadingText) loadingText.textContent = "Verifying Face...";
                loadingOverlay.classList.add('active');
            }

            // Stop camera after capture
            FaceRecognition._stopCamera(stream);
            stream = null;

            if (statusEl) statusEl.textContent = "Verifying facial features...";

            const response = await fetch(`${getBackendUrl()}/face/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voter_id: voterId, face_encoding: descriptorArray }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.detail || 'Face authentication failed');
            }

            return result;
        } catch (err) {
            if (stream) FaceRecognition._stopCamera(stream);
            console.error("Face login failed:", err);
            throw err;
        } finally {
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
        }
    }
};
