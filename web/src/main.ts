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
      // Redirect to discovery page by default
      this.router.navigate('/discovery')
    })
    
    this.router.addRoute('/discovery', () => {
      const discoveryPage = new DiscoveryPage()
      discoveryPage.render()
    })
    
    this.router.addRoute('/remote', () => {
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