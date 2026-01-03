import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import PasswordReset from "./pages/PasswordReset";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import GroupsPage from "./pages/app/Groups";
import ChallengesPage from "./pages/app/Challenges";
import FeaturesRedirect from "./pages/FeaturesRedirect";
import ChallengesList from "./pages/ChallengesList";
import ChallengeDetail from "./pages/ChallengeDetail";
import ProfilePage from "./pages/app/Profile";
import SummaryPage from "./pages/app/Summary";
import ApprovalPage from "./pages/app/Approval";
import EntryPage from "./pages/app/Entry";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
// Task Planner
import TasksLayout from "./pages/app/tasks/TasksLayout";
import TasksInbox from "./pages/app/tasks/Inbox";
import TasksToday from "./pages/app/tasks/Today";
import TasksUpcoming from "./pages/app/tasks/Upcoming";
import TasksProjects from "./pages/app/tasks/Projects";
import ProjectDetail from "./pages/app/tasks/ProjectDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset" element={<PasswordReset />} />
            <Route path="/features" element={<FeaturesRedirect />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <DateRangeProvider userId={null}>
                    <AppLayout />
                  </DateRangeProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/app/summary" replace />} />
              <Route path="challenges" element={<ChallengesPage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="approval" element={<ApprovalPage />} />
              <Route path="summary" element={<SummaryPage />} />
              <Route path="entry" element={<EntryPage />} />
              {/* Task Planner */}
              <Route path="tasks" element={<TasksLayout />}>
                <Route index element={<Navigate to="/app/tasks/inbox" replace />} />
                <Route path="inbox" element={<TasksInbox />} />
                <Route path="today" element={<TasksToday />} />
                <Route path="upcoming" element={<TasksUpcoming />} />
                <Route path="projects" element={<TasksProjects />} />
                <Route path="projects/:projectId" element={<ProjectDetail />} />
              </Route>
            </Route>
            {/* Top-level protected routes */}
            <Route path="/challenges" element={
              <ProtectedRoute>
                <DateRangeProvider userId={null}>
                  <ChallengesList />
                </DateRangeProvider>
              </ProtectedRoute>
            } />
            <Route path="/challenges/:id" element={
              <ProtectedRoute>
                <DateRangeProvider userId={null}>
                  <ChallengeDetail />
                </DateRangeProvider>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;

