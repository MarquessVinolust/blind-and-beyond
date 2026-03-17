import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/BB-Logo.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex justify-center pt-10 pb-6">
        <motion.img
          src={logo}
          alt="Brice & Burnett"
          className="h-16"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Hero blurb */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-center px-6 mb-12"
      >
        <h1 className="text-4xl font-bold text-foreground mb-3">
          Blind & Beyond
        </h1>
        <p className="text-muted-foreground text-base max-w-sm mx-auto leading-relaxed">
          A guided wine tasting experience. Taste blind, discover your palate,
          and find your next favourite bottle.
        </p>
      </motion.div>

      {/* Two path buttons */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-5 px-6 max-w-xl mx-auto w-full"
      >
        {/* Taster */}
        <button
          onClick={() =>
            sessionId
              ? navigate(`/register?session=${sessionId}`)
              : navigate("/register")
          }
          className="flex-1 bg-card border-2 border-border hover:border-gold rounded-xl p-8 text-left transition-all hover:shadow-lg group"
        >
          <div className="flex flex-col items-center text-center gap-4">
            {/* Placeholder graphic — swap for provided asset */}
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <span className="text-4xl">🍷</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Taster</h2>
              <p className="text-sm text-muted-foreground leading-snug">
                Join a tasting session and discover your palate
              </p>
            </div>
          </div>
        </button>

        {/* Host */}
        <button
          onClick={() => navigate("/host")}
          className="flex-1 bg-card border-2 border-border hover:border-gold rounded-xl p-8 text-left transition-all hover:shadow-lg group"
        >
          <div className="flex flex-col items-center text-center gap-4">
            {/* Placeholder graphic — swap for provided asset */}
            <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
              <span className="text-4xl">🍾</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Host</h2>
              <p className="text-sm text-muted-foreground leading-snug">
                Set up and manage your wine tasting event
              </p>
            </div>
          </div>
        </button>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-muted-foreground mt-auto pb-8 pt-12"
      >
        Powered by Blind & Beyond
      </motion.p>
    </div>
  );
};

export default Index;
