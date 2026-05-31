// ============================================================
// FACE RECOGNITION MODULE
// Follows the same export pattern as biometrics.js
// Provides .register() and .login() methods for face auth
// ============================================================

export const FaceRecognition = {

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

    // ── Internal: Capture a frame from video as base64 JPEG ──
    _captureFrame: (videoElement) => {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0);
        return canvas.toDataURL('image/jpeg');
    },

    // ── Register a voter's face ──
    // opts: { videoId, statusId, captureBtnId } — all optional, use defaults if not provided
    register: async (voterId, opts = {}) => {
        const videoEl = document.getElementById(opts.videoId || 'face-preview');
        const statusEl = document.getElementById(opts.statusId || 'face-status');
        const captureBtn = document.getElementById(opts.captureBtnId || 'faceCaptureBtn');

        if (!videoEl) throw new Error("Face preview element not found");

        let stream = null;
        let loadingOverlay = null;

        try {
            if (statusEl) statusEl.textContent = "Starting camera...";
            stream = await FaceRecognition._startCamera(videoEl);
            if (statusEl) statusEl.textContent = "Camera ready. Position your face and click Capture.";

            // Wait for user to click capture button
            const imageData = await new Promise((resolve) => {
                const handler = () => {
                    captureBtn.removeEventListener('click', handler);
                    if (statusEl) statusEl.textContent = "Capturing...";
                    const base64 = FaceRecognition._captureFrame(videoEl);
                    resolve(base64);
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

            if (statusEl) statusEl.textContent = "Processing face data...";

            const response = await fetch('http://192.168.1.13:8000/face/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voter_id: voterId, image: imageData }),
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
            if (statusEl) statusEl.textContent = "Starting camera...";
            stream = await FaceRecognition._startCamera(videoEl);
            if (statusEl) statusEl.textContent = "Camera ready. Position your face and click Capture.";

            // Wait for user to click capture button
            const imageData = await new Promise((resolve) => {
                const handler = () => {
                    captureBtn.removeEventListener('click', handler);
                    if (statusEl) statusEl.textContent = "Capturing...";
                    const base64 = FaceRecognition._captureFrame(videoEl);
                    resolve(base64);
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

            if (statusEl) statusEl.textContent = "Verifying face...";

            const response = await fetch('http://192.168.1.13:8000/face/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voter_id: voterId, image: imageData }),
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
