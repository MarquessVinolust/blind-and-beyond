import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  getSession,
  getGuestRankings,
  saveGuestRankings,
} from "@/lib/tasting-store";
import { TastingSession, GuestRankings } from "@/types/tasting";
import logo from "@/assets/BB-Logo.jpg";
import {
  Trophy,
  Star,
  ShoppingCart,
  Globe,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Download,
  Wine,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SummaryPage = () => {
  const { guestId } = useParams<{ guestId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const navigate = useNavigate();

  const [session, setSession] = useState<TastingSession | null>(null);
  const [guestRankings, setGuestRankings] = useState<GuestRankings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId || !guestId) return;
    const init = async () => {
      const [s, r] = await Promise.all([
        getSession(sessionId),
        getGuestRankings(guestId),
      ]);
      setSession(s);
      setGuestRankings(r);
      setLoading(false);
    };
    init();
  }, [sessionId, guestId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your results...</p>
      </div>
    );
  }

  if (!session || !guestRankings || !guestId || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No results found.</p>
      </div>
    );
  }

  const guest = session.guests.find(g => g.id === guestId);
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

  // Guess score
  let totalCorrect = 0;
  let totalInternational = 0;
  if (isBlind && isInternationalMix) {
    for (const [flightStr, results] of Object.entries(flightResults)) {
      const flight = parseInt(flightStr);
      const flightGuesses = guesses[flight] || [];
      for (const { wine } of results) {
        if (wine.isInternational) totalInternational++;
        if (flightGuesses.includes(wine.id) && wine.isInternational) totalCorrect++;
      }
    }
  }

  // ── PDF DOWNLOAD ─────────────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    if (!guest) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Wine Tasting Results", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(120, 100, 60); // gold-ish
    doc.text(session.name, pageWidth / 2, 28, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${guest.firstName} ${guest.lastName}  ·  ${new Date(session.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
      pageWidth / 2, 35, { align: "center" }
    );

    doc.setFontSize(10);
    doc.text(
      session.tastingType === "blind" ? "Blind Tasting" : "Open Tasting",
      pageWidth / 2, 41, { align: "center" }
    );

    let yOffset = 52;

    // International score
    if (isBlind && isInternationalMix && totalInternational > 0) {
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(
        `International Guessing Score: ${totalCorrect} / ${totalInternational}`,
        pageWidth / 2, yOffset, { align: "center" }
      );
      yOffset += 12;
    }

    // Top picks
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text("Your Top Picks", 14, yOffset);
    yOffset += 6;

    autoTable(doc, {
      startY: yOffset,
      head: [["Flight", "Wine", "Vintage", "Region", "Country", "Price"]],
      body: favourites.map((wine, i) => [
        `Flight ${i + 1}`,
        wine.name,
        wine.vintage || "",
        wine.region || "",
        wine.country || "",
        wine.price || "",
      ]),
      headStyles: { fillColor: [120, 100, 60] },
      styles: { fontSize: 9 },
    });

    yOffset = (doc as any).lastAutoTable.finalY + 12;

    // Results by flight
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text("Full Results by Flight", 14, yOffset);
    yOffset += 6;

    for (const [flight, results] of Object.entries(flightResults)) {
      const flightNum = parseInt(flight);
      const flightGuesses = guesses[flightNum] || [];

      const rows = results.map(({ wine, rank }) => {
        const guessedIntl = flightGuesses.includes(wine.id);
        const row: string[] = [
          String(rank),
          wine.name,
          wine.vintage || "",
          wine.region || "",
          wine.country || "",
          wine.price || "",
        ];
        if (isBlind && isInternationalMix) {
          row.push(
            wine.isInternational ? "Yes" : "No",
            guessedIntl ? "Yes" : "No",
            guessedIntl === !!wine.isInternational ? "✓" : "✗"
          );
        }
        return row;
      });

      const head = ["Rank", "Wine", "Vintage", "Region", "Country", "Price"];
      if (isBlind && isInternationalMix) {
        head.push("International", "Guessed", "Correct");
      }

      autoTable(doc, {
        startY: yOffset,
        head: [[`Flight ${flight}`, ...Array(head.length - 1).fill("")],  head],
        body: rows,
        headStyles: { fillColor: [60, 60, 60] },
        styles: { fontSize: 8 },
      });

      yOffset = (doc as any).lastAutoTable.finalY + 8;
    }

    doc.save(`${session.name} — ${guest.firstName} ${guest.lastName}.pdf`);
    toast.success("PDF downloaded!");
  };

  // ── RESULTS VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto"
      >
        <div className="flex flex-col items-center mb-8">
          <button onClick={() => navigate("/")}>
            <img src={logo} alt="Brice & Burnett" className="h-5 mb-4" />
          </button>
          <h1 className="text-3xl font-bold text-foreground">Your Results</h1>
          {guest && (
            <p className="text-muted-foreground">{guest.firstName} {guest.lastName}</p>
          )}
          <span className={`mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full ${
            isBlind ? "bg-primary/10 text-primary" : "bg-gold/20 text-gold"
          }`}>
            {isBlind ? "Blind Tasting" : "Open Tasting"}
          </span>
        </div>

        {/* International score */}
        {isBlind && isInternationalMix && totalInternational > 0 && (
          <div className="bg-card border border-gold/30 rounded-lg p-6 mb-6 shadow-md text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-gold" />
              <h2 className="text-xl font-semibold">International Guessing</h2>
            </div>
            <p className="text-3xl font-bold text-gold mb-1">
              {totalCorrect} / {totalInternational}
            </p>
            <p className="text-sm text-muted-foreground">
              international wines correctly identified
            </p>
          </div>
        )}

        {/* Top picks — no price */}
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
                    {wine.vintage && `${wine.vintage} · `}
                    {wine.region}
                    {wine.country && ` · ${wine.country}`}
                  </p>
                </div>
                {isBlind && isInternationalMix && wine.isInternational && (
                  <Globe className="h-3.5 w-3.5 text-gold shrink-0" />
                )}
                {/* No price shown here */}
              </motion.div>
            ))}
          </div>
        </div>

       {/* Results by flight — with price */}
        {Object.entries(flightResults).map(([flight, results]) => {
          const flightNum = parseInt(flight);
          const flightGuesses = guesses[flightNum] || [];

          return (
            <div
              key={flight}
              className="bg-card border border-border rounded-lg p-5 mb-4 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-gold mb-3">Flight {flight}</h3>
              <div className="space-y-2">
                {results.map(({ wine, rank }) => {
                  const guessedIntl = flightGuesses.includes(wine.id);
                  return (
                    <div key={wine.id} className="flex items-center gap-3 text-sm">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        rank === 1
                          ? "bg-gold text-gold-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{wine.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {wine.vintage && `${wine.vintage} · `}
                          {wine.region}
                          {wine.country && ` · ${wine.country}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isBlind && isInternationalMix && wine.isInternational && (
                          <Globe className="h-3.5 w-3.5 text-gold" />
                        )}
                        {isBlind && isInternationalMix && (
                          guessedIntl ? (
                            wine.isInternational
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                              : <XCircle className="h-3.5 w-3.5 text-destructive" />
                          ) : wine.isInternational
                            ? <XCircle className="h-3.5 w-3.5 text-destructive" />
                            : null
                        )}
                        <span className="text-muted-foreground text-xs">{wine.price}</span>
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
  <Button
    onClick={() => navigate(`/order/${guestId}?session=${sessionId}`)}
    className="w-full bg-gold text-gold-foreground hover:opacity-90 text-base py-5"
  >
    <ShoppingCart className="h-4 w-4 mr-2" /> Order Now
  </Button>
  <div className="grid grid-cols-2 gap-3">
    <Button
      variant="outline"
      onClick={handleDownloadPDF}
      className="w-full border-gold text-gold hover:bg-gold/10 text-base py-5"
    >
      <Download className="h-4 w-4 mr-2" /> Download
    </Button>
    <Button
      variant="outline"
      onClick={() => navigate(`/done?session=${sessionId}`)}
      className="w-full border-gold text-gold hover:bg-gold/10 text-base py-5"
    >
      <Wine className="h-4 w-4 mr-2" /> Consider me wined!
    </Button>
  </div>
</div>

export default SummaryPage;
