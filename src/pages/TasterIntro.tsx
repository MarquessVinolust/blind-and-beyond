import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/wine-cellar-logo.png";
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

  // Build steps dynamically when session is available
  const steps = session
    ? [
        {
          icon: Wine,
          title: `${session.flights} Guided Round${session.flights !== 1 ? "s" : ""}`,
          description: `
