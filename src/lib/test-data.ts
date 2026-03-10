import { Wine, TastingSession, TastingType, OriginFormat } from "@/types/tasting";
import { saveSession } from "@/lib/tasting-store";

const TEST_WINES: Omit<Wine, "id" | "flight">[] = [
  { name: "A Badenhorst Family Red", vintage: "2017", region: "Swartland", country: "South Africa", price: "R625.00", isInternational: false },
  { name: "Alheit Vineyards Cartology", vintage: "2020", region: "Western Cape", country: "South Africa", price: "R600.00", isInternational: false },
  { name: "Allesverloren Tinta Barocca", vintage: "1995", region: "Swartland", country: "South Africa", price: "R400.00", isInternational: false },
  { name: "Château Margaux Grand Vin", vintage: "2015", region: "Bordeaux", country: "France", price: "R8,500.00", isInternational: true },
  { name: "Babylonstoren Nebukadnesar", vintage: "2018", region: "Stellenbosch", country: "South Africa", price: "R900.00", isInternational: false },
  { name: "Boekenhoutskloof Syrah", vintage: "2018", region: "Swartland", country: "South Africa", price: "R775.00", isInternational: false },
  { name: "Boschkloof Epilogue", vintage: "2017", region: "Stellenbosch", country: "South Africa", price: "R1,400.00", isInternational: false },
  { name: "Penfolds Grange", vintage: "2017", region: "South Australia", country: "Australia", price: "R12,000.00", isInternational: true },
  { name: "Crystallum Peter Max Pinot Noir", vintage: "2022", region: "Hemel-en-Aarde", country: "South Africa", price: "R450.00", isInternational: false },
  { name: "David & Nadia Chenin Blanc", vintage: "2021", region: "Swartland", country: "South Africa", price: "R475.00", isInternational: false },
  { name: "De Toren Fusion V", vintage: "2019", region: "Stellenbosch", country: "South Africa", price: "R825.00", isInternational: false },
  { name: "Opus One", vintage: "2018", region: "Napa Valley", country: "USA", price: "R9,500.00", isInternational: true },
  { name: "Kanonkop Pinotage", vintage: "2019", region: "Stellenbosch", country: "South Africa", price: "R675.00", isInternational: false },
  { name: "Mullineux Syrah", vintage: "2020", region: "Swartland", country: "South Africa", price: "R525.00", isInternational: false },
  { name: "Porseleinberg Syrah", vintage: "2021", region: "Swartland", country: "South Africa", price: "R875.00", isInternational: false },
  { name: "Sadie Family Columella", vintage: "2019", region: "Swartland", country: "South Africa", price: "R3,250.00", isInternational: false },
];

export function loadTestSession(
  winesPerFlight = 4,
  tastingType: TastingType = 'blind',
  originFormat: OriginFormat = 'international_mix'
): TastingSession {
  const wines: Wine[] = TEST_WINES.map((w, i) => ({
    ...w,
    id: crypto.randomUUID(),
    flight: Math.floor(i / winesPerFlight) + 1,
  }));

  const flights = Math.ceil(wines.length / winesPerFlight);

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
