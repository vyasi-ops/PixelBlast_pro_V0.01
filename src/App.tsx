import { useState, useEffect, useRef, useCallback } from 'react'

// Types
interface Vec2 { x: number; y: number }

interface Star {
  x: number
  y: number
  size: number
  speed: number
  brightness: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

interface Asteroid {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  rotSpeed: number
  vertices: number[]
}

interface Missile {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  trail: Vec2[]
}

interface Gem {
  x: number
  y: number
  vx: number
  vy: number
  pulse: number
}

interface PowerUp {
  x: number
  y: number
  vx: number
  vy: number
  type: 'shield' | 'slowmo' | 'magnet'
  pulse: number
}

type GameState = 'menu' | 'playing' | 'gameover'

// Audio engine
class AudioEngine {
  private ctx: AudioContext | null = null

  init() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.1) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + duration)
  }

  collect() { this.playTone(880, 0.1, 'square', 0.08); setTimeout(() => this.playTone(1100, 0.1, 'square', 0.06), 50) }
  powerup() { this.playTone(440, 0.1, 'sine', 0.1); setTimeout(() => this.playTone(660, 0.1, 'sine', 0.08), 80); setTimeout(() => this.playTone(880, 0.15, 'sine', 0.06), 160) }
  nearMiss() { this.playTone(200, 0.05, 'sawtooth', 0.05) }
  death() { this.playTone(150, 0.3, 'sawtooth', 0.15); setTimeout(() => this.playTone(100, 0.4, 'sawtooth', 0.1), 100) }
  combo() { this.playTone(600, 0.08, 'square', 0.06); setTimeout(() => this.playTone(800, 0.08, 'square', 0.06), 60); setTimeout(() => this.playTone(1000, 0.12, 'square', 0.05), 120) }
}

const audio = new AudioEngine()

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('spaceDodgeHigh')
    return saved ? parseInt(saved) : 0
  })
  const [combo, setCombo] = useState(0)
  const [wave, setWave] = useState(1)
  const [activePowers, setActivePowers] = useState<{ shield: number; slowmo: number; magnet: number }>({ shield: 0, slowmo: 0, magnet: 0 })

  // Game refs
  const stateRef = useRef<GameState>('menu')
  const playerRef = useRef<Vec2>({ x: 0, y: 0 })
  const playerVelRef = useRef<Vec2>({ x: 0, y: 0 })
  const keysRef = useRef<Set<string>>(new Set())
  const starsRef = useRef<Star[]>([])
  const particlesRef = useRef<Particle[]>([])
  const asteroidsRef = useRef<Asteroid[]>([])
  const missilesRef = useRef<Missile[]>([])
  const gemsRef = useRef<Gem[]>([])
  const powerUpsRef = useRef<PowerUp[]>([])
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const waveRef = useRef(1)
  const gameTimeRef = useRef(0)
  const lastSpawnRef = useRef(0)
  const lastMissileRef = useRef(0)
  const lastGemRef = useRef(0)
  const lastPowerRef = useRef(0)
  const shakeRef = useRef(0)
  const powersRef = useRef({ shield: 0, slowmo: 0, magnet: 0 })
  const trailRef = useRef<Vec2[]>([])
  const frameRef = useRef(0)
  const sizeRef = useRef({ w: 800, h: 600 })

  stateRef.current = gameState

  // Init stars
  const initStars = useCallback((w: number, h: number) => {
    const stars: Star[] = []
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        brightness: Math.random() * 0.5 + 0.5
      })
    }
    starsRef.current = stars
  }, [])

  const createAsteroidVertices = (): number[] => {
    const verts: number[] = []
    const numVerts = 7 + Math.floor(Math.random() * 4)
    for (let i = 0; i < numVerts; i++) {
      verts.push(0.7 + Math.random() * 0.3)
    }
    return verts
  }

  const spawnAsteroid = useCallback(() => {
    const { w, h } = sizeRef.current
    const side = Math.floor(Math.random() * 4)
    let x = 0, y = 0, vx = 0, vy = 0
    const baseSpeed = 0.9 + waveRef.current * 0.2
    const speed = baseSpeed * (0.7 + Math.random() * 0.5)
    const size = 15 + Math.random() * 30

    switch (side) {
      case 0: x = Math.random() * w; y = -size; vx = (Math.random() - 0.5) * speed; vy = speed * (0.5 + Math.random() * 0.5); break
      case 1: x = w + size; y = Math.random() * h; vx = -speed * (0.5 + Math.random() * 0.5); vy = (Math.random() - 0.5) * speed; break
      case 2: x = Math.random() * w; y = h + size; vx = (Math.random() - 0.5) * speed; vy = -speed * (0.5 + Math.random() * 0.5); break
      case 3: x = -size; y = Math.random() * h; vx = speed * (0.5 + Math.random() * 0.5); vy = (Math.random() - 0.5) * speed; break
    }

    asteroidsRef.current.push({
      x, y, vx, vy, size,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.05,
      vertices: createAsteroidVertices()
    })
  }, [])

  const spawnMissile = useCallback(() => {
    const { w, h } = sizeRef.current
    const side = Math.floor(Math.random() * 4)
    let x = 0, y = 0
    const speed = 1.5 + waveRef.current * 0.15

    switch (side) {
      case 0: x = Math.random() * w; y = -10; break
      case 1: x = w + 10; y = Math.random() * h; break
      case 2: x = Math.random() * w; y = h + 10; break
      case 3: x = -10; y = Math.random() * h; break
    }

    const px = playerRef.current.x
    const py = playerRef.current.y
    const angle = Math.atan2(py - y, px - x)

    missilesRef.current.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      trail: []
    })
  }, [])

  const spawnGem = useCallback(() => {
    const { w, h } = sizeRef.current
    const side = Math.floor(Math.random() * 4)
    let x = 0, y = 0, vx = 0, vy = 0
    const speed = 0.6 + Math.random() * 0.8

    switch (side) {
      case 0: x = Math.random() * w; y = -10; vx = (Math.random() - 0.5) * speed; vy = speed; break
      case 1: x = w + 10; y = Math.random() * h; vx = -speed; vy = (Math.random() - 0.5) * speed; break
      case 2: x = Math.random() * w; y = h + 10; vx = (Math.random() - 0.5) * speed; vy = -speed; break
      case 3: x = -10; y = Math.random() * h; vx = speed; vy = (Math.random() - 0.5) * speed; break
    }

    gemsRef.current.push({ x, y, vx, vy, pulse: Math.random() * Math.PI * 2 })
  }, [])

  const spawnPowerUp = useCallback(() => {
    const { w, h } = sizeRef.current
    const types: PowerUp['type'][] = ['shield', 'slowmo', 'magnet']
    const type = types[Math.floor(Math.random() * types.length)]
    const side = Math.floor(Math.random() * 4)
    let x = 0, y = 0, vx = 0, vy = 0
    const speed = 0.6

    switch (side) {
      case 0: x = Math.random() * w; y = -15; vx = (Math.random() - 0.5) * speed; vy = speed; break
      case 1: x = w + 15; y = Math.random() * h; vx = -speed; vy = (Math.random() - 0.5) * speed; break
      case 2: x = Math.random() * w; y = h + 15; vx = (Math.random() - 0.5) * speed; vy = -speed; break
      case 3: x = -15; y = Math.random() * h; vx = speed; vy = (Math.random() - 0.5) * speed; break
    }

    powerUpsRef.current.push({ x, y, vx, vy, type, pulse: 0 })
  }, [])

  const addParticles = (x: number, y: number, color: string, count: number, speed = 3) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
      const s = speed * (0.5 + Math.random())
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        color,
        size: 2 + Math.random() * 3
      })
    }
  }

  const startGame = useCallback(() => {
    audio.init()
    const { w, h } = sizeRef.current
    playerRef.current = { x: w / 2, y: h / 2 }
    playerVelRef.current = { x: 0, y: 0 }
    asteroidsRef.current = []
    missilesRef.current = []
    gemsRef.current = []
    powerUpsRef.current = []
    particlesRef.current = []
    trailRef.current = []
    scoreRef.current = 0
    comboRef.current = 0
    waveRef.current = 1
    gameTimeRef.current = 0
    lastSpawnRef.current = 0
    lastMissileRef.current = 0
    lastGemRef.current = 0
    lastPowerRef.current = 0
    shakeRef.current = 0
    powersRef.current = { shield: 0, slowmo: 0, magnet: 0 }
    setScore(0)
    setCombo(0)
    setWave(1)
    setActivePowers({ shield: 0, slowmo: 0, magnet: 0 })
    setGameState('playing')
  }, [])

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      sizeRef.current = { w: canvas.width, h: canvas.height }
      if (starsRef.current.length === 0) initStars(canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === ' ' || e.key === 'Enter') {
        if (stateRef.current === 'menu' || stateRef.current === 'gameover') {
          startGame()
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    let lastTime = performance.now()

    const loop = (now: number) => {
      const rawDt = Math.min((now - lastTime) / 16.67, 3)
      lastTime = now
      const { w, h } = sizeRef.current
      const slowFactor = powersRef.current.slowmo > 0 ? 0.4 : 1
      const dt = rawDt * slowFactor

      // Clear
      ctx.fillStyle = '#06060f'
      ctx.fillRect(0, 0, w, h)

      // Screen shake
      if (shakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * shakeRef.current * 8
        const shakeY = (Math.random() - 0.5) * shakeRef.current * 8
        ctx.save()
        ctx.translate(shakeX, shakeY)
        shakeRef.current = Math.max(0, shakeRef.current - 0.05)
      }

      // Draw stars
      for (const star of starsRef.current) {
        star.y += star.speed * dt
        if (star.y > h) { star.y = 0; star.x = Math.random() * w }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`
        ctx.fillRect(star.x, star.y, star.size, star.size)
      }

      if (stateRef.current === 'playing') {
        gameTimeRef.current += rawDt
        frameRef.current++

        // Wave system
        const newWave = Math.floor(gameTimeRef.current / 2700) + 1 // every 45s
        if (newWave !== waveRef.current) {
          waveRef.current = newWave
          setWave(newWave)
        }

        // Update power-up timers
        for (const key of ['shield', 'slowmo', 'magnet'] as const) {
          if (powersRef.current[key] > 0) {
            powersRef.current[key] -= rawDt
            if (powersRef.current[key] <= 0) powersRef.current[key] = 0
          }
        }
        setActivePowers({ ...powersRef.current })

        // Move player
        const accel = 0.35
        const friction = 0.9
        const keys = keysRef.current
        if (keys.has('arrowleft') || keys.has('a')) playerVelRef.current.x -= accel * dt
        if (keys.has('arrowright') || keys.has('d')) playerVelRef.current.x += accel * dt
        if (keys.has('arrowup') || keys.has('w')) playerVelRef.current.y -= accel * dt
        if (keys.has('arrowdown') || keys.has('s')) playerVelRef.current.y += accel * dt
        
        playerVelRef.current.x *= friction
        playerVelRef.current.y *= friction
        playerRef.current.x += playerVelRef.current.x * dt
        playerRef.current.y += playerVelRef.current.y * dt
        playerRef.current.x = Math.max(15, Math.min(w - 15, playerRef.current.x))
        playerRef.current.y = Math.max(15, Math.min(h - 15, playerRef.current.y))

        // Trail
        if (frameRef.current % 2 === 0) {
          trailRef.current.push({ x: playerRef.current.x, y: playerRef.current.y })
          if (trailRef.current.length > 20) trailRef.current.shift()
        }

        // Spawn asteroids
        const asteroidInterval = Math.max(30, 80 - waveRef.current * 5)
        if (gameTimeRef.current - lastSpawnRef.current > asteroidInterval) {
          spawnAsteroid()
          lastSpawnRef.current = gameTimeRef.current
        }

        // Spawn missiles
        const missileInterval = Math.max(120, 300 - waveRef.current * 20)
        if (gameTimeRef.current - lastMissileRef.current > missileInterval) {
          spawnMissile()
          lastMissileRef.current = gameTimeRef.current
        }

        // Spawn gems
        if (gameTimeRef.current - lastGemRef.current > 90) {
          spawnGem()
          lastGemRef.current = gameTimeRef.current
        }

        // Spawn power-ups
        if (gameTimeRef.current - lastPowerRef.current > 600) {
          spawnPowerUp()
          lastPowerRef.current = gameTimeRef.current
        }

        // Update asteroids
        asteroidsRef.current = asteroidsRef.current.filter(a => {
          a.x += a.vx * dt
          a.y += a.vy * dt
          a.rotation += a.rotSpeed * dt
          return a.x > -100 && a.x < w + 100 && a.y > -100 && a.y < h + 100
        })

        // Update missiles (straight line, no homing)
        missilesRef.current = missilesRef.current.filter(m => {
          m.x += m.vx * dt
          m.y += m.vy * dt
          m.trail.push({ x: m.x, y: m.y })
          if (m.trail.length > 15) m.trail.shift()
          return m.x > -50 && m.x < w + 50 && m.y > -50 && m.y < h + 50
        })

        // Update gems
        gemsRef.current = gemsRef.current.filter(g => {
          g.pulse += 0.05 * dt
          // Magnet effect
          if (powersRef.current.magnet > 0) {
            const dx = playerRef.current.x - g.x
            const dy = playerRef.current.y - g.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 200) {
              g.vx += (dx / dist) * 0.3 * dt
              g.vy += (dy / dist) * 0.3 * dt
            }
          }
          g.x += g.vx * dt
          g.y += g.vy * dt
          return g.x > -20 && g.x < w + 20 && g.y > -20 && g.y < h + 20
        })

        // Update power-ups
        powerUpsRef.current = powerUpsRef.current.filter(p => {
          p.pulse += 0.05 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          return p.x > -20 && p.x < w + 20 && p.y > -20 && p.y < h + 20
        })

        // Update particles
        particlesRef.current = particlesRef.current.filter(p => {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vx *= 0.97
          p.vy *= 0.97
          p.life -= (1 / (p.maxLife * 60)) * dt
          return p.life > 0
        })

        // Collision: player vs asteroids
        const px = playerRef.current.x
        const py = playerRef.current.y
        const playerRadius = 10

        for (const a of asteroidsRef.current) {
          const dx = a.x - px
          const dy = a.y - py
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < a.size * 0.4 + playerRadius) {
            if (powersRef.current.shield > 0) {
              powersRef.current.shield = 0
              addParticles(px, py, '#00ffff', 15, 4)
              asteroidsRef.current = asteroidsRef.current.filter(o => o !== a)
              audio.collect()
            } else {
              addParticles(px, py, '#ff00ff', 30, 5)
              audio.death()
              if (scoreRef.current > highScore) {
                setHighScore(scoreRef.current)
                localStorage.setItem('spaceDodgeHigh', scoreRef.current.toString())
              }
              setGameState('gameover')
              stateRef.current = 'gameover'
              break
            }
          }
          // Near miss detection
          if (dist < a.size * 0.4 + playerRadius + 25 && dist > a.size * 0.4 + playerRadius) {
            if (shakeRef.current < 0.3) {
              shakeRef.current = 0.3
              audio.nearMiss()
            }
          }
        }

        // Collision: player vs missiles
        for (const m of missilesRef.current) {
          const dx = m.x - px
          const dy = m.y - py
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 18 + playerRadius) {
            if (powersRef.current.shield > 0) {
              powersRef.current.shield = 0
              addParticles(px, py, '#00ffff', 15, 4)
              missilesRef.current = missilesRef.current.filter(o => o !== m)
              audio.collect()
            } else {
              addParticles(px, py, '#ff4400', 30, 5)
              audio.death()
              if (scoreRef.current > highScore) {
                setHighScore(scoreRef.current)
                localStorage.setItem('spaceDodgeHigh', scoreRef.current.toString())
              }
              setGameState('gameover')
              stateRef.current = 'gameover'
              break
            }
          }
        }

        // Collision: player vs gems
        gemsRef.current = gemsRef.current.filter(g => {
          const dx = g.x - px
          const dy = g.y - py
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 20 + playerRadius) {
            const comboBonus = Math.floor(comboRef.current / 5)
            scoreRef.current += 10 + comboBonus * 5
            comboRef.current++
            if (comboRef.current % 10 === 0) audio.combo()
            else audio.collect()
            setScore(scoreRef.current)
            setCombo(comboRef.current)
            addParticles(g.x, g.y, '#ffdd00', 8, 2)
            return false
          }
          return true
        })

        // Collision: player vs power-ups
        powerUpsRef.current = powerUpsRef.current.filter(p => {
          const dx = p.x - px
          const dy = p.y - py
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 20 + playerRadius) {
            powersRef.current[p.type] = 300 // 5 seconds
            audio.powerup()
            addParticles(p.x, p.y, p.type === 'shield' ? '#00ffff' : p.type === 'slowmo' ? '#4488ff' : '#ff44ff', 12, 3)
            return false
          }
          return true
        })

        // Score ticks up
        if (frameRef.current % 10 === 0) {
          scoreRef.current += 1
          setScore(scoreRef.current)
        }

        // Reset combo if no collection for a while
        if (frameRef.current % 120 === 0 && comboRef.current > 0) {
          comboRef.current = Math.max(0, comboRef.current - 1)
          setCombo(comboRef.current)
        }

        // Draw trail
        for (let i = 0; i < trailRef.current.length; i++) {
          const t = trailRef.current[i]
          const alpha = i / trailRef.current.length * 0.5
          ctx.beginPath()
          ctx.arc(t.x, t.y, 4 * (i / trailRef.current.length), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`
          ctx.fill()
        }

        // Draw player ship
        ctx.save()
        ctx.translate(px, py)
        const shipAngle = Math.atan2(playerVelRef.current.y, playerVelRef.current.x)
        const moving = Math.abs(playerVelRef.current.x) + Math.abs(playerVelRef.current.y) > 0.5
        if (moving) ctx.rotate(shipAngle)
        else ctx.rotate(-Math.PI / 2)

        // Ship glow
        ctx.shadowColor = '#00ffff'
        ctx.shadowBlur = 15
        ctx.beginPath()
        ctx.moveTo(12, 0)
        ctx.lineTo(-8, -8)
        ctx.lineTo(-4, 0)
        ctx.lineTo(-8, 8)
        ctx.closePath()
        ctx.fillStyle = '#00ffff'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.restore()

        // Shield bubble
        if (powersRef.current.shield > 0) {
          const shieldAlpha = powersRef.current.shield < 60 ? 0.2 + Math.sin(frameRef.current * 0.3) * 0.2 : 0.3
          ctx.beginPath()
          ctx.arc(px, py, 22, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(0, 255, 255, ${shieldAlpha + 0.3})`
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.fillStyle = `rgba(0, 255, 255, ${shieldAlpha})`
          ctx.fill()
        }

        // Draw asteroids
        for (const a of asteroidsRef.current) {
          ctx.save()
          ctx.translate(a.x, a.y)
          ctx.rotate(a.rotation)
          ctx.shadowColor = '#aa44ff'
          ctx.shadowBlur = 10
          ctx.beginPath()
          const verts = a.vertices
          for (let i = 0; i < verts.length; i++) {
            const angle = (Math.PI * 2 * i) / verts.length
            const r = a.size * 0.5 * verts[i]
            const x = Math.cos(angle) * r
            const y = Math.sin(angle) * r
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fillStyle = '#2a1a3a'
          ctx.fill()
          ctx.strokeStyle = '#bb55ff'
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.shadowBlur = 0
          ctx.restore()
        }

        // Draw missiles
        for (const m of missilesRef.current) {
          // Trail
          for (let i = 0; i < m.trail.length; i++) {
            const t = m.trail[i]
            const alpha = i / m.trail.length * 0.6
            ctx.beginPath()
            ctx.arc(t.x, t.y, 2 * (i / m.trail.length), 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`
            ctx.fill()
          }
          // Missile body
          ctx.save()
          ctx.translate(m.x, m.y)
          ctx.rotate(m.angle)
          ctx.shadowColor = '#ff4400'
          ctx.shadowBlur = 12
          ctx.beginPath()
          ctx.moveTo(10, 0)
          ctx.lineTo(-6, -4)
          ctx.lineTo(-6, 4)
          ctx.closePath()
          ctx.fillStyle = '#ff4400'
          ctx.fill()
          ctx.strokeStyle = '#ffaa00'
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.shadowBlur = 0
          ctx.restore()
        }

        // Draw gems
        for (const g of gemsRef.current) {
          const scale = 1 + Math.sin(g.pulse) * 0.15
          ctx.save()
          ctx.translate(g.x, g.y)
          ctx.scale(scale, scale)
          ctx.shadowColor = '#ffdd00'
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.moveTo(0, -8)
          ctx.lineTo(6, 0)
          ctx.lineTo(0, 8)
          ctx.lineTo(-6, 0)
          ctx.closePath()
          ctx.fillStyle = '#ffdd00'
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.shadowBlur = 0
          ctx.restore()
        }

        // Draw power-ups
        for (const p of powerUpsRef.current) {
          const scale = 1 + Math.sin(p.pulse) * 0.15
          const color = p.type === 'shield' ? '#00ffff' : p.type === 'slowmo' ? '#4488ff' : '#ff44ff'
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.scale(scale, scale)
          ctx.shadowColor = color
          ctx.shadowBlur = 15
          ctx.beginPath()
          ctx.arc(0, 0, 12, 0, Math.PI * 2)
          ctx.fillStyle = color + '44'
          ctx.fill()
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.stroke()
          // Icon
          ctx.fillStyle = '#ffffff'
          ctx.font = '12px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(p.type === 'shield' ? '🛡' : p.type === 'slowmo' ? '🐌' : '🧲', 0, 0)
          ctx.shadowBlur = 0
          ctx.restore()
        }

        // Draw particles
        for (const p of particlesRef.current) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
          ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0')
          ctx.fill()
        }
      }

      if (shakeRef.current > 0 || gameState === 'playing') {
        if (shakeRef.current > 0) ctx.restore()
      }

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState, highScore, initStars, spawnAsteroid, spawnMissile, spawnGem, spawnPowerUp, startGame])

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#06060f]">
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
          <div className="flex flex-col gap-2">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-cyan-500/30">
              <div className="text-cyan-400 text-xs font-bold tracking-wider">SCORE</div>
              <div className="text-white text-2xl font-bold font-mono">{score}</div>
            </div>
            {combo > 2 && (
              <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-yellow-500/30 animate-pulse">
                <div className="text-yellow-400 text-sm font-bold">🔥 x{combo} COMBO</div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-500/30">
              <div className="text-purple-400 text-xs font-bold tracking-wider">WAVE</div>
              <div className="text-white text-2xl font-bold font-mono">{wave}</div>
            </div>
            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-yellow-500/30">
              <div className="text-yellow-400 text-xs">BEST: {highScore}</div>
            </div>
          </div>
        </div>
      )}

      {/* Active Power-ups */}
      {gameState === 'playing' && (activePowers.shield > 0 || activePowers.slowmo > 0 || activePowers.magnet > 0) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none z-10">
          {activePowers.shield > 0 && (
            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-cyan-500/50 text-cyan-400 text-sm font-bold">
              🛡️ {Math.ceil(activePowers.shield / 60)}s
            </div>
          )}
          {activePowers.slowmo > 0 && (
            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-blue-500/50 text-blue-400 text-sm font-bold">
              🐌 {Math.ceil(activePowers.slowmo / 60)}s
            </div>
          )}
          {activePowers.magnet > 0 && (
            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-pink-500/50 text-pink-400 text-sm font-bold">
              🧲 {Math.ceil(activePowers.magnet / 60)}s
            </div>
          )}
        </div>
      )}

      {/* Menu */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="text-center">
            <h1 className="text-7xl font-black mb-2 tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,255,255,0.5)]">
                DODGE!
              </span>
            </h1>
            <p className="text-purple-300 text-lg mb-1 font-semibold tracking-wider">SPACE ARCADE</p>
            <p className="text-gray-500 text-sm mb-8">Survive the asteroid field</p>
            
            <div className="flex flex-col gap-2 mb-8 text-sm text-gray-400">
              <div className="flex items-center justify-center gap-4">
                <span className="px-2 py-1 bg-gray-800 rounded text-cyan-400 font-mono">WASD</span>
                <span>or</span>
                <span className="px-2 py-1 bg-gray-800 rounded text-cyan-400 font-mono">ARROWS</span>
                <span>to move</span>
              </div>
            </div>

            {highScore > 0 && (
              <div className="mb-6 text-yellow-400">
                <div className="text-xs tracking-wider mb-1">HIGH SCORE</div>
                <div className="text-3xl font-bold font-mono">{highScore}</div>
              </div>
            )}

            <button
              onClick={startGame}
              className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold text-xl rounded-xl shadow-lg shadow-cyan-500/30 transform hover:scale-105 transition-all border border-white/20"
            >
              START
            </button>
            <p className="text-gray-600 text-xs mt-4">or press SPACE</p>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-5xl font-black mb-6 text-red-500 drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]">
              DESTROYED
            </h2>
            
            <div className="mb-6 space-y-3">
              <div>
                <div className="text-gray-400 text-sm tracking-wider">SCORE</div>
                <div className="text-white text-5xl font-bold font-mono">{score}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm tracking-wider">WAVE REACHED</div>
                <div className="text-purple-400 text-2xl font-bold font-mono">{wave}</div>
              </div>
              {score >= highScore && score > 0 && (
                <div className="text-yellow-400 text-lg font-bold animate-pulse">
                  ⭐ NEW HIGH SCORE! ⭐
                </div>
              )}
            </div>

            <button
              onClick={startGame}
              className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold text-xl rounded-xl shadow-lg shadow-cyan-500/30 transform hover:scale-105 transition-all border border-white/20"
            >
              RETRY
            </button>
            <p className="text-gray-600 text-xs mt-4">or press SPACE</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
