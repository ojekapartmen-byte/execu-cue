import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useSEO, SEO_CONFIG } from "@/hooks/useSEO";

const NotFound = () => {
  const location = useLocation();

  // SEO Configuration - noindex for 404 pages
  useSEO(SEO_CONFIG.notFound);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted" role="main">
      <article className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404 - Page Not Found</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Oops! The page you're looking for doesn't exist.
        </p>
        <a 
          href="/" 
          className="text-primary underline hover:text-primary/90"
          aria-label="Return to homepage"
        >
          Return to Home
        </a>
      </article>
    </main>
  );
};

export default NotFound;
