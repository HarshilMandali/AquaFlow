// src/components/Home.tsx
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import algosdk from 'algosdk'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import AnimatedCounter from './components/AnimatedCounter'
import ConnectWallet from './components/ConnectWallet'
import BlinkBlurB from './components/Loders'
import Nav from './components/Nav'
import Transact from './components/Transact'
import { SteamClient } from './contracts/Steam'
import { create, deleteStreamApplication, startStream, stopStream } from './methods'
import { getAlgodConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appId, setAppId] = useState<number>(0)
  const [inputAppId, setInputAppId] = useState<number | null>(null)
  const { activeAddress, signer } = useWallet()
  const [streamRate, setStreamRate] = useState<bigint>(0n)
  const [isStreaming, setIsStreaming] = useState<number>(0)
  const [loding, setLoding] = useState<boolean>(false)
  const [recipient, setRecipient] = useState<string>('')
  const [amount, setAmount] = useState<bigint>(0n)
  const [streamApproxEndTime, setApproxEndTime] = useState<string>('')
  const [streamApproxHoursMins, setstreamApproxHoursMins] = useState<string>('')
  const [streamContractBalance, setStreamContractBalance] = useState<number>(0)
  const [streamStartTime, setStreamStartTime] = useState<string>()
  const [streamFinishTime, setStreamFinishTime] = useState<string>()
  const [streamFlowRate, setStreamFlowRate] = useState<number>(0)
  const [totalUserWithdraw, setTotalUserWithdraw] = useState<number>(0)
  const [reciverAddress, setReciverAddress] = useState<string>()
  const [animationDuration, setAnimationDuration] = useState<number>(0)
  const [epochStreamStartTime, setepochStreamStartTime] = useState<number>(0)
  const [userAccountBalance, setUserAccountBalance] = useState<number>()
  const [timeUnit, setTimeUnit] = useState<string>('sec')
  const [displayFlowAmount, setdisplayFlowAmount] = useState(0)
  const [epochStreamfinishTime, setepochStreamfinishTime] = useState<number>(0)
  const [navigationMod, setNavigationMod] = useState<string>('DeployApp')
  const [internalTxns, setInternalTxns] = useState<Array<{ amount: number; receiver: string }>>([])

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
      const assetInfo = await algorand.client.algod.getAssetByID(inputAppId).do()

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

  // const validateAppId = async (inputAppId: number) => {
  //   try {
  //     // Fetch the application details using the input app ID
  //     const appInfo = await algorand.client.algod.getApplicationByID(inputAppId).do()

  //     if (appInfo) {
  //       // If application exists, set the app ID
  //       setAppId(inputAppId)
  //       toast.success(`App ID ${inputAppId} is valid!`)
  //     }
  //   } catch (error) {
  //     if (error instanceof Error) {
  //       if (error.message.includes('404')) {
  //         // If a 404 error occurs (application not found), show an error message
  //         toast.error('App ID does not exist. Please enter a valid App ID.')
  //         console.error('App ID not found:', error.message)
  //       } else {
  //         console.error('An error occurred while fetching the app ID:', error.message)
  //         toast.error('Failed to validate App ID. Please try again.')
  //       }
  //     }
  //   }
  // }
  // const handleAppIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const inputAppId = Number(event.target.value)
  //   setAppId(inputAppId)
  //   if (inputAppId > 0) {
  //     // Validate the app ID when user enters it
  //     validateAppId(inputAppId)
  //   } else {
  //     toast.error('Please enter a valid number for the App ID.')
  //   }
  // }

  // Create stream method reference
  const createStream = async () => {
    setLoding(true)
    await create(algorand, dmClient, activeAddress!, setAppId)()
    setLoding(false)
  }

  const funcStopStream = async () => {
    try {
      setLoding(true)
      const transactions = await stopStream(algorand, dmClient, activeAddress!, appId, recipient)()
      setInternalTxns(transactions)
      setLoding(false)
      await fetchContractGlobalStateData(dmClient)
      toast.success('Current Stream Stopped')
    } catch (error) {
      if (error instanceof Error) {
        setLoding(false)
        if (error.message.includes('CreatorAddress; ==; assert')) {
          console.error('Caught a URLTokenBaseHTTPError:', error.message)
          toast.error('You are not owner of this stream')
        } else {
          console.error('An error occurred:', error.message)
        }
      } else {
        console.error('An unknown error occurred:', error)
      }
    }
  }

  const funcdeleteStream = async () => {
    try {
      const deleteConfirmation = await deleteStreamApplication(algorand, dmClient, activeAddress!, appId)()
      if (deleteConfirmation) {
        console.log('Contract deletion confirmed:', deleteConfirmation)
        // await fetchContractGlobalStateData(dmClient)
        toast.success('Contract Deleted')
        setAppId(0)
      } else {
        toast.error('You are not owner of this stream')
      }
    } catch (error) {
      console.error('Error deleting contract:', error)
      toast.error('Error deleting contract or Invalid User')
    }
  }

  // Start stream method reference
  const handleStartStream = async () => {
    // Fetch the user's account balance
    if (!recipient || amount <= 0n || streamRate <= 0n) {
      toast.error('Please fill out all required fields: recipient address, amount, and stream rate.')
      return
    }
    try {
      const accountInfo = await algorand.client.algod.accountInformation(activeAddress!).do()
      const userBalance = accountInfo.amount // Balance in microAlgos

      // Ensure user has enough balance before starting the stream
      const totalCost = Number(amount) + 2000000 + (streamRate > 0 ? 0.1 * Number(streamRate) : 0) // Adjust totalCost logic as needed
      if (userBalance < totalCost) {
        toast.error('Insufficient funds to start the stream. Keep 2 extra Algos in wallet for avoiding errors.')
        return // Exit the function if insufficient funds
      }

      // Try to start the stream
      toast.info('Confirm payment')
      setLoding(true)
      await startStream(algorand, dmClient, activeAddress!, streamRate, recipient, amount, appId)()
      setLoding(false)
      setIsStreaming(1) // Only set streaming state if startStream is successful
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('URLTokenBaseHTTPError')) {
          console.error('Caught a URLTokenBaseHTTPError:', error.message)
        } else {
          console.error('An error occurred:', error.message)
        }
      } else {
        console.error('An unknown error occurred:', error)
      }
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

      const recipientBytes = streamData.recipient?.asByteArray()
      if (recipientBytes) {
        const userAddress = algosdk.encodeAddress(new Uint8Array(recipientBytes))
        setReciverAddress(userAddress)
      } else {
        console.log('Recipient address not found or is invalid.')
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
  //FIF
  const calculateStreamEndTime = () => {
    if (streamRate > 0n && amount > 0n) {
      const durationInSeconds = Number(amount) / Number(streamRate)
      const endTime = new Date(Date.now() + durationInSeconds * 1000)
      const hours = Math.floor(durationInSeconds / 3600)
      const minutes = Math.floor((durationInSeconds % 3600) / 60)
      const formattedEndTime = dayjs(endTime).format('MM/DD/YYYY, h:mm:ss A')
      setApproxEndTime(`${formattedEndTime}`)
      setstreamApproxHoursMins(`(${hours} hours, ${minutes} minutes)`)
    }
  }
  //FIF
  const calculateAnimationDuration = () => {
    if (streamFlowRate > 0 && streamContractBalance > 0) {
      const totalAmount = Number(streamContractBalance) // Convert to Algos
      const totalDuration = (totalAmount / Number(streamFlowRate)) * 1000 // Duration in milliseconds
      //////
      const currentTime = Math.floor(Date.now() / 1000)

      if (currentTime >= epochStreamfinishTime) {
        setAnimationDuration(0)
        setdisplayFlowAmount(0)
        return // Stop further calculations
      }

      const elapsedtime = currentTime - epochStreamStartTime
      const TotalStreamed = elapsedtime * streamFlowRate * 1000000
      const elapsedAmount = TotalStreamed - totalUserWithdraw * 1000000
      const DisplayAmount = elapsedAmount / 1000000
      const FinalDisplayAmount = streamContractBalance - DisplayAmount
      setdisplayFlowAmount(FinalDisplayAmount)
      //////
      setAnimationDuration(totalDuration)
    }
  }
  //FIF
  const userBalanceFetch = async () => {
    const accountInfo = await algorand.client.algod.accountInformation(activeAddress!).do()
    const userBalance = accountInfo.amount
    setUserAccountBalance(userBalance / 1e6)
  }

  // Conversion factors for time units
  const timeUnitToSeconds = (unit: string) => {
    switch (unit) {
      case 'sec':
        return 60
      case 'min':
        return 350
      case 'hour':
        return 3600
      case 'day':
        return 86400
      case 'week':
        return 604800
      case 'month':
        return 2629800
      case 'year':
        return 31536000 // Approx 365 days
      default:
        return 1
    }
  }
  //FIF
  const updateStreamRate = (newAmount: bigint, newTimeUnit: string) => {
    const seconds = timeUnitToSeconds(newTimeUnit)
    const rate = Number(newAmount) / seconds // μAlgos/sec
    const bigintRate = BigInt(Math.round(rate)) // μAlgos/sec as BigInt
    setStreamRate(bigintRate)
  }
  //FIF
  const handleTimeUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeUnit = e.target.value
    setTimeUnit(newTimeUnit)
    updateStreamRate(amount, newTimeUnit)
  }

  const fetchAssetId = async () => {
    const assetInfo = await algorand.client.algod.getAssetByID(729894412).do()
    console.log('AssetInfo===========>', assetInfo.params)
  }

  useEffect(() => {
    if (appId > 0) updateStreamRate(amount, timeUnit)
    fetchAssetId()
  }, [])

  useEffect(() => {
    if (dmClient) {
      userBalanceFetch()
    }
  }, [dmClient, activeAddress])

  useEffect(() => {
    if (streamRate > 0 && amount > 0) {
      calculateStreamEndTime()
      console.log('UseEffect3')
    } else {
      setApproxEndTime('')
    }
  }, [streamRate, amount, activeAddress])

  useEffect(() => {
    if (appId > 0 && dmClient) {
      fetchIsStreaming(dmClient)
      fetchContractGlobalStateData(dmClient)
      calculateAnimationDuration()
    }
  }, [appId, activeAddress, dmClient])

  useEffect(() => {
    if (Date.now() / 1000 < epochStreamfinishTime) {
      const interval = setInterval(() => {
        calculateAnimationDuration()
      }, 1000)
      return () => clearInterval(interval)
    }
    return () => {
      setdisplayFlowAmount(0)
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
        <div className="">
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </center>
      {appId == 0 && (
        <div className="flex flex-row justify-center mt-40">
          <div className=" px-[10px] flex flex-row items-center ">
            <div className="py-[1px] rounded-3xl text-gray-200">
              <button
                onClick={(e) => {
                  setNavigationMod('DeployApp')
                }}
                className={`text-white mt-1 ml-3 border-[#170c31f5] from-[#1e0e44bd]  to-[#180b3698] hover:bg-gradient-to-bl font-medium rounded-xl text-[19px] px-5 py-2 text-center me-2 mb-2
                ${navigationMod === 'DeployApp' ? 'bg-[#361352f5] border-[#2d1672dc] from-[#170c31f5] to-[#170c31f5] hover:bg-gradient-to-bl' : ''}`}
              >
                DeployApp
              </button>

              <button
                onClick={(e) => {
                  setNavigationMod('SearchApp')
                }}
                className={`text-white mt-1 ml-3 border-[#170c31f5] from-[#1e0e44bd]  to-[#180b3698] hover:bg-gradient-to-bl font-medium rounded-xl text-[19px] px-5 py-2 text-center me-2 mb-2
                ${navigationMod === 'SearchApp' ? 'bg-[#361352f5] border-[#2d1672dc] from-[#170c31f5] to-[#170c31f5] hover:bg-gradient-to-bl' : ''}`}
              >
                SearchApp
              </button>
              {/* <a
                href="/History"
                className={`text-white mt-1 ml-3 border-[#170c31f5] from-[#1e0e44bd]  to-[#180b3698] hover:bg-gradient-to-bl font-medium rounded-xl text-[19px] px-5 py-2 text-center me-2 mb-2
                ${navigationMod === 'AccHistory' ? 'bg-[#361352f5] border-[#2d1672dc] from-[#170c31f5] to-[#170c31f5] hover:bg-gradient-to-bl' : ''}`}
              >
                History
              </a> */}
            </div>
          </div>
        </div>
      )}

      {appId == 0 && navigationMod == 'DeployApp' && (
        <div className="text-center rounded-2xl mt-2 border-slate-800 border-solid border-[0.1px] p-4 max-w-md backdrop-blur-[5px] bg-[rgba(21,6,29,0.8)]  mx-auto">
          <label className="block text-[20px] font-medium text-gray-900 dark:text-white">Create New Stream Contract</label>
          {!activeAddress ? (
            <button
              className="btn rounded-2xl bg-purple-700 hover:bg-purple-800 text-white text-[20px] px-11 mt-4"
              onClick={toggleWalletModal}
            >
              Connect Wallet
            </button>
          ) : appId === 0 ? (
            <button className="btn rounded-2xl bg-purple-700 hover:bg-purple-800 text-white text-[20px] px-11 mt-4" onClick={createStream}>
              {loding ? <span className="loading loading-spinner" /> : 'Deploy agreement contract'}
            </button>
          ) : null}
        </div>
      )}
      {appId == 0 && activeAddress && navigationMod == 'SearchApp' ? (
        <div className="text-center rounded-2xl mt-3 border-solid border-2 border-slate-800 p-4 max-w-md backdrop-blur-[5px] bg-[rgba(21,6,29,0.8)]  mx-auto">
          <label className="block text-[19px] mb-4 font-medium text-gray-900 dark:text-white">Search for existing steram</label>
          <input
            type="number"
            placeholder="Enter AppId"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-[18px]  rounded-lg focus:ring-blue-500  focus:border-blue-500 block w-full p-3 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            onChange={handleAppIdChange}
          ></input>
        </div>
      ) : !activeAddress && navigationMod == 'SearchApp' ? (
        <button
          className="btn hero rounded-2xl bg-purple-700 hover:bg-purple-800 max-w-md  text-white text-[20px] px-11 mt-4 mx-auto"
          onClick={toggleWalletModal}
        >
          Connect Wallet
        </button>
      ) : null}
      {activeAddress && appId > 0 && isStreaming === 1 && (
        <div className="text-center rounded-2xl mt-11 border-solid border-2 slate-800 p-4 max-w-md backdrop-blur-[5px] bg-[rgba(21,6,29,0.8)]  mx-auto">
          <label className="block text-[19px] mb-2 font-medium text-gray-900 dark:text-white">Application ID</label>
          <input
            disabled={true}
            type="number"
            className="bg-gray-50 border cursor-text border-gray-300 text-gray-900 text-[18px]  rounded-lg focus:ring-blue-500  focus:border-blue-500 block w-full p-3 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            value={appId}
          ></input>
        </div>
      )}

      {activeAddress && appId > 0 && isStreaming === 1 && (
        <div className="mt-20 ml-[740px]">
          <div className="mb-11 flex">
            <h2 className="text-[22px] font-medium text-gray-900 dark:text-white mr-8">Flow Started</h2>
            <BlinkBlurB></BlinkBlurB>
            <div className="text-white  ml-10 text-[22px] font-semibold">
              <AnimatedCounter from={displayFlowAmount} to={0} duration={animationDuration / 1000} />
            </div>
          </div>
        </div>
      )}

      {activeAddress && appId > 0 && isStreaming === 0 && internalTxns.length > 0 && (
        <center>
          <div className="backdrop-blur-[5px] bg-[rgba(21,6,29,0.8)] mt-8 w-[900px] p-2 rounded-2xl mb-5  border-solid border-2">
            <h3 className="block mb-2 text-lg text-center font-medium text-gray-900 dark:text-white">Recent Stream Distributed Amounts</h3>
            {internalTxns.length > 0 ? (
              <ul>
                <ul className="flex mb-2 text-lg font-normal text-gray-900 dark:text-white">
                  <li>Receiver</li>
                  <li className="ml-auto">Amount</li>
                </ul>
                {internalTxns.map((txn, index) => (
                  <li className="flex  mb-2 text-base font-normal text-gray-900 dark:text-white" key={index}>
                    {txn.receiver} <p className="ml-auto ">{txn.amount}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No internal transactions found.</p>
            )}
          </div>
        </center>
      )}

      {activeAddress && appId > 0 && isStreaming === 0 && (
        <div className="text-center  rounded-2xl mt-11  p-6 max-w-md backdrop-blur-[5px] bg-[rgba(21,6,29,0.8)]  mx-auto">
          <div className="max-w-md">
            <div className="grid ">
              <div>
                <h1 className="block mb-2  text-2xl font-medium text-gray-900 dark:text-white">Application ID {appId}</h1>
                {/* <h2 className="block mb-2 mt-4  text-2xl font-medium text-gray-900 dark:text-white">Create Payment Stream</h2> */}
                <div className="mt-4">
                  <label className="block mr-80 text-lg font-medium text-gray-900 dark:text-white">Address</label>
                  <input
                    type="text"
                    placeholder="Recipient Address"
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-lg rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>
                <div className="mt-4">
                  <label className="block mr-80  text-lg font-medium text-gray-900 dark:text-white">Amount</label>
                  <input
                    type="number"
                    placeholder="1"
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-lg rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    // value={Number(amount) / 1e6}
                    onChange={(e) => {
                      const inputVal = e.target.valueAsNumber // Get the value as a number (in Algos)
                      const microAlgos = BigInt(Math.round(inputVal * 1e6)) // Convert Algos to microAlgos as BigInt
                      console.log('InputAmount', microAlgos)
                      setAmount(microAlgos) // Store as BigInt (μAlgos)
                      setTimeUnit('sec')
                    }}
                  />
                </div>
                <div className="mt-4 firstField">
                  <label className="text-lg mr-[179px] font-medium text-gray-900 dark:text-white ">Custom Flowrate Per/sec</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="0.01"
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-lg rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      onChange={(e) => {
                        const inputVal = e.currentTarget.valueAsNumber
                        const bigintVal = BigInt(Math.round(inputVal * 1e6)) // Convert the decimal to μAlgos as BigInt
                        console.log('FlowRateAs', bigintVal)
                        setStreamRate(bigintVal)
                        setTimeUnit('sec')
                      }}
                    />
                  </div>
                </div>
                <div>
                  <p className="mt-3 mb-3  block text-lg font-medium text-gray-900 dark:text-white">OR</p>
                </div>
                <div className="mt-1 secondField">
                  <label className="block mr-48 text-lg font-medium text-gray-900 dark:text-white">Auto Flowrate Per/sec</label>
                  <div className="flex items-center">
                    <select
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-[20px] rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 cursor-pointer"
                      value={timeUnit}
                      onChange={handleTimeUnitChange}
                    >
                      <option value="sec">Sec</option>
                      <option value="min">5 Min</option>
                      <option value="hour">1 Hour</option>
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>

                    <input
                      type="number"
                      disabled={true}
                      placeholder="0.001"
                      className="bg-gray-50 border ml-1 border-gray-300 text-gray-900 text-lg rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      value={Number(streamRate) / 1e6}
                      onChange={(e) => {
                        const inputVal = e.currentTarget.valueAsNumber
                        const bigintVal = BigInt(Math.round(inputVal * 1e6))
                        console.log('FlowRateAs', bigintVal)
                        setStreamRate(bigintVal)
                      }}
                    />
                  </div>
                </div>

                <div className="block text-xl font-medium text-gray-900 dark:text-white">
                  {streamApproxEndTime && <h2 className=" text-[23px] mt-3">Stream Till: {streamApproxEndTime.toLocaleString()}</h2>}
                  {streamApproxEndTime && (
                    <h2 className=" text-[22px] mt-1">Stream Ending in: {streamApproxHoursMins.toLocaleString()} Approx</h2>
                  )}
                </div>
                {activeAddress && (
                  <div className="mt-3">
                    <button
                      className="btn rounded-2xl text-lg mt-4 bg-purple-700 hover:bg-purple-800 text-white"
                      onClick={handleStartStream}
                    >
                      {loding ? <span className="loading loading-spinner" /> : 'CreateStream'}
                    </button>
                    <button
                      className="btn  ml-9 text-lg mt-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white"
                      onClick={funcdeleteStream}
                    >
                      DeleteAgreement
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeAddress && appId > 0 && isStreaming === 1 && (
        <div className="hero antialiased mt-16 text-[21px]">
          <div className="backdrop-blur-[5px] bg-[rgba(44,33,59,0.48)]  p-4 rounded-2xl mb-5 border-white border-solid border-2">
            <table className="border-3  text-gray-500 dark:text-gray-400">
              <tbody>
                {/* <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-1 ">Application ID</th>
                  <th className="text-white ml-auto mt-2 mr-2 ">{appId}</th>
                </tr> */}
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-1 ">Receiver</th>
                  <th className="text-white ml-32 mt-2 mr-2 ">{reciverAddress}</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">TotalContractBalance</th>
                  <th className="text-red-400 ml-auto mt-2 mr-2 ">{streamContractBalance} Algos</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">StreamStartTime</th>
                  <th className="text-white ml-auto mt-2 mr-2 ">{streamStartTime}</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">StreamfinishTime</th>
                  <th className="text-white ml-auto mt-2 mr-2 ">{streamFinishTime}</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">AlgoFlowRate</th>
                  <th className="text-white ml-auto mt-2 mr-2 ">{streamFlowRate} P/Sec Algos</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">TotalWithdrawAmount</th>
                  <th className="text-green-500 ml-auto mt-2 mr-2 ">{totalUserWithdraw} Algos</th>
                </tr>
                <tr className="flex border-solid border-b border-slate-200">
                  <th className="text-white font-medium mt-2">ActiveStream</th>
                  <th className="text-white ml-auto mt-2 mr-2 ">{isStreaming} </th>
                </tr>
              </tbody>
            </table>
            <div className="mt-2">
              <center>
                <button
                  className="btn rounded-2xl  font-medium text-[22px] mr-6 mt-4 bg-purple-700 hover:bg-purple-800 text-white"
                  onClick={funcStopStream}
                >
                  {loding ? <span className="loading loading-spinner" /> : 'StopStream'}
                </button>
                <button
                  className="btn text-[22px] mt-4  font-medium rounded-2xl bg-purple-700 hover:bg-purple-800 text-white"
                  onClick={funcdeleteStream}
                >
                  DeleteAgreement
                </button>
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

export default Home
