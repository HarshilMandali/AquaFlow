import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import React, { useEffect, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Nav from './components/Nav'
import Transact from './components/Transact'
import { SteamClient } from './contracts/Steam'
import { getAlgodConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

interface AccountHistoryProps {}

const AccountHistory: React.FC<AccountHistoryProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appId, setAppId] = useState<number>(0)
  const { activeAddress, signer } = useWallet()
  const [userAccountBalance, setUserAccountBalance] = useState<number>()
  const [createdApps, setCreatedApps] = useState<{ id: number; params: any }[]>([])

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = algokit.AlgorandClient.fromConfig({ algodConfig })
  algorand.setDefaultSigner(signer)

  const userBalanceFetch = async () => {
    try {
      const dmClient = new SteamClient(
        {
          resolveBy: 'id',
          id: appId,
          sender: { addr: activeAddress!, signer },
        },
        algorand.client.algod,
      )
      dmClient

      const accountInfo = await algorand.client.algod.accountInformation(activeAddress!).do()
      const userBalance = accountInfo.amount
      const createdAppsList = accountInfo['created-apps']

      if (createdAppsList && createdAppsList.length > 0) {
        // Reverse the created apps and update state
        setCreatedApps(createdAppsList.slice().reverse())
      } else {
        console.log('No created apps found for this account.')
      }

      setUserAccountBalance(userBalance / 1e6)
    } catch (error) {
      console.error('Error fetching user balance:', error)
    }
  }

  useEffect(() => {
    if (activeAddress) {
      userBalanceFetch()
      console.log('Fetching')
    }
  }, [activeAddress])

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
        <div className="w-[820px] antialiased mt-20 text-[21px]">
          <h2 className="text-white font-medium mb-6 text-[30px]">All Created Applications</h2>
          <div className="backdrop-blur-[5px] bg-[rgba(44,33,59,0.48)] p-4 rounded-2xl border-white border-solid border-2">
            <table className="border-3 w-full text-gray-500 dark:text-gray-400">
              <thead>
                <tr className="flex">
                  <th className="mr-auto">App Index</th>
                  <th>App ID</th>
                </tr>
              </thead>
              <tbody>
                {createdApps.map((app, index) => (
                  <tr key={app.id} className="flex border-solid border-b border-slate-200">
                    <th className="text-white font-medium mt-1">{index + 1}</th>
                    <th className="text-white ml-auto mt-2 mr-2">{app.id}</th>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </center>
      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
    </div>
  )
}

export default AccountHistory
