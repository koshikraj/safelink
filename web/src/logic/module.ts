import { Contract, Interface, ZeroAddress, getBytes, parseEther} from "ethers";
import { ethers, utils } from 'ethersv5';   
import { BaseTransaction } from '@safe-global/safe-apps-sdk';
import { getSafeInfo, isConnectedToSafe, submitTxs } from "./safeapp";
import { isModuleEnabled, buildEnableModule, buildUpdateFallbackHandler } from "./safe";
import { getJsonRpcProvider, getProvider } from "./web3";
import Safe7579 from "./Safe7579.json"
import SpendLimitSession from "./SpendLimitSession.json"
import WebAuthnValidator from "./WebAuthnValidator.json"
import EntryPoint from "./EntryPoint.json"
import {  publicClient } from "./utils";
import {  buildUnsignedUserOpTransaction } from "@/utils/userOp";
import { createClient, http, Chain, Hex, pad} from "viem";
import { bundlerActions, ENTRYPOINT_ADDRESS_V07, UserOperation, getAccountNonce, getPackedUserOperation } from 'permissionless'
import {  createPimlicoPaymasterClient } from "permissionless/clients/pimlico";
import { pimlicoBundlerActions } from 'permissionless/actions/pimlico'
import {  sendUserOperation } from "./permissionless";

// const safe7579Module = "0xbaCA6f74a5549368568f387FD989C279f940f1A5"
const safe7579Module = "0x94952C0Ea317E9b8Bca613490AF25f6185623284"
const spendLimitModule = "0x396C9a7f004412f251B228fd4Fb63F243793b509"


export const getSessionData = async (chainId: string, sessionKey: string, token: string): Promise<any> => {


    const bProvider = await getJsonRpcProvider(chainId)

    const spendLimit = new Contract(
        spendLimitModule,
        SpendLimitSession.abi,
        bProvider
    )


    const sesionData = await spendLimit.sessionKeys(sessionKey, token);


    return sesionData;

}


function generateRandomString(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    return result;
}


/**
 * Generates a deterministic key pair from an arbitrary length string
 *
 * @param {string} string - The string to generate a key pair from
 * @returns {Object} - An object containing the address and privateKey
 */
export function generateKeysFromString(string: string) {
    const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(string)) // v5
    const wallet = new ethers.Wallet(privateKey)
    return {
        address: wallet.address,
        privateKey: privateKey,
    }
}



export const sendTransaction = async (chainId: string, recipient: string, amount: bigint, walletProvider: any, safeAccount: string): Promise<any> => {

    const bProvider = await getJsonRpcProvider(chainId)


    const abi = [
        'function execute(address sessionKey, address to, uint256 value, bytes calldata data) external',
      ]

    const execCallData = new Interface(abi).encodeFunctionData('execute', [walletProvider.address, recipient, amount, '0x' as Hex])

    const call = { target: spendLimitModule as Hex, value: 0, callData: execCallData as Hex }

    const key = BigInt(pad(spendLimitModule as Hex, {
        dir: "right",
        size: 24,
      }) || 0
    )
    
    const nonce = await getAccountNonce(publicClient(parseInt(chainId)), {
        sender: safeAccount as Hex,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        key: key
    })


    let unsignedUserOp = buildUnsignedUserOpTransaction(
        safeAccount as Hex,
        call,
        nonce,
      )

      const signUserOperation = async function signUserOperation(userOperation: UserOperation<"v0.7">) {

        const bProvider = await getJsonRpcProvider(chainId)
    
        const entryPoint = new Contract(
            ENTRYPOINT_ADDRESS_V07,
            EntryPoint.abi,
            bProvider
        )
        let typedDataHash = getBytes(await entryPoint.getUserOpHash(getPackedUserOperation(userOperation)))
        return await walletProvider.signMessage(typedDataHash) as `0x${string}`
    
    }

    const userOperationHash = await sendUserOperation(chainId, unsignedUserOp, signUserOperation )

    return userOperationHash;

}


const buildInitSafe7579 = async ( ): Promise<BaseTransaction> => {

    
    const info = await getSafeInfo()

    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId = (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)

    const safeValidator = new Contract(
        safe7579Module,
        Safe7579.abi,
        bProvider
    )

    return {
        to: safe7579Module,
        value: "0",
        data: (await safeValidator.initializeAccount.populateTransaction([], [], [], [], {registry: ZeroAddress, attesters: [], threshold: 0})).data
    }
}




const buildInstallValidator = async (): Promise<BaseTransaction> => {

    
    const info = await getSafeInfo()

    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId = (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)

    const safeValidator = new Contract(
        safe7579Module,
        Safe7579.abi,
        bProvider
    )

    return {
        to: info.safeAddress,
        value: "0",
        data: (await safeValidator.installModule.populateTransaction(1, spendLimitModule, '0x')).data
    }
}


const buildInstallExecutor = async ( ): Promise<BaseTransaction> => {

    
    const info = await getSafeInfo()

    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId = (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)

    const safeValidator = new Contract(
        safe7579Module,
        Safe7579.abi,
        bProvider
    )

    return {
        to: info.safeAddress,
        value: "0",
        data: (await safeValidator.installModule.populateTransaction(2, spendLimitModule, '0x')).data
    }
}






const buildAddSessionKey = async (sessionKey: string, token: string, amount: string, refreshInterval: number, validAfter: number, validUntil: number ): Promise<BaseTransaction> => {

    
    const info = await getSafeInfo()

    const sessionData = {account: info.safeAddress, validAfter: validAfter, validUntil: validUntil, limitAmount: parseEther(amount), limitUsed: 0, lastUsed: 0, refreshInterval: refreshInterval }

    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId = (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)

    const spendLimit = new Contract(
        spendLimitModule,
        SpendLimitSession.abi,
        bProvider
    )

    return {
        to: spendLimitModule,
        value: "0",
        data: (await spendLimit.addSessionKey.populateTransaction(sessionKey, token, sessionData)).data
    }
}





export const createSessionKey = async (token: string, amount: string, refreshInterval: number, validAfter: number, validUntil: number ): Promise<string> => {

    
    if (!await isConnectedToSafe()) throw Error("Not connected to a Safe")

    const info = await getSafeInfo()

    const txs: BaseTransaction[] = []

    const randomSeed = generateRandomString(18)

    const { address, privateKey } = generateKeysFromString(randomSeed);

    if (!await isModuleEnabled(info.safeAddress, safe7579Module)) {
        txs.push(await buildEnableModule(info.safeAddress, safe7579Module))
        txs.push(await buildUpdateFallbackHandler(info.safeAddress, safe7579Module))
        txs.push(await buildInitSafe7579())

        txs.push(await buildInstallValidator())
        txs.push(await buildInstallExecutor())
    }



    txs.push(await buildAddSessionKey(address, token, amount, refreshInterval, validAfter, validUntil))

    const provider = await getProvider()

    // Updating the provider RPC if it's from the Safe App.
    const chainId = (await provider.getNetwork()).chainId.toString()

    if (txs.length == 0) return '';
    await submitTxs(txs)

    return randomSeed;
}


