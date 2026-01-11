import { Newspaper, PenSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const location = useLocation();
  const isCreateArticle = location.pathname === "/create-article";

  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-lg gradient-editorial flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                AI Daily Digest
              </h1>
              <p className="text-xs text-muted-foreground">
                Executive Intelligence Tool
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {!isCreateArticle && (
              <Link to="/create-article">
                <Button variant="outline" size="sm" className="gap-2">
                  <PenSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Article</span>
                </Button>
              </Link>
            )}
            <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <span>Powered by AI</span>
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
