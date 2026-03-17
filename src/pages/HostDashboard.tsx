import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getSession, getAllSessions, getAllRankings, getAllOrders, endSession, activateSession } from "@/lib/tasting-store";
import { TastingSession, GuestStatus } from "@/types/tasting";
import logo from "@/assets/wine-cellar-logo.png";
import { Users, Trophy, QrCode, EyeOff, Eye, Plus, Download, StopCircle, ChevronRight, Calendar, Mail } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const statusColour: Record<GuestStatus, string> = {
  registered: "text-muted-foreground",
  in_progress: "text-blue-400",
  completed: "text-sage",
  ordered: "text-gold",
};

const statusLabel: Record<GuestStatus, string> = {
  registered: "Registered",
  in_progress: "In Progress",
  completed: "Completed",
  ordered: "Ordered",
};

// ─── SESSION LIST VIEW ───────────────────────────────────────────────────────

const SessionList = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TastingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllSessions().then(s => {
      setSessions(s);
      setLoading(false);
    });
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      upcoming: "bg-blue-400/10 text-blue-400",
      active: "bg-sage/20 text-sage",
      ended: "bg-muted text-muted-foreground",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate("/")}>
            <img src={logo} alt="Wine Cellar" className="h-10" />
          </button>
          <Button
            onClick={() => navigate("/host/setup")}
            className="bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" /> New Tasting
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6">Host Dashboard</h1>

        {loading ? (
          <p className="text-muted-foreground">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No tastings yet.</p>
            <Button
              onClick={() => navigate("/host/setup")}
              className="bg-primary text-primary-foreground"
            >
              Set Up Your First Tasting
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => navigate(`/host/${session.id}`)}
                className="w-full text-left bg-card border border-border rounded-lg p-5 shadow-sm hover:border-gold transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold text-foreground truncate">{session.name}</h2>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusBadge(session.status)}`}>
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(session.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        {session.tastingType === "blind"
                          ? <><EyeOff className="h-3 w-3" /> Blind</>
                          : <><Eye className="h-3 w-3" /> Open</>}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ─── ACTIVE SESSION VIEW ─────────────────────────────────────────────────────

const SessionView = ({ sessionId }: { sessionId: string }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<TastingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadSession = async () => {
    const s = await getSession(sessionId);
    setSession(s);
    setLoading(false);
  };

  useEffect(() => {
    loadSession();

    // Realtime — watch guests table for this session
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
          filter: `session_id=eq.${sessionId}`,
        },
        () => loadSession()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guest_rankings",
          filter: `session_id=eq.${sessionId}`,
        },
        () => loadSession()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const handleActivate = async () => {
    try {
      await activateSession(sessionId);
      await loadSession();
      toast.success("Tasting is now active — guests can join!");
    } catch {
      toast.error("Failed to activate session.");
    }
  };

  const handleEndTasting = async () => {
    setEnding(true);
    try {
      await endSession(sessionId);
      await loadSession();
      setShowEndConfirm(false);
      toast.success("Tasting ended.");
    } catch {
      toast.error("Failed to end session.");
    } finally {
      setEnding(false);
    }
  };

  const handleDownload = async () => {
    if (!session) return;
    setDownloading(true);

    try {
      const [allRankings, allOrders] = await Promise.all([
        getAllRankings(sessionId),
        getAllOrders(sessionId),
      ]);

      const wb = XLSX.utils.book_new();

      // ── Sheet 1: Guest List ──
      const guestRows = session.guests.map(g => ({
        "First Name": g.firstName,
        "Last Name": g.lastName,
        "Email": g.email,
        "Phone": g.phone || "",
        "Consent": g.consent ? "Yes" : "No",
        "Status": g.status ? statusLabel[g.status] : "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guestRows), "Guest List");

      // ── Sheet 2: Tasting Results ──
      const resultRows: any[] = [];
      for (const guest of session.guests) {
        const rankings = allRankings.find(r => r.guestId === guest.id);
        if (!rankings) continue;

        const flightGroups: Record<number, { wine: any; rank: number }[]> = {};
        for (const r of rankings.rankings) {
          const wine = session.wines.find(w => w.id === r.wineId);
          if (!wine) continue;
          if (!flightGroups[wine.flight]) flightGroups[wine.flight] = [];
          flightGroups[wine.flight].push({ wine, rank: r.rank });
        }

        for (const [flight, results] of Object.entries(flightGroups)) {
          results.sort((a, b) => a.rank - b.rank);
          for (const { wine, rank } of results) {
            const flightGuesses = rankings.guesses?.[parseInt(flight)] || [];
            const guessedIntl = flightGuesses.includes(wine.id);
            resultRows.push({
              "Guest": `${guest.firstName} ${guest.lastName}`,
              "Email": guest.email,
              "Flight": flight,
              "Rank": rank,
              "Wine": wine.name,
              "Vintage": wine.vintage,
              "Region": wine.region,
              "Country": wine.country,
              "Price": wine.price,
              "International": wine.isInternational ? "Yes" : "No",
              "Guessed International": session.originFormat === "international_mix"
                ? (guessedIntl ? "Yes" : "No")
                : "N/A",
              "Guess Correct": session.originFormat === "international_mix"
                ? (guessedIntl === !!wine.isInternational ? "Yes" : "No")
                : "N/A",
            });
          }
        }
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resultRows), "Tasting Results");

      // ── Sheet 3: Orders ──
      const orderRows: any[] = [];
      const wineTotals: Record<string, { name: string; vintage: string; total: number }> = {};

      for (const order of allOrders) {
        const guest = order.guests;
        for (const item of order.items) {
          orderRows.push({
            "Guest": `${guest.first_name} ${guest.last_name}`,
            "Email": guest.email,
            "Phone": guest.phone || "",
            "Wine": item.wineName,
            "Vintage": item.vintage,
            "Quantity": item.quantity,
            "Price Per Bottle": item.price,
          });
          if (!wineTotals[item.wineId]) {
            wineTotals[item.wineId] = { name: item.wineName, vintage: item.vintage, total: 0 };
          }
          wineTotals[item.wineId].total += item.quantity;
        }
      }

      // Add summary rows at bottom
      if (orderRows.length > 0) {
        orderRows.push({});
        orderRows.push({ "Guest": "── TOTALS BY WINE ──" });
        for (const wt of Object.values(wineTotals)) {
          orderRows.push({
            "Guest": "",
            "Wine": wt.name,
            "Vintage": wt.vintage,
            "Quantity": wt.total,
          });
        }
      }

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "Orders");

      XLSX.writeFile(wb, `${session.name} Tasting.xlsx`);
      toast.success("Download ready!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate download.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Session not found.</p>
      </div>
    );
  }

  const completedCount = session.guests.filter(g => g.status === "completed" || g.status === "ordered").length;
  const orderedCount = session.guests.filter(g => g.status === "ordered").length;
  const registrationUrl = `${window.location.origin}/?session=${session.id}`;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/host")}>
            <img src={logo} alt="Wine Cellar" className="h-10" />
          </button>
          <button
            onClick={() => navigate("/host")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← All Sessions
          </button>
        </div>

        {/* Session Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{session.name}</h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
              session.status === "active" ? "bg-sage/20 text-sage" :
              session.status === "upcoming" ? "bg-blue-400/10 text-blue-400" :
              "bg-muted text-muted-foreground"
            }`}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(session.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span>{session.wines.length} wines · {session.flights} flights</span>
            <span className="flex items-center gap-1">
              {session.tastingType === "blind" ? <><EyeOff className="h-3 w-3" /> Blind</> : <><Eye className="h-3 w-3" /> Open</>}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> {session.hostEmail}
            </span>
          </div>
        </div>

        {/* Activate button for upcoming sessions */}
        {session.status === "upcoming" && (
          <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-4 mb-6 flex items-center justify-between">
            <p className="text-sm text-blue-400">Session is set up and ready. Activate when guests arrive.</p>
            <Button
              onClick={handleActivate}
              className="bg-blue-400 text-white hover:opacity-90 shrink-0 ml-4"
            >
              Activate
            </Button>
          </div>
        )}

        {/* QR Code — show when active */}
        {session.status === "active" && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-md mb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <QrCode className="h-5 w-5 text-gold" />
              <h2 className="text-xl font-semibold">Guest Registration</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Scan to join the tasting</p>
            <div className="inline-block bg-white p-4 rounded-lg">
              <QRCodeSVG value={registrationUrl} size={200} level="M" fgColor="#333333" />
            </div>
            <p className="text-xs text-muted-foreground mt-3 break-all">{registrationUrl}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Registered", value: session.guests.length, icon: Users },
            { label: "Completed", value: completedCount, icon: Trophy },
            { label: "Ordered", value: orderedCount, icon: QrCode },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-4 text-center">
              <Icon className="h-4 w-4 text-gold mx-auto mb-1" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Guest List */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-md mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-gold" />
            <h2 className="text-xl font-semibold">Guests</h2>
            {session.status === "active" && (
              <span className="ml-auto text-xs text-sage animate-pulse">● Live</span>
            )}
          </div>

          {session.guests.length === 0 ? (
            <p className="text-muted-foreground text-sm">No guests have registered yet.</p>
          ) : (
            <div className="space-y-2">
              {session.guests.map(guest => (
                <div key={guest.id} className="flex items-center justify-between bg-muted/50 rounded-md p-3">
                  <div>
                    <p className="font-medium">{guest.firstName} {guest.lastName}</p>
                    <p className="text-xs text-muted-foreground">{guest.email}</p>
                  </div>
                  <span className={`text-xs font-medium ${statusColour[guest.status as GuestStatus] || "text-muted-foreground"}`}>
                    {statusLabel[guest.status as GuestStatus] || guest.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {session.status !== "upcoming" && (
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full bg-gold text-gold-foreground hover:opacity-90 text-base py-5"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Preparing Download..." : `Download ${session.name} Tasting`}
            </Button>
          )}

          {session.status === "active" && !showEndConfirm && (
            <Button
              variant="outline"
              onClick={() => setShowEndConfirm(true)}
              className="w-full border-destructive text-destructive hover:bg-destructive/10 text-base py-5"
            >
              <StopCircle className="h-4 w-4 mr-2" /> End Tasting
            </Button>
          )}

          {showEndConfirm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/30 rounded-lg p-4"
            >
              <p className="text-sm text-destructive font-medium mb-3">
                Are you sure? Tasters will no longer have access once the session is ended.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEndTasting}
                  disabled={ending}
                  className="flex-1 bg-destructive text-white hover:opacity-90"
                >
                  {ending ? "Ending..." : "Yes, End Tasting"}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── ROUTER ──────────────────────────────────────────────────────────────────

const HostDashboard = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  return sessionId ? <SessionView sessionId={sessionId} /> : <SessionList />;
};

export default HostDashboard;
