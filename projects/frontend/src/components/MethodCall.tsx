import { ReactNode, useState } from 'react'

interface MethodCallINterface {
  methodFuncition: () => Promise<void>
  children?: ReactNode
}

const MethodCall = ({ methodFuncition, children }: MethodCallINterface) => {
  const [loding, setLoding] = useState<boolean>(false)
  const callMethodFunction = async () => {
    setLoding(true)
    await methodFuncition()
    setLoding(false)
  }
  return (
    <button className="" onClick={callMethodFunction}>
      {loding ? <span className="loading loading-spinner" /> : ''}
    </button>
  )
}

export default MethodCall
