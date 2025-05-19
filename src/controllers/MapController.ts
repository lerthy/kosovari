import L from 'leaflet'
import { useIssueStore, IssueCategory, categoryMonsters } from '../store/issues'

export class MapController {
  private center: [number, number] = [42.6629, 21.1655] // Kosovo coordinates
  private zoom: number = 13
  private markerIcons: Record<IssueCategory, L.Icon>
  private defaultMarkerIcon: L.Icon

  constructor() {
    // Create default marker icon
    this.defaultMarkerIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      shadowSize: [41, 41]
    })

    // Create category-specific marker icons using monster images
    this.markerIcons = {
      traffic: this.createMonsterIcon(categoryMonsters.traffic),
      environment: this.createMonsterIcon(categoryMonsters.environment),
      economy: this.createMonsterIcon(categoryMonsters.economy),
      living: this.createMonsterIcon(categoryMonsters.living),
      damage: this.createMonsterIcon(categoryMonsters.damage),
      heritage: this.createMonsterIcon(categoryMonsters.heritage)
    }
  }

  private createMonsterIcon(iconUrl: string): L.Icon {
    return L.icon({
      iconUrl: iconUrl,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
      // No shadow for monster icons
    })
  }

  getCenter(): [number, number] {
    return this.center
  }

  setCenter(center: [number, number]) {
    this.center = center
  }

  getZoom(): number {
    return this.zoom
  }

  setZoom(zoom: number) {
    this.zoom = zoom
  }

  getIssues() {
    return useIssueStore.getState().issues
  }

  getMarkerIcon(category?: IssueCategory): L.Icon {
    if (category && this.markerIcons[category]) {
      return this.markerIcons[category]
    }
    return this.defaultMarkerIcon
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
} 