<![CDATA[# SecureVote — Project Structure Reference

> **Purpose:** This document is a structured reference of the entire codebase. Share it with other AI assistants, collaborators, or use it as a map when navigating the project.

---

## 📁 Root Directory

```
Decentralized-Voting-System/
│
│── .env                          # Environment variables for Node.js server
│── .gitignore                    # Git ignore rules
│── LICENSE                       # MIT License
│── README.md                     # Project documentation
│── structure.md                  # THIS FILE — project structure reference
│── agents.md                     # AI agent context document
│── package.json                  # Node.js dependencies & scripts
│── package-lock.json             # Dependency lockfile
│── truffle-config.js             # Truffle compiler & network config
│── index.js                      # EXPRESS SERVER — main entry point (port 8080)
│
├── contracts/                    # SOLIDITY SMART CONTRACTS
│   ├── Voting.sol                # Core voting contract
│   └── Migrations.sol            # Truffle migration contract
│
├── migrations/                   # TRUFFLE MIGRATION SCRIPTS
│   ├── 1_initial_migration.js    # Deploy Migrations.sol
│   └── 2_deploy_contracts.js     # Deploy Voting.sol
│
├── build/contracts/              # COMPILED ABI OUTPUT (auto-generated)
│   ├── Voting.json               # Voting contract ABI + bytecode
│   └── Migrations.json           # Migrations contract ABI
│
├── Database_API/                 # FASTAPI BACKEND (Python, port 8000)
│   ├── .env                      # MySQL + JWT config
│   ├── main.py                   # All API endpoints
│   ├── seed_admin.sql            # SQL to seed first admin
│   └── generate_password_hash.py # bcrypt hash utility
│
├── src/                          # FRONTEND SOURCE CODE
│   ├── html/                     # HTML pages (13 files)
│   ├── js/                       # Client JavaScript (5 files)
│   ├── css/                      # Stylesheets (6 files)
│   ├── dist/                     # Browserify output bundles
│   └── assets/                   # Images and party logos
│
├── public/                       # PUBLIC STATIC ASSETS
│   ├── favicon.ico               # Browser tab icon
│   └── *.png                     # Screenshot images
│
└── node_modules/                 # Installed npm packages (gitignored)
```

---

## 🌐 HTML Pages (`src/html/`)

### Public Pages (No Auth Required)
| File | Route | Description |
|------|-------|-------------|
| `landing.html` | `/` , `/landing.html` | Public landing page with hero, features, and info sections |
| `about.html` | `/about.html` | About the Election Commission |
| `publications.html` | `/publications.html` | Publications & resources |
| `voter_services.html` | `/voter_services.html` | Voter services information |
| `voterLogin.html` | `/voterLogin.html` | Voter login (password → face verification) |
| `adminLogin.html` | `/adminLogin.html` | Admin login (password → face verification) |
| `register.html` | `/register.html` | Voter self-registration with face capture |
| `adminRegister.html` | `/adminRegister.html` | **BLOCKED (403)** — Admin registration disabled |

### Protected Pages (JWT Required via `?Authorization=Bearer%20<token>`)
| File | Route | Description |
|------|-------|-------------|
| `index.html` | `/index.html` | Voter dashboard — election list, voting UI |
| `admin.html` | `/admin.html` | Admin dashboard — navigation tiles |
| `addCandidate.html` | `/addCandidate.html` | Admin — manage elections & candidates |
| `viewResults.html` | `/viewResults.html` | Admin — live election results with bar charts |
| `voterResults.html` | `/voterResults.html` | Voter — election results with winner spotlight |

---

## 📜 JavaScript Files (`src/js/`)

| File | Bundle Command | Description |
|------|---------------|-------------|
| `app.js` | `npm run build:app` | Core Web3 interaction — contract loading, election CRUD, voting, result queries. Bundled with `@truffle/contract` and `web3` via Browserify. |
| `login.js` | `npm run build:login` | Login page logic — password verification step via FastAPI `/login` endpoint |
| `register.js` | — (inline script) | Voter registration — calls FastAPI `/register` endpoint |
| `adminRegister.js` | — (blocked) | Admin registration logic (disabled) |
| `faceRecognition.js` | `npm run build:face` | Webcam capture, face registration (`/face/register`), face login (`/face/login`), scanner animation control |

---

## 🎨 CSS Files (`src/css/`)

| File | Scope | Description |
|------|-------|-------------|
| `theme.css` | Global | Design system — CSS variables, colors (`--navy`, `--gold`, `--glass`), fonts, base reset, tricolor strip, navbar, footer, buttons |
| `login.css` | Login/Register pages | Form layout, webcam container, scanner overlay animation, loading spinner, biometric verification styles |
| `index.css` | Voter dashboard | Election cards, voting UI, candidate grid |
| `admin.css` | Admin dashboard | Navigation tiles, admin layout |
| `manage.css` | addCandidate.html | Election/candidate management forms, modals, tables, election selector dropdown |
| `results.css` | Results pages | Bar charts, winner spotlight, stats bar, result rows with animations |

---

## 🐍 FastAPI Backend (`Database_API/main.py`)

### Endpoints

| Method | Path | Purpose | Returns |
|--------|------|---------|---------|
| `GET` | `/login` | Step 1: password verification | `{status: "password_verified", role}` |
| `POST` | `/register` | Voter self-registration | `{message, voter_id}` |
| `POST` | `/register-admin` | **DISABLED (403 always)** | Error |
| `POST` | `/face/register` | Store face encoding (base64 image → DeepFace FaceNet → DB) | `{status}` |
| `POST` | `/face/login` | Step 2: face verification → JWT issuance | `{token, role}` |

### Authentication Flow
```
1. User enters voter_id + password
2. Frontend calls GET /login?voter_id=X&password=Y
3. If valid → shows webcam for face capture
4. Frontend calls POST /face/login with {voter_id, image (base64)}
5. Backend compares live face encoding vs stored encoding (cosine similarity > 0.60)
6. If match → returns JWT token
7. Frontend redirects to dashboard with ?Authorization=Bearer%20<token>
```

### Database Schema (`voter_db.voters_base`)
```sql
voter_id      VARCHAR(255) PRIMARY KEY
name          VARCHAR(255) NOT NULL
password      VARCHAR(255) NOT NULL    -- plain text (voters) or bcrypt hash (admins)
role          VARCHAR(50)  DEFAULT 'user'  -- 'user' or 'admin'
face_encoding LONGTEXT                 -- JSON array of 128 floats (FaceNet embedding)
```

---

## 📦 Express Server (`index.js`)

### Responsibilities
- Serves all static HTML, CSS, JS, and assets
- JWT authorization middleware on protected routes
- Blocks `/adminRegister.html` and `/js/adminRegister.js` with 403
- Handles party logo upload via `POST /upload-logo` (Multer → `src/assets/logos/`)
- Runs on **port 8080**

### Route Categories
```
PUBLIC:    /  /landing.html  /voterLogin.html  /adminLogin.html  /register.html
           /about.html  /voter_services.html  /publications.html
           /css/*  /js/*  /dist/*  /assets/*  /logos/*  /favicon.ico

BLOCKED:   /adminRegister.html  /js/adminRegister.js  → 403 Forbidden

PROTECTED: /index.html  /admin.html  /addCandidate.html
           /viewResults.html  /voterResults.html  → JWT required
```

---

## ⛓️ Smart Contract (`contracts/Voting.sol`)

### Structs
```solidity
Candidate { id, name, party, voteCount }
Election  { id, name, startDate, endDate, candidateCount }
```

### State Mappings
```solidity
elections              : electionId → Election
electionCandidates     : electionId → candidateId → Candidate
hasVoted               : electionId → voterAddress → bool
voterChoices           : electionId → voterAddress → candidateId
```

### Key Functions
| Function | Access | Description |
|----------|--------|-------------|
| `addElection(name, start, end)` | Public | Create new election, returns ID |
| `addCandidate(electionId, name, party)` | Public | Add candidate, returns ID |
| `vote(electionId, candidateId)` | Public | Cast vote (enforces one per address) |
| `getElection(id)` | View | Returns (id, name, start, end, count) |
| `getCandidate(electionId, candidateId)` | View | Returns (id, name, party, votes) |
| `checkVote(electionId)` | View | Has msg.sender voted? |
| `getVoterChoice(electionId, voter)` | View | Which candidate did voter choose? |

### Deployment
- **Network:** Ganache at `127.0.0.1:7545` (Network ID: 5777, Chain ID: 1337)
- **Compiler:** Solidity 0.5.16 with optimizer (200 runs)
- **Deploy:** `truffle migrate --reset`
- **ABI Location:** `build/contracts/Voting.json`

---

## 🔧 Build Commands

```bash
npm run build:app     # Browserify src/js/app.js → src/dist/app.bundle.js
npm run build:login   # Browserify src/js/login.js → src/dist/login.bundle.js
npm run build:face    # Browserify src/js/faceRecognition.js → src/dist/face.bundle.js
```

---

## 🌍 Environment Variables

### Root `.env`
| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | JWT signing secret (shared with FastAPI) |
| `ADMIN_REGISTRATION_KEY` | Admin passcode (legacy, registration disabled) |

### `Database_API/.env`
| Variable | Purpose |
|----------|---------|
| `MYSQL_USER` | MySQL username |
| `MYSQL_PASSWORD` | MySQL password |
| `MYSQL_HOST` | MySQL host (default: localhost) |
| `MYSQL_DB` | Database name (voter_db) |
| `SECRET_KEY` | JWT signing secret (**must match root .env**) |
| `ADMIN_REGISTRATION_KEY` | Admin passcode (legacy) |

---

## 🏃 Runtime Services

| Service | Port | Command |
|---------|------|---------|
| Ganache | 7545 | Ganache GUI or `ganache-cli -p 7545` |
| FastAPI | 8000 | `cd Database_API && uvicorn main:app --reload --port 8000` |
| Express | 8080 | `node index.js` |
]]>
