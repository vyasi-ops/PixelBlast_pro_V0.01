import { useState, useEffect, useRef, useCallback } from 'react'

interface Obstacle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('dodgeHighScore')
    return saved ? parseInt(saved) : 0
  })
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 50 })
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  
  const gameLoopRef = useRef<number>()
  const lastSpawnRef = useRef(0)
  const obstacleIdRef = useRef(0)
  const particleIdRef = useRef(0)
  const keysRef = useRef<Set<string>>(new Set())
  const playerRef = useRef(playerPos)
  const obstaclesRef = useRef(obstacles)
  const scoreRef = useRef(score)

  playerRef.current = playerPos
  obstaclesRef.current = obstacles
  scoreRef.current = score

  const startGame = () => {
    setGameState('playing')
    setScore(0)
    setPlayerPos({ x: 50, y: 50 })
    setObstacles([])
    setParticles([])
    lastSpawnRef.current = Date.now()
    obstacleIdRef.current = 0
  }

  const endGame = useCallback(() => {
    setGameState('gameover')
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current)
      localStorage.setItem('dodgeHighScore', scoreRef.current.toString())
    }
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current)
    }
  }, [highScore])

  const spawnObstacle = useCallback(() => {
    const side = Math.floor(Math.random() * 4)
    let x = 0, y = 0, vx = 0, vy = 0
    const speed = 0.3 + (scoreRef.current / 500) * 0.5
    const size = 20 + Math.random() * 20

    switch (side) {
      case 0: // top
        x = Math.random() * 100
        y = -5
        vx = (Math.random() - 0.5) * speed
        vy = speed
        break
      case 1: // right
        x = 105
        y = Math.random() * 100
        vx = -speed
        vy = (Math.random() - 0.5) * speed
        break
      case 2: // bottom
        x = Math.random() * 100
        y = 105
        vx = (Math.random() - 0.5) * speed
        vy = -speed
        break
      case 3: // left
        x = -5
        y = Math.random() * 100
        vx = speed
        vy = (Math.random() - 0.5) * speed
        break
    }

    return {
      id: obstacleIdRef.current++,
      x, y, vx, vy, size
    }
  }, [])

  const createExplosion = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20
      const speed = 2 + Math.random() * 3
      newParticles.push({
        id: particleIdRef.current++,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }, [])

  useEffect(() => {
    if (gameState !== 'playing') return

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const gameLoop = () => {
      const now = Date.now()
      const deltaTime = 16 // ~60fps

      // Move player
      const playerSpeed = 0.8
      let newX = playerRef.current.x
      let newY = playerRef.current.y

      if (keysRef.current.has('arrowleft') || keysRef.current.has('a')) {
        newX -= playerSpeed
      }
      if (keysRef.current.has('arrowright') || keysRef.current.has('d')) {
        newX += playerSpeed
      }
      if (keysRef.current.has('arrowup') || keysRef.current.has('w')) {
        newY -= playerSpeed
      }
      if (keysRef.current.has('arrowdown') || keysRef.current.has('s')) {
        newY += playerSpeed
      }

      newX = Math.max(2, Math.min(98, newX))
      newY = Math.max(2, Math.min(98, newY))

      setPlayerPos({ x: newX, y: newY })

      // Spawn obstacles
      const spawnInterval = Math.max(300, 1000 - (scoreRef.current / 10) * 50)
      if (now - lastSpawnRef.current > spawnInterval) {
        setObstacles(prev => [...prev, spawnObstacle()])
        lastSpawnRef.current = now
      }

      // Update obstacles
      setObstacles(prev => {
        const updated = prev.map(obs => ({
          ...obs,
          x: obs.x + obs.vx,
          y: obs.y + obs.vy
        }))

        // Remove off-screen obstacles
        const filtered = updated.filter(obs => 
          obs.x > -10 && obs.x < 110 && obs.y > -10 && obs.y < 110
        )

        // Check collisions
        for (const obs of filtered) {
          const dx = obs.x - newX
          const dy = obs.y - newY
          const distance = Math.sqrt(dx * dx + dy * dy)
          const collisionDistance = (obs.size / 100) * 0.5 + 0.02

          if (distance < collisionDistance) {
            createExplosion(newX, newY)
            endGame()
            return filtered
          }
        }

        return filtered
      })

      // Update particles
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * 0.1,
            y: p.y + p.vy * 0.1,
            life: p.life - 0.02
          }))
          .filter(p => p.life > 0)
      )

      // Update score
      setScore(prev => prev + 1)

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, spawnObstacle, createExplosion, endGame])

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full max-w-4xl max-h-[800px] bg-black/50 border-2 border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20">
        
        {/* Score Display */}
        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-500/30">
              <div className="text-purple-400 text-xs font-semibold">SCORE</div>
              <div className="text-white text-2xl font-bold">{score}</div>
            </div>
          </div>
        )}

        {/* High Score */}
        {gameState === 'playing' && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-500/30">
              <div className="text-yellow-400 text-xs font-semibold">BEST</div>
              <div className="text-white text-2xl font-bold">{highScore}</div>
            </div>
          </div>
        )}

        {/* Menu Screen */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80 backdrop-blur-sm">
            <div className="text-center">
              <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                DODGE!
              </h1>
              <p className="text-gray-400 text-lg mb-2">Survive as long as you can</p>
              <p className="text-gray-500 text-sm mb-8">Use WASD or Arrow Keys to move</p>
              
              {highScore > 0 && (
                <div className="mb-6 text-yellow-400">
                  <div className="text-sm">High Score</div>
                  <div className="text-3xl font-bold">{highScore}</div>
                </div>
              )}

              <button
                onClick={startGame}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xl rounded-xl shadow-lg shadow-purple-500/50 transform hover:scale-105 transition-all"
              >
                START GAME
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80 backdrop-blur-sm">
            <div className="text-center">
              <h2 className="text-5xl font-black mb-4 text-red-500">GAME OVER</h2>
              
              <div className="mb-6">
                <div className="text-gray-400 text-sm mb-1">Score</div>
                <div className="text-white text-4xl font-bold mb-4">{score}</div>
                
                {score >= highScore && score > 0 && (
                  <div className="text-yellow-400 text-lg font-bold mb-4 animate-pulse">
                    🎉 NEW HIGH SCORE! 🎉
                  </div>
                )}
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xl rounded-xl shadow-lg shadow-purple-500/50 transform hover:scale-105 transition-all"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}

        {/* Game Area */}
        {gameState === 'playing' && (
          <>
            {/* Player */}
            <div
              className="absolute w-4 h-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full shadow-lg shadow-cyan-500/50 transform -translate-x-1/2 -translate-y-1/2 transition-none"
              style={{
                left: `${playerPos.x}%`,
                top: `${playerPos.y}%`,
              }}
            />

            {/* Obstacles */}
            {obstacles.map(obs => (
              <div
                key={obs.id}
                className="absolute bg-gradient-to-br from-red-500 to-orange-500 rounded-full shadow-lg shadow-red-500/50 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${obs.x}%`,
                  top: `${obs.y}%`,
                  width: `${obs.size}px`,
                  height: `${obs.size}px`,
                }}
              />
            ))}

            {/* Particles */}
            {particles.map(particle => (
              <div
                key={particle.id}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  opacity: particle.life,
                }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default App
