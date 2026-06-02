import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from web3 import Web3
from eth_account import Account
import contract_abi

router = APIRouter(prefix="/blockchain", tags=["blockchain"])

ALCHEMY_URL = os.environ.get("ALCHEMY_SEPOLIA_URL", "https://eth-sepolia.g.alchemy.com/v2/Sww_YrFt6ACHf-3163yZx")
MNEMONIC = os.environ.get("MNEMONIC", "05c4aebfba3758c262e19c1e3abed6ca0104d3928ec2cdd35af8e7c111c3fba0")
CONTRACT_ADDRESS = "0xb5efD0ad02AC07B1289e0fd6777724e827df2755"

w3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))
account = Account.from_key(MNEMONIC) if MNEMONIC else None

if not w3.is_connected():
    print("Warning: Web3 is not connected to Alchemy.")
else:
    print("Connected to Alchemy Sepolia")

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi.ABI)

def send_transaction(func, *args):
    if not account:
        raise HTTPException(status_code=500, detail="Server private key not configured")
    try:
        nonce = w3.eth.get_transaction_count(account.address)
        tx = func(*args).build_transaction({
            'chainId': 11155111,
            'gas': 2500000,
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
        })
        signed_tx = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        if receipt.status != 1:
            raise HTTPException(status_code=500, detail="Transaction failed on blockchain")
        return receipt
    except Exception as e:
        print(f"Transaction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AddElectionReq(BaseModel):
    name: str
    startDate: int
    endDate: int

@router.post("/add-election")
def add_election(req: AddElectionReq):
    receipt = send_transaction(contract.functions.addElection, req.name, req.startDate, req.endDate)
    return {"status": "success", "tx_hash": receipt.transactionHash.hex()}

class AddCandidateReq(BaseModel):
    electionId: int
    name: str
    party: str

@router.post("/add-candidate")
def add_candidate(req: AddCandidateReq):
    receipt = send_transaction(contract.functions.addCandidate, req.electionId, req.name, req.party)
    return {"status": "success", "tx_hash": receipt.transactionHash.hex()}

@router.get("/elections-count")
def get_elections_count():
    count = contract.functions.getElectionsCount().call()
    return {"count": count}

@router.get("/election/{election_id}")
def get_election(election_id: int):
    try:
        data = contract.functions.getElection(election_id).call()
        return {
            "id": data[0],
            "name": data[1],
            "startDate": data[2],
            "endDate": data[3],
            "candidateCount": data[4]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/candidates-count/{election_id}")
def get_candidates_count(election_id: int):
    count = contract.functions.getCandidatesCount(election_id).call()
    return {"count": count}

@router.get("/candidate/{election_id}/{candidate_id}")
def get_candidate(election_id: int, candidate_id: int):
    data = contract.functions.getCandidate(election_id, candidate_id).call()
    
    # Option A: Get vote count from MySQL database
    import main
    cnx, cursor = main.get_db()
    cursor.execute("SELECT COUNT(*) FROM votes WHERE election_id = %s AND candidate_id = %s", (election_id, candidate_id))
    db_vote_count = cursor.fetchone()[0]
    
    return {
        "id": data[0],
        "name": data[1],
        "party": data[2],
        "voteCount": db_vote_count
    }

class VoteReq(BaseModel):
    electionId: int
    candidateId: int
    voterId: str

@router.post("/vote")
def vote(req: VoteReq):
    import main
    cnx, cursor = main.get_db()
    
    # Check if voter already voted
    cursor.execute("SELECT id FROM votes WHERE election_id = %s AND voter_id = %s", (req.electionId, req.voterId))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="You have already voted in this election")
        
    # Insert vote
    cursor.execute(
        "INSERT INTO votes (voter_id, election_id, candidate_id) VALUES (%s, %s, %s)",
        (req.voterId, req.electionId, req.candidateId)
    )
    cnx.commit()
    
    return {"status": "success", "message": "Vote recorded successfully"}

@router.get("/check-vote/{election_id}/{voter_id}")
def check_vote(election_id: int, voter_id: str):
    import main
    cnx, cursor = main.get_db()
    cursor.execute("SELECT id FROM votes WHERE election_id = %s AND voter_id = %s", (election_id, voter_id))
    has_voted = cursor.fetchone() is not None
    return {"hasVoted": has_voted}

@router.get("/voter-choice/{election_id}/{voter_id}")
def voter_choice(election_id: int, voter_id: str):
    import main
    cnx, cursor = main.get_db()
    cursor.execute("SELECT candidate_id FROM votes WHERE election_id = %s AND voter_id = %s", (election_id, voter_id))
    row = cursor.fetchone()
    if row:
        return {"candidateId": row[0]}
    return {"candidateId": 0}
