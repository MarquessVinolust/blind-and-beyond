import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createSession } from "@/lib/tasting-store";
import { Wine, TastingType, OriginFormat } from "@/types/tasting";
import logo from "@/assets/BB-Logo.jpg";
import { Upload, Plus, Trash2, PlayCircle, Download, Globe, Eye, EyeOff } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type WineEntry = Omit<Wine, "id" | "flight">;

const HostSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"type" | "config">("type");
  const [tastingType, setTastingType] = useState<TastingType>("blind");
  const [originFormat, setOriginFormat] = useState<OriginFormat>("local_only");
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [hostEmail, setHostEmail] = useState("");
  const [wines, setWines] = useState<WineEntry[]>([]);
  const [flights, setFlights] = useState(1);
  const [winesPerFlight, setWinesPerFlight] = useState(4);
  const [manualEntry, setManualEntry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBlindInternational = tastingType === "blind" && originFormat === "international_mix";

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        const parsed: WineEntry[] = json.map((row) => {
          const get = (keys: string[]) => {
            for (const k of keys) {
              const match = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase());
              if (match && row[match]) return String(row[match]);
            }
            return "";
          };
          const intlVal = get(["International", "international", "Intl", "intl"]);
          return {
            name: get(["Name", "name", "Wine", "wine"]),
            vintage: get(["Vintage", "vintage", "Year", "year"]),
            region: get(["Region", "region"]),
            country: get(["Country", "country"]),
            price: get(["Price", "price"]),
            isInternational: isBlindInternational && intlVal
              ? ["yes", "true", "1", "y", "x"].includes(intlVal.toLowerCase().trim())
              : false,
          };
        }).filter(w => w.name);

        if (parsed.length === 0) {
          toast.error("No wines found. Please ensure columns: Name, Vintage, Region, Country, Price");
          return;
        }

        setWines(parsed);
        const autoFlights = Math.ceil(parsed.length / winesPerFlight);
        setFlights(autoFlights);
        toast.success(`Loaded ${parsed.length} wines from spreadsheet`);
      } catch {
        toast.error("Failed to read file. Please use .xlsx or .csv format.");
      }
    };
    reader.readAsBinaryString(file);
  }, [winesPerFlight, isBlindInternational]);

  const downloadTemplate = () => {
    const headers = ["Name", "Vintage", "Region", "Country", "Price"];
    const example1 = ["Example Cabernet Sauvignon", "2019", "Stellenbosch", "South Africa", "R250"];
    const example2 = ["Example Bordeaux Blend", "2018", "Bordeaux", "France", "R450"];

    if (isBlindInternational) {
      headers.push("International");
      example1.push("No");
      example2.push("Yes");
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, example1, example2]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Wines");
    XLSX.writeFile(wb, "wine-tasting-template.xlsx");
  };

  const addManualWine = () => {
    setWines([...wines, { name: "", vintage: "", region: "", country: "", price: "", isInternational: false }]);
  };

  const updateWine = (index: number, field: string, value: any) => {
    const updated = [...wines];
    updated[index] = { ...updated[index], [field]: value };
    setWines(updated);
  };

  const removeWine = (index: number) => {
    setWines(wines.filter((_, i) => i !== index));
  };

  const startTasting = async () => {
    if (!sessionName.trim()) {
      toast.error("Please enter a session name.");
      return;
    }
    if (!sessionDate) {
      toast.error("Please select a date for the tasting.");
      return;
    }
    if (!hostEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hostEmail)) {
      toast.error("Please enter a valid host email address.");
      return;
    }
    if (wines.length === 0 || wines.some(w => !w.name)) {
      toast.error("Please add at least one wine with a name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const assignedWines: Wine[] = wines.map((w, i) => ({
        ...w,
        id: crypto.randomUUID(),
        flight: Math.floor(i / winesPerFlight) + 1,
      }));

      const totalFlights = Math.max(flights, Math.ceil(wines.length / winesPerFlight));

      const session = await createSession(
        sessionName.trim(),
        sessionDate,
        hostEmail.trim(),
        assignedWines,
        totalFlights,
        winesPerFlight,
        tastingType,
        originFormat
      );

      toast.success("Tasting session created!");
      navigate(`/host/${session.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const recalcFlights = (wpf: number) => {
    setWinesPerFlight(wpf);
    if (wines.length > 0) {
      setFlights(Math.ceil(wines.length / wpf));
    }
  };

  if (step === "type") {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto"
        >
          <div className="flex flex-col items-center mb-10">
            <button onClick={() => navigate("/")} className="mb-6">
              <img src={logo} alt="Brice & Burnett" className="h-10" />
            </button>
            <h1 className="text-3xl font-bold text-foreground">Set Up Your Tasting</h1>
            <p className="text-muted-foreground text-center mt-1">Choose how your guests will experience the wines</p>
          </div>

          <div className="space-y-4 mb-8">
            <button
              onClick={() => setTastingType("blind")}
              className={`w-full text-left bg-card border-2 rounded-lg p-6 shadow-sm transition-all hover:shadow-md ${
                tastingType === "blind" ? "border-primary ring-2 ring-primary/20" : "border-border"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <EyeOff className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Blind Tasting</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wine identities are hidden. Guests rank wines and reveal them after each flight.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setTastingType("open")}
              className={`w-full text-left bg-card border-2 rounded-lg p-6 shadow-sm transition-all hover:shadow-md ${
                tastingType === "open" ? "border-primary ring-2 ring-primary/20" : "border-border"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                  <Eye className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Open Tasting</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wine details are visible throughout. Guests simply rank their favourites per flight.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <AnimatePresence>
            {tastingType === "blind" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-8"
              >
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-1">Wine Origin Format</h3>
                  <p className="text-sm text-muted-foreground mb-4">Will guests guess which wines are international?</p>
                  <div className="space-y-3">
                    <button
                      onClick={() => setOriginFormat("international_mix")}
                      className={`w-full text-left border rounded-lg p-4 transition-all ${
                        originFormat === "international_mix" ? "border-gold bg-gold/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className={`h-5 w-5 ${originFormat === "international_mix" ? "text-gold" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium text-foreground">International & Local Mix</p>
                          <p className="text-xs text-muted-foreground">Guests guess which wines are international after ranking</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setOriginFormat("local_only")}
                      className={`w-full text-left border rounded-lg p-4 transition-all ${
                        originFormat === "local_only" ? "border-gold bg-gold/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          originFormat === "local_only" ? "border-gold" : "border-muted-foreground"
                        }`}>
                          <div className={`h-2 w-2 rounded-full ${originFormat === "local_only" ? "bg-gold" : ""}`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">All Local</p>
                          <p className="text-xs text-muted-foreground">No international guessing — just blind ranking</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={() => setStep("config")}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 text-lg py-6"
          >
            Continue to Wine Setup
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="flex flex-col items-center mb-8">
          <button onClick={() => navigate("/")} className="mb-4">
            <img src={logo} alt="Brice & Burnett" className="h-10" />
          </button>
          <h1 className="text-3xl font-bold text-foreground">Host Setup</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
              tastingType === "blind" ? "bg-primary/10 text-primary" : "bg-gold/20 text-gold"
            }`}>
              {tastingType === "blind" ? "Blind Tasting" : "Open Tasting"}
            </span>
            {tastingType === "blind" && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gold/20 text-gold">
                {originFormat === "international_mix" ? "International Mix" : "Local Only"}
              </span>
            )}
            <button onClick={() => setStep("type")} className="text-xs text-muted-foreground underline ml-1">Change</button>
          </div>
        </div>

        {/* Session Details */}
        <div className="bg-card rounded-lg p-6 shadow-md border border-border mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Details</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionName">Session Name</Label>
              <Input
                id="sessionName"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. The Njoroge Family Tasting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionDate">Date of Tasting</Label>
              <Input
                id="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hostEmail">Host Email Address</Label>
              <Input
                id="hostEmail"
                type="email"
                value={hostEmail}
                onChange={(e) => setHostEmail(e.target.value)}
                placeholder="orders@yourwinehouse.com"
              />
              <p className="text-xs text-muted-foreground">Orders from tasters will be sent to this address</p>
            </div>
          </div>
        </div>

        {/* Wine List */}
        <div className="bg-card rounded-lg p-6 shadow-md border border-border mb-6">
          <h2 className="text-xl font-semibold mb-2">Wine List</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a spreadsheet or add manually.
            {isBlindInternational && (
              <span className="text-gold"> Mark which wines are international — guests will try to guess!</span>
            )}
          </p>

          <div className="flex gap-3 mb-4">
            <label className="flex-1 cursor-pointer">
              <div className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-4 hover:border-gold transition-colors">
                <Upload className="h-5 w-5 text-gold" />
                <span className="text-sm text-muted-foreground">Upload Spreadsheet</span>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="border-gold text-gold hover:bg-gold/10"
            >
              <Download className="h-4 w-4 mr-1" /> Template
            </Button>
            <Button
              variant="outline"
              onClick={() => { setManualEntry(true); if (wines.length === 0) addManualWine(); }}
              className="border-gold text-gold hover:bg-gold/10"
            >
              <Plus className="h-4 w-4 mr-1" /> Manual
            </Button>
          </div>

          {wines.length > 0 && (
            <div className="space-y-3 mt-4">
              {wines.map((wine, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2 items-start"
                >
                  <span className="text-xs text-muted-foreground mt-3 w-6 shrink-0">
                    F{Math.floor(i / winesPerFlight) + 1}
                  </span>
                  {manualEntry ? (
                    <>
                      <Input placeholder="Wine name" value={wine.name} onChange={(e) => updateWine(i, "name", e.target.value)} className="flex-1" />
                      <Input placeholder="Vintage" value={wine.vintage} onChange={(e) => updateWine(i, "vintage", e.target.value)} className="w-20" />
                      <Input placeholder="Region" value={wine.region} onChange={(e) => updateWine(i, "region", e.target.value)} className="w-28" />
                      <Input placeholder="Country" value={wine.country} onChange={(e) => updateWine(i, "country", e.target.value)} className="w-28" />
                      <Input placeholder="Price" value={wine.price} onChange={(e) => updateWine(i, "price", e.target.value)} className="w-20" />
                      {isBlindInternational && (
                        <div className="flex items-center gap-1 shrink-0 mt-2" title="International wine?">
                          <Checkbox
                            checked={wine.isInternational || false}
                            onCheckedChange={(checked) => updateWine(i, "isInternational", !!checked)}
                          />
                          <Globe className="h-3.5 w-3.5 text-gold" />
                        </div>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => removeWine(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex-1 bg-muted rounded-md px-3 py-2 flex justify-between items-center text-sm gap-2">
                      <span className="font-medium truncate">{wine.name}</span>
                      <span className="text-muted-foreground shrink-0">{wine.vintage}</span>
                      <span className="text-gold shrink-0">{wine.region}</span>
                      <span className="text-muted-foreground shrink-0">{wine.country}</span>
                      <span className="text-muted-foreground shrink-0">{wine.price}</span>
                      {isBlindInternational && wine.isInternational && (
                        <Globe className="h-3.5 w-3.5 text-gold shrink-0" />
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              {manualEntry && (
                <Button variant="ghost" onClick={addManualWine} className="w-full text-gold">
                  <Plus className="h-4 w-4 mr-1" /> Add Another Wine
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Flight Configuration */}
        <div className="bg-card rounded-lg p-6 shadow-md border border-border mb-6">
          <h2 className="text-xl font-semibold mb-4">Flight Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Wines Per Flight</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={winesPerFlight}
                onChange={(e) => recalcFlights(parseInt(e.target.value) || 4)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Flights</Label>
              <Input
                type="number"
                min={1}
                value={flights}
                onChange={(e) => setFlights(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {wines.length} wines across {flights} flight{flights > 1 ? "s" : ""} ({winesPerFlight} per flight)
            {isBlindInternational && wines.filter(w => w.isInternational).length > 0 && (
              <span className="text-gold ml-1">
                · {wines.filter(w => w.isInternational).length} international
              </span>
            )}
          </p>
        </div>

        <Button
          onClick={startTasting}
          disabled={wines.length === 0 || isSubmitting}
          className="w-full bg-primary text-primary-foreground hover:opacity-90 text-lg py-6"
        >
          <PlayCircle className="mr-2 h-5 w-5" />
          {isSubmitting ? "Creating Session..." : `Save ${tastingType === "blind" ? "Blind" : "Open"} Tasting`}
        </Button>
      </motion.div>
    </div>
  );
};

export default HostSetup;
