import { supabase } from './supabase'
import { Wine, Guest, GuestRankings, TastingSession, GuestProgress, TastingType, OriginFormat } from '@/types/tasting'

// ─── SESSION ────────────────────────────────────────────────────────────────

export async function createSession(
  name: string,
  date: string,
  hostEmail: string,
  wines: Wine[],
  flights: number,
  winesPerFlight: number,
  tastingType: TastingType,
  originFormat: OriginFormat
): Promise<TastingSession> {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      name,
      date,
      host_email: hostEmail,
      tasting_type: tastingType,
      origin_format: originFormat,
      flights,
      wines_per_flight: winesPerFlight,
      status: 'upcoming',
    })
    .select()
    .single()

  if (sessionError) throw sessionError

  const wineRows = wines.map((w, i) => ({
    session_id: session.id,
    name: w.name,
    vintage: w.vintage,
    region: w.region,
    country: w.country,
    price: w.price,
    flight: w.flight,
    is_international: w.isInternational ?? false,
    position: i,
  }))

  const { error: winesError } = await supabase.from('wines').insert(wineRows)
  if (winesError) throw winesError

  return mapSession(session, wines)
}

export async function getSession(sessionId: string): Promise<TastingSession | null> {
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !session) return null

  const { data: wines } = await supabase
    .from('wines')
    .select('*')
    .eq('session_id', sessionId)
    .order('position')

  const { data: guests } = await supabase
    .from('guests')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at')

  return mapSession(session, mapWines(wines ?? []), mapGuests(guests ?? []))
}

export async function getAllSessions(): Promise<TastingSession[]> {
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false })

  if (error || !sessions) return []
  return sessions.map(s => mapSession(s, [], []))
}

export async function activateSession(sessionId: string) {
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'active' })
    .eq('id', sessionId)
  if (error) throw error
}

export async function endSession(sessionId: string) {
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'ended' })
    .eq('id', sessionId)
  if (error) throw error
}

// ─── GUESTS ─────────────────────────────────────────────────────────────────

export async function addGuest(
  sessionId: string,
  guest: Omit<Guest, 'id'>
): Promise<Guest> {
  const { data, error } = await supabase
    .from('guests')
    .insert({
      session_id: sessionId,
      first_name: guest.firstName,
      last_name: guest.lastName,
      email: guest.email,
      phone: guest.phone ?? null,
      consent: guest.consent ?? false,
      status: 'registered',
    })
    .select()
    .single()

  if (error) throw error
  return mapGuest(data)
}

export async function getGuestByEmail(
  sessionId: string,
  email: string
): Promise<Guest | null> {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('session_id', sessionId)
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !data) return null
  return mapGuest(data)
}

export async function updateGuestStatus(
  guestId: string,
  status: Guest['status']
) {
  const { error } = await supabase
    .from('guests')
    .update({ status })
    .eq('id', guestId)
  if (error) throw error
}

// ─── GUEST PROGRESS ──────────────────────────────────────────────────────────

export async function saveGuestProgress(
  guestId: string,
  sessionId: string,
  progress: GuestProgress
) {
  const { error } = await supabase
    .from('guest_progress')
    .upsert({
      guest_id: guestId,
      session_id: sessionId,
      current_flight: progress.currentFlight,
      rankings: progress.rankings,
      guesses: progress.guesses,
      revealed_flights: progress.revealedFlights,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guest_id' })

  if (error) throw error
}

export async function getGuestProgress(
  guestId: string
): Promise<GuestProgress | null> {
  const { data, error } = await supabase
    .from('guest_progress')
    .select('*')
    .eq('guest_id', guestId)
    .single()

  if (error || !data) return null

  return {
    currentFlight: data.current_flight,
    rankings: data.rankings,
    guesses: data.guesses,
    revealedFlights: data.revealed_flights,
  }
}

// ─── GUEST RANKINGS (final) ──────────────────────────────────────────────────

export async function saveGuestRankings(
  guestId: string,
  sessionId: string,
  rankings: { wineId: string; rank: number }[],
  guesses: Record<number, string[]> = {}
) {
  const { error } = await supabase
    .from('guest_rankings')
    .upsert({
      guest_id: guestId,
      session_id: sessionId,
      rankings,
      guesses,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'guest_id' })

  if (error) throw error

  await updateGuestStatus(guestId, 'completed')
}

export async function getGuestRankings(
  guestId: string
): Promise<GuestRankings | null> {
  const { data, error } = await supabase
    .from('guest_rankings')
    .select('*')
    .eq('guest_id', guestId)
    .single()

  if (error || !data) return null

  return {
    guestId: data.guest_id,
    rankings: data.rankings,
    guesses: data.guesses,
  }
}

export async function getAllRankings(sessionId: string): Promise<GuestRankings[]> {
  const { data, error } = await supabase
    .from('guest_rankings')
    .select('*')
    .eq('session_id', sessionId)

  if (error || !data) return []

  return data.map(r => ({
    guestId: r.guest_id,
    rankings: r.rankings,
    guesses: r.guesses,
  }))
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export async function saveOrder(
  guestId: string,
  sessionId: string,
  items: { wineId: string; wineName: string; vintage: string; price: string; quantity: number }[],
  total: string
) {
  const { error } = await supabase
    .from('orders')
    .upsert({
      guest_id: guestId,
      session_id: sessionId,
      items,
      total,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'guest_id' })

  if (error) throw error

  await updateGuestStatus(guestId, 'ordered')
}

export async function getOrder(guestId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('guest_id', guestId)
    .single()

  if (error || !data) return null
  return data
}

export async function getAllOrders(sessionId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, guests(first_name, last_name, email, phone)')
    .eq('session_id', sessionId)

  if (error || !data) return []
  return data
}

// ─── MAPPERS ─────────────────────────────────────────────────────────────────

function mapSession(row: any, wines: Wine[] = [], guests: Guest[] = []): TastingSession {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    hostEmail: row.host_email,
    tastingType: row.tasting_type,
    originFormat: row.origin_format,
    flights: row.flights,
    winesPerFlight: row.wines_per_flight,
    status: row.status,
    wines,
    guests,
  }
}

function mapWines(rows: any[]): Wine[] {
  return rows.map(w => ({
    id: w.id,
    name: w.name,
    vintage: w.vintage ?? '',
    region: w.region ?? '',
    country: w.country ?? '',
    price: w.price ?? '',
    flight: w.flight,
    isInternational: w.is_international,
  }))
}

function mapGuests(rows: any[]): Guest[] {
  return rows.map(mapGuest)
}

function mapGuest(row: any): Guest {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? '',
    consent: row.consent ?? false,
    status: row.status,
  }
}
