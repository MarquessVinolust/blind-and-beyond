export type TastingType = 'blind' | 'open'
export type OriginFormat = 'international_mix' | 'local_only'
export type SessionStatus = 'upcoming' | 'active' | 'ended'
export type GuestStatus = 'registered' | 'in_progress' | 'completed' | 'ordered'

export interface Wine {
  id: string
  name: string
  vintage: string
  region: string
  country: string
  price: string
  flight: number
  isInternational?: boolean
}

export interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  consent?: boolean
  status?: GuestStatus
}

export interface TastingSession {
  id: string
  name: string
  date: string
  hostEmail: string
  tastingType: TastingType
  originFormat: OriginFormat
  flights: number
  winesPerFlight: number
  status: SessionStatus
  wines: Wine[]
  guests: Guest[]
}

export interface WineRanking {
  wineId: string
  rank: number
}

export interface GuestRankings {
  guestId: string
  rankings: WineRanking[]
  guesses: Record<number, string[]>
}

export interface GuestProgress {
  currentFlight: number
  rankings: Record<number, Record<string, number>>
  guesses: Record<number, string[]>
  revealedFlights: number[]
}

export interface OrderItem {
  wineId: string
  wineName: string
  vintage: string
  price: string
  quantity: number
}
