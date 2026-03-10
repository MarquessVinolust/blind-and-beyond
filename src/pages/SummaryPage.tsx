import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getSession, getGuestRankings } from "@/lib/tasting-store";
import logo from "@/assets/wine-cellar-logo.png";
import { Trophy, Star, ShoppingCart, RotateCcw, Globe, CheckCircle2, XCircle } from "lucide-react";

const SummaryPage = () => {
  const { guestId } = useParams<{ guestId: string }>();
  const navigate = useNavigate();
  const session = getSession();
  const guestRankings = guestId ? getGuestRankings(guestId) : null;
  const guest = session?.guests.find(g => g.id === guestId);

  if (!session || !guestRankings || !guest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No results found.</p>
      </div>
    );
  }

  const isBlind = session.tastingType === "blind";
  const isInternationalMix = session.originFormat === "international_mix";
  const guesses = guestRankings.guesses || {};

  // Group rankings by flight
  const flightResults: Record<number, { wine: typeof session.wines[0]; rank: number }[]> = {};
  for (const r of guestRankings.rankings) {
    const wine = session.wines.find(w => w.id === r.wineId);
    if (!wine) continue;
    if (!flightResults[wine.flight]) flightResults[wine.flight] = [];
    flightResults[wine.flight].push({ wine, rank: r.rank });
  }

  Object.values(flightResults).forEach(arr => arr.sort((a, b) => a.rank - b.rank));

  const favourites = Object.values(flightResults)
    .map(arr => arr[0]?.wine)
    .filter(Boolean);

  // Calculate guess score (only for blind + international)
  let totalCorrect = 0;
  let totalInternational = 0;
  if (isBlind && isInternationalMix) {
    for (const [flightStr, results] of Object.entries(flightResults)) {
      const flight = parseInt(flightStr);
      const flightGuesses = guesses[flight] || [];
      for (const { wine } of results) {
        if (wine.isInternational) totalInternational++;
        const guessedIntl = flightGuesses.includes(wine.id);
        if (guessedIntl && wine.isInternational) totalCorrect++;
      }
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Wine Cellar" className="h-10 mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Your Results</h1>
          <p className="text-muted-foreground">{guest.firstName} {guest.lastName}</p>
          <span className={`mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full ${
            isBlind ? "bg-primary/10 text-primary" : "bg-gold/20 text-gold"
          }`}>
            {isBlind ? "Blind Tasting" : "Open Tasting"}
          </span>
        </div>

        {/* International Guess Score */}
        {isBlind && isInternationalMix && totalInternational > 0 && (
          <div className="bg-card border border-gold/30 rounded-lg p-6 mb-6 shadow-md text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-gold" />
              <h2 className="text-xl font-semibold">International Guessing</h2>
            </div>
            <p className="text-3xl font-bold text-gold mb-1">{totalCorrect} / {totalInternational}</p>
            <p className="text-sm text-muted-foreground">international wines correctly identified</p>
          </div>
        )}

        {/* Top Favourites */}
        <div className="bg-card border border-gold/30 rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-gold" />
            <h2 className="text-xl font-semibold">Your Top Picks</h2>
          </div>
          <div className="space-y-3">
            {favourites.map((wine, i) => (
              <motion.div
                key={wine.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 bg-muted/50 rounded-md p-3"
              >
                <Star className="h-5 w-5 text-gold fill-gold" />
                <div className="flex-1">
                  <p className="font-semibold">{wine.name}</p>
                  <p className="text-xs text-gold">
                    {wine.vintage && `${wine.vintage} · `}{wine.region}{wine.country && ` · ${wine.country}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isBlind && isInternationalMix && wine.isInternational && (
                    <Globe className="h-3.5 w-3.5 text-gold" />
                  )}
                  <p className="font-bold text-foreground">{wine.price}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Detailed Results by Flight */}
        {Object.entries(flightResults).map(([flight, results]) => {
          const flightNum = parseInt(flight);
          const flightGuesses = guesses[flightNum] || [];

          return (
            <div key={flight} className="bg-card border border-border rounded-lg p-5 mb-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gold mb-3">Flight {flight}</h3>
              <div className="space-y-2">
                {results.map(({ wine, rank }) => {
                  const guessedIntl = flightGuesses.includes(wine.id);

                  return (
                    <div key={wine.id} className="flex items-center gap-3 text-sm">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        rank === 1 ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {rank}
                      </span>
                      <div className="flex-1">
                        <span className="font-medium">{wine.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {wine.vintage && `${wine.vintage} · `}{wine.region}{wine.country && ` · ${wine.country}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isBlind && isInternationalMix && wine.isInternational && (
                          <Globe className="h-3.5 w-3.5 text-gold" />
                        )}
                        {isBlind && isInternationalMix && (
                          guessedIntl ? (
                            wine.isInternational ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )
                          ) : wine.isInternational ? (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          ) : null
                        )}
                        <span className="text-muted-foreground">{wine.price}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Actions */}
        <div className="space-y-3 mt-6">
          <Button onClick={() => navigate(`/order/${guestId}`)} className="w-full bg-gold text-gold-foreground hover:opacity-90 text-base py-5">
            <ShoppingCart className="h-4 w-4 mr-2" /> Order Now
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default SummaryPage;
