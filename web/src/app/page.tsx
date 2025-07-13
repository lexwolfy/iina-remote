'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface IINAServer {
  name: string
  address: string
  port: number
  status: 'online' | 'offline' | 'checking'
  lastSeen?: Date
}

function DiscoveryPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [servers, setServers] = useState<IINAServer[]>([])
  const [manualAddress, setManualAddress] = useState('localhost')
  const [manualPort, setManualPort] = useState('10010')

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 ${
      type === 'success' 
        ? 'bg-green-500/20 border-green-500/30 text-green-400' 
        : 'bg-red-500/20 border-red-500/30 text-red-400'
    } border px-4 py-3 rounded-lg z-50`
    toast.textContent = message
    
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.remove()
    }, type === 'error' ? 5000 : 3000)
  }, [])

  const testWebSocketConnection = useCallback(async (address: string, port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`⏰ Connection timeout for ${address}:${port}`)
        resolve(false)
      }, 3000)
      
      try {
        const ws = new WebSocket(`ws://${address}:${port}`)
        
        ws.onopen = () => {
          console.log(`🟢 WebSocket connected to ${address}:${port}`)
          clearTimeout(timeout)
          ws.close()
          resolve(true)
        }
        
        ws.onerror = () => {
          clearTimeout(timeout)
          resolve(false)
        }
        
        ws.onclose = (event) => {
          if (event.code !== 1000) {
            clearTimeout(timeout)
            resolve(false)
          }
        }
      } catch {
        clearTimeout(timeout)
        resolve(false)
      }
    })
  }, [])

  const updateServerStatus = useCallback((address: string, port: number, status: IINAServer['status']) => {
    setServers(prev => {
      const updated = prev.map(server => {
        if (server.address === address && server.port === port) {
          return {
            ...server,
            status,
            lastSeen: status === 'online' ? new Date() : server.lastSeen
          }
        }
        return server
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem('iina-discovered-servers', JSON.stringify(updated))
      }
      return updated
    })
  }, [])

  const testConnection = useCallback(async (address: string, port: number, showResult = true) => {
    try {
      updateServerStatus(address, port, 'checking')
      
      const isConnected = await testWebSocketConnection(address, port)
      
      if (isConnected) {
        updateServerStatus(address, port, 'online')
        if (showResult) {
          showToast(`Server at ${address}:${port} is online`)
        }
      } else {
        updateServerStatus(address, port, 'offline')
        if (showResult) {
          showToast(`Could not connect to ${address}:${port}`, 'error')
        }
      }
    } catch (error) {
      updateServerStatus(address, port, 'offline')
      if (showResult) {
        showToast(`Connection test failed: ${(error as Error).message}`, 'error')
      }
    }
  }, [testWebSocketConnection, updateServerStatus, showToast])

  const addOrUpdateServer = useCallback((server: IINAServer) => {
    setServers(prev => {
      const existingIndex = prev.findIndex(s => s.address === server.address && s.port === server.port)
      
      let updated
      if (existingIndex >= 0) {
        updated = [...prev]
        updated[existingIndex] = server
      } else {
        updated = [...prev, server]
      }
      
      // Save immediately and synchronously
      if (typeof window !== 'undefined') {
        localStorage.setItem('iina-discovered-servers', JSON.stringify(updated))
      }
      return updated
    })
  }, [])

  const connectToServer = useCallback((address: string, port: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('iina-server-address', address)
      localStorage.setItem('iina-server-port', port.toString())
    }
    router.push('/remote')
  }, [router])

  const handleManualConnection = useCallback(() => {
    const address = manualAddress.trim()
    const port = parseInt(manualPort)
    
    if (!address) {
      showToast('Please enter a server address', 'error')
      return
    }
    
    if (isNaN(port) || port < 1 || port > 65535) {
      showToast('Please enter a valid port number (1-65535)', 'error')
      return
    }
    
    addOrUpdateServer({
      name: `IINA Server (${address})`,
      address,
      port,
      status: 'checking',
      lastSeen: new Date()
    })
    
    connectToServer(address, port)
  }, [manualAddress, manualPort, showToast, addOrUpdateServer, connectToServer])

  const deleteServer = useCallback((address: string, port: number) => {
    setServers(prev => {
      const updated = prev.filter(s => !(s.address === address && s.port === port))
      if (typeof window !== 'undefined') {
        localStorage.setItem('iina-discovered-servers', JSON.stringify(updated))
      }
      return updated
    })
    showToast('Server removed successfully')
  }, [showToast])

  const getLastServer = useCallback((): IINAServer | null => {
    if (servers.length === 0) return null
    
    return servers.reduce((latest, current) => {
      if (!latest.lastSeen) return current
      if (!current.lastSeen) return latest
      return current.lastSeen > latest.lastSeen ? current : latest
    })
  }, [servers])

  const getStatusClasses = useCallback((status: string): string => {
    switch (status) {
      case 'online':
        return 'bg-green-500/20 text-green-400 border border-green-500/30'
      case 'offline':
        return 'bg-red-500/20 text-red-400 border border-red-500/30'
      case 'checking':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    }
  }, [])

  const formatTime = useCallback((date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }, [])

  // Check URL parameters on mount
  useEffect(() => {
    const ip = searchParams.get('ip')
    const port = searchParams.get('port')
    
    if (ip && port) {
      const portNum = parseInt(port)
      if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
        // Add server immediately and connect
        addOrUpdateServer({
          name: `Server (${ip})`,
          address: ip,
          port: portNum,
          status: 'checking',
          lastSeen: new Date()
        })
        
        // Connect immediately - the server is now saved
        connectToServer(ip, portNum)
        return
      }
    }
  }, [searchParams, addOrUpdateServer, connectToServer])

  // Load saved servers on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const saved = localStorage.getItem('iina-discovered-servers')
      if (saved) {
        const parsedServers = JSON.parse(saved).map((server: Partial<IINAServer> & { lastSeen?: string }) => ({
          ...server,
          lastSeen: server.lastSeen ? new Date(server.lastSeen) : undefined,
          status: 'checking' as const
        }))
        setServers(parsedServers)
        
        // Test connection for the last server automatically
        const lastServer = parsedServers.reduce((latest: IINAServer | null, current: IINAServer) => {
          if (!latest?.lastSeen) return current
          if (!current.lastSeen) return latest
          return current.lastSeen > latest.lastSeen ? current : latest
        }, null)
        
        if (lastServer) {
          testConnection(lastServer.address, lastServer.port, false)
        }
      }
    } catch (error) {
      console.error('Failed to load saved servers:', error)
    }
  }, [testConnection])

  const lastServer = getLastServer()

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-sm mx-auto">
        <div className="iina-card mb-8">
          <h1 className="text-3xl font-light text-center mb-2">🎬 IINA Web Remote</h1>
          <p className="text-center text-iina-text-muted mb-6">Discover and connect to IINA servers on your network</p>
          
          {/* Manual Connection */}
          <div className="iina-card">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <span>🔗</span> Manual Connection
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Server Address</label>
                <input 
                  type="text" 
                  className="iina-input w-full" 
                  placeholder="192.168.1.100"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Port</label>
                <input 
                  type="number" 
                  className="iina-input w-full" 
                  placeholder="10010"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  min="1"
                  max="65535"
                />
              </div>
              <button 
                onClick={handleManualConnection}
                className="iina-button-primary w-full py-3"
              >
                Connect Manually
              </button>
            </div>
          </div>
        </div>

        {/* Last Server */}
        <div className="iina-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">Last Server</h2>
          </div>
          
          {!lastServer ? (
            <div className="text-center py-8 text-iina-text-muted">
              <div className="text-3xl mb-3">📡</div>
              <p className="text-base mb-2">No previous server</p>
              <p className="text-sm">Use manual connection to connect to a server</p>
            </div>
          ) : (
            <div className="iina-card">
              <div className="flex flex-col gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1 truncate">{lastServer.name}</h3>
                  <p className="text-iina-text-muted text-sm mb-3 truncate">
                    {lastServer.address}:{lastServer.port}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClasses(lastServer.status)} w-fit`}>
                      {lastServer.status.toUpperCase()}
                    </span>
                    {lastServer.lastSeen && (
                      <span className="text-xs text-iina-text-muted">
                        Last seen: {formatTime(lastServer.lastSeen)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="iina-button px-4 py-2 text-sm flex-1" 
                    onClick={() => testConnection(lastServer.address, lastServer.port)}
                  >
                    🔍 Test
                  </button>
                  <button 
                    className="iina-button-primary px-4 py-2 text-sm flex-1" 
                    onClick={() => connectToServer(lastServer.address, lastServer.port)}
                  >
                    🚀 Connect
                  </button>
                  <button 
                    className="iina-button px-3 py-2 text-sm" 
                    onClick={() => deleteServer(lastServer.address, lastServer.port)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DiscoveryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-4 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-iina-text-muted">Loading...</p>
        </div>
      </div>
    }>
      <DiscoveryPageContent />
    </Suspense>
  )
}