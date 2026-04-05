import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index"; // Ini Dashboard Utama
import CreateArticle from "./pages/CreateArticle";
import ArticleHistory from "./pages/ArticleHistory";
import NotFound from "./pages/NotFound";
import SeoAudit from "./pages/SeoAudit";
import KeywordResearch from "./pages/KeywordResearch";
import ContentCalendar from "./pages/ContentCalendar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Dashboard Utama SEO OS */}
          <Route path="/" element={<Index />} /> 
          
          {/* Menu-menu SEO OS */}
          <Route path="/research" element={<KeywordResearch />} />
          <Route path="/content-calendar" element={<ContentCalendar />} />
          <Route path="/create-article" element={<CreateArticle />} />
          <Route path="/audit" element={<SeoAudit />} />
          
          {/* Fitur Tambahan */}
          <Route path="/daily-digest" element={<LandingPage />} />
          <Route path="/article-history" element={<ArticleHistory />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;