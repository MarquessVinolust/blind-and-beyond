import { Wine, Guest, GuestRankings, TastingSession, GuestProgress, TastingType, OriginFormat } from "@/types/tasting";

const STORAGE_KEY = "winecellar_tasting";

export function getSession(): TastingSession | null {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveSession(session: TastingSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function createSession(
  wines: Wine[],
  flights: number,
  winesPerFlight: number,
  tastingType: TastingType = 'blind',
  originFormat: OriginFormat = 'local_only'
): TastingSession {
  const session: TastingSession = {
    id: crypto.randomUUID(),
    tastingType,
    originFormat,
    wines,
    flights,
    winesPerFlight,
    guests: [],
  };
  saveSession(session);
  return session;
}

export function addGuest(guest: Guest) {
  const session = getSession();
  if (!session) return;
  session.guests.push(guest);
  saveSession(session);
}

const RANKINGS_KEY = "winecellar_rankings";

export function getAllRankings(): GuestRankings[] {
  const data = localStorage.getItem(RANKINGS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveGuestRankings(guestId: string, rankings: { wineId: string; rank: number }[], guesses: Record<number, string[]> = {}) {
  const all = getAllRankings();
  const existing = all.findIndex(r => r.guestId === guestId);
  if (existing >= 0) {
    all[existing].rankings = rankings;
    all[existing].guesses = guesses;
  } else {
    all.push({ guestId, rankings, guesses });
  }
  localStorage.setItem(RANKINGS_KEY, JSON.stringify(all));
}

export function getGuestRankings(guestId: string): GuestRankings | null {
  return getAllRankings().find(r => r.guestId === guestId) || null;
}

const PROGRESS_PREFIX = "winecellar_progress_";

export function saveGuestProgress(guestId: string, progress: GuestProgress) {
  localStorage.setItem(PROGRESS_PREFIX + guestId, JSON.stringify(progress));
}

export function getGuestProgress(guestId: string): GuestProgress | null {
  const data = localStorage.getItem(PROGRESS_PREFIX + guestId);
  return data ? JSON.parse(data) : null;
}

export function clearGuestProgress(guestId: string) {
  localStorage.removeItem(PROGRESS_PREFIX + guestId);
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(RANKINGS_KEY);
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PROGRESS_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}
