// ============================================================================
// TETRIS GAME - Mejorado con arquitectura modular
// ============================================================================

// Definición de Tetrominós
const TETROMINOS = {
  I: [
    [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  ],
  J: [
    [1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  ],
  L: [
    [0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  ],
  O: [[0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  S: [
    [0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  ],
  T: [
    [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  ],
  Z: [
    [1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  ],
}

const COLORS = {
  I: "cI",
  J: "cJ",
  L: "cL",
  O: "cO",
  S: "cS",
  T: "cT",
  Z: "cZ",
}

// ============================================================================
// Audio & Haptic Feedback System
// ============================================================================
class SoundManager {
  constructor() {
    this.audioContext = null
    this.isMuted = localStorage.getItem("tetris_muted") === "true"
    this.hasVibration = "vibrate" in navigator
    this.initAudioContext()
  }

  initAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      this.audioContext = new AudioContext()
    } catch (e) {
      console.warn("Web Audio API not supported")
    }
  }

  playTone(frequency, duration, volume = 0.3) {
    if (this.isMuted || !this.audioContext) return

    try {
      const ctx = this.audioContext
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.value = frequency
      osc.type = "sine"

      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch (e) {
      console.warn("Error playing sound:", e)
    }
  }

  playMove() {
    // Sonido suave para movimiento
    this.playTone(400, 0.05, 0.15)
  }

  playRotate() {
    // Sonido para rotación
    this.playTone(500, 0.08, 0.2)
  }

  playLock() {
    // Sonido para bloquear pieza
    this.playTone(300, 0.1, 0.25)
  }

  playLineClear() {
    // Sonido para línea limpiada (escala ascendente)
    setTimeout(() => this.playTone(523, 0.1, 0.25), 0)
    setTimeout(() => this.playTone(659, 0.1, 0.25), 100)
    setTimeout(() => this.playTone(784, 0.15, 0.3), 200)
  }

  playGameOver() {
    // Sonido de game over (escala descendente)
    setTimeout(() => this.playTone(784, 0.1, 0.3), 0)
    setTimeout(() => this.playTone(659, 0.1, 0.3), 100)
    setTimeout(() => this.playTone(523, 0.1, 0.3), 200)
    setTimeout(() => this.playTone(392, 0.2, 0.3), 300)
  }

  vibrate(pattern = 20) {
    if (!this.hasVibration) return
    try {
      navigator.vibrate(pattern)
    } catch (e) {
      console.warn("Vibration API error:", e)
    }
  }

  vibrateMini() {
    this.vibrate(10)
  }

  vibrateMedium() {
    this.vibrate(30)
  }

  vibratePattern(pattern) {
    this.vibrate(pattern)
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    localStorage.setItem("tetris_muted", this.isMuted)
    return this.isMuted
  }
}

// ============================================================================
// Clase principal del juego
// ============================================================================
class TetrisGame {
  constructor() {
    this.COLS = 10
    this.ROWS = 20
    this.board = []
    this.current = null
    this.nextPiece = null
    this.isRunning = false
    this.isPaused = false
    this.dropInterval = null
    this.dropSpeed = 800

    // Estadísticas
    this.score = 0
    this.lines = 0
    this.level = 1
    this.highScore = Number.parseInt(localStorage.getItem("tetris_high") || "0", 10)

    this.soundManager = new SoundManager()

    // DOM Elements
    this.gridEl = document.getElementById("grid")
    this.nextPreviewEl = document.getElementById("next-preview")
    this.scoreEl = document.getElementById("score")
    this.linesEl = document.getElementById("lines")
    this.levelEl = document.getElementById("level")
    this.highEl = document.getElementById("high")
    this.statusBadgeEl = document.getElementById("status-badge")
    this.statusTextEl = document.getElementById("status-text")
    this.gameOverModal = document.getElementById("gameOverModal")

    // Arreglos de elementos DOM
    this.cells = []
    this.nextCells = []

    this.init()
  }

  init() {
    this.createGrid()
    this.resetBoard()
    this.setupEventListeners()
    this.updateHUD()
  }

  createGrid() {
    this.gridEl.innerHTML = ""
    this.cells = []

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const cell = document.createElement("div")
        cell.className = "cell"
        this.gridEl.appendChild(cell)
        this.cells.push(cell)
      }
    }

    this.nextPreviewEl.innerHTML = ""
    this.nextCells = []
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement("div")
      cell.className = "cell"
      this.nextPreviewEl.appendChild(cell)
      this.nextCells.push(cell)
    }
  }

  resetBoard() {
    this.board = []
    for (let r = 0; r < this.ROWS; r++) {
      this.board.push(new Array(this.COLS).fill(0))
    }
  }

  setupEventListeners() {
    document.getElementById("btn-start").addEventListener("click", () => this.start())
    document.getElementById("btn-pause").addEventListener("click", () => this.togglePause())
    document.getElementById("btn-reset").addEventListener("click", () => this.reset())

    this.createMuteButton()

    // Teclado
    document.addEventListener("keydown", (e) => this.handleKeyDown(e))

    // Touch controls
    document.querySelectorAll(".touch-controls button").forEach((btn) => {
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault()
        const action = btn.getAttribute("data-action")
        this.handleTouchAction(action)
      })
    })
  }

  createMuteButton() {
    const controlsDiv = document.querySelector(".controls")
    const muteBtn = document.createElement("button")
    muteBtn.id = "btn-mute"
    muteBtn.textContent = this.soundManager.isMuted ? "🔇 Silenciado" : "🔊 Sonido"
    muteBtn.style.marginTop = "8px"
    muteBtn.addEventListener("click", () => {
      const muted = this.soundManager.toggleMute()
      muteBtn.textContent = muted ? "🔇 Silenciado" : "🔊 Sonido"
      this.soundManager.vibrateMini()
    })
    controlsDiv.appendChild(muteBtn)
  }

  handleKeyDown(e) {
    if (!this.isRunning) return

    switch (e.key) {
      case "ArrowLeft":
        this.move(-1, 0)
        e.preventDefault()
        break
      case "ArrowRight":
        this.move(1, 0)
        e.preventDefault()
        break
      case "ArrowDown":
        this.move(0, 1)
        e.preventDefault()
        break
      case "ArrowUp":
      case "x":
      case "X":
        this.rotate(1)
        e.preventDefault()
        break
      case "z":
      case "Z":
        this.rotate(-1)
        e.preventDefault()
        break
      case " ":
        this.hardDrop()
        e.preventDefault()
        break
    }
  }

  handleTouchAction(action) {
    if (!this.isRunning) return

    switch (action) {
      case "left":
        this.move(-1, 0)
        break
      case "right":
        this.move(1, 0)
        break
      case "down":
        this.move(0, 1)
        break
      case "rotate":
        this.rotate(1)
        break
      case "drop":
        this.hardDrop()
        break
    }
  }

  // Generador de piezas aleatorias
  getRandomPiece() {
    const types = Object.keys(TETROMINOS)
    return types[Math.floor(Math.random() * types.length)]
  }

  getShape(type, rotationIndex) {
    const variants = TETROMINOS[type]
    return variants[rotationIndex % variants.length]
  }

  // Spawn de nueva pieza
  spawn() {
    if (!this.nextPiece) {
      this.nextPiece = this.getRandomPiece()
    }

    const type = this.nextPiece
    this.nextPiece = this.getRandomPiece()

    this.current = {
      type,
      rotation: 0,
      shape: this.getShape(type, 0),
      x: 3,
      y: -1,
    }

    if (this.checkCollision(this.current.x, this.current.y, this.current.shape)) {
      this.gameOver()
    }

    this.renderNextPreview()
  }

  // Detección de colisiones
  checkCollision(x, y, shape) {
    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        const idx = sy * 4 + sx
        if (shape[idx]) {
          const gx = x + sx
          const gy = y + sy

          if (gx < 0 || gx >= this.COLS || gy >= this.ROWS) return true
          if (gy >= 0 && this.board[gy][gx]) return true
        }
      }
    }
    return false
  }

  // Bloquear pieza al tablero
  lockPiece() {
    const s = this.current.shape
    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        const idx = sy * 4 + sx
        if (s[idx]) {
          const gx = this.current.x + sx
          const gy = this.current.y + sy
          if (gy >= 0) {
            this.board[gy][gx] = this.current.type
          }
        }
      }
    }

    this.soundManager.playLock()
    this.soundManager.vibrateMedium()

    this.clearLines()
    this.spawn()
  }

  // Limpiar líneas completas
  clearLines() {
    let cleared = 0
    for (let r = this.ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((cell) => cell !== 0)) {
        this.board.splice(r, 1)
        this.board.unshift(new Array(this.COLS).fill(0))
        cleared++
        r++
      }
    }

    if (cleared > 0) {
      const pointsTable = { 1: 40, 2: 100, 3: 300, 4: 1200 }
      this.score += (pointsTable[cleared] || 0) * this.level
      this.lines += cleared

      const newLevel = Math.floor(this.lines / 10) + 1
      if (newLevel !== this.level) {
        this.level = newLevel
        this.updateSpeed()
      }

      this.soundManager.playLineClear()
      this.soundManager.vibratePattern([30, 50, 30, 50, 50])

      this.updateHUD()
      this.playLineClearAnimation()
    }
  }

  playLineClearAnimation() {
    // Visual feedback para líneas limpiadas
    this.cells.forEach((cell) => {
      if (
        cell.classList.contains("cI") ||
        cell.classList.contains("cJ") ||
        cell.classList.contains("cL") ||
        cell.classList.contains("cO") ||
        cell.classList.contains("cS") ||
        cell.classList.contains("cT") ||
        cell.classList.contains("cZ")
      ) {
        cell.classList.add("line-clear")
      }
    })
  }

  updateSpeed() {
    this.dropSpeed = Math.max(100, 800 - (this.level - 1) * 60)
    if (this.isRunning && !this.isPaused) {
      clearInterval(this.dropInterval)
      this.dropInterval = setInterval(() => this.stepDown(), this.dropSpeed)
    }
  }

  // Movimiento
  move(dx, dy) {
    if (!this.current) return false

    const nx = this.current.x + dx
    const ny = this.current.y + dy

    if (!this.checkCollision(nx, ny, this.current.shape)) {
      this.current.x = nx
      this.current.y = ny
      this.soundManager.playMove()
      this.soundManager.vibrateMini()
      this.render()
      return true
    }
    return false
  }

  // Rotación con wall kicks
  rotate(dir = 1) {
    if (!this.current) return false

    const variants = TETROMINOS[this.current.type]
    const nextRot = (this.current.rotation + dir + variants.length) % variants.length
    const nextShape = this.getShape(this.current.type, nextRot)

    const kicks = [0, -1, 1, -2, 2]
    for (const k of kicks) {
      if (!this.checkCollision(this.current.x + k, this.current.y, nextShape)) {
        this.current.rotation = nextRot
        this.current.shape = nextShape
        this.current.x += k
        this.soundManager.playRotate()
        this.soundManager.vibrateMini()
        this.render()
        return true
      }
    }
    return false
  }

  // Hard drop
  hardDrop() {
    if (!this.current) return
    while (this.move(0, 1)) {}
    this.lockPiece()
    this.render()
  }

  // Caída natural
  stepDown() {
    if (!this.current) return
    if (!this.move(0, 1)) {
      this.lockPiece()
    }
  }

  // Renderizar
  render() {
    // Limpiar tablero
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const idx = r * this.COLS + c
        const val = this.board[r][c]
        const cell = this.cells[idx]
        cell.className = "cell"
        if (val) {
          cell.classList.add(COLORS[val], "active")
        }
      }
    }

    // Dibujar pieza actual
    if (this.current) {
      // Ghost piece
      let ghostY = this.current.y
      while (!this.checkCollision(this.current.x, ghostY + 1, this.current.shape)) {
        ghostY++
      }
      this.drawShape(this.current.shape, this.current.x, ghostY, true)

      // Pieza actual
      this.drawShape(this.current.shape, this.current.x, this.current.y, false)
    }
  }

  drawShape(shape, x, y, isGhost = false) {
    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        const idx = sy * 4 + sx
        if (shape[idx]) {
          const gx = x + sx
          const gy = y + sy
          if (gy >= 0 && gy < this.ROWS && gx >= 0 && gx < this.COLS) {
            const cell = this.cells[gy * this.COLS + gx]
            cell.classList.add(COLORS[this.current.type], "active")
            if (isGhost) {
              cell.classList.add("ghost")
            }
          }
        }
      }
    }
  }

  renderNextPreview() {
    this.nextCells.forEach((c) => (c.className = "cell"))
    if (!this.nextPiece) return

    const shape = this.getShape(this.nextPiece, 0)
    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        const idx = sy * 4 + sx
        if (shape[idx]) {
          const elIndex = sy * 4 + sx
          if (this.nextCells[elIndex]) {
            this.nextCells[elIndex].classList.add(COLORS[this.nextPiece])
          }
        }
      }
    }
  }

  updateHUD() {
    this.scoreEl.textContent = this.score
    this.linesEl.textContent = this.lines
    this.levelEl.textContent = this.level
    this.highEl.textContent = this.highScore
  }

  updateStatusBadge() {
    this.statusBadgeEl.className = "status-badge"
    if (!this.isRunning) {
      this.statusBadgeEl.classList.add("status-idle")
      this.statusTextEl.textContent = "Presiona Iniciar"
    } else if (this.isPaused) {
      this.statusBadgeEl.classList.add("status-paused")
      this.statusTextEl.textContent = "⏸ En Pausa"
    } else {
      this.statusBadgeEl.classList.add("status-running")
      this.statusTextEl.textContent = "● Jugando"
    }
  }

  // Control del juego
  start() {
    if (this.isRunning) return

    this.resetBoard()
    this.score = 0
    this.lines = 0
    this.level = 1
    this.updateHUD()
    this.updateSpeed()

    this.isRunning = true
    this.isPaused = false
    this.updateStatusBadge()
    this.updateButtonStates()

    clearInterval(this.dropInterval)
    this.spawn()
    this.render()
    this.dropInterval = setInterval(() => this.stepDown(), this.dropSpeed)
  }

  togglePause() {
    if (!this.isRunning) return

    this.isPaused = !this.isPaused
    this.updateStatusBadge()
    this.updateButtonStates()

    if (this.isPaused) {
      clearInterval(this.dropInterval)
    } else {
      this.dropInterval = setInterval(() => this.stepDown(), this.dropSpeed)
    }
  }

  reset() {
    clearInterval(this.dropInterval)
    this.isRunning = false
    this.isPaused = false
    this.current = null
    this.nextPiece = null
    this.resetBoard()
    this.score = 0
    this.lines = 0
    this.level = 1
    this.updateHUD()
    this.updateStatusBadge()
    this.updateButtonStates()
    this.render()
    this.renderNextPreview()
  }

  gameOver() {
    clearInterval(this.dropInterval)
    this.isRunning = false
    this.isPaused = false
    this.updateStatusBadge()
    this.updateButtonStates()

    this.soundManager.playGameOver()
    this.soundManager.vibratePattern([100, 50, 100, 50, 100, 50, 200])

    if (this.score > this.highScore) {
      this.highScore = this.score
      localStorage.setItem("tetris_high", this.score)
    }
    this.updateHUD()

    document.getElementById("final-score").textContent = this.score
    document.getElementById("final-lines").textContent = this.lines
    document.getElementById("final-level").textContent = this.level

    this.gameOverModal.classList.add("show")
  }

  updateButtonStates() {
    const startBtn = document.getElementById("btn-start")
    const pauseBtn = document.getElementById("btn-pause")

    startBtn.disabled = this.isRunning
    pauseBtn.disabled = !this.isRunning
  }
}

// ============================================================================
// Inicializar juego cuando el DOM esté listo
// ============================================================================
const game = new TetrisGame()
