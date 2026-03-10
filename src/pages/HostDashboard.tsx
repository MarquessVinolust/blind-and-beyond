import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getSession, getAllRankings } from "@/lib/tasting-store";
import logo from "@/assets/wine-cellar-logo.png";
import { Users, Mail, Trophy, QrCode, EyeOff, Eye } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const HostDashboard = () => {
  const navigate = useNavigate();
  const session = getSession();
  const allRankings = getAllRankings();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <img src={logo} alt="Wine Cellar" className="h-12 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">No Active Tasting</h1>
          <p className="text-muted-foreground mb-6">Set up a tasting to get started</p>
          <Button onClick={() => navigate("/host/setup")} className="bg-primary text-primary-foreground">
            Set Up Tasting
          </Button>
        </motion.div>
      </div>
    );
  }

  const completedGuests = session.guests.filter(g =>
    allRankings.some(r => r.guestId === g.id)
  );

  const emailAllGuests = () => {
    completedGuests.forEach(guest => {
      const guestRanking = allRankings.find(r => r.guestId === guest.id);
      if (!guestRanking) return;

      const topPicks = guestRanking.rankings
        .filter(r => r.rank === 1)
        .map(r => session.wines.find(w => w.id === r.wineId))
        .filter(Boolean);

      const subject = encodeURIComponent("Your Wine Cellar Tasting Favourites");
      const body = encodeURIComponent(
        `Hi ${guest.firstName},\n\nThank you for joining our tasting! Here are your favourite wines:\n\n${
          topPicks.map((w, i) => `${i + 1}. ${w!.name} (${w!.vintage}) - ${w!.region}, ${w!.country} - ${w!.price}`).join("\n")
        }\n\nWould you like to place an order? Reply to this email or visit us!\n\nCheers,\nWine Cellar`
      );
      window.open(`mailto:${guest.email}?subject=${subject}&body=${body}`);
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <img src={logo} alt="Wine Cellar" className="h-10" />
          <Button variant="outline" onClick={() => navigate("/host/setup")} className="text-sm">
            New Tasting
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-2">Host Dashboard</h1>
        <div className="flex items-center gap-2 mb-6">
          <p className="text-muted-foreground">
            {session.wines.length} wines · {session.flights} flights · {session.guests.length} guests
          </p>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
            session.tastingType === "blind" ? "bg-primary/10 text-primary" : "bg-gold/20 text-gold"
          }`}>
            {session.tastingType === "blind" ? (
              <span className="flex items-center gap-1"><EyeOff className="h-3 w-3" /> Blind</span>
            ) : (
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Open</span>
            )}
          </span>
          {session.tastingType === "blind" && (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gold/20 text-gold">
              {session.originFormat === "international_mix" ? "International Mix" : "Local Only"}
            </span>
          )}
        </div>

        {/* QR Code */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-md mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <QrCode className="h-5 w-5 text-gold" />
            <h2 className="text-xl font-semibold">Guest Registration</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Scan to join the tasting</p>
          <div className="inline-block bg-white p-4 rounded-lg">
            <QRCodeSVG value={window.location.origin + "/"} size={200} level="M" fgColor="#333333" />
          </div>
          <p className="text-xs text-muted-foreground mt-3 break-all">{window.location.origin}/</p>
        </div>

        {/* Guests */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-md mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-gold" />
            <h2 className="text-xl font-semibold">Registered Guests</h2>
          </div>

          {session.guests.length === 0 ? (
            <p className="text-muted-foreground text-sm">No guests have registered yet.</p>
          ) : (
            <div className="space-y-2">
              {session.guests.map(guest => {
                const hasCompleted = allRankings.some(r => r.guestId === guest.id);
                return (
                  <div key={guest.id} className="flex items-center justify-between bg-muted/50 rounded-md p-3">
                    <div>
                      <p className="font-medium">{guest.firstName} {guest.lastName}</p>
                      <p className="text-xs text-muted-foreground">{guest.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasCompleted ? (
                        <span className="flex items-center gap-1 text-xs text-sage font-medium">
                          <Trophy className="h-3 w-3" /> Completed
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">In progress</span>
                      )}
                      {hasCompleted && (
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/summary/${guest.id}`)} className="text-xs text-gold">
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Email All */}
        {completedGuests.length > 0 && (
          <Button onClick={emailAllGuests} className="w-full bg-gold text-gold-foreground hover:opacity-90 text-base py-5">
            <Mail className="h-4 w-4 mr-2" /> Email All Guests Their Favourites
          </Button>
        )}
      </motion.div>
    </div>
  );
};

export default HostDashboard;
