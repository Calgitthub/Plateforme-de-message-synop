import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { Mail, Lock, ShieldCheck, ChevronRight, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const successMessage = location.state?.message;

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await axios.get("/api/auth/setup-status");
        if (!res.data.isSetup) {
          navigate("/setup");
        }
      } catch (err) {
        console.error("Setup check failed", err);
      }
    };
    checkSetup();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post("/api/auth/login", { email, password });
      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        navigate("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Blobs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          x: [0, 50, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-60"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, -40, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-10 relative z-10 border border-slate-100">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-200">
              <ShieldCheck size={36} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenue</h1>
            <p className="text-slate-500 font-medium font-sans">Plateforme SYNOP de supervision</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {successMessage && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-bold border border-emerald-100 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full" />
                {successMessage}
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex justify-end px-1">
                <Link to="/forgot-password" className="text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading ? "Connexion..." : (
                <>
                  Se connecter
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 flex justify-center">
            <p className="text-xs text-slate-400 font-medium">© 2026 Plateforme SYNOP DMZ</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
