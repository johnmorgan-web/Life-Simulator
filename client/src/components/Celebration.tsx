import { useEffect } from 'react'
import confetti from 'canvas-confetti'

export type CelebrationEvent = 
  | 'pay-bump'
  | 'degree'
  | 'certification'
  | 'car-paid-off'
  | 'debt-paid-off'
  | 'promotion'
  | 'job-accepted'
  | 'achievement'
  | 'rainbow'

type CelebrationMessage = {
  [key in CelebrationEvent]: string
}

const celebrationMessages: CelebrationMessage = {
  'pay-bump': '💰 Time to schedule a celebration, you just received a pay raise!',
  'degree': '🎓 Look at you smarty pants! You just earned yourself a degree!',
  'certification': '📜 Those extra hours of studying have paid off! You have earned a new certification!',
  'car-paid-off': '🚗 Your ride just got paid off! Should you go car shopping?',
  'debt-paid-off': '💳 That much closer to financial freedom, a loan has been paid off!',
  'promotion': '🚀 Promotion unlocked! More pay, more pressure, more options.',
  'job-accepted': '✅ You just accepted a new job! Hopefully the people here are cooler...',
  'achievement': '🏆 Achievement unlocked! You earned a new reward spin.',
  'rainbow': '🌈 Everything is working out for you.'
}

export default function Celebration({ event, onComplete }: { event: CelebrationEvent | null; onComplete: () => void }) {
  useEffect(() => {
    if (!event) return

    // Keep celebration copy visible longer than the confetti burst.
    const messageDuration = 10000

    // Trigger confetti
    const isTherapistCelebration = event === 'rainbow'
    const confettiDuration = isTherapistCelebration ? 500 : 1000
    const end = Date.now() + confettiDuration
    let frameCount = 0
    let animationFrameId = 0

    const completionTimer = window.setTimeout(() => {
      onComplete()
    }, messageDuration)

    const frame = () => {
      if (Date.now() > end) {
        return
      }

      // Therapist rainbow celebrations use lighter confetti cadence.
      const shouldBurst = !isTherapistCelebration || frameCount % 6 === 0
      if (shouldBurst) {
        confetti({
          particleCount: isTherapistCelebration ? 1 : 2,
          angle: Math.random() * 360,
          spread: Math.random() * 100,
          origin: {
            x: Math.random(),
            y: Math.random() * 0.5
          }
        })
      }
      frameCount += 1

      animationFrameId = requestAnimationFrame(frame)
    }

    frame()

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      window.clearTimeout(completionTimer)
    }
  }, [event, onComplete])

  if (!event) return null

  return (
    <div className="fixed inset-0 pointer-events-none flex items-start justify-center pt-20 z-50">
      <div className="pointer-events-auto -translate-y-40"></div>
      <div className="animate-bounce text-10xl">{celebrationMessages[event]}</div>
    </div>
  )
}
