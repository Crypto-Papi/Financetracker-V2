import { useEffect, useRef } from 'react'

function Confetti({ show, debtName }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!show || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const particles = []

    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Particle class
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height - canvas.height
        this.size = Math.random() * 8 + 4
        this.speedX = Math.random() * 6 - 3
        this.speedY = Math.random() * 5 + 5
        this.rotation = Math.random() * 360
        this.rotationSpeed = Math.random() * 10 - 5
        this.opacity = 1
        this.colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
        this.color = this.colors[Math.floor(Math.random() * this.colors.length)]
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.rotation += this.rotationSpeed
        this.opacity -= 0.01
        this.speedY += 0.1 // gravity
      }

      draw() {
        ctx.save()
        ctx.globalAlpha = this.opacity
        ctx.translate(this.x, this.y)
        ctx.rotate((this.rotation * Math.PI) / 180)
        ctx.fillStyle = this.color
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size)
        ctx.restore()
      }
    }

    // Create particles
    for (let i = 0; i < 100; i++) {
      particles.push(new Particle())
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update()
        particles[i].draw()

        if (particles[i].opacity <= 0) {
          particles.splice(i, 1)
        }
      }

      if (particles.length > 0) {
        requestAnimationFrame(animate)
      }
    }

    animate()

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [show])

  if (!show) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
    />
  )
}

export default Confetti

