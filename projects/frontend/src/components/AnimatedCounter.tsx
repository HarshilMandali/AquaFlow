// src/components/AnimatedCounter.tsx
import { KeyframeOptions, animate, useInView, useIsomorphicLayoutEffect } from 'framer-motion'
import { useRef } from 'react'

type AnimatedCounterProps = {
  from: number
  to: number
  duration: number
  animationOptions?: KeyframeOptions
}

const AnimatedCounter = ({ from, to, duration, animationOptions }: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useIsomorphicLayoutEffect(() => {
    const element = ref.current

    if (!element || !inView) return

    // Set initial value
    element.textContent = String(from)

    // If reduced motion is enabled in system's preferences
    if (window.matchMedia('(prefers-reduced-motion)').matches) {
      element.textContent = String(to)
      return
    }

    const controls = animate(from, to, {
      duration,
      ease: 'easeOut',
      ...animationOptions,
      onUpdate(value) {
        element.textContent = String(value)
      },
    })

    // Cancel on unmount
    return () => {
      controls.stop()
    }
  }, [ref, inView, from, to, duration])

  return <span ref={ref} />
}

export default AnimatedCounter
