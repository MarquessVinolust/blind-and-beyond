import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getSession,
  saveGuestProgress,
  getGuestProgress,
  saveGuestRankings,
  updateGuestStatus,
} from "@/lib/tasting-store";
import { TastingSession } from "@/types/tasting";
import logo from "@/assets/wine-cellar-logo.png";
import {
  ChevronRight,
  ChevronLeft,
  Trophy,
  Check,
  Globe,
  Eye,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const TastingPage = () => {
  const { guestId } = useParams<{ guestId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const navigate = useNavigate();

  const [session, setSession] = useState<TastingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentFlight, setCurrentFlight] = useState(1);
  const [rankings, setRankings] = useState<Record<number, Record<string, number>>>({});
  const [guesses, setGuesses] = useState<Record<number, string[]>>({});
  const [revealedFlights, setRevealedFlights] = useState<number[]>([]);
  const [initialized, setInitialized] = useState(false);

  const isBlind = session?.tastingType === "blind";
  const isInternationalMix = session?.originFormat === "international_mix";

  // Load session + restore progress
  useEffect(() => {
    if (!sessionId || !guestId) return;

    const init = async () => {
      const s = await getSession(sessionId);
      if (!s) { setLoading(false); return; }
      setSession(s);

      const saved = await getGuestProgress(guestId);
      if (saved) {
        setCurrentFlight(saved.currentFlight);
        setRankings(saved.rankings);
        setGuesses(saved.guesses || {});
        setRevealedFlights(saved.revealedFlights || []);
      }

      setInitialized(true);
      setLoading(false);
    };

    init();
  }, [sessionId, guestId]);

  // Auto-save progress
  useEffect(() => {
    if (!guestId || !sessionId || !initialized) return;
    saveGuestProgress(guestId, sessionId, {
      currentFlight,
      rankings,
      guesses,
      revealedFlights,
    });
    updateGuestStatus(guestId, "in_progress");
  }, [currentFlight, rankings, guesses, revealedFlights, initialized]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your tasting...</p>
      </div>
    );
  }

  if (!session || !guestId || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <img src={logo} alt="Wine Cellar" className="h-12 mx-auto mb-4" />
          <p className="text-muted-foreground">No session found. Please ask your host for the correct link.</p>
        </div>
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <img src={logo} alt="Wine Cellar" className="h-12 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">This Tasting Has Ended</h1>
          <p className="text-muted-foreground">
            The host has closed this session. Thank you for joining!
          </p>
        </motion.div>
      </div>
    );
  }

  const totalFlights = session.flights;
  const flightWines = session.wines.filter(w => w.flight === currentFlight);
  const flightRankings = rankings[currentFlight] || {};
  const flightGuesses = guesses[currentFlight] || [];
  const isRevealed = revealedFlights.includes(currentFlight);
  const assignedRanks = new Set(Object.values(flightRankings));
  const allRanked = Object.keys(flightRankings).length === flightWines.length;
  const hasInternationalWines = isInternationalMix && flightWines.some(w => w.isInternational);
  const readyToReveal = allRanked && (flightGuesses.length > 0 || !hasInternationalWines);
  const canProceed = isBlind ? isRevealed : allRanked;
  const isLastFlight = currentFlight === totalFlights;

  const handleTapRank = (wineId: string, rank: number) => {
    if (isBlind && isRevealed) return;
    const current = { ...flightRankings };
    if (current[wineId] === rank) {
      delete current[wineId];
    } else {
      const existingWine = Object.entries(current).find(([, r]) => r === rank);
      if (existingWine) delete current[existingWine[0]];
      current[wineId] = rank;
    }
    setRankings({ ...rankings, [currentFlight]: current });
  };

  const unrankWine = (wineId: string) => {
    if (isBlind && isRevealed) return;
    const current = { ...flightRankings };
    delete current[wineId];
    setRankings({ ...rankings, [currentFlight]: current });
  };

  const toggleGuess = (wineId: string) => {
    if (isRevealed) return;
    const current = [...flightGuesses];
    const idx = current.indexOf(wineId);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(wineId);
    setGuesses({ ...guesses, [currentFlight]: current });
  };

  const revealFlight = () => {
    setRevealedFlights([...revealedFlights, currentFlight]);
  };

  const goToResults = async () => {
  try {
    const allRankingsList = Object.entries(rankings).flatMap(([, flightRanks]) =>
      Object.entries(flightRanks).map(([wineId, rank]) => ({ wineId, rank: rank as number }))
    );
    await saveGuestRankings(guestId, sessionId, allRankingsList, guesses);
    navigate(`/summary/${guestId}?session=${sessionId}`);
  } catch (err) {
    console.error(err);
    toast.error("Failed to save results. Please try again.");
  }
};

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/")}>
            <img src={logo} alt="Wine Cellar" className="h-10" />
          </button>
          <span className="text-sm text-gold font-medium">
            Flight {currentFlight} of {totalFlights}
          </span>
        </div>

        {/* Title */}
        {isBlind && !isRevealed ? (
          <>
            <h1 className="text-2xl font-bold mb-2">Blind Tasting</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Rank your wines (#1 = favourite).
              {hasInternationalWines && " Then guess which are international."}
            </p>
          </>
        ) : isBlind && isRevealed ? (
          <>
            <h1 className="text-2xl font-bold mb-2">Flight {currentFlight} Revealed!</h1>
            <p className="text-muted-foreground text-sm mb-6">
              See the full details and how you did.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Rank Your Wines</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Tap a number to assign a ranking. #1 is your favourite.
            </p>
          </>
        )}

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {Array.from({ length: totalFlights }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                isBlind
                  ? revealedFlights.includes(i + 1)
                    ? "bg-gold"
                    : i + 1 <= currentFlight
                    ? "bg-gold/40"
                    : "bg-muted"
                  : i + 1 <= currentFlight
                  ? "bg-gold"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Wine Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentFlight}-${isRevealed}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-3"
          >
            {flightWines.map((wine) => {
              const wineRank = flightRankings[wine.id];
              const isRanked = wineRank !== undefined;
              const isGuessedInternational = flightGuesses.includes(wine.id);
              const actuallyInternational = wine.isInternational;

              // ── REVEALED STATE ──
              if (isBlind && isRevealed) {
                const guessedCorrectly = isGuessedInternational === !!actuallyInternational;
                return (
                  <motion.div
                    key={wine.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-card border rounded-lg p-4 shadow-sm ${
                      actuallyInternational ? "border-gold" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isRanked && (
                        <div className="w-10 h-10 rounded-full bg-gold text-gold-foreground flex items-center justify-center text-lg font-bold shrink-0">
                          {wineRank}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{wine.name}</p>
                        <p className="text-xs text-gold">
                          {wine.vintage && `${wine.vintage} · `}
                          {wine.region}
                          {wine.country && ` · ${wine.country}`}
                        </p>
                      </div>
                      {actuallyInternational && (
                        <span className="flex items-center gap-1 text-xs font-medium text-gold bg-gold/10 px-2 py-1 rounded-full shrink-0">
                          <Globe className="h-3 w-3" /> International
                        </span>
                      )}
                    </div>
                    {hasInternationalWines && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs ml-13">
                        {isGuessedInternational ? (
                          guessedCorrectly ? (
                            <span className="flex items-center gap-1 text-sage">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Correct guess!
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive">
                              <XCircle className="h-3.5 w-3.5" /> Wrong guess
                            </span>
                          )
                        ) : !actuallyInternational ? (
                          <span className="text-muted-foreground">Not guessed — correct</span>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-3.5 w-3.5" /> Missed this one
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              }

              // ── OPEN OR PRE-REVEAL BLIND ──
              const showWineDetails = !isBlind;

              return (
                <motion.div
                  key={wine.id}
                  layout
                  className={`bg-card border rounded-lg p-4 shadow-sm transition-colors ${
                    isRanked ? "border-gold/50" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isRanked ? (
                      <button
                        onClick={() => unrankWine(wine.id)}
                        className="w-10 h-10 rounded-full bg-gold text-gold-foreground flex items-center justify-center text-lg font-bold shrink-0 hover:opacity-80 transition-opacity"
                      >
                        {wineRank === 1 ? <>1 ❤️</> : wineRank}
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs text-muted-foreground">?</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {showWineDetails ? (
                        <>
                          <p className="font-semibold text-foreground">{wine.name}</p>
                          <p className="text-xs text-gold">
                            {wine.vintage && `${wine.vintage} · `}
                            {wine.region}
                            {wine.country && ` · ${wine.country}`}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-foreground">
                            Wine {flightWines.indexOf(wine) + 1}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Blind tasting — details hidden
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rank buttons */}
                  {!isRanked && (
                    <div className="flex gap-2 mt-3 ml-13">
                      {flightWines.map((_, i) => {
                        const rankNum = i + 1;
                        const taken = assignedRanks.has(rankNum);
                        return (
                          <button
                            key={rankNum}
                            onClick={() => handleTapRank(wine.id, rankNum)}
                            disabled={taken}
                            className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                              taken
                                ? "bg-muted/50 text-muted-foreground/30 cursor-not-allowed"
                                : "bg-muted text-foreground hover:bg-gold hover:text-gold-foreground"
                            }`}
                          >
                            {rankNum}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* International guess */}
                  {isBlind && allRanked && hasInternationalWines && !isRevealed && (
                    <div className="mt-3 ml-13">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={isGuessedInternational}
                          onCheckedChange={() => toggleGuess(wine.id)}
                        />
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5 text-gold" /> I think this is international
                        </span>
                      </label>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Status messages */}
        {allRanked && isBlind && !isRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 justify-center text-sm text-gold mt-4"
          >
            <Check className="h-4 w-4" />
            {hasInternationalWines && flightGuesses.length === 0
              ? "Now guess which wine(s) are international!"
              : "All set — ready to reveal!"}
          </motion.div>
        )}

        {!isBlind && allRanked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 justify-center text-sm text-gold mt-4"
          >
            <Check className="h-4 w-4" /> All wines ranked for this flight!
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {currentFlight > 1 && (
            <Button
              variant="outline"
              onClick={() => setCurrentFlight(currentFlight - 1)}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
          )}

          {isBlind ? (
            !isRevealed ? (
              <Button
                onClick={revealFlight}
                disabled={!readyToReveal}
                className="flex-1 bg-gold text-gold-foreground hover:opacity-90"
              >
                <Eye className="h-4 w-4 mr-2" /> Reveal Flight
              </Button>
            ) : isLastFlight ? (
              <Button
                onClick={goToResults}
                className="flex-1 bg-primary text-primary-foreground hover:opacity-90"
              >
                <Trophy className="h-4 w-4 mr-2" /> Confirm My Results
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentFlight(currentFlight + 1)}
                className="flex-1 bg-gold text-gold-foreground hover:opacity-90"
              >
                Next Flight <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )
          ) : isLastFlight ? (
            <Button
              onClick={goToResults}
              disabled={!allRanked}
              className="flex-1 bg-primary text-primary-foreground hover:opacity-90"
            >
              <Trophy className="h-4 w-4 mr-2" /> Confirm My Results
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentFlight(currentFlight + 1)}
              disabled={!allRanked}
              className="flex-1 bg-gold text-gold-foreground hover:opacity-90"
            >
              Next Flight <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TastingPage;
