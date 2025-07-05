interface MediaStatus {
  // Basic playback info
  paused: boolean
  timePos: number
  duration: number
  progress: number
  hasMedia: boolean
  
  // Media information
  filename: string
  title: string
  fileFormat: string
  
  // Video properties
  videoCodec: string
  videoWidth: number
  videoHeight: number
  videoBitrate: number
  fps: number
  
  // Audio properties
  audioCodec: string
  audioBitrate: number
  
  // Playback state
  fullscreen: boolean
  volume: number
  muted: boolean
  speed: number
  
  // Formatted time strings
  timeFormatted: string
  durationFormatted: string
  
  // Timestamp for freshness
  timestamp: number
}

interface Command {
  type: string
  [key: string]: any
}

export class RemotePage {
  private ws: WebSocket | null = null
  private mediaStatus: MediaStatus = {
    paused: true,
    timePos: 0,
    duration: 0,
    progress: 0,
    hasMedia: false,
    filename: 'No media',
    title: 'No media',
    fileFormat: '',
    videoCodec: '',
    videoWidth: 0,
    videoHeight: 0,
    videoBitrate: 0,
    fps: 0,
    audioCodec: '',
    audioBitrate: 0,
    fullscreen: false,
    volume: 100,
    muted: false,
    speed: 1.0,
    timeFormatted: '0:00',
    durationFormatted: '0:00',
    timestamp: 0
  }
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private showMediaInfo = false

  render(): void {
    const app = document.getElementById('app')
    if (!app) return

    app.innerHTML = this.getHTML()
    this.attachEventListeners()
    this.connectToServer()
  }

  private getHTML(): string {
    return `
      <div class="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 pb-8">
        <div class="max-w-sm mx-auto sm:max-w-md">
          <!-- Header -->
          <div class="iina-card mb-4 sm:mb-6">
            <div class="flex items-center justify-between mb-4">
              <button id="back-btn" class="iina-button px-3 py-2 sm:px-4 sm:py-2 flex items-center gap-2 text-sm sm:text-base">
                <span>←</span> <span class="hidden xs:inline">Back</span>
              </button>
              <div id="connection-status" class="flex items-center gap-2">
                <div class="w-2 h-2 sm:w-3 sm:h-3 rounded-full ${this.isConnected ? 'bg-green-400' : 'bg-red-400'}"></div>
                <span class="text-xs sm:text-sm text-iina-text-muted">
                  ${this.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            
            <div class="text-center">
              <h1 class="text-lg sm:text-xl font-semibold mb-1 truncate px-2">${this.mediaStatus.title}</h1>
              <p class="text-xs sm:text-sm text-iina-text-muted truncate px-2 mb-2">${this.mediaStatus.filename}</p>
              
              <!-- Media Info Toggle -->
              ${this.mediaStatus.hasMedia ? `
                <button id="media-info-toggle" class="text-xs text-iina-text-muted hover:text-iina-text transition-colors">
                  ${this.showMediaInfo ? '▼' : '▶'} Media Info
                </button>
              ` : ''}
            </div>
            
            <!-- Expandable Media Info -->
            ${this.showMediaInfo && this.mediaStatus.hasMedia ? `
              <div id="media-info-panel" class="mt-4 pt-4 border-t border-iina-surface-light">
                <div class="grid grid-cols-2 gap-3 text-xs">
                  <!-- Video Info -->
                  ${this.mediaStatus.videoWidth > 0 ? `
                    <div class="space-y-1">
                      <div class="text-iina-text-muted font-medium">Video</div>
                      <div class="text-iina-text">${this.mediaStatus.videoWidth}×${this.mediaStatus.videoHeight}</div>
                      ${this.mediaStatus.videoCodec ? `<div class="text-iina-text-muted">${this.mediaStatus.videoCodec.toUpperCase()}</div>` : ''}
                      ${this.mediaStatus.fps > 0 ? `<div class="text-iina-text-muted">${this.mediaStatus.fps} fps</div>` : ''}
                      ${this.mediaStatus.videoBitrate > 0 ? `<div class="text-iina-text-muted">${this.formatBitrate(this.mediaStatus.videoBitrate)}</div>` : ''}
                    </div>
                  ` : ''}
                  
                  <!-- Audio Info -->
                  ${this.mediaStatus.audioCodec ? `
                    <div class="space-y-1">
                      <div class="text-iina-text-muted font-medium">Audio</div>
                      <div class="text-iina-text">${this.mediaStatus.audioCodec.toUpperCase()}</div>
                      ${this.mediaStatus.audioBitrate > 0 ? `<div class="text-iina-text-muted">${this.formatBitrate(this.mediaStatus.audioBitrate)}</div>` : ''}
                    </div>
                  ` : ''}
                  
                  <!-- File Info -->
                  <div class="space-y-1">
                    <div class="text-iina-text-muted font-medium">File</div>
                    ${this.mediaStatus.fileFormat ? `<div class="text-iina-text">${this.mediaStatus.fileFormat.toUpperCase()}</div>` : ''}
                    <div class="text-iina-text-muted">${this.mediaStatus.durationFormatted}</div>
                  </div>
                  
                  <!-- Playback Info -->
                  <div class="space-y-1">
                    <div class="text-iina-text-muted font-medium">Playback</div>
                    <div class="text-iina-text">${Math.round(this.mediaStatus.volume)}% ${this.mediaStatus.muted ? '🔇' : '🔊'}</div>
                    ${this.mediaStatus.speed !== 1.0 ? `<div class="text-iina-text-muted">${this.mediaStatus.speed}× speed</div>` : ''}
                    ${this.mediaStatus.fullscreen ? `<div class="text-iina-text-muted">Fullscreen</div>` : ''}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Progress Bar -->
          <div class="iina-card mb-4 sm:mb-6">
            <div class="space-y-3">
              <input 
                type="range" 
                id="progress-slider" 
                class="iina-slider h-3 sm:h-2" 
                min="0" 
                max="${this.mediaStatus.duration || 100}" 
                value="${this.mediaStatus.timePos}"
                step="0.1"
                ${!this.mediaStatus.hasMedia ? 'disabled' : ''}
              >
              <div class="flex justify-between items-center px-1">
                <span class="iina-timestamp text-xs sm:text-sm">${this.mediaStatus.timeFormatted}</span>
                <span class="iina-timestamp text-xs sm:text-sm text-center flex-1">
                  ${this.mediaStatus.hasMedia ? `${Math.round(this.mediaStatus.progress)}%` : ''}
                </span>
                <span class="iina-timestamp text-xs sm:text-sm">${this.mediaStatus.durationFormatted}</span>
              </div>
            </div>
          </div>

          <!-- Main Controls -->
          <div class="iina-card mb-4 sm:mb-6">
            <div class="flex items-center justify-center gap-6 sm:gap-4 py-2">
              <!-- Skip Backward -->
              <button id="skip-backward" class="iina-button w-16 h-16 sm:w-14 sm:h-14 ${!this.mediaStatus.hasMedia ? 'opacity-50 cursor-not-allowed' : ''}" title="Skip back 10s" ${!this.mediaStatus.hasMedia ? 'disabled' : ''}>
                <svg class="w-8 h-8 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 7l-7 5 7 5V7z"/>
                  <path d="M18 7l-7 5 7 5V7z"/>
                </svg>
              </button>

              <!-- Play/Pause -->
              <button id="play-pause" class="iina-button-primary w-20 h-20 sm:w-16 sm:h-16 ${!this.mediaStatus.hasMedia ? 'opacity-50 cursor-not-allowed' : ''}" title="Play/Pause" ${!this.mediaStatus.hasMedia ? 'disabled' : ''}>
                <svg class="w-10 h-10 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
                  ${this.mediaStatus.paused ? 
                    '<path d="M8 5v14l11-7z"/>' : 
                    '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'
                  }
                </svg>
              </button>

              <!-- Skip Forward -->
              <button id="skip-forward" class="iina-button w-16 h-16 sm:w-14 sm:h-14 ${!this.mediaStatus.hasMedia ? 'opacity-50 cursor-not-allowed' : ''}" title="Skip forward 10s" ${!this.mediaStatus.hasMedia ? 'disabled' : ''}>
                <svg class="w-8 h-8 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 7l7 5-7 5V7z"/>
                  <path d="M6 7l7 5-7 5V7z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Secondary Controls -->
          <div class="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <button id="fullscreen-btn" class="iina-button py-4 sm:py-3 flex items-center justify-center gap-2 text-sm sm:text-base ${this.mediaStatus.fullscreen ? 'bg-iina-primary text-white' : ''}">
              <svg class="w-5 h-5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                ${this.mediaStatus.fullscreen ? 
                  '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>' :
                  '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>'
                }
              </svg>
              <span class="hidden xs:inline">${this.mediaStatus.fullscreen ? 'Exit FS' : 'Fullscreen'}</span>
            </button>
            
            <button id="subtitles-btn" class="iina-button py-4 sm:py-3 flex items-center justify-center gap-2 text-sm sm:text-base">
              <svg class="w-5 h-5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"/>
              </svg>
              <span class="hidden xs:inline">Subtitles</span>
            </button>
          </div>

          <!-- Volume Control -->
          ${this.mediaStatus.hasMedia ? `
            <div class="iina-card mb-4 sm:mb-6">
              <div class="flex items-center gap-3">
                <button id="mute-btn" class="iina-button w-10 h-10 flex items-center justify-center">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    ${this.mediaStatus.muted ? 
                      '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>' :
                      '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>'
                    }
                  </svg>
                </button>
                <input 
                  type="range" 
                  id="volume-slider" 
                  class="iina-slider flex-1 h-2" 
                  min="0" 
                  max="100" 
                  value="${this.mediaStatus.volume}"
                  step="1"
                >
                <span class="text-xs text-iina-text-muted w-8 text-right">${Math.round(this.mediaStatus.volume)}%</span>
              </div>
            </div>
          ` : ''}

          <!-- Connection Info -->
          <div class="iina-card text-center">
            <div class="text-sm text-iina-text-muted">
              <p id="server-info">Connecting...</p>
              <button id="reconnect-btn" class="iina-button px-4 py-2 mt-3 ${this.isConnected ? 'hidden' : ''}">
                Reconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  private attachEventListeners(): void {
    // Back button
    const backBtn = document.getElementById('back-btn')
    backBtn?.addEventListener('click', () => {
      window.location.href = '/discovery'
    })

    // Media info toggle
    const mediaInfoToggle = document.getElementById('media-info-toggle')
    mediaInfoToggle?.addEventListener('click', () => {
      this.showMediaInfo = !this.showMediaInfo
      this.updateUI()
    })

    // Play/Pause
    const playPauseBtn = document.getElementById('play-pause')
    playPauseBtn?.addEventListener('click', () => {
      if (this.mediaStatus.hasMedia) {
        this.sendCommand({ type: 'toggle-pause' })
      }
    })

    // Skip controls
    const skipBackwardBtn = document.getElementById('skip-backward')
    skipBackwardBtn?.addEventListener('click', () => {
      if (this.mediaStatus.hasMedia) {
        this.sendCommand({ type: 'skip-backward', amount: 10 })
      }
    })

    const skipForwardBtn = document.getElementById('skip-forward')
    skipForwardBtn?.addEventListener('click', () => {
      if (this.mediaStatus.hasMedia) {
        this.sendCommand({ type: 'skip-forward', amount: 10 })
      }
    })

    // Progress slider
    const progressSlider = document.getElementById('progress-slider') as HTMLInputElement
    progressSlider?.addEventListener('input', () => {
      if (this.mediaStatus.hasMedia) {
        const position = parseFloat(progressSlider.value)
        this.sendCommand({ type: 'seek', position })
      }
    })

    // Volume controls
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement
    volumeSlider?.addEventListener('input', () => {
      const volume = parseInt(volumeSlider.value)
      this.sendCommand({ type: 'set-volume', volume })
    })

    const muteBtn = document.getElementById('mute-btn')
    muteBtn?.addEventListener('click', () => {
      this.sendCommand({ type: 'toggle-mute' })
    })

    // Fullscreen
    const fullscreenBtn = document.getElementById('fullscreen-btn')
    fullscreenBtn?.addEventListener('click', () => {
      this.sendCommand({ type: 'toggle-fullscreen' })
    })

    // Subtitles (placeholder)
    const subtitlesBtn = document.getElementById('subtitles-btn')
    subtitlesBtn?.addEventListener('click', () => {
      this.showToast('Subtitle controls coming soon!', 'info')
    })

    // Reconnect
    const reconnectBtn = document.getElementById('reconnect-btn')
    reconnectBtn?.addEventListener('click', () => {
      this.connectToServer()
    })

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return // Don't interfere with input fields
      
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (this.mediaStatus.hasMedia) {
            this.sendCommand({ type: 'toggle-pause' })
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (this.mediaStatus.hasMedia) {
            this.sendCommand({ type: 'skip-backward', amount: 10 })
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (this.mediaStatus.hasMedia) {
            this.sendCommand({ type: 'skip-forward', amount: 10 })
          }
          break
        case 'KeyF':
          e.preventDefault()
          this.sendCommand({ type: 'toggle-fullscreen' })
          break
        case 'KeyM':
          e.preventDefault()
          this.sendCommand({ type: 'toggle-mute' })
          break
        case 'ArrowUp':
          e.preventDefault()
          const newVolumeUp = Math.min(100, this.mediaStatus.volume + 5)
          this.sendCommand({ type: 'set-volume', volume: newVolumeUp })
          break
        case 'ArrowDown':
          e.preventDefault()
          const newVolumeDown = Math.max(0, this.mediaStatus.volume - 5)
          this.sendCommand({ type: 'set-volume', volume: newVolumeDown })
          break
      }
    })
  }

  private connectToServer(): void {
    const address = localStorage.getItem('iina-server-address') || 'localhost'
    const port = localStorage.getItem('iina-server-port') || '10010'
    
    if (this.ws) {
      this.ws.close()
    }

    try {
      this.ws = new WebSocket(`ws://${address}:${port}`)
      
      this.ws.onopen = () => {
        console.log('Connected to IINA server')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.updateConnectionStatus()
        this.showToast('Connected to IINA server', 'success')
        
        // Request initial status
        this.sendCommand({ type: 'get-status' })
      }
      
      this.ws.onmessage = (event) => {
        try {
          let messageText: string
          
          // Handle different message types (Blob vs string)
          if (event.data instanceof Blob) {
            // Convert Blob to text
            event.data.text().then(text => {
              try {
                const message = JSON.parse(text)
                this.handleServerMessage(message)
              } catch (error) {
                console.error('Failed to parse blob message:', error, 'Raw text:', text)
              }
            }).catch(error => {
              console.error('Failed to read blob data:', error)
            })
            return
          } else {
            // Handle as string
            messageText = event.data
          }
          
          const message = JSON.parse(messageText)
          this.handleServerMessage(message)
        } catch (error) {
          console.error('Failed to parse server message:', error, 'Raw data:', event.data)
        }
      }
      
      this.ws.onclose = () => {
        console.log('Disconnected from IINA server')
        this.isConnected = false
        this.updateConnectionStatus()
        this.attemptReconnect()
      }
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.showToast('Connection error', 'error')
      }
    } catch (error) {
      console.error('Failed to connect to server:', error)
      this.showToast('Failed to connect to server', 'error')
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.showToast('Max reconnection attempts reached', 'error')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
    
    setTimeout(() => {
      if (!this.isConnected) {
        console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
        this.connectToServer()
      }
    }, delay)
  }

  private sendCommand(command: Command): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command))
    } else {
      this.showToast('Not connected to server', 'error')
    }
  }

  private handleServerMessage(message: any): void {
    if (message.type === 'status' && message.data) {
      this.mediaStatus = { ...this.mediaStatus, ...message.data }
      this.updateUI()
    } else if (message.type === 'identify_response') {
      console.log('Server identified:', message)
      this.showToast(`Connected to ${message.name}`, 'success')
    }
  }

  private updateConnectionStatus(): void {
    const statusElement = document.getElementById('connection-status')
    const serverInfoElement = document.getElementById('server-info')
    const reconnectBtn = document.getElementById('reconnect-btn')
    
    if (statusElement) {
      statusElement.innerHTML = `
        <div class="w-3 h-3 rounded-full ${this.isConnected ? 'bg-green-400' : 'bg-red-400'}"></div>
        <span class="text-sm text-iina-text-muted">
          ${this.isConnected ? 'Connected' : 'Disconnected'}
        </span>
      `
    }
    
    if (serverInfoElement) {
      const address = localStorage.getItem('iina-server-address') || 'localhost'
      const port = localStorage.getItem('iina-server-port') || '10010'
      
      serverInfoElement.textContent = this.isConnected 
        ? `Connected to ${address}:${port}`
        : `Disconnected from ${address}:${port}`
    }
    
    if (reconnectBtn) {
      reconnectBtn.classList.toggle('hidden', this.isConnected)
    }
  }

  private updateUI(): void {
    // Re-render the entire interface to update all dynamic content
    const app = document.getElementById('app')
    if (app) {
      app.innerHTML = this.getHTML()
      this.attachEventListeners()
    }
  }

  private formatBitrate(bitrate: number): string {
    if (bitrate >= 1000000) {
      return `${(bitrate / 1000000).toFixed(1)} Mbps`
    } else if (bitrate >= 1000) {
      return `${(bitrate / 1000).toFixed(0)} kbps`
    } else {
      return `${bitrate} bps`
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = document.createElement('div')
    
    const colorClasses = {
      success: 'bg-green-500/20 border-green-500/30 text-green-400',
      error: 'bg-red-500/20 border-red-500/30 text-red-400',
      info: 'bg-blue-500/20 border-blue-500/30 text-blue-400'
    }
    
    toast.className = `fixed top-4 right-4 ${colorClasses[type]} border px-4 py-3 rounded-lg z-50 max-w-xs`
    toast.textContent = message
    
    document.body.appendChild(toast)
    
    const duration = type === 'error' ? 5000 : 3000
    setTimeout(() => {
      toast.remove()
    }, duration)
  }
} 