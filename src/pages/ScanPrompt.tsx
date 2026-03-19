import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";
import { getSessionByCode } from "@/lib/tasting-store";
import logo from "@/assets/wine-cellar-logo.png";
import { QrCode, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ScanPrompt = () => {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [mode, setMode] = useState<"choice" | "scan" | "code">("choice");
  const [scanning, setScanning] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // Start camera scanner
  useEffect(() => {
    if (mode !== "scan") return;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        setScanning(true);

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            // Stop scanning as soon as we get a result
            await scanner.stop();
            setScanning(false);
            handleScannedUrl(decodedText);
          },
          () => {} // ignore per-frame errors
        );
      } catch (err) {
        setScanning(false);
        setCameraError(
          "Camera access was denied or is unavailable. Please use the Tasting Code instead."
        );
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [mode]);

  const handleScannedUrl = (url: string) => {
    try {
      // Extract session ID from the scanned URL
      const parsed = new URL(url);
      const sessionId = parsed.searchParams.get("session");
      if (sessionId) {
        navigate(`/taster?session=${sessionId}`);
      } else {
        toast.error("Invalid QR code. Please try the Tasting Code instead.");
        setMode("code");
      }
    } catch {
      toast.error("Could not read QR code. Please try the Tasting Code instead.");
      setMode("code");
    }
  };

  const handleCodeSubmit = async () => {
    if (!codeInput.trim()) {
      toast.error("Please enter your Tasting Code.");
      return;
    }
    setLooking(true);
    try {
      const session = await getSessionByCode(codeInput.trim());
      if (!session) {
        toast.error("No session found with that code. Please check and try again.");
        return;
      }
      if (session.status === "ended") {
        toast.error("This tasting session has ended.");
        return;
      }
      navigate(`/taster?session=${session.id}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLooking(false);
    }
  };

  // ── CHOICE SCREEN ────────────────────────────────────────────────────────────
  if (mode === "choice") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full"
        >
          <button onClick={() => navigate("/")}>
            <img src={logo} alt="Wine Cellar" className="h-14 mx-auto mb-10" />
          </button>

          <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
            Join the Tasting
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-8">
            Scan the QR code provided by your host, or enter the Tasting Code manually.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setMode("scan")}
              className="w-full bg-card border-2 border-border hover:border-gold rounded-xl p-6 text-left transition-all hover:shadow-md group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0 group-hover:bg-gold/20 transition-colors">
                  <QrCode className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Scan QR Code</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use your camera to scan the code
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode("code")}
              className="w-full bg-card border-2 border-border hover:border-gold rounded-xl p-6 text-left transition-all hover:shadow-md group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Enter Tasting Code</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Type the code displayed by your host
                  </p>
                </div>
              </div>
            </button>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full text-center text-xs text-muted-foreground mt-8 hover:text-foreground transition-colors"
          >
            ← Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  // ── SCAN SCREEN ──────────────────────────────────────────────────────────────
  if (mode === "scan") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-sm w-full"
        >
          <button onClick={() => navigate("/")}>
            <img src={logo} alt="Wine Cellar" className="h-12 mx-auto mb-6" />
          </button>

          <h1 className="text-xl font-bold text-foreground mb-2 text-center">
            Scan QR Code
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-6">
            Point your camera at the QR code provided by your host
          </p>

          {cameraError ? (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4 text-center">
              <p className="text-sm text-destructive">{cameraError}</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden mb-4 bg-muted">
              <div id="qr-reader" className="w-full" />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-gold rounded-lg opacity-60" />
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => setMode("code")}
              className="w-full border-gold text-gold hover:bg-gold/10"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Enter Tasting Code instead
            </Button>
            <button
              onClick={() => setMode("choice")}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── CODE ENTRY SCREEN ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full"
      >
        <button onClick={() => navigate("/")}>
          <img src={logo} alt="Wine Cellar" className="h-12 mx-auto mb-6" />
        </button>

        <h1 className="text-xl font-bold text-foreground mb-2 text-center">
          Enter Tasting Code
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-6">
          Enter the code displayed by your host
        </p>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
          <Input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            placeholder="e.g. BX7K2M"
            className="text-center text-2xl font-bold tracking-widest h-14"
            maxLength={6}
            onKeyDown={e => e.key === "Enter" && handleCodeSubmit()}
            autoFocus
          />
          <Button
            onClick={handleCodeSubmit}
            disabled={looking || codeInput.length < 6}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 text-base py-5"
          >
            {looking ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Looking up session...</>
            ) : (
              "Continue"
            )}
          </Button>
        </div>

        <button
          onClick={() => setMode(cameraError ? "choice" : "scan")}
          className="w-full text-center text-xs text-muted-foreground mt-6 hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      </motion.div>
    </div>
  );
};

export default ScanPrompt;
