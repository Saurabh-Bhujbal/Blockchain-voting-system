# Import required modules
import dotenv
import os
import shutil
import re
import hashlib
import mysql.connector
from fastapi import FastAPI, HTTPException, status, Request, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from mysql.connector import errorcode
import jwt
from pydantic import BaseModel
import tempfile as tmp_module

# ── Face Recognition Imports (Lazy loaded) ──
import base64
import io
import json
import tempfile
from PIL import Image
# ── Face Recognition Imports End ──

# Registration model
class VoterRegister(BaseModel):
    voter_id: str
    name: str
    password: str

class AdminRegister(BaseModel):
    voter_id: str
    name: str
    password: str
    admin_passcode: str

# Loading the environment variables
dotenv.load_dotenv()

# Initialize the app
app = FastAPI()

# Define the allowed origins for CORS
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://blockchain-voting-system-kappa.vercel.app",
    "https://blockchain-voting-system-2-hkad.onrender.com",
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure logos directory exists
LOGOS_DIR = os.path.join(os.path.dirname(__file__), "logos")
os.makedirs(LOGOS_DIR, exist_ok=True)

# Mount logos directory for serving static images
app.mount("/logos", StaticFiles(directory=LOGOS_DIR), name="logos")

# ── FIX 1: SSL Certificate for Render ──
# On local machine, use ca.pem file
# On Render, use MYSQL_SSL_CA environment variable
def get_ssl_config():
    if os.path.exists("ca.pem"):
        # Local development
        return {"ssl_ca": "ca.pem", "ssl_verify_cert": True}
    elif os.environ.get("MYSQL_SSL_CA"):
        # Render deployment — write cert from env var to temp file
        cert_content = os.environ.get("MYSQL_SSL_CA")
        cert_path = "/tmp/ca.pem"
        with open(cert_path, "w") as f:
            f.write(cert_content)
        return {"ssl_ca": cert_path, "ssl_verify_cert": True}
    else:
        # No SSL (fallback)
        return {}

# ── FIX 2: Reconnection Logic ──
# Single connection drops after inactivity on Render free tier
# This function always returns a live connection
cnx = None
cursor = None

def get_db():
    global cnx, cursor
    try:
        if cnx is None or not cnx.is_connected():
            ssl_config = get_ssl_config()
            cnx = mysql.connector.connect(
                user=os.environ['MYSQL_USER'],
                password=os.environ['MYSQL_PASSWORD'],
                host=os.environ['MYSQL_HOST'],
                database=os.environ['MYSQL_DB'],
                port=int(os.environ.get('MYSQL_PORT', 19015)),
                **ssl_config
            )
            cursor = cnx.cursor()
            print("Database (re)connected successfully ✅")
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed"
        )
    return cnx, cursor

# Initial connection on startup
try:
    get_db()
except Exception as e:
    print(f"Initial DB connection failed: {e}")

# ── FIX 3: Health Endpoint for Cron Job ──
@app.get("/health")
async def health():
    try:
        get_db()
        return {"status": "alive", "database": "connected"}
    except:
        return {"status": "alive", "database": "disconnected"}

# ── Helper: Clean SECRET_KEY robustly ──
def get_clean_secret_key():
    """Get SECRET_KEY with aggressive cleaning of invisible characters."""
    raw = os.environ.get('SECRET_KEY', '')
    # If the user accidentally pasted "SECRET_KEY=" or "SECRET_KEY = " in the value field:
    raw = re.sub(r'^SECRET_KEY\s*=\s*', '', raw)
    # Strip whitespace, quotes, BOM, zero-width chars, non-breaking spaces
    cleaned = raw.strip().strip("'").strip('"')
    # Remove any non-ASCII invisible characters (BOM, ZWNBSP, NBSP, etc.)
    cleaned = re.sub(r'[^\x20-\x7E]', '', cleaned)
    return cleaned

# ── Debug: Key fingerprint endpoint ──
@app.get("/debug/key-check")
async def debug_key_check():
    """Returns SHA256 fingerprint of the SECRET_KEY so you can compare with Node.js."""
    key = get_clean_secret_key()
    key_hash = hashlib.sha256(key.encode('utf-8')).hexdigest()
    return {
        "key_length": len(key),
        "key_prefix": key[:5] if key else "",
        "key_suffix": key[-5:] if key else "",
        "key_sha256": key_hash,
        "simulated_face_auth": os.environ.get('SIMULATED_FACE_AUTH', 'false')
    }

# Define the authentication middleware
async def authenticate(request: Request):
    try:
        cnx, cursor = get_db()
        api_key = request.headers.get('authorization').replace("Bearer ", "")
        cursor.execute("SELECT * FROM voters_base WHERE voter_id = %s", (api_key,))
        if api_key not in [row[0] for row in cursor.fetchall()]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Forbidden"
            )
    except HTTPException:
        raise
    except:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Forbidden"
        )

# Define the GET endpoint for login
@app.get("/login")
async def login(request: Request, voter_id: str, password: str, expected_role: str = None):
    await authenticate(request)
    role = await get_role(voter_id, password)

    if expected_role and role != expected_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Access denied. This login is for {expected_role}s only."
        )

    return {'status': 'password_verified', 'role': role}

# Get role based on voter_id and password
async def get_role(voter_id, password):
    try:
        import bcrypt
        cnx, cursor = get_db()
        cursor.execute("SELECT role, password FROM voters_base WHERE voter_id = %s", (voter_id,))
        row = cursor.fetchone()
        if row:
            role, stored_hash = row
            if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
                if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
                    return role
            else:
                if password == stored_hash:
                    return role
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid voter id or password"
        )
    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )

# POST endpoint for registration
@app.post("/register")
async def register(voter: VoterRegister):
    try:
        cnx, cursor = get_db()
        cursor.execute("SELECT * FROM voters_base WHERE voter_id = %s", (voter.voter_id,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voter ID already registered"
            )

        sql = "INSERT INTO voters_base (voter_id, name, password, role) VALUES (%s, %s, %s, %s)"
        val = (voter.voter_id, voter.name, voter.password, 'user')
        cursor.execute(sql, val)
        cnx.commit()

        return {"message": "Voter registered successfully", "voter_id": voter.voter_id}

    except mysql.connector.Error as err:
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during registration"
        )

# Admin registration permanently disabled
@app.post("/register-admin")
async def register_admin(voter: AdminRegister):
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            "Admin registration is disabled. "
            "Contact the system administrator to provision admin accounts."
        )
    )

# Logo Upload Endpoint
@app.post("/upload-logo")
async def upload_logo(candidateName: str = Form(...), logo: UploadFile = File(...)):
    try:
        sanitized_name = re.sub(r'[^a-z0-9]', '-', candidateName.lower())
        sanitized_name = re.sub(r'-+', '-', sanitized_name).strip('-')

        ext = os.path.splitext(logo.filename)[1] or '.png'
        filename = f"{sanitized_name}{ext}"

        file_path = os.path.join(LOGOS_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(logo.file, buffer)

        return {"success": True, "filename": filename}
    except Exception as e:
        print(f"Error uploading logo: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload logo")

# Face Recognition Pydantic Model
class FaceData(BaseModel):
    voter_id: str
    image: str

# POST /face/register — encode and store a voter's face
@app.post("/face/register")
async def face_register(data: FaceData):
    try:
        # Check if we are running in simulated authentication mode
        is_simulated = os.environ.get("SIMULATED_FACE_AUTH", "false").lower() == "true"

        image_b64 = data.image
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]

        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        if is_simulated:
            # Simulated mode: save a mock 128-element embedding vector
            print("SIMULATED_FACE_AUTH: Generating mock face encoding")
            mock_encoding = [0.0] * 128
            encoding_json = json.dumps(mock_encoding)
            
            cnx, cursor = get_db()
            cursor.execute("UPDATE voters_base SET face_encoding = %s WHERE voter_id = %s", (encoding_json, data.voter_id))
            cnx.commit()
            return {"status": "Face registered successfully"}

        # Normal mode: Import heavy dependencies lazily to avoid startup crashes
        from deepface import DeepFace
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            image.save(tmp, format='JPEG')
            tmp_path = tmp.name

        try:
            embeddings = DeepFace.represent(img_path=tmp_path, model_name='Facenet', enforce_detection=True)
        except ValueError:
            raise HTTPException(status_code=400, detail="No face detected")
        finally:
            os.unlink(tmp_path)

        if not embeddings:
            raise HTTPException(status_code=400, detail="No face detected")

        encoding = embeddings[0]['embedding']
        encoding_json = json.dumps(encoding)

        cnx, cursor = get_db()
        cursor.execute("UPDATE voters_base SET face_encoding = %s WHERE voter_id = %s", (encoding_json, data.voter_id))
        cnx.commit()

        return {"status": "Face registered successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in face registration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# POST /face/login — verify face and return JWT
@app.post("/face/login")
async def face_login(data: FaceData):
    try:
        # Check if we are running in simulated authentication mode
        is_simulated = os.environ.get("SIMULATED_FACE_AUTH", "false").lower() == "true"

        cnx, cursor = get_db()
        cursor.execute("SELECT face_encoding, role, password FROM voters_base WHERE voter_id = %s", (data.voter_id,))
        user_data = cursor.fetchone()

        if not user_data or not user_data[0]:
            raise HTTPException(status_code=404, detail="Face not registered")

        role = user_data[1]
        password = user_data[2]

        image_b64 = data.image
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]

        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        secret_key = get_clean_secret_key()
        key_sha256 = hashlib.sha256(secret_key.encode('utf-8')).hexdigest()

        if is_simulated:
            print("SIMULATED_FACE_AUTH: Bypassing face match checks")
            print(f"DEBUG: Signing JWT. Key length: {len(secret_key)}, SHA256: {key_sha256}")
            token = jwt.encode(
                {'voter_id': data.voter_id, 'role': role},
                secret_key,
                algorithm='HS256'
            )
            return {
                "token": token,
                "role": role,
                "debug_backend_key_length": len(secret_key),
                "debug_backend_key_prefix": secret_key[:5] if secret_key else "",
                "debug_backend_key_suffix": secret_key[-5:] if secret_key else "",
                "debug_backend_key_sha256": key_sha256
            }

        # Normal mode: Import heavy dependencies lazily
        import numpy
        from deepface import DeepFace
        
        stored_encoding = numpy.array(json.loads(user_data[0]))

        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            image.save(tmp, format='JPEG')
            tmp_path = tmp.name

        try:
            live_embeddings = DeepFace.represent(img_path=tmp_path, model_name='Facenet', enforce_detection=True)
        except ValueError:
            raise HTTPException(status_code=400, detail="No face detected in image")
        finally:
            os.unlink(tmp_path)

        if not live_embeddings:
            raise HTTPException(status_code=400, detail="No face detected in image")

        live_encoding = numpy.array(live_embeddings[0]['embedding'])

        cosine_distance = numpy.dot(stored_encoding, live_encoding) / (
            numpy.linalg.norm(stored_encoding) * numpy.linalg.norm(live_encoding)
        )
        is_match = cosine_distance > 0.60

        if is_match:
            print(f"DEBUG: Signing JWT. Key length: {len(secret_key)}, SHA256: {key_sha256}")
            token = jwt.encode(
                {'voter_id': data.voter_id, 'role': role},
                secret_key,
                algorithm='HS256'
            )
            return {
                "token": token,
                "role": role,
                "debug_backend_key_length": len(secret_key),
                "debug_backend_key_prefix": secret_key[:5] if secret_key else "",
                "debug_backend_key_suffix": secret_key[-5:] if secret_key else "",
                "debug_backend_key_sha256": key_sha256
            }
        else:
            raise HTTPException(status_code=401, detail="Face authentication failed")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in face login: {e}")
        raise HTTPException(status_code=500, detail=str(e))