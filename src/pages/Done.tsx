import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/BB-Logo.jpg";
import { Wine } from "lucide-react";

const Done = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-sm w-full text-center"
      >
        <button onClick={() => navigate("/")}>
          <img src={logo} alt="WiBrice & Burnet" className="h-5 mx-auto mb-8" />
        </button>

        <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
          <Wine className="h-8 w-8 text-gold" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-3">
          Cheers from Brice & Burnett!
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          We hope the experience was as memorable as the wines.
        </p>
      </motion.div>
    </div>
  );
};

export default Done;
