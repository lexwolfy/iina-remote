interface IINAServer {
  name: string
  address: string
  port: number
  status: 'online' | 'offline' | 'checking'
  lastSeen?: Date
}

export class DiscoveryPage {
  private servers: IINAServer[] = []

  render(): void {
    const app = document.getElementById('app')
    if (!app) return

    app.innerHTML = this.getHTML()
    this.attachEventListeners()
    this.loadSavedServers()
    this.checkUrlParameters()
  }

  private getHTML(): string {
    return `
      <div class="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 sm:p-6">
        <div class="max-w-sm mx-auto">
          <div class="iina-card mb-8">
            <h1 class="text-3xl font-light text-center mb-2">🎬 IINA Web Remote</h1>
            <p class="text-center text-iina-text-muted mb-6">Discover and connect to IINA servers on your network</p>
            
            <!-- Manual Connection -->
            <div class="iina-card">
              <h2 class="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                <span>🔗</span> Manual Connection
              </h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-2">Server Address</label>
                  <input 
                    type="text" 
                    id="manual-address" 
                    class="iina-input w-full" 
                    placeholder="192.168.1.100"
                    value="localhost"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Port</label>
                  <input 
                    type="number" 
                    id="manual-port" 
                    class="iina-input w-full" 
                    placeholder="10010"
                    value="10010"
                    min="1"
                    max="65535"
                  >
                </div>
                <button id="connect-manual" class="iina-button-primary w-full py-3">
                  Connect Manually
                </button>
              </div>
            </div>
          </div>

          <!-- Last Server -->
          <div class="iina-card">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg sm:text-xl font-semibold">Last Server</h2>
            </div>
            
            <div id="last-server-container">
              ${this.getLastServerHTML()}
            </div>
          </div>
        </div>
      </div>
    `
  }

  private getLastServerHTML(): string {
    const lastServer = this.getLastServer()
    
    if (!lastServer) {
      return `
        <div class="text-center py-8 text-iina-text-muted">
          <div class="text-3xl mb-3">📡</div>
          <p class="text-base mb-2">No previous server</p>
          <p class="text-sm">Use manual connection to connect to a server</p>
        </div>
      `
    }

    return `
      <div class="iina-card">
        <div class="flex flex-col gap-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold mb-1 truncate">${lastServer.name}</h3>
            <p class="text-iina-text-muted text-sm mb-3 truncate">
              ${lastServer.address}:${lastServer.port}
            </p>
            <div class="flex items-center gap-2 mb-4">
              <span class="px-3 py-1 rounded-full text-xs font-medium ${this.getStatusClasses(lastServer.status)} w-fit">
                ${lastServer.status.toUpperCase()}
              </span>
              ${lastServer.lastSeen ? `<span class="text-xs text-iina-text-muted">Last seen: ${this.formatTime(lastServer.lastSeen)}</span>` : ''}
            </div>
          </div>
          <div class="flex gap-2">
            <button class="iina-button px-4 py-2 text-sm test-connection flex-1" 
                    data-address="${lastServer.address}" 
                    data-port="${lastServer.port}">
              🔍 Test
            </button>
            <button class="iina-button-primary px-4 py-2 text-sm connect-server flex-1" 
                    data-address="${lastServer.address}" 
                    data-port="${lastServer.port}">
              🚀 Connect
            </button>
            <button class="iina-button px-3 py-2 text-sm delete-server" 
                    data-address="${lastServer.address}" 
                    data-port="${lastServer.port}">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `
  }

  private getLastServer(): IINAServer | null {
    if (this.servers.length === 0) return null
    
    // Return the most recently seen server
    return this.servers.reduce((latest, current) => {
      if (!latest.lastSeen) return current
      if (!current.lastSeen) return latest
      return current.lastSeen > latest.lastSeen ? current : latest
    })
  }

  private getStatusClasses(status: string): string {
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
  }

  private attachEventListeners(): void {
    // Manual connection
    const connectManualBtn = document.getElementById('connect-manual')
    connectManualBtn?.addEventListener('click', () => this.handleManualConnection())

    // Server connections and network presets
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      
      if (target.classList.contains('connect-server')) {
        const address = target.dataset.address
        const port = target.dataset.port
        if (address && port) {
          this.connectToServer(address, parseInt(port))
        }
      }
      
      if (target.classList.contains('test-connection')) {
        const address = target.dataset.address
        const port = target.dataset.port
        if (address && port) {
          this.testConnection(address, parseInt(port))
        }
      }
      
      if (target.classList.contains('delete-server')) {
        const address = target.dataset.address
        const port = target.dataset.port
        if (address && port) {
          this.deleteServer(address, parseInt(port))
        }
      }
    })
  }

  private handleManualConnection(): void {
    const addressInput = document.getElementById('manual-address') as HTMLInputElement
    const portInput = document.getElementById('manual-port') as HTMLInputElement
    
    const address = addressInput?.value.trim()
    const port = parseInt(portInput?.value || '10010')
    
    if (!address) {
      this.showError('Please enter a server address')
      return
    }
    
    if (isNaN(port) || port < 1 || port > 65535) {
      this.showError('Please enter a valid port number (1-65535)')
      return
    }
    
    // Add or update server in the list before connecting
    this.addOrUpdateServer({
      name: `IINA Server (${address})`,
      address,
      port,
      status: 'checking',
      lastSeen: new Date()
    })
    
    this.connectToServer(address, port)
  }

  private deleteServer(address: string, port: number): void {
    this.servers = this.servers.filter(s => !(s.address === address && s.port === port))
    this.saveServers()
    this.updateUI()
    this.showSuccess('Server removed successfully')
  }

  private checkUrlParameters(): void {
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1])
    
    const ip = urlParams.get('ip') || hashParams.get('ip')
    const port = urlParams.get('port') || hashParams.get('port')
    
    if (ip && port) {
      const portNum = parseInt(port)
      if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
        // Store the server info and navigate to remote
        this.addOrUpdateServer({
          name: `Server (${ip})`,
          address: ip,
          port: portNum,
          status: 'checking',
          lastSeen: new Date()
        })
        
        // Connect directly
        this.connectToServer(ip, portNum)
        return
      }
    }
  }

  private async testConnection(address: string, port: number, showResult = true): Promise<void> {
    try {
      if (!showResult) {
        console.log(`Testing connection to ${address}:${port}`)
      }
      
      // Update server status to checking
      this.updateServerStatus(address, port, 'checking')
      
      // Use simple WebSocket connection test like remote page
      const isConnected = await this.testWebSocketConnection(address, port)
      
      if (isConnected) {
        this.updateServerStatus(address, port, 'online')
        
        if (showResult) {
          this.showSuccess(`Server at ${address}:${port} is online`)
        } else {
          console.log(`✅ Server online at ${address}:${port}`)
        }
      } else {
        this.updateServerStatus(address, port, 'offline')
        
        if (showResult) {
          this.showError(`Could not connect to ${address}:${port}`)
        } else {
          console.log(`❌ No server at ${address}:${port}`)
        }
      }
    } catch (error) {
      this.updateServerStatus(address, port, 'offline')
      
      if (showResult) {
        this.showError(`Connection test failed: ${(error as Error).message}`)
      } else {
        console.log(`❌ Connection failed to ${address}:${port}: ${(error as Error).message}`)
      }
    }
  }

  private async testWebSocketConnection(address: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`⏰ Connection timeout for ${address}:${port}`)
        resolve(false)
      }, 3000) // 3 second timeout
      
      try {
        const ws = new WebSocket(`ws://${address}:${port}`)
        
        ws.onopen = () => {
          console.log(`🟢 WebSocket connected to ${address}:${port}`)
          clearTimeout(timeout)
          ws.close()
          resolve(true)
        }
        
        ws.onerror = (error) => {
          console.log(`🔴 WebSocket error for ${address}:${port}:`, error)
          clearTimeout(timeout)
          resolve(false)
        }
        
        ws.onclose = (event) => {
          if (event.code !== 1000) {
            console.log(`🟡 WebSocket closed for ${address}:${port}, code: ${event.code}`)
            clearTimeout(timeout)
            resolve(false)
          }
        }
      } catch (error) {
        console.log(`💥 WebSocket creation failed for ${address}:${port}:`, error)
        clearTimeout(timeout)
        resolve(false)
      }
    })
  }

  private connectToServer(address: string, port: number): void {
    // Save connection details and navigate to remote page
    localStorage.setItem('iina-server-address', address)
    localStorage.setItem('iina-server-port', port.toString())
    
    // Navigate to remote control page
    window.location.href = '/remote'
  }

  private addOrUpdateServer(server: IINAServer): void {
    console.log('🔧 addOrUpdateServer called with:', server)
    
    const existingIndex = this.servers.findIndex(s => s.address === server.address && s.port === server.port)
    
    if (existingIndex >= 0) {
      console.log('📝 Updating existing server at index:', existingIndex)
      this.servers[existingIndex] = server
    } else {
      console.log('➕ Adding new server to list')
      this.servers.push(server)
    }
    
    console.log('📋 Current servers array:', this.servers)
    
    this.saveServers()
    this.updateUI()
    
    console.log('🎨 UI update completed')
  }

  private updateServerStatus(address: string, port: number, status: IINAServer['status']): void {
    const server = this.servers.find(s => s.address === address && s.port === port)
    
    if (server) {
      server.status = status
      if (status === 'online') {
        server.lastSeen = new Date()
      }
      this.saveServers() // Save immediately when status changes
      this.updateUI()
    }
  }


  private loadSavedServers(): void {
    try {
      const saved = localStorage.getItem('iina-discovered-servers')
      if (saved) {
        this.servers = JSON.parse(saved).map((server: any) => ({
          ...server,
          lastSeen: server.lastSeen ? new Date(server.lastSeen) : undefined,
          status: 'checking' as const // Reset status to checking when loading
        }))
        this.updateUI()
        
        // Test connection for the last server automatically
        const lastServer = this.getLastServer()
        if (lastServer) {
          this.testConnection(lastServer.address, lastServer.port, false)
        }
      }
    } catch (error) {
      console.error('Failed to load saved servers:', error)
    }
  }

  private saveServers(): void {
    try {
      localStorage.setItem('iina-discovered-servers', JSON.stringify(this.servers))
    } catch (error) {
      console.error('Failed to save servers:', error)
    }
  }

  private updateUI(): void {
    console.log('🎨 updateUI called, servers count:', this.servers.length)
    
    const lastServerContainer = document.getElementById('last-server-container')
    if (lastServerContainer) {
      const newHTML = this.getLastServerHTML()
      console.log('📄 Generated HTML length:', newHTML.length)
      lastServerContainer.innerHTML = newHTML
      console.log('✅ Updated last server container')
    } else {
      console.log('❌ last-server-container element not found')
    }
  }

  private showError(message: string): void {
    // Create and show error toast
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg z-50'
    toast.textContent = message
    
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.remove()
    }, 5000)
  }

  private showSuccess(message: string): void {
    // Create and show success toast
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg z-50'
    toast.textContent = message
    
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  private formatTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

} 