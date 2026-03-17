import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { addGuest, getGuestByEmail, getSession, activateSession } from "@/lib/tasting-store";
import { TastingSession } from "@/types/tasting";
import logo from "@/assets/wine-cellar-logo.png";
import { Wine } from "lucide-react";
import { toast } from "sonner";

const GuestRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");

  const [session, setSession] = useState<TastingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    getSession(sessionId).then(s => {
      setSession(s);
      setLoading(false);
    });
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!session) {
      setError("No tasting session found. Please ask your host for the correct link.");
      return;
    }
    if (session.status === "ended") {
      setError("This tasting session has ended.");
      return;
    }

    setSubmitting(true);

    try {
      // Check if returning guest
      const existing = await getGuestByEmail(sessionId!, email.trim());
      if (existing) {
        toast.info("Welcome back! Resuming your tasting.");
        navigate(`/tasting/${existing.id}?session=${sessionId}`);
        return;
      }

      const guest = await addGuest(sessionId!, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        consent,
      });

      navigate(`/tasting/${guest.id}?session=${sessionId}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!sessionId || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <img src={logo} alt="Wine Cellar" className="h-12 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">No Session Found</h1>
          <p className="text-muted-foreground">Please ask your host for the correct QR code or link.</p>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-10">
          <button onClick={() => navigate("/")}>
            <img src={logo} alt="Wine Cellar" className="h-14 mb-6" />
          </button>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Welcome to the Tasting
          </h1>
          <p className="text-muted-foreground text-center text-sm mb-2">
            {session.name}
          </p>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
            session.tastingType === "blind"
              ? "bg-primary/10 text-primary"
              : "bg-gold/20 text-gold"
          }`}>
            {session.tastingType === "blind" ? "Blind Tasting" : "Open Tasting"}
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-lg p-8 shadow-lg border border-border space-y-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Surname <span className="text-destructive">*</span></Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Surname"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 81 234 5678"
            />
          </div>

          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(checked) => setConsent(!!checked)}
              className="mt-0.5"
            />
            <Label htmlFor="consent" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              I'd like to receive updates about wines, events, and offers from this wine house
            </Label>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 text-lg py-6"
          >
            <Wine className="mr-2 h-5 w-5" />
            {submitting ? "Joining..." : "Join the Tasting"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Are you the host?{" "}
          <button
            onClick={() => navigate("/host")}
            className="text-gold underline"
          >
            Go to Host Dashboard
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default GuestRegistration;
