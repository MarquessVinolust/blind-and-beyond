import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addGuest, getSession } from "@/lib/tasting-store";
import { loadTestSession } from "@/lib/test-data";
import logo from "@/assets/wine-cellar-logo.png";
import { Wine, FlaskConical } from "lucide-react";
import { toast } from "sonner";

const GuestRegistration = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const session = getSession();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!session) {
      setError("No tasting session found. Please ask your host to set one up.");
      return;
    }

    const existingGuest = session.guests.find(
      g => g.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (existingGuest) {
      toast.info("Welcome back! Resuming your tasting session.");
      navigate(`/tasting/${existingGuest.id}`);
      return;
    }

    const guest = {
      id: crypto.randomUUID(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    };
    addGuest(guest);
    navigate(`/tasting/${guest.id}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="Wine Cellar" className="h-14 mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to the Tasting</h1>
          <p className="text-muted-foreground text-center">
            Please register to begin your wine experience
          </p>
          {session && (
            <span className={`mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full ${
              session.tastingType === "blind" ? "bg-primary/10 text-primary" : "bg-gold/20 text-gold"
            }`}>
              {session.tastingType === "blind" ? "Blind Tasting" : "Open Tasting"}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg p-8 shadow-lg border border-border space-y-5">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter your first name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Surname</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Enter your surname" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:opacity-90 text-lg py-6">
            <Wine className="mr-2 h-5 w-5" />
            Join the Tasting
          </Button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-muted-foreground">
            Are you the Host? <button onClick={() => navigate("/host")} className="text-gold underline">Set up the tasting here</button>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-gold text-gold hover:bg-gold/10"
            onClick={() => {
              loadTestSession(4, "blind", "international_mix");
              const guest = {
                id: crypto.randomUUID(),
                firstName: "Test",
                lastName: "Player",
                email: "test@demo.com",
              };
              addGuest(guest);
              toast.success("Demo session loaded — blind tasting with international mix!");
              navigate(`/tasting/${guest.id}`);
            }}
          >
            <FlaskConical className="h-4 w-4 mr-1" />
            Demo Mode (Blind + International)
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default GuestRegistration;
