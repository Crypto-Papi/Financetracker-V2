import confetti from 'canvas-confetti'
import { useEffect, useRef } from 'react'

function DebtPaidOffModal({ debtName, onClose }) {
  const canvasRef = useRef(null)
  const modalRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Create a confetti instance for the modal canvas
    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: false // Disable worker to keep confetti within modal bounds
    })

    // Launch multiple confetti bursts for a celebration effect
    const duration = 2500 // 2.5 seconds of confetti
    const end = Date.now() + duration

    const frame = () => {
      // Center burst - upward
      myConfetti({
        particleCount: 6,
        angle: 90,
        spread: 60,
        origin: { x: 0.5, y: 0.6 },
        startVelocity: 35,
        decay: 0.92
      })

      // Left burst
      myConfetti({
        particleCount: 4,
        angle: 45,
        spread: 50,
        origin: { x: 0.3, y: 0.6 },
        startVelocity: 30,
        decay: 0.92
      })

      // Right burst
      myConfetti({
        particleCount: 4,
        angle: 135,
        spread: 50,
        origin: { x: 0.7, y: 0.6 },
        startVelocity: 30,
        decay: 0.92
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()

    return () => {
      myConfetti.reset()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}>
      {/* Modal Content */}
      <div ref={modalRef} className="relative z-50 bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center overflow-hidden">
        {/* Confetti Canvas - Inside Modal */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 10 }}
        />
        {/* Celebration Icon */}
        <div className="relative z-20 mb-6 flex justify-center">
          <div className="text-7xl animate-bounce">🎉</div>
        </div>

        {/* Title */}
        <h2 className="relative z-20 text-4xl font-bold text-gray-900 mb-3">
          Congratulations!
        </h2>

        {/* Debt Name */}
        <p className="relative z-20 text-xl text-purple-600 font-semibold mb-6">
          {debtName} is paid off!
        </p>

        {/* Message */}
        <p className="relative z-20 text-gray-600 text-lg mb-8">
          You're making amazing progress on your debt payoff journey. Keep up the great work! 💪
        </p>

        {/* Progress Indicator */}
        <div className="relative z-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 mb-8">
          <p className="text-sm text-gray-700">
            One step closer to financial freedom!
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="relative z-20 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

export default DebtPaidOffModal

