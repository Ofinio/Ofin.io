// SPDX-License-Identifier: Copyright@ofin.io
/**
 * ░▄▀▄▒█▀░█░█▄░█░░░▀█▀░▄▀▄░█▄▀▒██▀░█▄░█
 * ░▀▄▀░█▀░█░█▒▀█▒░░▒█▒░▀▄▀░█▒█░█▄▄░█▒▀█
 * 
 * URL: https://ofin.io/
 * Symbol: ON
 * 
 */

 pragma solidity 0.6.12;
 pragma experimental ABIEncoderV2;

//  import "./TokenTimelock.sol";
 import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
 import "@openzeppelin/contracts/math/SafeMath.sol";
 import "@openzeppelin/contracts/access/AccessControl.sol";
//  import "./interfaces/IOFINToken.sol";
import "./OFINToken.sol";

/**
* @dev This contract handles allotment of OFIN Token
*/
 contract OFINAllotment is AccessControl {

    struct TokenTimelock {
        address _beneficiary;
        uint256 _releaseTime;
        uint256 _tokenCount;
        string _name;
    }
    
    using SafeERC20 for OFINToken;
    // using SafeERC20 for IOFINToken;
    using SafeMath for uint256;

    // OFIN token Contract
    // IOFINToken private _ofinToken;
    OFINToken private _ofinToken;

    bytes32 public constant ALLOTER_ROLE = keccak256("ALLOTER_ROLE");
    
    mapping( address => TokenTimelock[] ) private beneficiaryAllotments;
    address[] private beneficiaries;

    event TokenVested(address indexed vestingContract, address indexed beneficiary, uint256 indexed tokenCount);
    event TokenReleased(address indexed vestingContract, address indexed beneficiary, uint256 indexed tokenCount);
    event AllotmentVestTimeUpdated(address indexed vestingContract, address indexed beneficiary, uint256 indexed newReleaseTime);

    /**
     * @dev Initialize the contract with OFIN token address
     *
     * @param ofinToken - OFIN Token address
     * 
     */
    constructor(address ofinToken) public {
        require(ofinToken != address(0), "OFINAllotment: token is zero address");

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(ALLOTER_ROLE, _msgSender());

        // Set OFIN ERC20 token Contract
        // _ofinToken = IOFINToken(ofinToken);
        _ofinToken = OFINToken(ofinToken);
    }

    /**
    * @dev Get OFIN token contract address.
    *
    * @return account - Address of OFIN Token contract
    */
    function getOFINTokenContract() public view returns (address) {
        return address(_ofinToken);
    }

    /**
    * @dev Grant alloter role.
    * @param account - Address of the alloter to be granted the role
    * Requirements:
    *
    * - the caller must have the admin role.
    */
    function grantAlloterRole(address account) public {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "OFINAllotment: sender must be an admin to grant");
        super.grantRole(ALLOTER_ROLE, account);
    }

    /**
    * @dev create allotments and freeze tokens
    * @param beneficiary - Address of the beneficiary
    * @param releaseTime - time in the future till when it is locked
    * Requirements:
    *
    * - the caller must have the alloter role. 
    */
    function allotTokens(address beneficiary, uint256 releaseTime, uint256 tokenCount, string calldata name) external {
        
        require(hasRole(ALLOTER_ROLE, _msgSender()), "OFINAllotment: sender must be an alloter to allot tokens");
        require(beneficiary != address(0), "OFINAllotment: beneficiary is zero address");
        require(bytes(name).length != 0,"OFINAllotment: name length cannot be zero");

        TokenTimelock memory allotment = TokenTimelock({ _beneficiary: beneficiary, _releaseTime: releaseTime,_tokenCount: tokenCount, _name: name});

        _ofinToken.mint(address(this), tokenCount);

        beneficiaries.push(beneficiary);
        
        beneficiaryAllotments[beneficiary].push( allotment);

        emit TokenVested(address(this), beneficiary, tokenCount);
    }

    /**
    * @dev sets the release time
    * @param beneficairy - Address of the TokenTimeLock
    * @param newReleaseTime - time in the future till when it is locked
    * Requirements:
    *
    * - the caller must have the alloter role. 
    */
    function setNewReleaseTime( address beneficairy, string calldata name, uint256 newReleaseTime) external {
        
        require(hasRole(ALLOTER_ROLE, _msgSender()), "OFINAllotment: sender must be an alloter to extend release time");
        require(beneficairy != address(0), "OFINAllotment: benficairy contract is zero address");
        require(bytes(name).length != 0,"OFINAllotment: name length cannot be zero");

        TokenTimelock[] storage myAllotments = beneficiaryAllotments[beneficairy];
        for(uint i =0; i< myAllotments.length; i++ ){
            TokenTimelock storage allotment = myAllotments[i];
            if(keccak256(abi.encodePacked(allotment._name)) == keccak256(abi.encodePacked(name))){
                require(newReleaseTime >= allotment._releaseTime, "TokenTimelock: newReleaseTime should be greater than older value");
                allotment._releaseTime = newReleaseTime;

                emit AllotmentVestTimeUpdated( address(this), allotment._beneficiary, allotment._releaseTime );
                break;                
            }
        }
    }

    /**
    * @dev releases the specified allotment if applicable
    * @param beneficairy - Address of the TokenTimeLock
    * @param name - allotment name
    */
    function releaseBeneficiaryAllotment(address beneficairy, string memory name ) public {
        require(beneficairy != address(0), "OFINAllotment: benficairy contract is zero address");
        require(bytes(name).length != 0,"OFINAllotment: name length cannot be zero");

        TokenTimelock[] storage myAllotments = beneficiaryAllotments[beneficairy];
        for(uint i =0; i< myAllotments.length; i++ ){
            TokenTimelock storage allotment = myAllotments[i];
            if(keccak256(abi.encodePacked(allotment._name)) == keccak256(abi.encodePacked(name))){

                require(block.timestamp >= allotment._releaseTime, "TokenTimelock: current time is before release time");
                uint256 amount = allotment._tokenCount;
                address beneficiary = allotment._beneficiary;
                allotment._tokenCount = 0;

                _ofinToken.safeTransfer(beneficiary, amount);
                emit TokenReleased(address(this), beneficiary, amount );

                break;                
            }
        }

    }

    /**
    * @dev releases the specified allotment if applicable for the sender
    * @param name - allotment name
    */
    function releaseAllotment(string calldata name ) external {
        releaseBeneficiaryAllotment(_msgSender(), name);
    }

    /**
    * @dev gets all the beneficiary address
    */
    function getAllBeneficiaries() external view returns (address[] memory ){
        return beneficiaries;
    }

    /**
    * @dev gets all benefeciary allotments
    */
    function getBeneficiaryAllotments(address beneficiary) external view returns (TokenTimelock[] memory ){
        return beneficiaryAllotments[beneficiary];
    }

    /**
    * @dev gets all senders allotments
    */
    function getAllotments() external view returns (TokenTimelock[] memory ){
        return beneficiaryAllotments[_msgSender()];
    }

    /**
    * @dev gets sender's total balance (released + locked)
    */
    function getTotalBalance() external view returns (uint256 ){
        TokenTimelock[] memory myAllotments = beneficiaryAllotments[_msgSender()];
        uint256 balance = _ofinToken.balanceOf(_msgSender());

        for(uint i =0; i< myAllotments.length; i++ ){
            balance.add(myAllotments[i]._tokenCount);
        }

        return balance;
    }
}