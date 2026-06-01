const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

require('dotenv').config();

// Multer config — save logos to src/assets/logos/
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'src/assets/logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Sanitize candidate name: lowercase, replace spaces/special chars with hyphens
    const name = (req.body.candidateName || 'unknown')
      .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const ext = path.extname(file.originalname) || '.png';
    cb(null, name + ext);
  }
});
const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const app = express();


// Authorization middleware
const authorizeUser = (req, res, next) => {
  let authQuery = req.query.Authorization || "";
  console.log("Incoming Request to:", req.path, "Auth Param Length:", authQuery.length);
  
  // Clean up the token (handle spaces or encoded spaces)
  let token = "";
  if (authQuery.includes('Bearer ')) {
    token = authQuery.split('Bearer ')[1];
  } else if (authQuery.startsWith('Bearer%20')) {
    token = authQuery.split('Bearer%20')[1];
  } else {
    token = authQuery; // Try raw
  }

  if (!token || token === "undefined") {
    console.error("Auth failed: No token provided in query string");
    return res.status(401).send('<h1 align="center"> Login to Continue </h1>');
  }
  
  try {
    const secretKey = (process.env.SECRET_KEY || "").trim().replace(/^["']|["']$/g, "");
    console.log(`DEBUG: Verifying JWT. Key length: ${secretKey.length}, Starts with: "${secretKey.substring(0, 5)}...", Ends with: "...${secretKey.slice(-5)}"`);
    const decodedToken = jwt.verify(token, secretKey, { algorithms: ['HS256'] });
    req.user = decodedToken;
    next(); 
  } catch (error) {
    console.error("JWT Verification failed:", error.message);
    return res.status(401).json({ message: 'Invalid authorization token', error: error.message });
  }
};


// ── Admin Registration Block BEGIN ──
// Block admin registration page and JS — must be before all other routes
app.get('/adminRegister.html', (req, res) => {
  console.warn(`[SECURITY] Blocked access attempt to /adminRegister.html from ${req.ip}`);
  return res.status(403).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>403 — Access Forbidden</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #f8fafc;
        }
        .box {
          text-align: center;
          padding: 60px 48px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          max-width: 480px;
          backdrop-filter: blur(12px);
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { font-size: 32px; font-weight: 800; color: #ef4444; margin-bottom: 8px; }
        .code { font-size: 14px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }
        p { font-size: 16px; color: #cbd5e1; line-height: 1.7; margin-bottom: 32px; }
        a {
          display: inline-block;
          padding: 12px 28px;
          background: #2563eb;
          color: white;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
          transition: background 0.2s;
        }
        a:hover { background: #1d4ed8; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="icon">🚫</div>
        <div class="code">Error 403</div>
        <h1>Access Forbidden</h1>
        <p>
          Admin registration is <strong>permanently disabled</strong>.
          Administrator accounts are provisioned directly by the system administrator.
          Please contact your system administrator for access.
        </p>
        <a href="/">← Return to Home</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/js/adminRegister.js', (req, res) => {
  console.warn(`[SECURITY] Blocked access attempt to /js/adminRegister.js from ${req.ip}`);
  return res.status(403).json({ error: 'Forbidden', message: 'Admin registration is disabled.' });
});
// ── Admin Registration Block END ──

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/landing.html'));
});

app.get('/voterLogin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/voterLogin.html'));
});

// ── Informational / Public Pages ──
app.get('/landing.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/landing.html'));
});

app.get('/about.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/about.html'));
});

app.get('/voter_services.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/voter_services.html'));
});

app.get('/publications.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/publications.html'));
});

app.get('/adminLogin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/adminLogin.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/register.html'));
});

app.get('/js/login.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/login.js'))
});

app.get('/js/register.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/register.js'))
});

// NOTE: /js/adminRegister.js is blocked above (403) — original route removed.

app.get('/js/biometrics.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/biometrics.js'))
});

// ── Face Recognition Route Begin ──
app.get('/js/faceRecognition.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/faceRecognition.js'))
});
// ── Face Recognition Route End ──

app.get('/css/login.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/login.css'))
});

app.get('/css/index.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/index.css'))
});

app.get('/css/admin.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/admin.css'))
});

app.get('/css/theme.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/theme.css'))
});

app.get('/css/manage.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/manage.css'))
});

app.get('/css/results.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/results.css'))
});

app.get('/assets/eth5.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/assets/eth5.jpg'))
});

app.get('/assets/blockchain.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/assets/blockchain.png'))
});

app.get('/assets/biometric.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/assets/biometric.png'))
});

// Serve party logos statically
app.get('/logos/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'src/assets/logos', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('');
  }
});

// Upload logo endpoint (multipart form: candidateName + logo file)
app.post('/upload-logo', uploadLogo.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  console.log('Logo uploaded:', req.file.filename);
  res.json({ success: true, filename: req.file.filename });
});

app.get('/js/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/app.js'))
});

app.get('/admin.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/admin.html'));
});

app.get('/addCandidate.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/addCandidate.html'));
});

app.get('/viewResults.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/viewResults.html'));
});

app.get('/voterResults.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/voterResults.html'));
});

app.get('/index.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/index.html'));
});

app.get('/dist/login.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/login.bundle.js'));
});

app.get('/dist/app.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/app.bundle.js'));
});

// Serve the favicon.ico file
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/favicon.ico'));
});

// Start the server
app.listen(8080, () => {
  console.log('Server listening on http://localhost:8080');
});
