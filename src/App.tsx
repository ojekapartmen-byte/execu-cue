import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
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
          <Route path="/" element={<LandingPage />} />
          <Route path="/daily-digest" element={<Index />} />
          <Route path="/create-article" element={<CreateArticle />} />
          <Route path="/article-history" element={<ArticleHistory />} />
          <Route path="/seo-audit" element={<SeoAudit />} />
          <Route path="/keyword-research" element={<KeywordResearch />} />
          <Route path="/content-calendar" element={<ContentCalendar />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
