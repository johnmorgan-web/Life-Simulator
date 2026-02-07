import { useEffect } from 'react'
import confetti from 'canvas-confetti'

export type CelebrationEvent = 
  | 'pay-bump'
  | 'degree'
  | 'certification'
  | 'car-paid-off'
  | 'debt-paid-off'
  | 'job-accepted'

type CelebrationMessage = {
  [key in CelebrationEvent]: string
}

const celebrationMessages: CelebrationMessage = {
  'pay-bump': '💰 Time to schedule a celebration, you just received a pay raise!',
  'degree': '🎓 Look at you smarty pants! You just earned yourself a degree!',
  'certification': '📜 Those extra hours of studying have paid off! You have earned a new certification!',
  'car-paid-off': '🚗 Your ride just got paid off! Should you go car shopping?',
  'debt-paid-off': '💳 That much closer to financial freedom, a loan has been paid off!',
  'job-accepted': '✅ You just accepted a new job! Hopefully the people here are cooler...'
}

export default function Celebration({ event, onComplete }: { event: CelebrationEvent | null; onComplete: () => void }) {
  useEffect(() => {
    if (!event) return

    // Trigger confetti
    const duration = 5000
    const end = Date.now() + duration

    const frame = () => {
      if (Date.now() > end) {
        onComplete()
        return
      }

      confetti({
        particleCount: 2,
        angle: Math.random() * 360,
        spread: Math.random() * 100,
        origin: {
          x: Math.random(),
          y: Math.random() * 0.5
        }
      })

      requestAnimationFrame(frame)
    }

    frame()
  }, [event, onComplete])

  if (!event) return null

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
      <div className="animate-bounce text-20xl">{celebrationMessages[event]}</div>
    </div>
  )
}
