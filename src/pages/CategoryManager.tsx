import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function CategoryManager() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // State untuk form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Ambil data dari Supabase
  const fetchCategories = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('article_categories').select('*').order('created_at', { ascending: true });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCategories(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Simpan kategori baru
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;
    setIsSaving(true);

    const value = name.toLowerCase().replace(/[^a-z0-9]/g, '-'); // Buat ID unik (slug)

    const { error } = await supabase.from('article_categories').insert([
      { name, value, description }
    ]);

    setIsSaving(false);

    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil!", description: "Kategori baru ditambahkan." });
      setName("");
      setDescription("");
      fetchCategories(); // Refresh tabel
    }
  };

  // Hapus kategori
  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kategori ini?")) return;
    
    const { error } = await supabase.from('article_categories').delete().eq('id', id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dihapus", description: "Kategori berhasil dihapus." });
      fetchCategories();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Manajemen Kategori & Prompt AI</h1>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form Tambah Kategori */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Tambah Kategori Baru</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Kategori</Label>
                  <Input 
                    placeholder="Contoh: Psikolog, Tech Bro..." 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instruksi / Prompt AI</Label>
                  <Textarea 
                    placeholder="Contoh: Tulis artikel dengan gaya bahasa analitis, gunakan istilah psikologi..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[150px]"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Ini adalah instruksi rahasia yang akan dibaca oleh AI saat menulis artikel.</p>
                </div>
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Simpan Kategori
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Daftar Kategori */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daftar Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
              ) : (
                <div className="space-y-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="p-4 border rounded-lg flex justify-between items-start gap-4 hover:bg-muted/50">
                      <div>
                        <h3 className="font-bold text-lg">{cat.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{cat.description}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(cat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}