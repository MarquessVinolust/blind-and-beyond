import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession, getGuestRankings, saveOrder } from "@/lib/tasting-store";
import { TastingSession, GuestRankings, OrderItem } from "@/types/tasting";
import logo from "@/assets/BB-Logo.jpg";
import { Star, Minus, Plus, ArrowLeft, ShoppingCart, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const parsePrice = (price: string): number => {
  const cleaned = price.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
};

const formatPrice = (amount: number, sample: string): string => {
  const prefix = sample.match(/^[^0-9]*/)?.[0] || "";
  return `${prefix}${amount.toFixed(2)}`;
};

const OrderPage = () => {
  const { guestId } = useParams<{ guestId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const navigate = useNavigate();

  const [session, setSession] = useState<TastingSession | null>(null);
  const [guestRankings, setGuestRankings] = useState<GuestRankings | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Order form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!sessionId || !guestId) return;
    const init = async () => {
      const [s, r] = await Promise.all([
        getSession(sessionId),
        getGuestRankings(guestId),
      ]);
      setSession(s);
      setGuestRankings(r);

      // Pre-fill form from guest data
      const guest = s?.guests.find(g => g.id === guestId);
      if (guest) {
        setFormName(`${guest.firstName} ${guest.lastName}`);
        setFormEmail(guest.email);
        setFormPhone(guest.phone || "");
      }

      setLoading(false);
    };
    init();
  }, [sessionId, guestId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session || !guestId || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No session found.</p>
      </div>
    );
  }

  const guest = session.guests.find(g => g.id === guestId);

  const rankMap: Record<string, number> = {};
  if (guestRankings) {
    for (const r of guestRankings.rankings) {
      rankMap[r.wineId] = r.rank;
    }
  }

  // Group wines by flight, sorted by guest ranking
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

  // Compute totals
  const orderedWines = session.wines.filter(w => (quantities[w.id] || 0) > 0);
  const totalItems = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const pricePrefix = session.wines.find(w => w.price)?.price.match(/^[^0-9]*/)?.[0] || "";

  const grandTotal = orderedWines.reduce((sum, wine) => {
    return sum + parsePrice(wine.price) * (quantities[wine.id] || 0);
  }, 0);

  const buildOrderItems = (): OrderItem[] =>
    orderedWines.map(wine => ({
      wineId: wine.id,
      wineName: wine.name,
      vintage: wine.vintage,
      price: wine.price,
      quantity: quantities[wine.id] || 0,
    }));

  const handleProceedToForm = () => {
    if (totalItems === 0) return;
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitOrder = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Please confirm your name and email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);

    try {
      const items = buildOrderItems();
      const total = `${pricePrefix}${grandTotal.toFixed(2)}`;

      // Save to Supabase
      await saveOrder(guestId, sessionId, items, total);

      // Build order summary for emails
      const orderLines = items
        .map(item => `${item.quantity}x ${item.wineName} (${item.vintage}) @ ${item.price} each`)
        .join("\n");

      const emailBody = `
Wine Order — ${session.name}

Guest: ${formName}
Email: ${formEmail}
Phone: ${formPhone || "Not provided"}

Order:
${orderLines}

Total: ${total}
      `.trim();

      // Send via Supabase Edge Function
const { error: fnError } = await supabase.functions.invoke("send-order-email", {
  body: {
    hostEmail: session.hostEmail,
    guestEmail: formEmail,
    guestName: formName,
    sessionName: session.name,
    orderLines: items,
    total,
  },
});

if (fnError) throw fnError;

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── CONFIRMATION SCREEN ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <button onClick={() => navigate("/")}>
            <img src={logo} alt="Brice & Burnett" className="h-5 mx-auto mb-6" />
          </button>
          <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-sage" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Sent!</h1>
          <p className="text-muted-foreground text-sm mb-2">
            Your order has been sent to the wine house.
          </p>
          <p className="text-muted-foreground text-sm">
            A copy has been sent to <span className="text-foreground font-medium">{formEmail}</span>.
          </p>
          <p className="text-muted-foreground text-sm mt-4">
            We'll be in touch shortly. Cheers! 🍷
          </p>
        </motion.div>
      </div>
    );
  }

  // ── ORDER FORM ───────────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-lg mx-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate("/")}>
              <img src={logo} alt="Brice & Burnett" className="h-5" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>

          <h1 className="text-2xl font-bold mb-1">Confirm Your Order</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Review your order and confirm your details
          </p>

          {/* Order summary */}
          <div className="bg-card border border-border rounded-lg p-5 mb-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gold mb-3">Order Summary</h2>
            <div className="space-y-2">
              {buildOrderItems().map(item => (
                <div key={item.wineId} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.wineName}</p>
                    <p className="text-xs text-muted-foreground">{item.vintage} · {item.price} each</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-medium">×{item.quantity}</p>
                    <p className="text-xs text-gold">
                      {pricePrefix}{(parsePrice(item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-4 pt-3 flex justify-between items-center">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-gold">
                {pricePrefix}{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Contact details */}
          <div className="bg-card border border-border rounded-lg p-5 mb-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gold">Your Details</h2>
            <div className="space-y-2">
              <Label htmlFor="formName">Full Name</Label>
              <Input
                id="formName"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formEmail">Email Address</Label>
              <Input
                id="formEmail"
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formPhone">Phone Number</Label>
              <Input
                id="formPhone"
                type="tel"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder="+27 81 234 5678"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 text-base py-5"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {submitting ? "Submitting..." : "Submit Order"}
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── WINE SELECTION ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-lg mx-auto pb-40"
      >
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/")}>
            <img src={logo} alt="Brice & Burnett" className="h-5" />
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/summary/${guestId}?session=${sessionId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-1">Place Your Order</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Select the wines you'd like to purchase
        </p>

        {Object.entries(flightGroups).map(([flight, wines]) => (
          <div key={flight} className="mb-6">
            <h3 className="text-sm font-semibold text-gold mb-3">Flight {flight}</h3>
            <div className="space-y-3">
              {wines.map(wine => {
                const isFavourite = rankMap[wine.id] === 1;
                const qty = quantities[wine.id] || 0;
                const lineTotal = parsePrice(wine.price) * qty;

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
                          {wine.vintage && `${wine.vintage} · `}
                          {wine.region}
                          {wine.country && ` · ${wine.country}`}
                        </p>
                        <p className="text-sm font-bold text-foreground mt-1">{wine.price}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2">
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
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => updateQty(wine.id, 1)}
                            className="bg-gold text-gold-foreground hover:opacity-90 text-xs px-4"
                          >
                            ADD
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Per-wine subtotal */}
                    <AnimatePresence>
                      {qty > 1 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">
                              {qty} × {wine.price}
                            </span>
                            <span className="font-semibold text-gold">
                              {pricePrefix}{lineTotal.toFixed(2)}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Sticky total + proceed button */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-4 shadow-lg"
          >
            <div className="max-w-lg mx-auto">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-muted-foreground">
                  {totalItems} bottle{totalItems !== 1 ? "s" : ""}
                </span>
                <span className="text-xl font-bold text-gold">
                  {pricePrefix}{grandTotal.toFixed(2)}
                </span>
              </div>
              <Button
                onClick={handleProceedToForm}
                className="w-full bg-primary text-primary-foreground hover:opacity-90 text-base py-5"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Proceed to Order
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderPage;
