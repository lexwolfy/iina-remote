export type RouteHandler = () => void

export class Router {
  private routes: Map<string, RouteHandler> = new Map()
  private currentPath: string = ''

  constructor() {
    // Listen for browser navigation events
    window.addEventListener('popstate', () => {
      this.handleRoute()
    })
  }

  addRoute(path: string, handler: RouteHandler): void {
    this.routes.set(path, handler)
  }

  navigate(path: string): void {
    if (this.currentPath === path) return
    
    this.currentPath = path
    window.history.pushState({}, '', path)
    this.handleRoute()
  }

  start(): void {
    this.handleRoute()
  }

  private handleRoute(): void {
    const path = window.location.pathname
    this.currentPath = path
    
    const handler = this.routes.get(path)
    if (handler) {
      handler()
    } else {
      // Default to home route if no match found
      const homeHandler = this.routes.get('/')
      if (homeHandler) {
        homeHandler()
      }
    }
  }

  getCurrentPath(): string {
    return this.currentPath
  }
} 