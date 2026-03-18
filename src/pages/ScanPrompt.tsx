import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/BB-Logo.jpg";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

const ScanPrompt = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-sm w-full text-center"
      >
        <button onClick={() => navigate("/")}>
          <img src={logo} alt="Brice & Burnett" className="h-5 mx-auto mb-8" />
        </button>

        <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
          <QrCode className="h-10 w-10 text-gold" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          Scan to Join
        </h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Ask your host for the QR code to join the tasting session. Point your camera at the code to get started.
        </p>

        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="w-full border-gold text-gold hover:bg-gold/10"
        >
          Back to Home
        </Button>
      </motion.div>
    </div>
  );
};

export default ScanPrompt;
