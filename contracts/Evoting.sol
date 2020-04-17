pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

contract Evoting {
    struct Voter{
        uint256 pool_id; // 0 - disabled / voting forbidden
        uint256 vote_height; // height == ElectionsCount => already voted on current elections
    }
    struct Candidate {
        uint256 id; //Start with 1
        string name;
        uint256 voteCount;
    }
    struct Election {
        uint256 id; //Start with 1
        string name;
        uint256 voteCount;
        uint256 voteStart; //timestamp as seconds since unix epoch
        uint256 voteEnd; //timestamp as seconds since unix epoch
        uint256 CandidatesCount;
        mapping(uint256 => Candidate) Candidates;
    }

    mapping(address => Voter) public Voters;
    mapping(uint256 => Election) public Elections;
    uint256 public ElectionsCount;
    uint256 public VotersCount;

    constructor() public {
    }

    function addElections (string memory _name, bytes32[] memory _candidates, uint256 _candidatesCount, uint256 _durationSeconds) public {
        ElectionsCount++;      
        Elections[ElectionsCount] = Election(
            ElectionsCount,
             _name,
             0,
             block.timestamp + 0,
             block.timestamp + _durationSeconds,
             0
             );

        for (uint i=0; i<_candidatesCount; i++) {
            addCandidate(bytes32ToString(_candidates[i]));
        }
    }
    function addCandidate(string memory _name) private {
        Elections[ElectionsCount].CandidatesCount++;        
        Elections[ElectionsCount].Candidates[Elections[ElectionsCount].CandidatesCount] = Candidate(Elections[ElectionsCount].CandidatesCount, _name, 0);
    }
    function GetCandidate(uint256 _idElection, uint256 _idCandidate) public view returns (
        uint256, 
        string memory,
        uint256) {              
        return (Elections[_idElection].Candidates[_idCandidate].id,
        Elections[_idElection].Candidates[_idCandidate].name,
        Elections[_idElection].Candidates[_idCandidate].voteCount
        );
    }
    function RegisterVoter(address _voterAddress, uint256 pool_id) public {
        require(Voters[_voterAddress].vote_height == 0, "Voter already registered!");
        VotersCount++;
        Voters[_voterAddress] = Voter(pool_id, 0);
    }
    function BanVoter(address _voterAddress) public {
        require(Voters[_voterAddress].pool_id > 0, "Voter already banned or never registered!");
        VotersCount--;
        Voters[_voterAddress].pool_id = 0;
    }
    function CanVote(address _voterAddress) public view returns (bool) {
        if(Voters[_voterAddress].pool_id <= 0)
            return false;
        return true;
    }
    function HasVoted(address _voterAddress) public view returns (bool) {
        if(Voters[_voterAddress].vote_height >= ElectionsCount)
            return true;
        return false;
    }
    function Vote(uint256 _candidateId) public {
        require(
            Elections[ElectionsCount].voteStart <= block.timestamp,
            "Not allowed, voting has not yet started!"
        );

        require(Elections[ElectionsCount].voteEnd >= block.timestamp, "Not allowed, voting has ended!");

        require(CanVote(msg.sender), "Not allowed, your address is not eligible to vote!");

        require(!HasVoted(msg.sender), "Not allowed, already voted on this elections!");

        require(
            _candidateId > 0 && _candidateId <= Elections[ElectionsCount].CandidatesCount,
            "Candidate does not exist!"
        );

        Voters[msg.sender].vote_height = ElectionsCount;

        Elections[ElectionsCount].Candidates[_candidateId].voteCount++;
    }

    function bytes32ToString(bytes32 _bytes32) public pure returns (string memory) { //Helper function
        uint8 i = 0;
        while(i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }
}
