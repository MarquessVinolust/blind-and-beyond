import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getSession, getGuestRankings } from "@/lib/tasting-store";
import logo from "@/assets/wine-cellar-logo.png";
import { Star, Minus, Plus, Mail, ArrowLeft } from "lucide-react";

const OrderPage = () => {
  const { guestId } = useParams<{ guestId: string }>();
  const navigate = useNavigate();
  const session = getSession();
  const guestRankings = guestId ? getGuestRankings(guestId) : null;
  const guest = session?.guests.find(g => g.id === guestId);

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (!session || !guest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No session found.</p>
      </div>
    );
  }

  const rankMap: Record<string, number> = {};
  if (guestRankings) {
    for (const r of guestRankings.rankings) {
      rankMap[r.wineId] = r.rank;
    }
  }

  const flightGroups: Record<number, typeof session.wines> = {};
  for (const wine of session.wines) {
    if (!flightGroups[wine.flight]) flightGroups[wine.flight] = [];
    flightGroups[wine.flight].push(wine);
  }

  Object.values(flightGroups).forEach(arr =>
    arr.sort((a, b) => (rankMap[a.id] || 99) - (rankMap[b.id] || 99))
  );

  const updateQty = (wineId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [wineId]: Math.max(0, (prev[wineId] || 0) + delta),
    }));
  };

  const totalItems = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  const handleEmailOrder = () => {
    const orderLines = session.wines
      .filter(w => (quantities[w.id] || 0) > 0)
      .map(w => `${quantities[w.id]}x ${w.name} (${w.vintage}) - ${w.price} each`)
      .join("\n");

    if (!orderLines) return;

    const subject = encodeURIComponent(`Wine Order from ${guest.firstName} ${guest.lastName}`);
    const body = encodeURIComponent(
      `Hi,\n\nI'd like to place the following order from the tasting:\n\n${orderLines}\n\nPlease let me know the total and how to pay.\n\nThanks,\n${guest.firstName} ${guest.lastName}\n${guest.email}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <img src={logo} alt="Wine Cellar" className="h-10" />
          <Button variant="ghost" size="sm" onClick={() => navigate(`/summary/${guestId}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-1">Place Your Order</h1>
        <p className="text-muted-foreground text-sm mb-6">Select wines you'd like to purchase</p>

        {Object.entries(flightGroups).map(([flight, wines]) => (
          <div key={flight} className="mb-6">
            <h3 className="text-sm font-semibold text-gold mb-3">Flight {flight}</h3>
            <div className="space-y-3">
              {wines.map(wine => {
                const isFavourite = rankMap[wine.id] === 1;
                const qty = quantities[wine.id] || 0;

                return (
                  <motion.div
                    key={wine.id}
                    layout
                    className={`bg-card border rounded-lg p-4 shadow-sm ${
                      isFavourite ? "border-gold/50" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isFavourite && (
                        <Star className="h-5 w-5 text-gold fill-gold shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{wine.name}</p>
                        <p className="text-xs text-gold">
                          {wine.vintage && `${wine.vintage} · `}{wine.region}{wine.country && ` · ${wine.country}`}
                        </p>
                        <p className="text-sm font-bold text-foreground mt-1">{wine.price}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 ? (
                          <>
                            <button
                              onClick={() => updateQty(wine.id, -1)}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-gold hover:text-gold transition-colors"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center font-bold text-foreground">{qty}</span>
                            <button
                              onClick={() => updateQty(wine.id, 1)}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-gold hover:text-gold transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => updateQty(wine.id, 1)} className="bg-gold text-gold-foreground hover:opacity-90 text-xs px-4">
                            ADD
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="sticky bottom-4 mt-4">
          <Button
            onClick={handleEmailOrder}
            disabled={totalItems === 0}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 text-base py-5 shadow-lg"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Order ({totalItems} bottle{totalItems !== 1 ? "s" : ""})
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderPage;
