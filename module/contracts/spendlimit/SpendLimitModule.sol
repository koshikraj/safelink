// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import { ERC7579ValidatorBase } from "../module-bases/ERC7579ValidatorBase.sol";
import { PackedUserOperation } from
    "@account-abstraction/contracts/core/UserOperationLib.sol";

import { SignatureCheckerLib } from "solady/utils/SignatureCheckerLib.sol";
import { ECDSA } from "solady/utils/ECDSA.sol";
import { ExecutionLib } from "../safe7579/lib/ExecutionLib.sol";

import { ERC7579ExecutorBase } from "../module-bases/ERC7579ExecutorBase.sol";


contract SpendLimitModule is ERC7579ValidatorBase, ERC7579ExecutorBase {
    using SignatureCheckerLib for address;
    using ExecutionLib for bytes;

    // SessionKey -> token -> SessionData
    mapping(address => mapping(address => SessionData)) public sessionKeys;

    struct SessionData {

        address account;
        uint48 validAfter;
        uint48 validUntil;

        uint256 limitAmount;
        uint256 limitUsed;

        uint48 lastUsed;
        uint48 refreshInterval;
    }

            
    event SessionKeyAdded(address indexed sessionKey, address indexed account);

    error ExecutionFailed();

    function onInstall(bytes calldata data) external override {
    }

    function onUninstall(bytes calldata) external override {

        // delete the Safe account sessions
    }

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    )
        external
        view
        override
        returns (ValidationData)
    {

        // Extract the execution calldata from the user operation.
        bytes calldata executionCalldata = userOp.callData[100:];

        // Extract the target address and the session key from the execution calldata.
        (address target , uint256 value, bytes calldata callData) = executionCalldata.decodeSingle();

        address sessionKey = address(bytes20(callData[16:]));

        // Check if the session key is valid.
        bool validSig =  sessionKey.isValidSignatureNow(
            ECDSA.toEthSignedMessageHash(userOpHash), userOp.signature
        );
        return _packValidationData(!validSig, type(uint48).max, 0);
    }

    function isValidSignatureWithSender(
        address,
        bytes32 hash,
        bytes calldata data
    )
        external
        view
        override
        returns (bytes4)
    {

        //Implement the session key sig validation

        // return SignatureCheckerLib.isValidSignatureNowCalldata(owner, hash, data)
        //     ? EIP1271_SUCCESS
        //     : EIP1271_FAILED;
    }


    /**
     * @dev Adds a session key to the mapping.
     */
    // Add a session key to the mapping
    function addSessionKey(address sessionKey, address token, SessionData calldata sessionData) public  {

        sessionKeys[sessionKey][token] =  sessionData; 
        sessionKeys[sessionKey][token].account =  msg.sender; 
        emit SessionKeyAdded(sessionKey, msg.sender);

    }


    /**
     * @dev Executes a transaction on behalf of a session.
     * @param sessionKey The session key associated with the transaction.
     * @param to The address to which the transaction is being sent.
     * @param value The amount of ether to send with the transaction.
     * @param data The data to include with the transaction.
     * @return The result of the transaction execution.
     */
    function execute(address sessionKey, address to, uint256 value, bytes calldata data) public returns (bytes memory) {

            address token = value == 0 ? to : address(0);
            uint256 value = value == 0 ? _getTokenSpendAmount(data) : value;


            if(!updateSpendLimitUsage(value, sessionKey, token))  {
            revert ExecutionFailed();
            }

            SessionData memory sessionData = sessionKeys[sessionKey][token];
            return _execute(msg.sender, to, value, data);


        }

        function _getTokenSpendAmount(bytes memory callData) internal pure returns (uint256) {

        // Expected length: 68 bytes (4 selector + 32 address + 32 amount)
        if (callData.length < 68) {
            return 0;
        }

        // Load the amount being sent/approved.
        // Solidity doesn't support access a whole word from a bytes memory at once, only a single byte, and
        // trying to use abi.decode would require copying the data to remove the selector, which is expensive.
        // Instead, we use inline assembly to load the amount directly. This is safe because we've checked the
        // length of the call data.
        uint256 amount;
        assembly ("memory-safe") {
            // Jump 68 words forward: 32 for the length field, 4 for the selector, and 32 for the to address.
            amount := mload(add(callData, 68))
        }
        return amount;
        
        // Unrecognized function selector
        return 0;
    }

    function updateSpendLimitUsage(
        uint256 newUsage,
        address sessionKey,
        address token
    ) internal returns (bool) {


            SessionData storage sessionData = sessionKeys[sessionKey][token];
            

            uint48 refreshInterval =  sessionData.refreshInterval;
            uint48 lastUsed = sessionData.lastUsed;
            uint256 spendLimit = sessionData.limitAmount;
            uint256 currentUsage = sessionData.limitUsed;

        
        if(block.timestamp < sessionData.validAfter || block.timestamp > sessionData.validUntil) {
            return false;
        }


        if (refreshInterval == 0 || lastUsed + refreshInterval > block.timestamp) {
            // We either don't have a refresh interval, or the current one is still active.

            // Must re-check the limits to handle changes due to other user ops.
            // We manually check for overflows here to give a more informative error message.
            uint256 newTotalUsage;
            unchecked {
                newTotalUsage = newUsage + currentUsage;
            }
            if (newTotalUsage < newUsage || newTotalUsage > spendLimit) {
                // If we overflow, or if the limit is exceeded, fail here and revert in the parent context.
                return false;
            }

            // We won't update the refresh interval last used variable now, so just update the spend limit.
            sessionData.limitUsed = newTotalUsage;
        } else {
            // We have a interval active that is currently resetting.
            // Must re-check the amount to handle changes due to other user ops.
            // It only needs to fit within the new refresh interval, since the old one has passed.
            if (newUsage > spendLimit) {
                return false;
            }

            // The refresh interval has passed, so we can reset the spend limit to the new usage.
            sessionData.limitUsed = newUsage;
            sessionData.lastUsed = uint48(block.timestamp);
        }

        return true;
    }


    function name() external pure returns (string memory) {
        return "SpendLimitSession";
    }

    function version() external pure returns (string memory) {
        return "0.0.1";
    }

    function isModuleType(uint256 typeID) external pure override returns (bool) {
        return typeID == TYPE_VALIDATOR || typeID == TYPE_EXECUTOR;
    }

    function isInitialized(address smartAccount) external view returns (bool) { }
}
