import './style.css'
import { Router } from './router'
import { DiscoveryPage } from './pages/DiscoveryPage'
import { RemotePage } from './pages/RemotePage'

// Initialize the application
class App {
  private router: Router

  constructor() {
    this.router = new Router()
    this.setupRoutes()
    this.init()
  }

  private setupRoutes() {
    this.router.addRoute('/', () => {
      // Check for URL parameters (for QR code functionality)
      const urlParams = new URLSearchParams(window.location.search)
      const ipParam = urlParams.get('ip')
      
      if (ipParam) {
        // If IP parameter is provided, save it and go to remote page
        localStorage.setItem('iina-remote-server', `${ipParam}:10010`)
        this.router.navigate('/remote')
        return
      }
      
      // Check if we have a saved server connection
      const savedServer = localStorage.getItem('iina-remote-server')
      if (savedServer) {
        // If we have a saved connection, go to remote page
        this.router.navigate('/remote')
      } else {
        // Otherwise, go to discovery page
        this.router.navigate('/discovery')
      }
    })
    
    this.router.addRoute('/discovery', () => {
      const discoveryPage = new DiscoveryPage()
      discoveryPage.render()
    })
    
    this.router.addRoute('/remote', () => {
      // Check for URL parameters here too
      const urlParams = new URLSearchParams(window.location.search)
      const ipParam = urlParams.get('ip')
      
      if (ipParam) {
        // If IP parameter is provided, save it
        localStorage.setItem('iina-remote-server', `${ipParam}:10010`)
      }
      
      const remotePage = new RemotePage()
      remotePage.render()
    })
  }

  private init() {
    // Start the router
    this.router.start()
    
    // Add global error handling
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error)
    })

    // Add unhandled promise rejection handling
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason)
    })
  }
}

// Start the application
new App() 