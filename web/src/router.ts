export type RouteHandler = () => void

export class Router {
  private routes: Map<string, RouteHandler> = new Map()
  private currentPath: string = ''

  constructor() {
    // Listen for hash changes (better for GitHub Pages)
    window.addEventListener('hashchange', () => {
      this.handleRoute()
    })
    
    // Also listen for popstate for back/forward navigation
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
    
    // Use hash-based routing for GitHub Pages compatibility
    if (path === '/') {
      window.location.hash = ''
    } else {
      window.location.hash = path
    }
  }

  start(): void {
    this.handleRoute()
  }

  private handleRoute(): void {
    // Get path from hash or pathname
    let path = window.location.hash.slice(1) || window.location.pathname
    
    // Split path and query parameters
    const [pathOnly, queryString] = path.split('?')
    
    // Handle GitHub Pages subdirectory
    if (pathOnly.startsWith('/iina-remote')) {
      path = pathOnly.replace('/iina-remote', '') + (queryString ? '?' + queryString : '')
    }
    
    // Default to root if empty
    if (!pathOnly || pathOnly === '/') {
      path = '/' + (queryString ? '?' + queryString : '')
    }
    
    this.currentPath = path
    
    // Extract just the path part for route matching
    const [routePath] = path.split('?')
    
    const handler = this.routes.get(routePath)
    if (handler) {
      handler()
    } else {
      // Try to find a matching route
      const matchedRoute = this.findMatchingRoute(routePath)
      if (matchedRoute) {
        matchedRoute()
      } else {
        // Default to discovery page
        const discoveryHandler = this.routes.get('/discovery')
        if (discoveryHandler) {
          discoveryHandler()
        }
      }
    }
  }

  private findMatchingRoute(path: string): RouteHandler | null {
    // First try exact match
    if (this.routes.has(path)) {
      return this.routes.get(path)!
    }
    
    // Try common variations
    const variations = [
      path.endsWith('/') ? path.slice(0, -1) : path + '/',
      path.startsWith('/') ? path : '/' + path,
      path.startsWith('/') ? path.slice(1) : path
    ]
    
    for (const variation of variations) {
      if (this.routes.has(variation)) {
        return this.routes.get(variation)!
      }
    }
    
    return null
  }

  getCurrentPath(): string {
    return this.currentPath
  }
} 