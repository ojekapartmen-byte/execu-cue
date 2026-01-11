import { Newspaper } from "lucide-react";

export const Header = () => {
  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <span>Powered by AI</span>
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </div>
        </div>
      </div>
    </header>
  );
};
