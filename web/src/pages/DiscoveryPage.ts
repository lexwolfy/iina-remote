interface IINAServer {
  name: string
  address: string
  port: number
  status: 'online' | 'offline' | 'checking'
  lastSeen?: Date
}

export class DiscoveryPage {
  private servers: IINAServer[] = []
  private isScanning = false

  render(): void {
    const app = document.getElementById('app')
    if (!app) return

    app.innerHTML = this.getHTML()
    this.attachEventListeners()
    this.loadSavedServers()
    this.detectNetworkRange()
  }

  private getHTML(): string {
    return `
      <div class="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 sm:p-6">
        <div class="max-w-sm mx-auto sm:max-w-md md:max-w-2xl lg:max-w-4xl">
          <div class="iina-card mb-8">
            <h1 class="text-3xl font-light text-center mb-2">🎬 IINA Web Remote</h1>
            <p class="text-center text-iina-text-muted mb-6">Discover and connect to IINA servers on your network</p>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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

              <!-- Network Scan -->
              <div class="iina-card">
                <h2 class="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>🔍</span> Network Scan
                </h2>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium mb-2">IP Range</label>
                    <input 
                      type="text" 
                      id="scan-range" 
                      class="iina-input w-full" 
                      placeholder="192.168.1.1-254"
                      value=""
                    >
                    <p class="text-xs text-iina-text-muted mt-1">Format: 192.168.x.1-254 (scans all IPs in that subnet)</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-2">Port</label>
                    <input 
                      type="number" 
                      id="scan-port" 
                      class="iina-input w-full" 
                      placeholder="10010"
                      value="10010"
                      min="1"
                      max="65535"
                    >
                  </div>
                  <button id="start-scan" class="iina-button w-full py-3" ${this.isScanning ? 'disabled' : ''}>
                    ${this.isScanning ? 'Scanning...' : 'Start Network Scan'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Servers List -->
          <div class="iina-card">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg sm:text-xl font-semibold">Discovered Servers</h2>
              <button id="refresh-servers" class="iina-button px-3 py-2 text-sm sm:px-4 sm:text-base">
                <span>🔄</span> <span class="hidden sm:inline">Refresh</span>
              </button>
            </div>
            
            <div id="servers-container">
              ${this.getServersHTML()}
            </div>
            
            ${this.isScanning ? this.getScanningHTML() : ''}
          </div>
        </div>
      </div>
    `
  }

  private getServersHTML(): string {
    if (this.servers.length === 0) {
      return `
        <div class="text-center py-12 text-iina-text-muted">
          <div class="text-4xl mb-4">📡</div>
          <p class="text-lg mb-2">No servers found</p>
          <p class="text-sm">Try manual connection or start a network scan</p>
        </div>
      `
    }

    return this.servers.map(server => `
      <div class="iina-card mb-4 cursor-pointer hover:scale-[1.02] transition-transform" 
           data-server-address="${server.address}" 
           data-server-port="${server.port}">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex-1 min-w-0">
            <h3 class="text-base sm:text-lg font-semibold mb-1 truncate">${server.name}</h3>
            <p class="text-iina-text-muted text-sm mb-2 truncate">
              ${server.address}:${server.port}
            </p>
            <div class="flex flex-col sm:flex-row sm:items-center gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-medium ${this.getStatusClasses(server.status)} w-fit">
                ${server.status.toUpperCase()}
              </span>
              ${server.lastSeen ? `<span class="text-xs text-iina-text-muted">Last seen: ${this.formatTime(server.lastSeen)}</span>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-2 sm:flex-shrink-0">
            <button class="iina-button px-3 py-2 text-sm sm:px-4 sm:py-2 test-connection flex-1 sm:flex-initial" 
                    data-address="${server.address}" 
                    data-port="${server.port}">
              Test
            </button>
            <button class="iina-button-primary px-4 py-2 text-sm sm:px-6 sm:py-2 connect-server flex-1 sm:flex-initial" 
                    data-address="${server.address}" 
                    data-port="${server.port}">
              Connect
            </button>
          </div>
        </div>
      </div>
    `).join('')
  }

  private getScanningHTML(): string {
    return `
      <div class="text-center py-8">
        <div class="inline-block w-8 h-8 border-2 border-iina-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-iina-text-muted">Scanning network for IINA servers...</p>
      </div>
    `
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

    // Network scan
    const startScanBtn = document.getElementById('start-scan')
    startScanBtn?.addEventListener('click', () => this.handleNetworkScan())

    // Refresh servers
    const refreshBtn = document.getElementById('refresh-servers')
    refreshBtn?.addEventListener('click', () => this.refreshServers())

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
      
      if (target.classList.contains('network-preset')) {
        const range = target.dataset.range
        const rangeInput = document.getElementById('scan-range') as HTMLInputElement
        if (range && rangeInput) {
          rangeInput.value = range
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
    
    this.connectToServer(address, port)
  }

  private async handleNetworkScan(): Promise<void> {
    const rangeInput = document.getElementById('scan-range') as HTMLInputElement
    const portInput = document.getElementById('scan-port') as HTMLInputElement
    
    const range = rangeInput?.value.trim() || '192.168.1.1-254'
    const port = parseInt(portInput?.value || '10010')
    
    this.isScanning = true
    this.updateUI()
    
    try {
      await this.scanNetwork(range, port)
    } catch (error) {
      this.showError('Network scan failed: ' + (error as Error).message)
    } finally {
      this.isScanning = false
      this.updateUI()
    }
  }

  private async scanNetwork(range: string, port: number): Promise<void> {
    // Parse IP range (e.g., "192.168.1.1-254")
    const [baseIP, endRange] = range.split('-')
    if (!baseIP || !endRange) {
      throw new Error('Invalid IP range format. Use format: 192.168.1.1-254')
    }
    
    const ipParts = baseIP.split('.')
    if (ipParts.length !== 4) {
      throw new Error('Invalid IP address format')
    }
    
    const baseOctets = ipParts.slice(0, 3).join('.')
    const startOctet = parseInt(ipParts[3])
    const endOctet = parseInt(endRange)
    
    console.log(`🔍 Starting network scan: ${baseOctets}.${startOctet}-${endOctet} on port ${port}`)
    console.log(`📊 Will test ${endOctet - startOctet + 1} IP addresses`)
    
    const promises: Promise<void>[] = []
    
    for (let i = startOctet; i <= endOctet; i++) {
      const ip = `${baseOctets}.${i}`
      promises.push(this.testConnection(ip, port, false))
    }
    
    const results = await Promise.allSettled(promises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    console.log(`✅ Scan complete: ${successful} successful, ${failed} failed`)
  }

  private async testConnection(address: string, port: number, showResult = true): Promise<void> {
    try {
      // For network scanning, we need to track all attempts
      if (!showResult) {
        console.log(`Testing connection to ${address}:${port}`)
      }
      
      // For manual connections, update server status to checking
      if (showResult) {
        this.updateServerStatus(address, port, 'checking')
      }
      
      // Attempt WebSocket connection with IINA verification
      const serverInfo = await this.checkIINAServer(address, port)
      
      if (serverInfo.isIINA) {
        this.addOrUpdateServer({
          name: serverInfo.name || `IINA Server (${address})`,
          address,
          port,
          status: 'online',
          lastSeen: new Date()
        })
        
        if (showResult) {
          this.showSuccess(`Successfully connected to IINA server at ${address}:${port}`)
        } else {
          console.log(`✅ Found IINA server at ${address}:${port} - ${serverInfo.name}`)
        }
      } else {
        if (showResult) {
          this.updateServerStatus(address, port, 'offline')
          if (serverInfo.connected) {
            this.showError(`Server at ${address}:${port} is not an IINA server`)
          } else {
            this.showError(`Could not connect to ${address}:${port}`)
          }
        } else {
          if (serverInfo.connected) {
            console.log(`⚠️ Non-IINA server at ${address}:${port}`)
          } else {
            console.log(`❌ No server at ${address}:${port}`)
          }
        }
      }
    } catch (error) {
      if (showResult) {
        this.updateServerStatus(address, port, 'offline')
        this.showError(`Connection test failed: ${(error as Error).message}`)
      } else {
        console.log(`❌ Connection failed to ${address}:${port}: ${(error as Error).message}`)
      }
    }
  }

  private async checkIINAServer(address: string, port: number): Promise<{isIINA: boolean, connected: boolean, name?: string}> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`⏰ Connection timeout for ${address}:${port}`)
        resolve({isIINA: false, connected: false})
      }, 3000) // 3 second timeout
      
      try {
        const ws = new WebSocket(`ws://${address}:${port}`)
        let hasReceivedResponse = false
        
        ws.onopen = () => {
          console.log(`🟢 WebSocket opened for ${address}:${port}`)
          
          // Send IINA identification request
          const identifyMessage = {
            type: 'identify',
            timestamp: Date.now()
          }
          ws.send(JSON.stringify(identifyMessage))
          
          // Wait for response or timeout after 2 seconds
          setTimeout(() => {
            if (!hasReceivedResponse) {
              console.log(`⚠️ No IINA response from ${address}:${port}`)
              clearTimeout(timeout)
              ws.close()
              resolve({isIINA: false, connected: true})
            }
          }, 2000)
        }
        
        ws.onmessage = (event) => {
          hasReceivedResponse = true
          
          const handleMessage = (messageText: string) => {
            try {
              const response = JSON.parse(messageText)
              if (response.type === 'identify_response' && response.application === 'IINA') {
                console.log(`✅ Confirmed IINA server at ${address}:${port}`)
                clearTimeout(timeout)
                ws.close()
                resolve({
                  isIINA: true, 
                  connected: true, 
                  name: response.name || `IINA Server (${address})`
                })
              } else {
                console.log(`⚠️ Non-IINA response from ${address}:${port}:`, response)
                clearTimeout(timeout)
                ws.close()
                resolve({isIINA: false, connected: true})
              }
            } catch (error) {
              console.log(`⚠️ Invalid JSON response from ${address}:${port}`, 'Raw text:', messageText)
              clearTimeout(timeout)
              ws.close()
              resolve({isIINA: false, connected: true})
            }
          }
          
          // Handle different message types (Blob vs string)
          if (event.data instanceof Blob) {
            // Convert Blob to text
            event.data.text().then(text => {
              handleMessage(text)
            }).catch(error => {
              console.log(`⚠️ Failed to read blob data from ${address}:${port}:`, error)
              clearTimeout(timeout)
              ws.close()
              resolve({isIINA: false, connected: true})
            })
          } else {
            // Handle as string
            handleMessage(event.data)
          }
        }
        
        ws.onerror = (error) => {
          console.log(`🔴 WebSocket error for ${address}:${port}:`, error)
          clearTimeout(timeout)
          resolve({isIINA: false, connected: false})
        }
        
        ws.onclose = (event) => {
          if (!hasReceivedResponse && event.code !== 1000) {
            console.log(`🟡 WebSocket closed for ${address}:${port}, code: ${event.code}`)
            clearTimeout(timeout)
            resolve({isIINA: false, connected: false})
          }
        }
      } catch (error) {
        console.log(`💥 WebSocket creation failed for ${address}:${port}:`, error)
        clearTimeout(timeout)
        resolve({isIINA: false, connected: false})
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
      this.updateUI()
    }
  }

  private refreshServers(): void {
    // Test all existing servers
    this.servers.forEach(server => {
      this.testConnection(server.address, server.port, false)
    })
  }

  private loadSavedServers(): void {
    try {
      const saved = localStorage.getItem('iina-discovered-servers')
      if (saved) {
        this.servers = JSON.parse(saved).map((server: any) => ({
          ...server,
          lastSeen: server.lastSeen ? new Date(server.lastSeen) : undefined
        }))
        this.updateUI()
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
    
    const serversContainer = document.getElementById('servers-container')
    if (serversContainer) {
      const newHTML = this.getServersHTML()
      console.log('📄 Generated HTML length:', newHTML.length)
      serversContainer.innerHTML = newHTML
      console.log('✅ Updated servers container')
    } else {
      console.log('❌ servers-container element not found')
    }
    
    // Update scan button
    const scanBtn = document.getElementById('start-scan') as HTMLButtonElement
    if (scanBtn) {
      scanBtn.disabled = this.isScanning
      scanBtn.textContent = this.isScanning ? 'Scanning...' : 'Start Network Scan'
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

  private detectNetworkRange(): void {
    // Set a reasonable default and provide quick options
    const rangeInput = document.getElementById('scan-range') as HTMLInputElement
    if (rangeInput && !rangeInput.value) {
      rangeInput.value = '192.168.1.1-254'
    }
    
    // Add quick network preset buttons
    this.addNetworkPresets()
  }

  private addNetworkPresets(): void {
    const networkScanCard = document.querySelector('.iina-card:has(#scan-range)')
    if (!networkScanCard) return
    
    const presetsHTML = `
      <div class="mt-3 pt-3 border-t border-gray-600">
        <p class="text-xs text-iina-text-muted mb-2">Quick presets:</p>
        <div class="flex flex-wrap gap-2">
          <button class="network-preset px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded transition-colors" data-range="192.168.1.1-254">192.168.1.x</button>
          <button class="network-preset px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded transition-colors" data-range="192.168.0.1-254">192.168.0.x</button>
          <button class="network-preset px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded transition-colors" data-range="192.168.50.1-254">192.168.50.x</button>
          <button class="network-preset px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded transition-colors" data-range="10.0.0.1-254">10.0.0.x</button>
          <button class="network-preset px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded transition-colors" data-range="172.16.0.1-254">172.16.0.x</button>
        </div>
      </div>
    `
    
    const scanRangeDiv = networkScanCard.querySelector('#scan-range')?.parentElement
    if (scanRangeDiv) {
      scanRangeDiv.insertAdjacentHTML('afterend', presetsHTML)
    }
  }
} 