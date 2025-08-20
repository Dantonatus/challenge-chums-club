import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import GroupsPage from "./pages/app/Groups";
import ChallengesPage from "./pages/app/Challenges";
import IdeasPage from "./pages/app/Ideas";
import LedgerPage from "./pages/app/Ledger";
import JournalPage from "./pages/app/Journal";
import Features from "./pages/Features";
import ChallengesList from "./pages/ChallengesList";
import ChallengeDetail from "./pages/ChallengeDetail";
import ProfilePage from "./pages/app/Profile";
import SummaryPage from "./pages/app/Summary";
import { DateRangeProvider } from "@/contexts/DateRangeContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <DateRangeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/features" element={<Features />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/challenges" replace />} />
                <Route path="challenges" element={<ChallengesPage />} />
                <Route path="groups" element={<GroupsPage />} />
                <Route path="ideas" element={<IdeasPage />} />
                <Route path="ledger" element={<LedgerPage />} />
                <Route path="journal" element={<JournalPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="summary" element={<SummaryPage />} />
              </Route>
              {/* Top-level protected routes */}
              <Route path="/challenges" element={<ProtectedRoute><ChallengesList /></ProtectedRoute>} />
              <Route path="/challenges/:id" element={<ProtectedRoute><ChallengeDetail /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </DateRangeProvider>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;

