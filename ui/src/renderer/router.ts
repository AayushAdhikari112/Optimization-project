export type RouteHandler = (route: string) => void

export class Router {
  private currentRoute: string = '#/maintenance/software'
  private listeners: RouteHandler[] = []

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        this.handleHashChange()
      })
    }
  }

  public init(): void {
    if (typeof window !== 'undefined') {
      if (!window.location.hash || window.location.hash === '#/') {
        window.location.hash = '#/maintenance/software'
      } else if (window.location.hash === '#/maintenance') {
        window.location.hash = '#/maintenance/software'
      } else {
        this.handleHashChange()
      }
    }
  }

  public navigate(route: string): void {
    const targetRoute = route === '#/maintenance' ? '#/maintenance/software' : route
    this.currentRoute = targetRoute
    if (typeof window !== 'undefined') {
      window.location.hash = targetRoute
    } else {
      this.handleHashChange()
    }
  }

  public getCurrentRoute(): string {
    if (typeof window !== 'undefined') {
      return window.location.hash || '#/maintenance/software'
    }
    return this.currentRoute
  }

  public getPrimaryNavId(customRoute?: string): 'home' | 'maintenance' | 'settings' {
    const route = customRoute || this.getCurrentRoute()
    if (route.startsWith('#/maintenance')) {
      return 'maintenance'
    }
    if (route.startsWith('#/settings')) {
      return 'settings'
    }
    return 'home'
  }

  public onRouteChange(handler: RouteHandler): () => void {
    this.listeners.push(handler)
    return () => {
      this.listeners = this.listeners.filter(l => l !== handler)
    }
  }

  private handleHashChange(): void {
    if (typeof window !== 'undefined') {
      let route = window.location.hash
      if (route === '#/maintenance' || route === '#/' || !route) {
        window.location.hash = '#/maintenance/software'
        return
      }
      this.currentRoute = route
    }
    for (const listener of this.listeners) {
      listener(this.currentRoute)
    }
  }
}

export const router = new Router()
