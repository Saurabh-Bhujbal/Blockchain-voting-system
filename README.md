# 🗳️ SecureVote — Blockchain-Based Voting System

A decentralized electronic voting system that combines **Ethereum smart contracts**, **biometric (face) authentication**, and a **two-factor login flow** to deliver a secure, transparent, and tamper-proof voting platform.

Votes are recorded immutably on-chain via Solidity smart contracts, while voter identity is verified through a password + facial-recognition check before a JWT session is issued.
## ✨ Features

- **Immutable, on-chain voting** — every vote is recorded on an Ethereum-compatible blockchain via a Solidity smart contract, preventing tampering or duplicate votes.
- **Two-factor authentication** — password verification followed by facial recognition (DeepFace / FaceNet) before any JWT is issued.
- **Role-based dashboards** — separate, protected experiences for **voters** and **admins**.
- **Election & candidate management** — admins can create elections, add candidates with party logos, and manage the voting window (start/end dates).
- **Live results** — bar-chart result views for both admins and voters, with a winner spotlight.
- **Locked-down admin registration** — admin accounts are seeded directly in the database; public admin self-registration is intentionally disabled (`403`) to prevent privilege escalation.
- **JWT-secured routes** — protected pages require a valid token passed via the request, verified by Express middleware.

---

## 🏗️ Architecture

The system is composed of three services that run together:

```
┌────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   Browser /     │────▶│  Express Server   │────▶│   FastAPI Backend  │
│   Frontend      │     │  (Node, :8080)    │     │   (Python, :8000)  │
│  HTML/CSS/JS    │◀────│  Static + JWT     │◀────│  Auth + Face Recog │
└────────┬────────┘     └───────────────────┘     └──────────┬─────────┘
         │                                                     │
         │  Web3.js / MetaMask                                 │  MySQL
         ▼                                                     ▼
┌─────────────────┐                                  ┌───────────────────┐
│  Ganache / EVM   │                                  │   MySQL Database   │
│  Voting.sol      │                                  │  voters_base table │
│  (Smart Contract)│                                  │ (id, pw, face enc.)│
└──────────────────┘                                  └───────────────────┘
```

**Authentication flow:**
1. Voter/Admin submits `voter_id` + `password` → verified by FastAPI (`GET /login`).
2. On success, the browser captures a webcam frame → sent to `POST /face/login`.
3. FastAPI compares the live face embedding against the stored FaceNet encoding (cosine similarity threshold).
4. On match, a JWT is issued and the client is redirected to the appropriate dashboard.
5. All blockchain reads/writes (adding elections, adding candidates, casting votes) happen **client-side** through `web3.js` + `@truffle/contract`, connected to the chain via MetaMask.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity `0.5.16`, Truffle |
| Blockchain (local) | Ganache (`127.0.0.1:7545`, network id `5777`, chain id `1337`) |
| Blockchain (production) | Sepolia Testnet (via Alchemy + HDWallet) |
| Frontend | Vanilla HTML, CSS, JavaScript, Browserify bundles |
| Web3 Layer | `web3.js`, `@truffle/contract` |
| App Server | Node.js, Express, JWT, Multer (file uploads) |
| Auth/API Backend | Python, FastAPI, Uvicorn |
| Biometrics | DeepFace (FaceNet embeddings) |
| Database | MySQL |

---

## 📁 Project Structure

```
Blockchain-voting-system/
│
├── contracts/                 # Solidity smart contracts
│   ├── Voting.sol             # Core voting contract
│   └── Migrations.sol         # Truffle migrations contract
│
├── migrations/                # Truffle deployment scripts
├── build/contracts/           # Compiled ABI output (auto-generated)
│
├── Database_API/              # FastAPI backend (Python, port 8000)
│   ├── main.py                # Auth, registration & face-recognition endpoints
│   ├── seed_admin.sql         # SQL to seed the first admin account
│   └── requirements.txt
│
├── src/
│   ├── html/                  # Frontend pages (voter/admin/public)
│   ├── js/                    # Client-side JS (app, login, face recognition)
│   ├── css/                   # Stylesheets
│   └── dist/                  # Browserify bundle output
│
├── public/                    # Static assets & screenshots
├── index.js                   # Express server entry point (port 8080)
├── truffle-config.js          # Truffle network/compiler configuration
└── package.json
```

> See [`structure.md`](structure.md) for a complete file-by-file reference and [`agents.md`](agents.md) for in-depth developer/contributor notes.

---

## ⚙️ Prerequisites

- **Node.js** ≥ 16.x and npm
- **Python** ≥ 3.9
- **MySQL** ≥ 8.0
- **Ganache** (GUI or `ganache-cli`) for local blockchain development
- **MetaMask** browser extension
- **Truffle** (`npm install -g truffle`)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Saurabh-Bhujbal/Blockchain-voting-system.git
cd Blockchain-voting-system
```

### 2. Install dependencies

```bash
# Node.js dependencies
npm install

# Python dependencies
cd Database_API
pip install -r requirements.txt
cd ..
```

### 3. Configure environment variables

Create a `.env` file in the **project root**:

```env
SECRET_KEY=your_shared_jwt_secret
ADMIN_REGISTRATION_KEY=your_legacy_admin_key
```

Create a `.env` file inside **`Database_API/`**:

```env
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_HOST=localhost
MYSQL_DB=voter_db
SECRET_KEY=your_shared_jwt_secret   # must match the root .env
ADMIN_REGISTRATION_KEY=your_legacy_admin_key
```

> ⚠️ `SECRET_KEY` **must be identical** in both `.env` files — tokens are issued by FastAPI and verified by Express.

### 4. Set up the database

```bash
mysql -u your_mysql_user -p < Database_API/seed_admin.sql
```

### 5. Start Ganache

Launch the Ganache GUI, or run:

```bash
ganache-cli -p 7545 --networkId 5777 --chainId 1337
```

### 6. Compile & deploy the smart contract

```bash
truffle migrate --reset
```

### 7. Build the frontend bundle

```bash
npm run build:app
```

### 8. Run the backend services

In separate terminals:

```bash
# Terminal 1 — FastAPI (auth + face recognition)
cd Database_API
uvicorn main:app --reload --port 8000

# Terminal 2 — Express (frontend + JWT middleware)
node index.js
```

### 9. Open the app

Visit **http://localhost:8080** and connect MetaMask to the Ganache network (`127.0.0.1:7545`).

---

## ⛓️ Smart Contract Overview (`contracts/Voting.sol`)

**Structs**

```solidity
Candidate { id, name, party, voteCount }
Election  { id, name, startDate, endDate, candidateCount }
```

**Key functions**

| Function | Description |
|---|---|
| `addElection(name, start, end)` | Creates a new election |
| `addCandidate(electionId, name, party)` | Adds a candidate to an election |
| `vote(electionId, candidateId)` | Casts a vote (one per address, enforced on-chain) |
| `getElection(id)` | Returns election details |
| `getCandidate(electionId, candidateId)` | Returns candidate details and vote count |
| `checkVote(electionId)` | Checks whether `msg.sender` has already voted |
| `getVoterChoice(electionId, voter)` | Returns the candidate a voter chose |

---

## 🔌 API Endpoints (`Database_API/main.py`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/login` | Step 1 — verifies `voter_id` + password |
| `POST` | `/face/login` | Step 2 — verifies face, issues JWT |
| `POST` | `/register` | Voter self-registration |
| `POST` | `/face/register` | Stores a voter's face encoding |
| `POST` | `/register-admin` | **Disabled** — always returns `403` |

---

## 🔐 Security Notes

- Admin accounts can only be created via `seed_admin.sql` — self-registration is blocked to prevent privilege escalation.
- Passwords for admin accounts are stored as bcrypt hashes; face encodings are stored as FaceNet embeddings, not raw images.
- Protected routes require a valid JWT, verified by Express middleware before the page is served.
- `build/contracts/` is auto-generated — never edit it directly; re-run `truffle migrate --reset` after changing `Voting.sol`.

---

## 🧪 Testing

There is currently no automated test suite — testing is manual:
1. Register a voter, then log in (password → face verification).
2. As an admin, create an election and add candidates.
3. Cast a vote from a voter account (MetaMask must be connected to Ganache).
4. Check live results on the admin/voter results pages.

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to the branch and open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👥 Author

**Saurabh Bhujbal**
GitHub: [@Saurabh-Bhujbal](https://github.com/Saurabh-Bhujbal)

---

## © Copyright
Copyright © 2026 Saurabh Bhujbal. All rights reserved under the terms of the MIT License
