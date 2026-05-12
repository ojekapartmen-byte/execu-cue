import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index"; // Ini Dashboard Utama
import CreateArticle from "./pages/CreateArticle";
import ArticleHistory from "./pages/ArticleHistory";
import NotFound from "./pages/NotFound";
import SeoAudit from "./pages/SeoAudit";
import KeywordResearch from "./pages/KeywordResearch";
import ContentCalendar from "./pages/ContentCalendar";
import CategoryManager from "./pages/CategoryManager"; 
import Distribution from "./pages/Distribution"; // Tambahkan Import Distribution
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
         <Routes>
          {/* Public */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><ErrorBoundary><Index /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/research" element={<ProtectedRoute><KeywordResearch /></ProtectedRoute>} />
          <Route path="/content-calendar" element={<ProtectedRoute><ContentCalendar /></ProtectedRoute>} />
          <Route path="/create-article" element={<ProtectedRoute><CreateArticle /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><SeoAudit /></ProtectedRoute>} />
          <Route path="/distribution" element={<ProtectedRoute><Distribution /></ProtectedRoute>} />
          <Route path="/daily-digest" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
          <Route path="/article-history" element={<ProtectedRoute><ArticleHistory /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><CategoryManager /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
         </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;