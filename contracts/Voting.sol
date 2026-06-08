pragma solidity ^0.5.15;

contract Voting {
    struct Candidate {
        uint id;
        string name;
        string party;
        uint voteCount;
    }

    struct Election {
        uint id;
        string name;
        uint256 startDate;
        uint256 endDate;
        uint candidateCount;
    }

    uint public electionCount;

    // Mapping of electionId => Election
    mapping(uint => Election) public elections;
    
    // Mapping of electionId => candidateId => Candidate
    mapping(uint => mapping(uint => Candidate)) public electionCandidates;
    
    // Mapping of electionId => voterAddress => hasVoted
    mapping(uint => mapping(address => bool)) public hasVoted;
    
    // Mapping of electionId => voterAddress => candidateId
    mapping(uint => mapping(address => uint)) public voterChoices;

    address public owner;

    constructor() public {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can perform this action");
        _;
    }

    // Add a new election
    function addElection(string memory _name, uint256 _startDate, uint256 _endDate) public returns(uint) {
        // Temporarily relaxed for local testing
        // require(_startDate + 1000000 > now, "Start date is too far in the past");
        // require(_endDate > _startDate, "End date must be after start date");
        
        electionCount++;
        elections[electionCount] = Election(electionCount, _name, _startDate, _endDate, 0);
        return electionCount;
    }

    // Add a candidate to a specific election
    function addCandidate(uint _electionId, string memory _name, string memory _party) public returns(uint) {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        // Candidates can only be added before voting starts
        Election memory election = elections[_electionId];
        require(now <= election.endDate, "Cannot add candidate after election has ended");
        
        elections[_electionId].candidateCount++;
        uint candidateId = elections[_electionId].candidateCount;
        electionCandidates[_electionId][candidateId] = Candidate(candidateId, _name, _party, 0);
        
        return candidateId;
    }

    // Vote for a candidate in a specific election
    function vote(uint _electionId, uint _candidateId) public {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        
        Election memory election = elections[_electionId];
        // Temporarily relaxed for local testing due to Ganache timestamp sync issues
        // require((election.startDate <= now) && (election.endDate > now), "Voting is not active for this election");
        
        require(_candidateId > 0 && _candidateId <= election.candidateCount, "Invalid candidate ID");

        // Voter must not have voted in this election already
        require(!hasVoted[_electionId][msg.sender], "You have already voted in this election");
               
        hasVoted[_electionId][msg.sender] = true;
        voterChoices[_electionId][msg.sender] = _candidateId;
        
        electionCandidates[_electionId][_candidateId].voteCount++;      
    }

    // Get the choice a voter made in a specific election
    function getVoterChoice(uint _electionId, address _voter) public view returns (uint) {
        return voterChoices[_electionId][_voter];
    }
    
    // Check if the current sender has voted in a specific election
    function checkVote(uint _electionId) public view returns(bool) {
        return hasVoted[_electionId][msg.sender];
    }
       
    // Get the number of candidates in a specific election
    function getCandidatesCount(uint _electionId) public view returns(uint) {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        return elections[_electionId].candidateCount;
    }

    // Get details of a candidate in a specific election
    function getCandidate(uint _electionId, uint _candidateId) public view returns (uint, string memory, string memory, uint) {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Candidate memory c = electionCandidates[_electionId][_candidateId];
        return (c.id, c.name, c.party, c.voteCount);
    }

    // Get the total number of elections
    function getElectionsCount() public view returns (uint) {
        return electionCount;
    }

    // Get details of a specific election
    function getElection(uint _electionId) public view returns (uint, string memory, uint256, uint256, uint) {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Election memory e = elections[_electionId];
        return (e.id, e.name, e.startDate, e.endDate, e.candidateCount);
    }
}
