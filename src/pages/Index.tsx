import { Header } from "@/components/Header";
import { 
  Search, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Share2, 
  LayoutDashboard 
} from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const tools = [
    {
      title: "1. Keyword Research",
      desc: "Riset kompetitor, targeted keyword, dan Google Trends dalam satu dashboard.",
      icon: <Search className="w-8 h-8 text-blue-600" />,
      path: "/research",
      color: "bg-blue-50"
    },
    {
      title: "2. Content Strategy",
      desc: "Buat kalender konten 1 bulan otomatis berdasarkan hasil riset AI.",
      icon: <Calendar className="w-8 h-8 text-purple-600" />,
      path: "/content-calendar",
      color: "bg-purple-50"
    },
    {
      title: "3. AI Production",
      desc: "Generate artikel SEO-friendly berkualitas tinggi hanya dengan satu klik.",
      icon: <FileText className="w-8 h-8 text-orange-600" />,
      path: "/create-article",
      color: "bg-orange-50"
    },
    {
      title: "4. SEO On-Page Audit",
      desc: "Audit artikelmu secara otomatis dan dapatkan skor optimasi serta saran perbaikan.",
      icon: <ShieldCheck className="w-8 h-8 text-green-600" />,
      path: "/audit",
      color: "bg-green-50"
    },
    {
      title: "5. Distribution & Sync",
      desc: "Otomatisasi publikasi ke WordPress atau kirim via Webhooks sesuai jadwal.",
      icon: <Share2 className="w-8 h-8 text-pink-600" />,
      path: "/distribution",
      color: "bg-pink-50"
    },
    {
      title: "6. Daily Digest Tool",
      desc: "Fitur klasik untuk membuat ringkasan harian dari berbagai sumber berita.",
      icon: <LayoutDashboard className="w-8 h-8 text-gray-600" />,
      path: "/daily-digest",
      color: "bg-gray-50"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            ✨ SEO Content Marketing OS
          </span>
          <h1 className="text-5xl font-bold text-slate-900 mt-6 mb-4 font-serif">
            Executive Content Engine
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Satu platform terintegrasi untuk mengelola seluruh alur kerja SEO Anda, 
            dari riset hingga distribusi otomatis.
          </p>
        </div>

        {/* Pipeline Visualizer */}
        <div className="hidden lg:flex justify-between items-center mb-12 px-10">
           {tools.slice(0, 5).map((_, i) => (
             <div key={i} className="flex items-center flex-1">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                {i < 4 && <div className="h-0.5 bg-blue-200 flex-1 mx-2"></div>}
             </div>
           ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tools.map((tool, index) => (
            <Link 
              key={index} 
              to={tool.path}
              className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`${tool.color} w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                {tool.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{tool.title}</h3>
              <p className="text-slate-500 leading-relaxed mb-6">
                {tool.desc}
              </p>
              <div className="flex items-center text-blue-600 font-semibold text-sm">
                Buka Tool 
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="py-12 mt-20 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm italic">
          © 2026 Execu-Cue • Built for High-Performance SEO
        </p>
      </footer>
    </div>
  );
};

export default Index;