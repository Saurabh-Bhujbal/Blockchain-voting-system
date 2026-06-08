<![CDATA[<div align="center">

# 🗳️ SecureVote — Decentralized Voting System

### Blockchain-Powered Elections with Biometric Face Authentication

[![Solidity](https://img.shields.io/badge/Solidity-0.5.16-363636?logo=solidity)](https://soliditylang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Ganache-3C3C3D?logo=ethereum)](https://trufflesuite.com/ganache/)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<br/>

> A secure, transparent, and tamper-proof electronic voting platform that combines **Ethereum smart contracts** for immutable vote storage with **DeepFace-powered biometric authentication** for voter identity verification.

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [User Flows](#-user-flows)
- [API Reference](#-api-reference)
- [Smart Contract](#-smart-contract)
- [Screenshots](#-screenshots)
- [Team](#-team)
- [License](#-license)

---

## ✨ Features

### 🔐 Security & Authentication
- **Two-Factor Authentication** — Password verification followed by real-time face recognition
- **Biometric Face Detection** — DeepFace (FaceNet model) powered facial encoding & matching with animated scanning overlay
- **JWT Token System** — Secure session management for both admin and voter portals
- **bcrypt Password Hashing** — Industry-standard password storage for admin accounts
- **Route-Level Authorization** — Express middleware protects all authenticated pages

### 🗳️ Voting System
- **Multi-Election Support** — Create and manage multiple elections with configurable date ranges
- **One-Vote-Per-Election** — Smart contract enforces single vote per Ethereum address per election
- **Immutable Vote Storage** — All votes recorded on-chain via Ganache local Ethereum blockchain
- **Real-Time Results** — Live vote tallies fetched directly from the smart contract with animated bar charts

### 👨‍💼 Admin Portal
- **Dashboard** — Centralized management panel for elections, candidates, and results
- **Election Management** — Create elections with start/end dates and manage candidates
- **Candidate Management** — Add candidates with party names and uploadable party logos
- **Face-Verified Login** — Admins must pass face recognition after password verification
- **Admin Registration Lockdown** — Registration endpoint permanently disabled; admins seeded via SQL

### 👤 Voter Portal
- **Self-Registration** — Voters register with ID, name, password, and face encoding
- **Face-Verified Voting** — Webcam-based biometric verification before casting vote
- **Election Selection** — Browse available elections and cast votes
- **Results Viewing** — Dedicated voter results page with winner spotlight and bar chart visualization
- **Loading Animations** — Biometric scanning animations for visual feedback during face verification

### 🎨 Design
- **Premium Dark Theme** — Glassmorphism UI with gold accents inspired by government portals
- **Indian Tricolor Accent** — Patriotic saffron-white-green header strip
- **Responsive Layout** — Works across desktop and tablet viewports
- **Micro-Animations** — Smooth transitions, hover effects, animated bar charts, and scanner overlays

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Landing  │  │  Voter   │  │  Admin   │  │  Results Pages   │   │
│  │  Page    │  │  Portal  │  │  Portal  │  │ (Admin + Voter)  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │             │                  │             │
│       └──────────────┴─────────────┴──────────────────┘             │
│                              │                                      │
│                    Browserify Bundles (Web3.js + @truffle/contract) │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────────┐
            │                  │                      │
            ▼                  ▼                      ▼
  ┌──────────────────┐ ┌──────────────┐  ┌────────────────────┐
  │  Express Server  │ │  FastAPI     │  │  Ganache (Ethereum) │
  │  (Node.js :8080) │ │  (:8000)     │  │  (localhost:7545)   │
  │                  │ │              │  │                     │
  │ • Static files   │ │ • Auth/Login │  │ • Voting.sol        │
  │ • JWT middleware  │ │ • Register   │  │ • Elections CRUD    │
  │ • Logo upload    │ │ • Face API   │  │ • Vote recording    │
  │ • Route guards   │ │ • DeepFace   │  │ • Result queries    │
  └──────────────────┘ └──────┬───────┘  └────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   MySQL (voter_db)│
                    │                  │
                    │ • voter_id       │
                    │ • name           │
                    │ • password (hash)│
                    │ • role           │
                    │ • face_encoding  │
                    └──────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Smart Contract** | Solidity 0.5.16 | Election logic, vote recording, result queries |
| **Blockchain** | Ganache (Truffle Suite) | Local Ethereum blockchain (port 7545) |
| **Contract Framework** | Truffle | Compilation, migration, deployment |
| **Frontend** | HTML5, CSS3, JavaScript | UI pages with premium dark theme |
| **Bundler** | Browserify | Bundle Web3.js & @truffle/contract for browser |
| **Web Server** | Express.js (Node.js) | Static file serving, JWT auth middleware, file uploads |
| **API Server** | FastAPI (Python) | Authentication, registration, face recognition |
| **Database** | MySQL | Voter credentials, roles, face encodings |
| **Face Recognition** | DeepFace (FaceNet) | Facial encoding & matching |
| **Auth Tokens** | JSON Web Tokens (JWT) | Session management |
| **Password Hashing** | bcrypt | Secure admin password storage |

---

## 📁 Project Structure

```
Decentralized-Voting-System/
├── .env                          # Node.js env (SECRET_KEY, ADMIN_REGISTRATION_KEY)
├── .gitignore
├── LICENSE                       # MIT License
├── README.md                     # This file
├── package.json                  # Node.js dependencies & build scripts
├── truffle-config.js             # Truffle/Ganache network & compiler settings
├── index.js                      # Express server — routes, JWT middleware, logo upload
│
├── contracts/                    # Solidity smart contracts
│   ├── Voting.sol                # Main voting contract (elections, candidates, votes)
│   └── Migrations.sol            # Truffle migration helper
│
├── migrations/                   # Truffle deployment scripts
│   ├── 1_initial_migration.js
│   └── 2_deploy_contracts.js
│
├── build/contracts/              # Compiled contract ABIs (auto-generated by Truffle)
│   ├── Voting.json
│   └── Migrations.json
│
├── Database_API/                 # FastAPI backend (Python)
│   ├── .env                      # MySQL credentials, SECRET_KEY
│   ├── main.py                   # API: login, register, face recognition
│   ├── seed_admin.sql            # SQL to seed first admin account
│   └── generate_password_hash.py # Utility to create bcrypt hashes
│
├── src/
│   ├── html/                     # All HTML pages
│   │   ├── landing.html          # Public landing page (hero, features, info)
│   │   ├── about.html            # About the Election Commission
│   │   ├── publications.html     # Publications & resources
│   │   ├── voter_services.html   # Voter services portal
│   │   ├── voterLogin.html       # Voter login (password + face)
│   │   ├── register.html         # Voter self-registration (with face capture)
│   │   ├── index.html            # Voter dashboard (election list, voting UI)
│   │   ├── voterResults.html     # Voter results view (bar charts, winner)
│   │   ├── adminLogin.html       # Admin login (password + face)
│   │   ├── adminRegister.html    # Admin registration (DISABLED — 403 blocked)
│   │   ├── admin.html            # Admin dashboard (navigation tiles)
│   │   ├── addCandidate.html     # Admin: manage elections & candidates
│   │   └── viewResults.html      # Admin: live election results
│   │
│   ├── js/                       # Client-side JavaScript
│   │   ├── app.js                # Core Web3/contract interaction (bundled)
│   │   ├── login.js              # Login logic (password step)
│   │   ├── register.js           # Voter registration logic
│   │   ├── adminRegister.js      # Admin registration logic (disabled)
│   │   └── faceRecognition.js    # Face capture, registration & verification
│   │
│   ├── css/                      # Stylesheets
│   │   ├── theme.css             # Global design system (colors, fonts, base)
│   │   ├── login.css             # Login/register page styles + face scanner
│   │   ├── index.css             # Voter dashboard styles
│   │   ├── admin.css             # Admin dashboard styles
│   │   ├── manage.css            # Candidate/election management styles
│   │   └── results.css           # Results page styles (bar charts, winner)
│   │
│   ├── dist/                     # Browserify output bundles
│   │   └── app.bundle.js         # Bundled Web3 + contract code
│   │
│   └── assets/                   # Static assets
│       ├── biometric.png         # Landing page illustration
│       ├── blockchain.png        # Landing page illustration
│       ├── eth5.jpg              # Background image
│       └── logos/                # Uploaded party logos (dynamic)
│
└── public/
    ├── favicon.ico               # Browser tab icon
    └── *.png                     # Screenshot images
```

---

## 📦 Prerequisites

Ensure you have the following installed:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | ≥ 16.x | [nodejs.org](https://nodejs.org/) |
| **Python** | ≥ 3.9 | [python.org](https://www.python.org/) |
| **MySQL** | ≥ 8.0 | [mysql.com](https://dev.mysql.com/downloads/) |
| **Ganache** | ≥ 7.x | [trufflesuite.com](https://trufflesuite.com/ganache/) |
| **Truffle** | ≥ 5.x | `npm install -g truffle` |
| **MetaMask** | Latest | [metamask.io](https://metamask.io/) |

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Decentralized-Voting-System.git
cd Decentralized-Voting-System
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
cd Database_API
pip install fastapi uvicorn mysql-connector-python python-dotenv pyjwt bcrypt deepface pillow numpy tf-keras
cd ..
```

### 4. Setup MySQL Database

```sql
CREATE DATABASE voter_db;
USE voter_db;

CREATE TABLE voters_base (
    voter_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    face_encoding LONGTEXT
);
```

### 5. Seed the First Admin Account

```bash
cd Database_API
# Generate a bcrypt hash for the admin password
python generate_password_hash.py
# Copy the hash output, edit seed_admin.sql, and paste it in place of PASTE_HASH_HERE
mysql -u root -p voter_db < seed_admin.sql
cd ..
```

### 6. Configure Environment Variables

**Root `.env`:**
```env
SECRET_KEY=your_jwt_secret_key_here
ADMIN_REGISTRATION_KEY=admin_secret_passcode
```

**`Database_API/.env`:**
```env
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_HOST=localhost
MYSQL_DB=voter_db
SECRET_KEY=your_jwt_secret_key_here
ADMIN_REGISTRATION_KEY=admin_secret_passcode
```

> ⚠️ Both `SECRET_KEY` values **must be identical** for JWT tokens to work across both servers.

### 7. Start Ganache & Deploy Contracts

1. Open **Ganache** and create/start a workspace on `127.0.0.1:7545` with network ID `5777`
2. Deploy contracts:
   ```bash
   truffle migrate --reset
   ```
3. Build the frontend bundle:
   ```bash
   npm run build:app
   ```

### 8. Configure MetaMask

1. Add a custom network in MetaMask:
   - **RPC URL:** `http://127.0.0.1:7545`
   - **Chain ID:** `1337`
   - **Network ID:** `5777`
2. Import a Ganache account using its private key

---

## ▶️ Running the Application

You need **three services** running simultaneously:

```bash
# Terminal 1 — Ganache (GUI or CLI)
ganache-cli -p 7545 --networkId 5777 --chainId 1337

# Terminal 2 — FastAPI Backend (Authentication + Face Recognition)
cd Database_API
uvicorn main:app --reload --port 8000

# Terminal 3 — Express Frontend Server
node index.js
```

Then open your browser and navigate to: **http://localhost:8080**

---

## 🔄 User Flows

### Voter Flow
```
Landing Page → Voter Login → Enter ID & Password → Face Verification (Webcam)
     → Voter Dashboard → Select Election → Vote for Candidate → View Results
```

### Voter Registration Flow
```
Landing Page → Register → Enter ID, Name, Password → Capture Face (Webcam)
     → Registration Complete → Redirect to Login
```

### Admin Flow
```
Landing Page → Admin Login → Enter ID & Password → Face Verification (Webcam)
     → Admin Dashboard → Manage Elections / Add Candidates / View Results
```

---

## 📡 API Reference

### FastAPI Backend (`http://127.0.0.1:8000`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/login` | Verify voter/admin password (step 1) | Header |
| `POST` | `/register` | Register new voter | None |
| `POST` | `/register-admin` | ~~Register admin~~ **(DISABLED — 403)** | — |
| `POST` | `/face/register` | Store face encoding (base64 image) | None |
| `POST` | `/face/login` | Verify face & return JWT (step 2) | None |

### Express Server (`http://localhost:8080`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/` | Landing page | None |
| `GET` | `/voterLogin.html` | Voter login page | None |
| `GET` | `/adminLogin.html` | Admin login page | None |
| `GET` | `/register.html` | Voter registration page | None |
| `GET` | `/index.html` | Voter dashboard | JWT (query) |
| `GET` | `/admin.html` | Admin dashboard | JWT (query) |
| `GET` | `/addCandidate.html` | Election/candidate management | JWT (query) |
| `GET` | `/viewResults.html` | Admin results page | JWT (query) |
| `GET` | `/voterResults.html` | Voter results page | JWT (query) |
| `POST` | `/upload-logo` | Upload party logo (multipart) | None |

---

## 📜 Smart Contract

The [`Voting.sol`](contracts/Voting.sol) contract manages:

| Function | Description |
|----------|-------------|
| `addElection(name, startDate, endDate)` | Create a new election |
| `addCandidate(electionId, name, party)` | Add candidate to an election |
| `vote(electionId, candidateId)` | Cast a vote (one per address per election) |
| `getElection(electionId)` | Get election details |
| `getCandidate(electionId, candidateId)` | Get candidate details & vote count |
| `getCandidatesCount(electionId)` | Get candidate count for an election |
| `getElectionsCount()` | Get total number of elections |
| `checkVote(electionId)` | Check if sender has voted |
| `getVoterChoice(electionId, voter)` | Get which candidate a voter chose |

---

## 📸 Screenshots

<div align="center">
  <img src="public/login ss.png" alt="Login Page" width="80%"/>
  <p><em>Voter Login with Face Verification</em></p>
  <br/>
  <img src="public/admin ss.png" alt="Admin Dashboard" width="80%"/>
  <p><em>Admin Dashboard</em></p>
  <br/>
  <img src="public/index ss.png" alt="Voter Dashboard" width="80%"/>
  <p><em>Voter Dashboard</em></p>
</div>

---

## 👥 Team

| Name | Role |
|------|------|
| **Saurabh** | Lead Developer |
| **Abhishek** | Developer |
| **Amey** | Developer |
| **Vivek** | Developer |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Built with ❤️ using Ethereum, FastAPI, and Express</strong>
  <br/><br/>
  <em>Powered by Blockchain Technology for Transparent & Secure Elections</em>
</div>
]]>
