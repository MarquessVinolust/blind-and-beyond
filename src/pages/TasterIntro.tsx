import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/BB-Logo.jpg";
import { Wine, User, Globe, Heart, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
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

  const handleStart = () => {
    if (sessionId) {
      navigate(`/register?session=${sessionId}`);
    } else {
      navigate("/scan");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto w-full flex flex-col flex-1"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <button onClick={() => navigate("/")}>
            <img src={logo} alt="Brice & Burnett" className="h-5" />
          </button>
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-bold text-foreground mb-8 leading-snug">
          Ready for a Guided Wine Tasting?
        </h1>

        {/* Steps */}
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

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={handleStart}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 text-lg py-6"
          >
            Start Tasting <ChevronRight className="h-5 w-5 ml-2" />
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
