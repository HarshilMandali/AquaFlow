import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import AnimatedCounter from './components/AnimatedCounter'
import ConnectWallet from './components/ConnectWallet'
import BlinkBlurB from './components/Loders'
import Nav from './components/Nav'
import Transact from './components/Transact'
import { SteamClient } from './contracts/Steam'
import { withdraw } from './methods'
import { getAlgodConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

interface WithdrawProps {}

const Withdraw: React.FC<WithdrawProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appId, setAppId] = useState<number>(0)
  const [inputAppId, setInputAppId] = useState<number | null>(null)
  const { activeAddress, signer } = useWallet()
  const [isStreaming, setIsStreaming] = useState<number>(0)
  // const [currentwithdrawAmount, setCurrentwithdrawAmount] = useState<number>(0)
  const [streamContractBalance, setStreamContractBalance] = useState<number>(0)
  const [streamStartTime, setStreamStartTime] = useState<string>()
  const [streamFinishTime, setStreamFinishTime] = useState<string>()
  const [streamFlowRate, setStreamFlowRate] = useState<number>(0)
  const [totalUserWithdraw, setTotalUserWithdraw] = useState<number>(0)
  const [reciverAddress, setReciverAddress] = useState<string>()
  const [epochStreamStartTime, setepochStreamStartTime] = useState<number>(0)
  const [animationDuration, setAnimationDuration] = useState<number>(0)
  const [userAccountBalance, setUserAccountBalance] = useState<number>()
  const [epochStreamfinishTime, setepochStreamfinishTime] = useState<number>(0)
  const [finalDisplayAmount, setFinalDisplayAmount] = useState<number>(0)

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = algokit.AlgorandClient.fromConfig({ algodConfig })
  algorand.setDefaultSigner(signer)

  const dmClient = new SteamClient(
    {
      resolveBy: 'id',
      id: appId,
      sender: { addr: activeAddress!, signer },
    },
    algorand.client.algod,
  )

  const handleAppIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputAppId = Number(event.target.value)

    setInputAppId(inputAppId)

    if (inputAppId > 0) {
      validateAppId(inputAppId)
    } else {
      toast.error('Please enter a valid number for the App ID.')
    }
  }

  const validateAppId = async (inputAppId: number) => {
    try {
      // Fetch the application details using the input app ID
      const appInfo = await algorand.client.algod.getApplicationByID(inputAppId).do()

      if (appInfo) {
        // If application exists, set the app ID
        setAppId(inputAppId)
        toast.success(`App ID ${inputAppId} is valid!`)
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          // If a 404 error occurs (application not found), show an error message
          toast.error('App ID does not exist. Please enter a valid App ID.')
          console.error('App ID not found:', error.message)
        } else {
          console.error('An error occurred while fetching the app ID:', error.message)
          toast.error('Failed to validate App ID. Please try again.')
        }
      }
    }
  }

  const handleWithdraw = async () => {
    if (activeAddress) {
      try {
        const withdrawConf = await withdraw(algorand, dmClient, activeAddress, appId)()
        if (withdrawConf?.success) {
          toast.success('Withdraw success')
        }
        await userBalanceFetch()
        await fetchContractGlobalStateData(dmClient)
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Rejected by user')) {
            console.error('Caught a user rejection error:', error.message)
            toast.error('Transaction rejected by user')
          } else {
            if (error.message.includes('opcodes=assert; ==; assert')) console.error('An error occurred during withdrawal:', error.message)
            toast.error('you are not allowed to withdraw')
          }
        } else {
          console.error('An unknown error occurred:', error)
          toast.error('An unknown error occurred')
        }
        console.error('Withdrawal failed', error)
      }
    }
  }

  // const streamendtime = async () => {
  //   await streamEndTime(algorand, dmClient, activeAddress!, appId)()
  // }  // Was used for accurate testing stream end time off-chain and on-chain

  // const currentWithdrawAmount = async () => {
  //   const availableAmount = await getCurrentWithdawamount(algorand, dmClient, activeAddress!, appId)()
  //   const availableAmountAlgo = availableAmount / 1000000
  //   setCurrentwithdrawAmount(availableAmountAlgo)
  // }
  //FIF
  const calculateAnimationDuration = () => {
    if (streamFlowRate > 0 && streamContractBalance > 0) {
      const totalAmount = Number(streamContractBalance) // Convert to Algos
      const totalDuration = (totalAmount / Number(streamFlowRate)) * 1000 // Duration in milliseconds

      //////
      const currentTime = Math.floor(Date.now() / 1000)

      if (currentTime >= epochStreamfinishTime) {
        // console.log('Stream has ended')
        // toast.info('Stream has ended')
        setAnimationDuration(0)
        setFinalDisplayAmount(streamContractBalance)
        return // Stop further calculations
      }

      const elapsedtime = currentTime - epochStreamStartTime
      // console.log('elapsedtime', elapsedtime)
      const TotalStreamed = elapsedtime * streamFlowRate * 1000000
      // console.log('TotalStreamed', TotalStreamed)
      const elapsedAmount = TotalStreamed - totalUserWithdraw * 1000000
      const FinalDisplayAmount = elapsedAmount / 1000000
      setFinalDisplayAmount(FinalDisplayAmount)
      // console.log('elapsedAmount', elapsedAmount / 1000000)
      //////
      setAnimationDuration(totalDuration)
    }
  }
  //FIF
  const fetchIsStreaming = async (steamAbiClient: SteamClient) => {
    if (activeAddress && appId > 0) {
      const streamData = await steamAbiClient.getGlobalState()
      const isStreaming = streamData.isStreaming?.asNumber() ?? 0
      setIsStreaming(isStreaming)
    }
  }
  //FIF
  const fetchContractGlobalStateData = async (steamAbiClient: SteamClient) => {
    if (activeAddress) {
      const streamData = await steamAbiClient.getGlobalState()
      const isStreaming = streamData.isStreaming?.asNumber() ?? 0
      const TotalContractbalance = streamData.balance?.asNumber() ?? 0
      const streamfinishTime = streamData.endTime?.asNumber() ?? 0
      const streamstartTime = streamData.startTime?.asNumber() ?? 0
      const streamalgoFlowRate = streamData.streamRate?.asNumber() ?? 0
      const TotalwithdrawAmount = streamData.withdrawnAmount?.asNumber() ?? 0
      setepochStreamfinishTime(streamfinishTime)
      setepochStreamStartTime(streamstartTime)
      //
      const recipientBytes = streamData.recipient?.asByteArray()
      if (recipientBytes) {
        const userAddress = algosdk.encodeAddress(new Uint8Array(recipientBytes))
        setReciverAddress(userAddress)
      } else {
        console.log('Recipient address not found or is invalid.')
        toast.error('Recipient address not found or is invalid')
      }

      // Convert in Algos
      const convTotalwithdrawAmount = TotalwithdrawAmount / 1000000
      const convstreamalgoFlowRate = streamalgoFlowRate / 1000000
      const convTotalContractbalance = TotalContractbalance / 1000000

      // Convert Unix timestamps to human-readable dates
      const formattedStreamStartTime = streamstartTime ? dayjs.unix(streamstartTime).format('MM/DD/YYYY, h:mm:ss A') : 'N/A'
      const formattedStreamFinishTime = streamfinishTime ? dayjs.unix(streamfinishTime).format('MM/DD/YYYY, h:mm:ss A') : 'N/A'

      setIsStreaming(isStreaming)
      setStreamContractBalance(convTotalContractbalance)
      setStreamStartTime(formattedStreamStartTime)
      setStreamFinishTime(formattedStreamFinishTime)
      setStreamFlowRate(convstreamalgoFlowRate)
      setTotalUserWithdraw(convTotalwithdrawAmount)
    }
  }
  //FIF frontend internal function
  const userBalanceFetch = async () => {
    const accountInfo = await algorand.client.algod.accountInformation(activeAddress!).do()
    const userBalance = accountInfo.amount
    setUserAccountBalance(userBalance / 1e6)
  }
  useEffect(() => {
    if (dmClient) {
      userBalanceFetch();
      if (appId > 0) {
        fetchIsStreaming(dmClient);
        fetchContractGlobalStateData(dmClient);
      }
    }
  }, [dmClient, appId ,activeAddress]);

  // Effect hook to continuously check the stream status
  useEffect(() => {
    if (Date.now() / 1000 < epochStreamfinishTime) {
      const interval = setInterval(() => {
        calculateAnimationDuration()
      }, 1000)
      return () => clearInterval(interval)
    }
    return () => {
      setFinalDisplayAmount(streamContractBalance)
      setAnimationDuration(0)
    }
  }, [isStreaming, epochStreamfinishTime, streamFlowRate, streamContractBalance])

  return (
    <div className="min-h-screen bg-custom-gradient">
      <center>
        <button
          data-test-id="connect-wallet"
          className="btn px-8 bg-purple-700 z-10 mt-2 right-2 hover:bg-purple-800 text-white pb-3 pt-2 text-xl rounded-2xl absolute "
          onClick={toggleWalletModal}
        >
          {!activeAddress ? 'Connect Wallet' : activeAddress && `Balance ${userAccountBalance} algos`}
        </button>
      </center>
      <div className="relative">
        <Nav />
      </div>
      <center>
        <div>
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </center>
      {/* <div className="text-center text-[18px] text-white rounded-2xl mt-8 border-solid border-2 border-white p-4 max-w-md backdrop-blur-[5px] bg-[rgba(21,6,29,0.62)] mx-auto">
        <div className="flex">
          <p className="">Balance </p>
          <p className="ml-auto">{userAccountBalance} Algos</p>
        </div>
      </div> */}

      <div className="text-center rounded-2xl mt-8 border-solid border-2 border-white p-4 max-w-md backdrop-blur-[5px] bg-[rgba(21,6,29,0.8)] mx-auto">
        <div className="max-w-md">
          <label className="block mb-2 text-lg font-medium text-gray-900 dark:text-white">Enter Your app ID</label>
          <input
            type="number"
            placeholder="Enter your AppId"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-[18px]  rounded-lg focus:ring-blue-500  focus:border-blue-500 block w-full p-3 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            value={inputAppId || ''}
            onChange={handleAppIdChange}
          ></input>
          {!activeAddress && (
            <button className="btn rounded-2xl bg-purple-700 hover:bg-purple-800 text-white  text-base mt-4" onClick={toggleWalletModal}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
      {activeAddress && appId > 0 && isStreaming === 1 && (
        <div className="mt-20 ml-[740px]">
          <div className="mb-11 flex">
            <h2 className="text-[22px] font-medium text-gray-900 dark:text-white mr-8">Flow Started</h2>
            <BlinkBlurB></BlinkBlurB>
            <div className="text-white ml-10 text-[22px] font-semibold ">
              <AnimatedCounter from={finalDisplayAmount} to={streamContractBalance} duration={animationDuration / 1000} />
            </div>
          </div>
        </div>
      )}
      {activeAddress && appId > 0 && isStreaming === 1 && (
        <div className="hero antialiased text-[21px]">
          <div className="backdrop-blur-[5px] bg-[rgba(44,33,59,0.48)]  p-4 rounded-2xl mt-5 mb-5 border-white border-solid border-2">
            <table className="border-3  text-gray-500 dark:text-gray-400">
              <tbody>
                {/* <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-1 ">Current Available Amount</th>
                  <th className="text-green-300 ml-auto mr-2 ">{currentwithdrawAmount} Algos</th>
                </tr> */}
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-1 ">Your Address</th>
                  <th className="text-white ml-32 mr-2 ">{reciverAddress}</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">TotalContractBalance</th>
                  <th className="text-green-400 ml-auto mt-1 mr-2 ">{streamContractBalance} Algos</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">StreamStartTime</th>
                  <th className="text-white ml-auto mt-1 mr-2 ">{streamStartTime}</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">StreamfinishTime</th>
                  <th className="text-white ml-auto mt-1 mr-2 ">{streamFinishTime}</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">AlgoFlowRate</th>
                  <th className="text-white ml-auto mt-1 mr-2 ">{streamFlowRate} P/Sec Algos</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">TotalWithdrawAmount</th>
                  <th className="text-red-400 ml-auto mt-1 mr-2 ">{totalUserWithdraw} Algos</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">ActiveStream</th>
                  <th className="text-green-300 ml-auto mt-1 mr-2 ">{isStreaming} </th>
                </tr>
              </tbody>
            </table>

            <div className="mt-3 mb-3">
              <center>
                {/* <button
                  className="btn rounded-2xl  font-medium text-[22px] mr-6 mt-4 bg-purple-700 hover:bg-purple-800 text-white"
                  onClick={currentWithdrawAmount}
                >
                  CheckAvailableAmount
                </button> */}

            <div className="relative group">
              <button
                className="btn text-[23px] px-52 mt-4 font-medium rounded-2xl bg-purple-700 hover:bg-purple-800 text-white"
                 onClick={handleWithdraw}
                >
               Withdraw
              </button>
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-center text-white bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              This action will withdraw funds.
              </span>
                </div>
              </center>
            </div>
          </div>
        </div>
      )}
      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
    </div>
  )
}

export default Withdraw
