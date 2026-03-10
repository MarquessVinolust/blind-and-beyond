export type TastingType = 'blind' | 'open';
export type OriginFormat = 'international_mix' | 'local_only';

export interface Wine {
  id: string;
  name: string;
  vintage: string;
  region: string;
  country: string;
  price: string;
  flight: number;
  isInternational?: boolean;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TastingSession {
  id: string;
  tastingType: TastingType;
  originFormat: OriginFormat;
  wines: Wine[];
  flights: number;
  winesPerFlight: number;
  guests: Guest[];
}

export interface WineRanking {
  wineId: string;
  rank: number;
}

export interface GuestRankings {
  guestId: string;
  rankings: WineRanking[];
  guesses: Record<number, string[]>;
}

export interface GuestProgress {
  currentFlight: number;
  rankings: Record<number, Record<string, number>>;
  guesses: Record<number, string[]>;
  revealedFlights: number[];
}
