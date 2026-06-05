// ============================================================
// FACE RECOGNITION MODULE (Client-Side face-api.js Version)
// Follows the same export pattern as biometrics.js
// Provides .register() and .login() methods for face auth
// ============================================================

import { getBackendUrl } from './config.js';

export const FaceRecognition = {

    _modelsLoaded: false,
    _processing: false,

    // ── Internal: Wait until video element has actual frame data ──
    _waitForVideoReady: (videoEl, timeoutMs = 5000) => {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                if (videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                    resolve();
                } else if (Date.now() - start > timeoutMs) {
                    reject(new Error('Camera timed out. Please try again.'));
                } else {
                    requestAnimationFrame(check);
                }
            };
            check();
        });
    },

    // ── Internal: Attempt face detection with retries ──
    _detectFaceWithRetries: async (videoEl, maxAttempts = 3, delayMs = 500) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const detection = await faceapi.detectSingleFace(videoEl)
                .withFaceLandmarks()
                .withFaceDescriptor();
            if (detection) return detection;
            if (attempt < maxAttempts) {
                console.log(`Face detection attempt ${attempt}/${maxAttempts} found nothing, retrying...`);
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
        return null;
    },

    // ── Internal: Load face-api.js models from CDN ──
    _loadModels: async (statusEl) => {
        if (FaceRecognition._modelsLoaded) return;
        const originalText = statusEl ? statusEl.textContent : "";
        if (statusEl) statusEl.textContent = "Loading face detection models (please wait)...";
        try {
            if (typeof faceapi === 'undefined') {
                throw new Error("Face recognition library (face-api.js) is not loaded. Please check your Content Security Policy.");
            }
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            FaceRecognition._modelsLoaded = true;
            if (statusEl) statusEl.textContent = originalText;
        } catch (err) {
            console.error("Failed to load face-api.js models:", err);
            if (err.message && err.message.includes("face-api.js")) {
                throw err;
            }
            throw new Error("Could not load face detection models. Please check your internet connection.");
        }
    },

    // ── Internal: Start webcam and attach to video element ──
    _startCamera: async (videoElement) => {
        try {
            // Clear any previous stream to ensure clean re-initialization
            if (videoElement.srcObject) {
                videoElement.srcObject.getTracks().forEach(t => t.stop());
                videoElement.srcObject = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
            });
            videoElement.srcObject = stream;
            await videoElement.play();

            // Wait for the video to actually have frame data
            await FaceRecognition._waitForVideoReady(videoElement);

            // Start scanner-line animation once camera is active
            if (videoElement) {
                const scannerLine = videoElement.parentElement?.querySelector('.scanner-line');
                if (scannerLine) {
                    scannerLine.style.animationPlayState = 'running';
                    scannerLine.style.opacity = '1';
                }
            }
            return stream;
        } catch (err) {
            console.error("Camera access failed:", err);
            throw new Error("Could not access webcam. Please allow camera permissions.");
        }
    },

    // ── Internal: Stop all tracks of a media stream ──
    _stopCamera: (stream, videoEl) => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        // Clear the srcObject so re-initialization works cleanly
        if (videoEl) {
            videoEl.srcObject = null;
        }
        // Stop the scanner-line animation so it doesn't keep scanning a black frame
        if (videoEl) {
            const scannerLine = videoEl.parentElement?.querySelector('.scanner-line');
            if (scannerLine) {
                scannerLine.style.animationPlayState = 'paused';
                scannerLine.style.opacity = '0';
            }
        }
    },

    // ── Register a voter's face ──
    register: async (voterId, opts = {}) => {
        if (FaceRecognition._processing) {
            console.warn("FaceRecognition register already in progress.");
            return;
        }
        FaceRecognition._processing = true;

        const videoEl = document.getElementById(opts.videoId || 'face-preview');
        const statusEl = document.getElementById(opts.statusId || 'face-status');
        const captureBtn = document.getElementById(opts.captureBtnId || 'faceCaptureBtn');

        if (!videoEl) {
            FaceRecognition._processing = false;
            throw new Error("Face preview element not found");
        }

        let stream = null;
        let loadingOverlay = null;

        try {
            // Disable button during initialization
            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '⏳ Initializing...';
            }

            // Load models first
            await FaceRecognition._loadModels(statusEl);

            if (statusEl) statusEl.textContent = "Starting camera...";
            stream = await FaceRecognition._startCamera(videoEl);
            if (statusEl) statusEl.textContent = "Camera ready. Position your face and click Capture.";

            // Enable capture button once camera is ready
            if (captureBtn) {
                captureBtn.disabled = false;
                captureBtn.textContent = '📸 Capture & Register Face';
            }

            // Wait for user to click capture button and extract descriptor
            const descriptorArray = await new Promise((resolve, reject) => {
                const handler = async () => {
                    captureBtn.removeEventListener('click', handler);
                    // Disable button immediately to prevent double-clicks
                    if (captureBtn) {
                        captureBtn.disabled = true;
                        captureBtn.textContent = '⏳ Detecting face...';
                    }
                    if (statusEl) statusEl.textContent = "Detecting face and extracting features...";

                    // Show loading overlay immediately to give visual feedback
                    loadingOverlay = videoEl.parentElement.querySelector('.loading-overlay');
                    const loadingText = videoEl.parentElement.querySelector('.loading-text-biometric');
                    if (loadingOverlay) {
                        if (loadingText) loadingText.textContent = "Detecting Face...";
                        loadingOverlay.classList.add('active');
                    }

                    try {
                        // Ensure video is still ready before detection
                        await FaceRecognition._waitForVideoReady(videoEl, 3000);

                        const detection = await FaceRecognition._detectFaceWithRetries(videoEl, 3, 600);
                        
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

            // Stop camera after capture (also stops scanner animation)
            FaceRecognition._stopCamera(stream, videoEl);
            stream = null;

            // Update loading text and button text during server request
            const loadingText = videoEl.parentElement.querySelector('.loading-text-biometric');
            if (loadingText) loadingText.textContent = "Registering Face...";

            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '⏳ Uploading to server...';
            }

            if (statusEl) statusEl.textContent = "Uploading face data to server...";

            const response = await fetch(`${getBackendUrl()}/face/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voter_id: voterId, face_encoding: descriptorArray }),
            });

            const result = await response.json();

            // Remove loading overlay once response is received
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }

            if (!response.ok) {
                throw new Error(result.error || result.detail || 'Face registration failed');
            }

            // Success — show success state
            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '✅ Face Registered!';
            }

            return result;
        } catch (err) {
            if (stream) FaceRecognition._stopCamera(stream, videoEl);
            // Remove loading overlay on error
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
            // Show failure state on button
            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '❌ Registration Failed';
            }
            console.error("Face registration failed:", err);
            throw err;
        } finally {
            FaceRecognition._processing = false;
        }
    },

    // ── Login with face recognition ──
    login: async (voterId) => {
        if (FaceRecognition._processing) {
            console.warn("FaceRecognition login already in progress.");
            return;
        }
        FaceRecognition._processing = true;

        const videoEl = document.getElementById('face-login-preview');
        const statusEl = document.getElementById('face-login-status');
        const captureBtn = document.getElementById('faceLoginCaptureBtn');

        if (!videoEl) {
            FaceRecognition._processing = false;
            throw new Error("Face login preview element not found");
        }

        let stream = null;
        let loadingOverlay = null;

        try {
            // Disable button during initialization
            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '⏳ Initializing...';
            }

            // Load models first
            await FaceRecognition._loadModels(statusEl);

            if (statusEl) statusEl.textContent = "Starting camera...";
            stream = await FaceRecognition._startCamera(videoEl);
            if (statusEl) statusEl.textContent = "Camera ready. Position your face and click Capture.";

            // Enable capture button once camera is ready
            if (captureBtn) {
                captureBtn.disabled = false;
                captureBtn.textContent = '📸 Capture & Verify Face';
            }

            // Wait for user to click capture button and extract descriptor
            const descriptorArray = await new Promise((resolve, reject) => {
                const handler = async () => {
                    captureBtn.removeEventListener('click', handler);
                    // Disable button immediately to prevent double-clicks
                    if (captureBtn) {
                        captureBtn.disabled = true;
                        captureBtn.textContent = '⏳ Verifying face...';
                    }
                    if (statusEl) statusEl.textContent = "Detecting face and verifying...";

                    // Show loading overlay immediately to give visual feedback
                    loadingOverlay = videoEl.parentElement.querySelector('.loading-overlay');
                    const loadingText = videoEl.parentElement.querySelector('.loading-text-biometric');
                    if (loadingOverlay) {
                        if (loadingText) loadingText.textContent = "Detecting Face...";
                        loadingOverlay.classList.add('active');
                    }

                    try {
                        // Ensure video is still ready before detection
                        await FaceRecognition._waitForVideoReady(videoEl, 3000);

                        const detection = await FaceRecognition._detectFaceWithRetries(videoEl, 3, 600);
                        
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

            // Stop camera after capture (also stops scanner animation)
            FaceRecognition._stopCamera(stream, videoEl);
            stream = null;

            // Update loading text and button text during server request
            const loadingText = videoEl.parentElement.querySelector('.loading-text-biometric');
            if (loadingText) loadingText.textContent = "Verifying features...";

            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '⏳ Sending to server...';
            }

            if (statusEl) statusEl.textContent = "Verifying facial features...";

            const response = await fetch(`${getBackendUrl()}/face/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voter_id: voterId, face_encoding: descriptorArray }),
            });

            const result = await response.json();

            // Remove loading overlay once response is received
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }

            if (!response.ok) {
                throw new Error(result.error || result.detail || 'Face authentication failed');
            }

            // Success — keep button disabled (page will redirect)
            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '✅ Verified!';
            }

            return result;
        } catch (err) {
            if (stream) FaceRecognition._stopCamera(stream, videoEl);
            // Remove loading overlay on error
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
            // Keep button disabled — the caller (login.js) will show a retry button
            // which re-invokes this whole flow from scratch
            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '❌ Verification Failed';
            }
            console.error("Face login failed:", err);
            throw err;
        } finally {
            FaceRecognition._processing = false;
        }
    },
    // ── Verify face before voting (same flow as login but resolves true/false) ──
    verify: async (voterId) => {
        if (FaceRecognition._processing) {
            console.warn("FaceRecognition verify already in progress.");
            return false;
        }
        FaceRecognition._processing = true;

        const videoEl   = document.getElementById('face-verify-preview');
        const statusEl  = document.getElementById('face-verify-status');
        const captureBtn = document.getElementById('faceVerifyCaptureBtn');

        if (!videoEl) {
            FaceRecognition._processing = false;
            throw new Error("Face verify preview element not found");
        }

        let stream = null;
        let loadingOverlay = null;

        try {
            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '\u23F3 Initializing Camera...';
            }

            await FaceRecognition._loadModels(statusEl);

            if (statusEl) statusEl.textContent = 'Starting camera...';
            stream = await FaceRecognition._startCamera(videoEl);
            if (statusEl) statusEl.textContent = 'Camera ready. Position your face and click Capture.';

            if (captureBtn) {
                captureBtn.disabled = false;
                captureBtn.innerHTML = '\uD83D\uDCF8 Capture &amp; Verify Face';
            }

            // Wait for user to click capture
            const descriptorArray = await new Promise((resolve, reject) => {
                const handler = async () => {
                    captureBtn.removeEventListener('click', handler);
                    if (captureBtn) {
                        captureBtn.disabled = true;
                        captureBtn.textContent = '\u23F3 Detecting face...';
                    }
                    if (statusEl) statusEl.textContent = 'Detecting and extracting facial features...';

                    loadingOverlay = videoEl.parentElement.querySelector('.loading-overlay');
                    const loadingText = videoEl.parentElement.querySelector('.loading-text-biometric');
                    if (loadingOverlay) {
                        if (loadingText) loadingText.textContent = 'Scanning Face...';
                        loadingOverlay.classList.add('active');
                    }

                    try {
                        await FaceRecognition._waitForVideoReady(videoEl, 3000);
                        const detection = await FaceRecognition._detectFaceWithRetries(videoEl, 3, 600);
                        if (!detection) {
                            throw new Error('No face detected. Please ensure your face is clearly visible and try again.');
                        }
                        resolve(Array.from(detection.descriptor));
                    } catch (e) {
                        reject(e);
                    }
                };
                captureBtn.addEventListener('click', handler);
            });

            FaceRecognition._stopCamera(stream, videoEl);
            stream = null;

            const loadingText = videoEl.parentElement.querySelector('.loading-text-biometric');
            if (loadingText) loadingText.textContent = 'Verifying identity...';
            if (captureBtn) captureBtn.textContent = '\u23F3 Verifying...';
            if (statusEl) statusEl.textContent = 'Verifying facial identity with server...';

            const response = await fetch(`${getBackendUrl()}/face/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voter_id: voterId, face_encoding: descriptorArray })
            });

            if (loadingOverlay) loadingOverlay.classList.remove('active');

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || errData.error || 'Face verification failed. Your face does not match the registered face.');
            }

            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '\u2705 Face Verified!';
            }
            if (statusEl) statusEl.textContent = 'Identity confirmed. Submitting your vote...';

            return true;

        } catch (err) {
            if (stream) FaceRecognition._stopCamera(stream, videoEl);
            if (loadingOverlay) loadingOverlay.classList.remove('active');
            if (captureBtn) {
                captureBtn.disabled = true;
                captureBtn.textContent = '\u274C Verification Failed';
            }
            console.error('Face verify failed:', err);
            throw err; // caller shows the error message
        } finally {
            FaceRecognition._processing = false;
        }
    }
};
