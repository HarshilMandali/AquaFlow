import { Link, useLocation } from 'react-router-dom'

const Nav = () => {
  const location = useLocation()

  // Check if the current route matches the link
  const isActive = (path: string) => location.pathname === path

  const handleReload = () => {
    if (location.pathname === '/') {
      // Force page reload if already on the same route
      window.location.reload()
    }
  }

  return (
    <div className="w-auto h-[65px] shadow-lg shadow-[#2A0E61]/50 bg-[#03001470] backdrop-blur-md">
      <div className="w-full h-full flex flex-row ">
        <a className="h-auto w-auto flex ml-3 flex-row items-center">
          <img src="/logoD.webp" alt="logo" width={40} height={50} className="cursor-default animate-pulse" />
          <p className="text-[23px] ml-2 mt-3 font-medium text-gray-900 dark:text-white ">AquaFlow</p>
          <p className="text-[15px] ml-1 mt-9  text-gray-900 dark:text-white ">V1</p>
        </a>
        <div className="w-full h-full flex flex-row justify-center pr-24 mr-64">
          <div className="w-[600px] px-[10px] h-full flex flex-row items-center justify-between">
            <div className="flex w-full h-auto py-[1px] rounded-3xl text-gray-200">
              <Link
                to="/"
                onClick={handleReload}
                className={`text-white mt-1 ml-4 border-[#170c31f5]  hover:bg-gradient-to-bl from-[#170c31f5] to-[#170c31f5] font-medium rounded-xl text-[19px] px-5 py-2 text-center me-2 mb-2
                  ${isActive('/') ? 'bg-[#170c31f5] border-[#2d1672dc] from-[#170c31f5] to-[#170c31f5] hover:bg-gradient-to-bl' : ''}`}
              >
                CreatorDashboard
              </Link>
              <p className="ml-10 mr-10 mt-2 text-2xl">|</p>
              <Link
                to="/Withdraw"
                className={`text-white mt-1 border-[#2d1672dc] hover:bg-gradient-to-bl from-[#170c31f5] to-[#170c31f5] font-medium rounded-xl ml-6 text-[19px] px-5 py-2 text-center me-2 mb-2
                  ${isActive('/Withdraw') ? 'bg-[#170c31f5] border-[#2d1672dc] from-[#170c31f5] to-[#170c31f5] hover:bg-gradient-to-bl' : ''}`}
              >
                ReceiverDashboard
              </Link>
              <p className="ml-10 mr-10 mt-2 text-2xl">|</p>
              <Link
                to="/History"
                className={`text-white mt-1 border-[#2d1672dc] hover:bg-gradient-to-bl from-[#170c31f5] to-[#170c31f5] font-medium rounded-xl ml-6 text-[19px] px-5 py-2 text-center me-2 mb-2
                  ${isActive('/History') ? 'bg-[#170c31f5] border-[#2d1672dc] from-[#170c31f5] to-[#170c31f5] hover:bg-gradient-to-bl' : ''}`}
              >
                Apphistory
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Nav
