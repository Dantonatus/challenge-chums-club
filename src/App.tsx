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
// Task Planner - Zen Redesign
import TasksLayoutZen from "./pages/app/tasks/TasksLayoutZen";
import TasksInbox from "./pages/app/tasks/Inbox";
import TodayZen from "./pages/app/tasks/TodayZen";
import TasksUpcoming from "./pages/app/tasks/Upcoming";
import AllTasksZen from "./pages/app/tasks/AllTasksZen";
import TasksProjects from "./pages/app/tasks/Projects";
import ProjectDetail from "./pages/app/tasks/ProjectDetail";
import TasksArchive from "./pages/app/tasks/Archive";
// Recipes
import RecipesLayout from "./pages/app/recipes/RecipesLayout";
import RecipesLibrary from "./pages/app/recipes/Library";
import RecipesCreate from "./pages/app/recipes/Create";
import RecipesReview from "./pages/app/recipes/Review";
import RecipeDetail from "./pages/app/recipes/Detail";
import RecipesFavorites from "./pages/app/recipes/Favorites";
import RecipesShoppingList from "./pages/app/recipes/ShoppingList";

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
              <Route path="tasks" element={<TasksLayoutZen />}>
                <Route index element={<Navigate to="/app/tasks/inbox" replace />} />
                <Route path="inbox" element={<TasksInbox />} />
                <Route path="today" element={<TodayZen />} />
                <Route path="upcoming" element={<TasksUpcoming />} />
                <Route path="all" element={<AllTasksZen />} />
                <Route path="projects" element={<TasksProjects />} />
                <Route path="projects/:projectId" element={<ProjectDetail />} />
                <Route path="archive" element={<TasksArchive />} />
              </Route>
              {/* Recipes */}
              <Route path="recipes" element={<RecipesLayout />}>
                <Route index element={<Navigate to="/app/recipes/library" replace />} />
                <Route path="library" element={<RecipesLibrary />} />
                <Route path="create" element={<RecipesCreate />} />
                <Route path="review" element={<RecipesReview />} />
                <Route path="favorites" element={<RecipesFavorites />} />
                <Route path="shopping" element={<RecipesShoppingList />} />
              </Route>
              <Route path="recipes/:recipeId" element={<RecipeDetail />} />
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

