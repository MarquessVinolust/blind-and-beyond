import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import HostSetup from "./pages/HostSetup";
import HostDashboard from "./pages/HostDashboard";
import TastingPage from "./pages/TastingPage";
import SummaryPage from "./pages/SummaryPage";
import OrderPage from "./pages/OrderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/host" element={<HostDashboard />} />
          <Route path="/host/setup" element={<HostSetup />} />
          <Route path="/tasting/:guestId" element={<TastingPage />} />
          <Route path="/summary/:guestId" element={<SummaryPage />} />
          <Route path="/order/:guestId" element={<OrderPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
