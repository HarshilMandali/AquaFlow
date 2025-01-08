import * as algokit from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import { SteamClient } from './contracts/Steam'

const validateAppId = async (appId: number) => {
  try {
    // Fetch the application information from Algorand network
    const appInfo = await algosdk.getApplicationAddress(appId)

    // If the app exists, return true
    return appInfo ? true : false
  } catch (error) {
    console.error('Invalid App ID:', error)
    return false
  }
}

export function create(algorand: algokit.AlgorandClient, steamAbiClient: SteamClient, sender: string, setAppId: (id: number) => void) {
  return async () => {
    const createResult = await steamAbiClient.create.createApplication({})
    setAppId(Number(createResult.appId))
    console.log(createResult.appId)
    console.log(createResult.appAddress)
  }
}

// Method.ts code for methods calls info

// Helper to get contract's address from app ID
const getApplicationAddress = (appId: number): string => {
  return algosdk.getApplicationAddress(appId)
}

function convertToMicroAlgos(algos: bigint | number): bigint {
  return BigInt(algos) // Return the input value directly
}

export function startStream(
  algorand: algokit.AlgorandClient,
  steamAbiClient: SteamClient,
  sender: string,
  streamRate: bigint,
  recipient: string,
  amount: bigint,
  appId: number,
) {
  return async () => {
    try {
      const streamRateInMicroAlgos = convertToMicroAlgos(streamRate)
      const appAddress = getApplicationAddress(appId)
      const algoAmount = algokit.microAlgos(Number(amount) + 100000) // for min bal
      // console.log('after Stream Rate:', streamRate)
      // console.log('After Amount:', algoAmount)

      // Start the stream
      const startStreamResult = await steamAbiClient.startStream({ recipient, rate: streamRateInMicroAlgos, amount: amount })

      console.log('Return Params==>', startStreamResult.return)

      // Create payment transaction

      const paymentTxn = await algorand.send.payment({
        sender, // Sender's address (wallet)
        receiver: appAddress, // The smart contract's app address
        amount: algoAmount, // Amount to transfer to the contract
      })
      // console.log('Payment transaction ID:', paymentTxn.txIds)
      // console.log('Payment transaction sent:', paymentTxn.returns)

      // console.log('before Stream Rate:', streamRateInMicroAlgos)
      // console.log('before Amount:', amount)

      // Log contract state after starting the stream
      const streamData = await steamAbiClient.getGlobalState()
      const balance = streamData.balance?.asNumber()
      const endTime = streamData.endTime?.asNumber()
      const isStreaming = streamData.isStreaming?.asNumber()
      const TotalWithdraw = streamData.withdrawnAmount?.asNumber()
      const StreamStartTime = streamData.lastStartTime?.asNumber()
      const recipitentAccount = streamData.recipient?.asString()
      const streamRateData = streamData.streamRate?.asNumber()
      // console.log('SreamRateData =>', streamRateData)
      // console.log('ReciverAccount=>', recipitentAccount)
      // console.log('LastStartTime', StreamStartTime)
      // console.log('Total Amount withdraw', TotalWithdraw)
      // console.log('Balance Left:', balance)
      // console.log('Stream End Time:', endTime)
      // console.log('Is Streaming:', isStreaming)
    } catch (error) {
      console.error('Failed to start stream:', error)
    }
  }
}

export function withdraw(algorand: algokit.AlgorandClient, steamAbiClient: SteamClient, sender: string, appId: number) {
  return async () => {
    try {
      const appAddress = getApplicationAddress(appId)
      console.log('App ID:', appAddress)

      // Fetch suggested transaction parameters (includes fee, first valid, etc.)
      const suggestedParams = await algorand.getSuggestedParams()
      // console.log('Suggested Transaction Params:', suggestedParams)

      // Prompt user for a fee
      const userFee = parseFloat('0.01')

      // Validate user fee input
      if (isNaN(userFee) || userFee <= 0) {
        console.error('Invalid fee provided. Please enter a positive number.')
        return
      }

      // Perform the withdraw operation with the appropriate send parameters
      const withdrawResult = await steamAbiClient.withdraw(
        {
          suggestedParams: {
            sendParams: {
              firstRound: suggestedParams.firstRound,
              lastRound: suggestedParams.lastRound,
              genesisID: suggestedParams.genesisID,
              genesisHash: suggestedParams.genesisHash,
            },
          },
        },
        {
          sendParams: {
            fee: algokit.algos(userFee),
          },
        },
      )

      // Check for confirmation
      if (withdrawResult.confirmation) {
        // console.log('Withdrawal Successful:', withdrawResult.confirmation)
        const streamData = await steamAbiClient.getGlobalState()
        // console.log('Stream Data:', streamData) // Log the entire streamData object for inspection
        const balance = streamData.balance?.asNumber()
        const endTime = streamData.endTime?.asNumber()
        const isStreaming = streamData.isStreaming?.asNumber()
        const TotalWithdraw = streamData.withdrawnAmount?.asNumber()
        const StreamStartTime = streamData.lastStartTime?.asNumber()
        const recipitentAccount = streamData.recipient?.asString()
        const streamRateData = streamData.streamRate?.asNumber()
        // console.log('SreamRateData =>', streamRateData)
        // console.log('ReciverAccount=>', recipitentAccount)
        // console.log('LastStartTime', StreamStartTime)
        // console.log('Total Amount withdraw', TotalWithdraw)
        // console.log('Balance Left:', balance)
        // console.log('Stream End Time:', endTime)
        // console.log('Is Streaming:', isStreaming)
        return { success: true }
      } else {
        throw new Error('Withdrawal failed: No confirmation received.')
      }
    } catch (error) {
      console.error('Error during withdrawal:', error)
      throw error
    }
  }
}

export function stopStream(
  algorand: algokit.AlgorandClient,
  steamAbiClient: SteamClient,
  sender: string,
  appId: number,
  recipient: string,
) {
  return async () => {
    try {
      console.log('recipientaccount')
      const internalTransactions: Array<{ amount: number; receiver: string }> = []
      const appAddress = getApplicationAddress(appId)
      const stopStreamM = await steamAbiClient.stopStream({}, { sendParams: { fee: algokit.algos(0.01), populateAppCallResources: true } })
      const streamData = await steamAbiClient.getGlobalState()
      // console.log('StopStream confirmations=>', stopStreamM.confirmations)
      // Check if there are inner transactions
      if (stopStreamM.confirmations && stopStreamM.confirmations.length > 0) {
        const confirmation = stopStreamM.confirmations[0]

        // Check if inner transactions exist
        if (confirmation.innerTxns && confirmation.innerTxns.length > 0) {
          console.log(`Found ${confirmation.innerTxns.length} internal transactions:`)

          // Loop through each internal transaction and log its details
          confirmation.innerTxns.forEach((innerTxn, index) => {
            console.log(`Internal Transaction ${index + 1}:`)
            const txnDetails = innerTxn.txn
            const amount = Number(txnDetails.txn.amt) / 1000000
            const receiver = algosdk.encodeAddress(txnDetails.txn.rcv as any)

            internalTransactions.push({
              amount,
              receiver,
            })

            console.log('Amount:', Number(txnDetails.txn.amt) / 1000000)
            console.log('Sender:', algosdk.encodeAddress(txnDetails.txn.snd))
            // console.log('ReceiverEncodeLease:', algokit.encodeLease(txnDetails.txn.rcv))
            console.log('First valid round:', txnDetails.txn.fv)
            console.log('Last valid round:', txnDetails.txn.lv)
          })
        } else {
          console.log('No internal transactions found.')
        }
      } else {
        console.log('No confirmations found.')
      }
      return internalTransactions
    } catch (error) {
      throw error
    }
  }
}

export function streamEndTime(algorand: algokit.AlgorandClient, steamAbiClient: SteamClient, sender: string, appId: number) {
  return async () => {
    const appAddress = getApplicationAddress(appId)
    const streamendTime = await steamAbiClient.getStreamEndTime({})
    console.log('steam End time=>', streamendTime.return?.toString())
  }
}

export function getCurrentWithdawamount(algorand: algokit.AlgorandClient, steamAbiClient: SteamClient, sender: string, appId: number) {
  return async () => {
    const withdrawAmount = await steamAbiClient.getWithdrawAmount({})
    console.log('CurrentWithdrawAmount', withdrawAmount.return?.toString())
    return Number(withdrawAmount.return?.toString() || 0)
  }
}

export function deleteStreamApplication(algorand: algokit.AlgorandClient, steamAbiClient: SteamClient, sender: string, appId: number) {
  return async () => {
    const deleteAapp = await steamAbiClient.delete.deleteContract(
      {},
      { sendParams: { fee: algokit.algos(0.01), populateAppCallResources: true } },
    )
    console.log('DeleteappConformations', deleteAapp.confirmations)
    return deleteAapp.confirmations
  }
}
