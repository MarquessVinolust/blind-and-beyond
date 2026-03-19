import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/BB-Logo.jpg";
import { Wine, User, Globe, Heart, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/tasting-store";
import { TastingSession } from "@/types/tasting";

const genericSteps = [
  {
    icon: Wine,
    title: "Guided Rounds",
    description: "In each round, you'll taste wines and rank them in order of preference.",
  },
  {
    icon: User,
    title: "Guided by an Expert",
    description: "Follow along as your host shares insights into each wine's character and origin.",
  },
  {
    icon: Globe,
    title: "Guess the Origin",
    description: "Can you identify which glass is which?",
  },
  {
    icon: Heart,
    title: "Pick Your Favourite",
    description: "Choose the wine you enjoyed most — there are no wrong answers.",
  },
];

const TasterIntro = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const [session, setSession] = useState<TastingSession | null>(null);
  const [loading, setLoading] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then(s => {
      setSession(s);
      setLoading(false);
    });
  }, [sessionId]);

  const handleStart = () => {
    if (sessionId) {
      navigate(`/register?session=${sessionId}`);
    } else {
      navigate("/scan");
    }
  };

  const steps = session
    ? [
        {
          icon: Wine,
          title: `${session.flights} Guided Round${session.flights !== 1 ? "s" : ""}`,
          description: `In each round, you'll taste ${session.winesPerFlight} wine${session.winesPerFlight !== 1 ? "s" : ""} and rank them in order of preference.`,
        },
        {
          icon: User,
          title: "Guided by an Expert",
          description: "Follow along as your host shares insights into each wine's character and origin.",
        },
        ...(session.originFormat === "international_mix"
          ? [{
              icon: Globe,
              title: "Guess the Origin",
              description: "Can you identify which wines are international and which are local?",
            }]
          : []),
        {
          icon: Heart,
          title: "Pick Your Favourite",
          description: "Choose the wine you enjoyed most — there are no wrong answers.",
        },
      ]
    : genericSteps;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto w-full flex flex-col flex-1"
      >
        <div className="flex justify-center mb-8">
          <button onClick={() => navigate("/")}>
            <img src={logo} alt="Brice & Burnett" className="h-5" />
          </button>
        </div>

        {session && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-4"
          >
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
              session.tastingType === "blind"
                ? "bg-primary/10 text-primary"
                : "bg-gold/20 text-gold"
            }`}>
              {session.tastingType === "blind" ? "Blind Tasting" : "Open Tasting"}
            </span>
            <p className="text-sm text-muted-foreground mt-2">{session.name}</p>
          </motion.div>
        )}

        <h1 className="text-3xl font-bold text-foreground mb-8 leading-snug">
          Ready for a Guided Wine Tasting?
        </h1>

        <div className="space-y-5 mb-10 flex-1">
          {steps.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={handleStart}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 text-lg py-6"
          >
            {sessionId ? "Register for the Tasting" : "Find My Tasting"}
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4 italic">
            A guided tasting experience by Brice & Burnett
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TasterIntro;
