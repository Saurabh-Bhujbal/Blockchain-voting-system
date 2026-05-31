# Import required modules
import dotenv
import os
import mysql.connector
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from mysql.connector import errorcode
import jwt
from pydantic import BaseModel

# ── Face Recognition Imports Begin ──
from deepface import DeepFace
import numpy
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

# Initialize the todoapi app
app = FastAPI()

# Define the allowed origins for CORS
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://blockchain-voting-system-kappa.vercel.app",
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

# Connect to the MySQL database
try:
    cnx = mysql.connector.connect(
        user=os.environ['MYSQL_USER'],
        password=os.environ['MYSQL_PASSWORD'],
        host=os.environ['MYSQL_HOST'],
        database=os.environ['MYSQL_DB'],
    )
    cursor = cnx.cursor()
except mysql.connector.Error as err:
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("Something is wrong with your user name or password")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("Database does not exist")
    else:
        print(err)

# Define the authentication middleware
async def authenticate(request: Request):
    try:
        api_key = request.headers.get('authorization').replace("Bearer ", "")
        cursor.execute("SELECT * FROM voters_base WHERE voter_id = %s", (api_key,))
        if api_key not in [row[0] for row in cursor.fetchall()]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Forbidden"
            )
    except:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Forbidden"
        )

# Define the GET endpoint for login (Step 1: password verification only — no JWT)
@app.get("/login")
async def login(request: Request, voter_id: str, password: str, expected_role: str = None):
    await authenticate(request)
    role = await get_role(voter_id, password)

    if expected_role and role != expected_role:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Access denied. This login is for {expected_role}s only."
        )

    # For ALL users (admin and voter), do NOT issue JWT here.
    # Face verification is required next for everyone.
    return {'status': 'password_verified', 'role': role}

# Replace 'admin' with the actual role based on authentication
async def get_role(voter_id, password):
    try:
        import bcrypt
        cursor.execute("SELECT role, password FROM voters_base WHERE voter_id = %s", (voter_id,))
        row = cursor.fetchone()
        if row:
            role, stored_hash = row
            # Check if stored password is a bcrypt hash
            if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
                if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
                    return role
            else:
                # Legacy plain-text comparison (for existing voter accounts)
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

# Define the POST endpoint for registration
@app.post("/register")
async def register(voter: VoterRegister):
    try:
        # Check if voter_id already exists
        cursor.execute("SELECT * FROM voters_base WHERE voter_id = %s", (voter.voter_id,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voter ID already registered"
            )

        # Insert new voter with default role 'user'
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

# ── Admin Registration Block BEGIN ──
# Admin registration is permanently disabled.
# Admins must be seeded directly in the database by a system administrator.
@app.post("/register-admin")
async def register_admin(voter: AdminRegister):
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            "Admin registration is disabled. "
            "Contact the system administrator to provision admin accounts."
        )
    )
# ── Admin Registration Block END ──

# ── Face Recognition Pydantic Model Begin ──
class FaceData(BaseModel):
    voter_id: str
    image: str
# ── Face Recognition Pydantic Model End ──

# ── Face Recognition Endpoints Begin ──

# POST /face/register — encode and store a voter's face
@app.post("/face/register")
async def face_register(data: FaceData):
    try:
        # Decode the base64 image (strip data URL prefix if present)
        image_b64 = data.image
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]

        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        # Save to a temp file for DeepFace (it works best with file paths)
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            image.save(tmp, format='JPEG')
            tmp_path = tmp.name

        # Extract facial encoding using DeepFace
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

        # Save encoding to database
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
        # Fetch stored face encoding and user data
        cursor.execute("SELECT face_encoding, role, password FROM voters_base WHERE voter_id = %s", (data.voter_id,))
        user_data = cursor.fetchone()

        if not user_data or not user_data[0]:
            raise HTTPException(status_code=404, detail="Face not registered")

        stored_encoding = numpy.array(json.loads(user_data[0]))
        role = user_data[1]
        password = user_data[2]

        # Decode the live image
        image_b64 = data.image
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]

        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        # Save to a temp file for DeepFace
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            image.save(tmp, format='JPEG')
            tmp_path = tmp.name

        # Extract live face encoding using DeepFace
        try:
            live_embeddings = DeepFace.represent(img_path=tmp_path, model_name='Facenet', enforce_detection=True)
        except ValueError:
            raise HTTPException(status_code=400, detail="No face detected in image")
        finally:
            os.unlink(tmp_path)

        if not live_embeddings:
            raise HTTPException(status_code=400, detail="No face detected in image")

        live_encoding = numpy.array(live_embeddings[0]['embedding'])

        # Compare faces using cosine distance (threshold 0.40 for Facenet model)
        cosine_distance = numpy.dot(stored_encoding, live_encoding) / (
            numpy.linalg.norm(stored_encoding) * numpy.linalg.norm(live_encoding)
        )
        is_match = cosine_distance > 0.60  # cosine similarity threshold

        if is_match:
            # Generate JWT — identical structure to /login
            token = jwt.encode({'password': password, 'voter_id': data.voter_id, 'role': role}, os.environ['SECRET_KEY'], algorithm='HS256')
            return {"token": token, "role": role}
        else:
            raise HTTPException(status_code=401, detail="Face authentication failed")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in face login: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Face Recognition Endpoints End ──
