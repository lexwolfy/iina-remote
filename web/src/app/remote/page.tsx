'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface MediaStatus {
  paused: boolean
  timePos: number
  duration: number
  progress: number
  hasMedia: boolean
  filename: string
  title: string
  fileFormat: string
  videoCodec: string
  videoWidth: number
  videoHeight: number
  videoBitrate: number
  fps: number
  audioCodec: string
  audioBitrate: number
  fullscreen: boolean
  volume: number
  muted: boolean
  speed: number
  timeFormatted: string
  durationFormatted: string
  timestamp: number
}

interface Command {
  type: string
  position?: number
  amount?: number
  volume?: number
  [key: string]: unknown
}

export default function RemotePage() {
  const router = useRouter()
  const wsRef = useRef<WebSocket | null>(null)
  
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>({
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
  })
  
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [showMediaInfo, setShowMediaInfo] = useState(false)
  const [serverAddress, setServerAddress] = useState('localhost')
  const [serverPort, setServerPort] = useState('10010')
  const maxReconnectAttempts = 5
  const reconnectDelay = 1000

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
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
  }, [])

  const sendCommand = useCallback((command: Command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command))
    } else {
      showToast('Not connected to server', 'error')
    }
  }, [showToast])

  const handleServerMessage = useCallback((message: { type: string; data?: Partial<MediaStatus>; name?: string }) => {
    if (message.type === 'status' && message.data) {
      setMediaStatus(prev => ({ ...prev, ...message.data }))
    } else if (message.type === 'identify_response') {
      console.log('Server identified:', message)
      showToast(`Connected to ${message.name}`, 'success')
    }
  }, [showToast])

  // Helper function to update server status in localStorage
  const updateServerInLocalStorage = useCallback((address: string, port: number, status: 'online' | 'offline') => {
    if (typeof window === 'undefined') return
    
    try {
      const saved = localStorage.getItem('iina-discovered-servers')
      if (saved) {
        const servers = JSON.parse(saved)
        const updatedServers = servers.map((server: { address: string; port: number; status: string; lastSeen?: string }) => {
          if (server.address === address && server.port === port) {
            return {
              ...server,
              status,
              lastSeen: status === 'online' ? new Date().toISOString() : server.lastSeen
            }
          }
          return server
        })
        localStorage.setItem('iina-discovered-servers', JSON.stringify(updatedServers))
      }
    } catch (error) {
      console.error('Failed to update server in localStorage:', error)
    }
  }, [])

  const connectToServer = useCallback(() => {
    if (typeof window === 'undefined') return // Prevent SSR issues
    
    const address = localStorage.getItem('iina-server-address') || 'localhost'
    const port = localStorage.getItem('iina-server-port') || '10010'
    
    // Update state for display
    setServerAddress(address)
    setServerPort(port)
    
    if (wsRef.current) {
      wsRef.current.close()
    }

    try {
      wsRef.current = new WebSocket(`ws://${address}:${port}`)
      
      wsRef.current.onopen = () => {
        console.log('Connected to IINA server')
        setIsConnected(true)
        setReconnectAttempts(0)
        showToast('Connected to IINA server', 'success')
        
        // Update server status in localStorage for discovery page
        updateServerInLocalStorage(address, parseInt(port), 'online')
        
        // Request initial status
        sendCommand({ type: 'get-status' })
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          let messageText: string
          
          // Handle different message types (Blob vs string)
          if (event.data instanceof Blob) {
            event.data.text().then(text => {
              try {
                const message = JSON.parse(text)
                handleServerMessage(message)
              } catch (error) {
                console.error('Failed to parse blob message:', error, 'Raw text:', text)
              }
            }).catch(error => {
              console.error('Failed to read blob data:', error)
            })
            return
          } else {
            messageText = event.data
          }
          
          const message = JSON.parse(messageText)
          handleServerMessage(message)
        } catch (error) {
          console.error('Failed to parse server message:', error, 'Raw data:', event.data)
        }
      }
      
      wsRef.current.onclose = () => {
        console.log('Disconnected from IINA server')
        setIsConnected(false)
      }
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        // Only show toast if we've been connected before to avoid startup noise
        if (reconnectAttempts > 0) {
          showToast('Connection error', 'error')
        }
      }
    } catch (error) {
      console.error('Failed to connect to server:', error)
      showToast('Failed to connect to server', 'error')
    }
  }, [sendCommand, handleServerMessage, showToast, updateServerInLocalStorage, reconnectAttempts])

  // Handle reconnection when disconnected
  useEffect(() => {
    if (!isConnected && reconnectAttempts < maxReconnectAttempts) {
      const timer = setTimeout(() => {
        setReconnectAttempts(prev => prev + 1)
        const delay = reconnectDelay * Math.pow(2, reconnectAttempts)
        setTimeout(() => {
          if (!isConnected) {
            console.log(`Reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`)
            connectToServer()
          }
        }, delay)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isConnected, reconnectAttempts, connectToServer])


  const formatBitrate = useCallback((bitrate: number): string => {
    if (bitrate >= 1000000) {
      return `${(bitrate / 1000000).toFixed(1)} Mbps`
    } else if (bitrate >= 1000) {
      return `${(bitrate / 1000).toFixed(0)} kbps`
    } else {
      return `${bitrate} bps`
    }
  }, [])

  // Connect on mount with small delay to avoid initial error flash
  useEffect(() => {
    const timer = setTimeout(() => {
      connectToServer()
    }, 200)
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timer)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connectToServer])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return // Don't interfere with input fields
      
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (mediaStatus.hasMedia) {
            sendCommand({ type: 'toggle-pause' })
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (mediaStatus.hasMedia) {
            sendCommand({ type: 'skip-backward', amount: 10 })
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (mediaStatus.hasMedia) {
            sendCommand({ type: 'skip-forward', amount: 10 })
          }
          break
        case 'KeyF':
          e.preventDefault()
          sendCommand({ type: 'toggle-fullscreen' })
          break
        case 'KeyM':
          e.preventDefault()
          sendCommand({ type: 'toggle-mute' })
          break
        case 'ArrowUp':
          e.preventDefault()
          const newVolumeUp = Math.min(100, mediaStatus.volume + 5)
          sendCommand({ type: 'set-volume', volume: newVolumeUp })
          break
        case 'ArrowDown':
          e.preventDefault()
          const newVolumeDown = Math.max(0, mediaStatus.volume - 5)
          sendCommand({ type: 'set-volume', volume: newVolumeDown })
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mediaStatus.hasMedia, mediaStatus.volume, sendCommand])

  // Load server info on mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const address = localStorage.getItem('iina-server-address') || 'localhost'
      const port = localStorage.getItem('iina-server-port') || '10010'
      setServerAddress(address)
      setServerPort(port)
    }
  }, [])

  return (
    <div className="min-h-screen p-4 pb-8">
      <div className="max-w-sm mx-auto sm:max-w-md">
        {/* Header */}
        <div className="iina-card mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => router.push('/')}
              className="iina-button px-3 py-2 sm:px-4 sm:py-2 flex items-center gap-2 text-sm sm:text-base"
            >
              <span>←</span> <span className="hidden xs:inline">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-xs sm:text-sm text-iina-text-muted">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-lg sm:text-xl font-semibold mb-1 truncate px-2">{mediaStatus.title}</h1>
            <p className="text-xs sm:text-sm text-iina-text-muted truncate px-2 mb-2">{mediaStatus.filename}</p>
            
            {/* Media Info Toggle */}
            {mediaStatus.hasMedia && (
              <button 
                onClick={() => setShowMediaInfo(!showMediaInfo)}
                className="text-xs text-iina-text-muted hover:text-white transition-colors"
              >
                {showMediaInfo ? '▼' : '▶'} Media Info
              </button>
            )}
          </div>
          
          {/* Expandable Media Info */}
          {showMediaInfo && mediaStatus.hasMedia && (
            <div className="mt-4 pt-4 border-t border-iina-surface-light">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Video Info */}
                {mediaStatus.videoWidth > 0 && (
                  <div className="space-y-1">
                    <div className="text-iina-text-muted font-medium">Video</div>
                    <div className="text-white">{mediaStatus.videoWidth}×{mediaStatus.videoHeight}</div>
                    {mediaStatus.videoCodec && <div className="text-iina-text-muted">{mediaStatus.videoCodec.toUpperCase()}</div>}
                    {mediaStatus.fps > 0 && <div className="text-iina-text-muted">{mediaStatus.fps} fps</div>}
                    {mediaStatus.videoBitrate > 0 && <div className="text-iina-text-muted">{formatBitrate(mediaStatus.videoBitrate)}</div>}
                  </div>
                )}
                
                {/* Audio Info */}
                {mediaStatus.audioCodec && (
                  <div className="space-y-1">
                    <div className="text-iina-text-muted font-medium">Audio</div>
                    <div className="text-white">{mediaStatus.audioCodec.toUpperCase()}</div>
                    {mediaStatus.audioBitrate > 0 && <div className="text-iina-text-muted">{formatBitrate(mediaStatus.audioBitrate)}</div>}
                  </div>
                )}
                
                {/* File Info */}
                <div className="space-y-1">
                  <div className="text-iina-text-muted font-medium">File</div>
                  {mediaStatus.fileFormat && <div className="text-white">{mediaStatus.fileFormat.toUpperCase()}</div>}
                  <div className="text-iina-text-muted">{mediaStatus.durationFormatted}</div>
                </div>
                
                {/* Playback Info */}
                <div className="space-y-1">
                  <div className="text-iina-text-muted font-medium">Playback</div>
                  <div className="text-white">{Math.round(mediaStatus.volume)}% {mediaStatus.muted ? '🔇' : '🔊'}</div>
                  {mediaStatus.speed !== 1.0 && <div className="text-iina-text-muted">{mediaStatus.speed}× speed</div>}
                  {mediaStatus.fullscreen && <div className="text-iina-text-muted">Fullscreen</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="iina-card mb-4 sm:mb-6">
          <div className="space-y-3">
            <input 
              type="range" 
              className="iina-slider h-3 sm:h-2" 
              min="0" 
              max={mediaStatus.duration || 100} 
              value={mediaStatus.timePos}
              step="0.1"
              disabled={!mediaStatus.hasMedia}
              onChange={(e) => {
                if (mediaStatus.hasMedia) {
                  const position = parseFloat(e.target.value)
                  sendCommand({ type: 'seek', position })
                }
              }}
            />
            <div className="flex justify-between items-center px-1">
              <span className="iina-timestamp text-xs sm:text-sm">{mediaStatus.timeFormatted}</span>
              <span className="iina-timestamp text-xs sm:text-sm text-center flex-1">
                {mediaStatus.hasMedia ? `${Math.round(mediaStatus.progress)}%` : ''}
              </span>
              <span className="iina-timestamp text-xs sm:text-sm">{mediaStatus.durationFormatted}</span>
            </div>
          </div>
        </div>

        {/* Main Controls */}
        <div className="iina-card mb-4 sm:mb-6">
          <div className="flex items-center justify-center gap-6 sm:gap-4 py-2">
            {/* Skip Backward */}
            <button 
              onClick={() => {
                if (mediaStatus.hasMedia) {
                  sendCommand({ type: 'skip-backward', amount: 10 })
                }
              }}
              className={`iina-button w-16 h-16 sm:w-14 sm:h-14 ${!mediaStatus.hasMedia ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Skip back 10s" 
              disabled={!mediaStatus.hasMedia}
            >
              <svg className="w-8 h-8 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 7l-7 5 7 5V7z"/>
                <path d="M18 7l-7 5 7 5V7z"/>
              </svg>
            </button>

            {/* Play/Pause */}
            <button 
              onClick={() => {
                if (mediaStatus.hasMedia) {
                  sendCommand({ type: 'toggle-pause' })
                }
              }}
              className={`iina-button-primary w-20 h-20 sm:w-16 sm:h-16 ${!mediaStatus.hasMedia ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Play/Pause" 
              disabled={!mediaStatus.hasMedia}
            >
              <svg className="w-10 h-10 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
                {mediaStatus.paused ? (
                  <path d="M8 5v14l11-7z"/>
                ) : (
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                )}
              </svg>
            </button>

            {/* Skip Forward */}
            <button 
              onClick={() => {
                if (mediaStatus.hasMedia) {
                  sendCommand({ type: 'skip-forward', amount: 10 })
                }
              }}
              className={`iina-button w-16 h-16 sm:w-14 sm:h-14 ${!mediaStatus.hasMedia ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Skip forward 10s" 
              disabled={!mediaStatus.hasMedia}
            >
              <svg className="w-8 h-8 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 7l7 5-7 5V7z"/>
                <path d="M6 7l7 5-7 5V7z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Secondary Controls */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button 
            onClick={() => sendCommand({ type: 'toggle-fullscreen' })}
            className={`iina-button py-4 sm:py-3 flex items-center justify-center gap-2 text-sm sm:text-base ${mediaStatus.fullscreen ? 'bg-blue-600 text-white' : ''}`}
          >
            <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
              {mediaStatus.fullscreen ? (
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              ) : (
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              )}
            </svg>
            <span>{mediaStatus.fullscreen ? 'Exit FS' : 'Fullscreen'}</span>
          </button>
          
          <button 
            onClick={() => showToast('Subtitle controls coming soon!', 'info')}
            className="iina-button py-4 sm:py-3 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"/>
            </svg>
            <span>Subtitles</span>
          </button>
        </div>

        {/* Volume Control */}
        {mediaStatus.hasMedia && (
          <div className="iina-card mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => sendCommand({ type: 'toggle-mute' })}
                className="iina-button w-10 h-10 flex items-center justify-center"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  {mediaStatus.muted ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  )}
                </svg>
              </button>
              <input 
                type="range" 
                className="iina-slider flex-1 h-2" 
                min="0" 
                max="100" 
                value={mediaStatus.volume}
                step="1"
                onChange={(e) => {
                  const volume = parseInt(e.target.value)
                  sendCommand({ type: 'set-volume', volume })
                }}
              />
              <span className="text-xs text-iina-text-muted w-8 text-right">{Math.round(mediaStatus.volume)}%</span>
            </div>
          </div>
        )}

        {/* Connection Info */}
        <div className="iina-card text-center">
          <div className="text-sm text-iina-text-muted">
            <p>
              {isConnected 
                ? `Connected to ${serverAddress}:${serverPort}`
                : `Disconnected from ${serverAddress}:${serverPort}`
              }
            </p>
            {!isConnected && (
              <button 
                onClick={connectToServer}
                className="iina-button px-4 py-2 mt-3"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}