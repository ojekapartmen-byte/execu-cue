import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

export interface Article {
  id: string;
  title: string;
  content: string;
  topic: string;
  source_links: string[];
  source_images: string[];
  toc: Json;
  created_at: string;
  updated_at: string;
}

export const useArticles = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch initial articles
  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast({
        title: "Error",
        description: "Gagal memuat artikel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save new article
  const saveArticle = async (article: {
    title: string;
    content: string;
    topic: string;
    source_links?: string[];
    source_images?: string[];
    toc?: Json;
  }) => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .insert({
          title: article.title,
          content: article.content,
          topic: article.topic,
          source_links: article.source_links || [],
          source_images: article.source_images || [],
          toc: article.toc || [],
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Tersimpan!",
        description: "Artikel berhasil disimpan ke database",
      });

      return data;
    } catch (error) {
      console.error("Error saving article:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan artikel",
        variant: "destructive",
      });
      return null;
    }
  };

  // Delete article
  const deleteArticle = async (id: string) => {
    try {
      const { error } = await supabase.from("articles").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Terhapus!",
        description: "Artikel berhasil dihapus",
      });

      return true;
    } catch (error) {
      console.error("Error deleting article:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus artikel",
        variant: "destructive",
      });
      return false;
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    fetchArticles();

    const channel = supabase
      .channel("articles-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "articles",
        },
        (payload) => {
          console.log("New article inserted:", payload);
          setArticles((prev) => [payload.new as Article, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "articles",
        },
        (payload) => {
          console.log("Article updated:", payload);
          setArticles((prev) =>
            prev.map((article) =>
              article.id === payload.new.id ? (payload.new as Article) : article
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "articles",
        },
        (payload) => {
          console.log("Article deleted:", payload);
          setArticles((prev) =>
            prev.filter((article) => article.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    articles,
    isLoading,
    saveArticle,
    deleteArticle,
    refetch: fetchArticles,
  };
};
