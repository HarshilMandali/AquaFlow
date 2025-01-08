import { BlinkBlur } from 'react-loading-indicators'
import OrbitProgress from 'react-loading-indicators/OrbitProgress'

const LoadingOrbit = () => <OrbitProgress variant="track-disc" color="crimson" size="small" />
const BlinkBlurB = () => <BlinkBlur speedPlus={2} size="small" color="00ce00"></BlinkBlur>

export default BlinkBlurB
