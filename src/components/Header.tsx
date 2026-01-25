import { Newspaper, PenSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const location = useLocation();
  const isCreateArticle = location.pathname === "/create-article";

  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50" role="banner">
      <nav className="container mx-auto px-4 py-4" aria-label="Main navigation">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            aria-label="AI Daily Digest - Return to homepage"
          >
            <div className="w-10 h-10 rounded-lg gradient-editorial flex items-center justify-center" aria-hidden="true">
              <Newspaper className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display text-xl font-bold text-foreground tracking-tight block">
                AI Daily Digest
              </span>
              <span className="text-xs text-muted-foreground">
                Executive Intelligence Tool
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {!isCreateArticle && (
              <Link to="/create-article">
                <Button variant="outline" size="sm" className="gap-2">
                  <PenSquare className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Create Article</span>
                </Button>
              </Link>
            )}
            <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground" aria-hidden="true">
              <span>Powered by AI</span>
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
