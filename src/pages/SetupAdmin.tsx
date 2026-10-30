import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Shield, Lock, Mail, HelpCircle, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export default function SetupAdmin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    securityQuestion: "",
    securityAnswer: ""
  });
  const [customQuestion, setCustomQuestion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await axios.get("/api/auth/setup-status");
        if (res.data.isSetup) {
          navigate("/login");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (formData.password !== formData.confirmPassword) {
      return setError("Les mots de passe ne correspondent pas");
    }
    
    if (formData.password.length < 6) {
      return setError("Le mot de passe doit faire au moins 6 caractères");
    }

    setLoading(true);
    try {
      const q = formData.securityQuestion === "custom" ? customQuestion : formData.securityQuestion;
      
      await axios.post("/api/auth/setup-root-admin", {
        email: formData.email,
        password: formData.password,
        securityQuestion: q,
        securityAnswer: formData.securityAnswer
      });
      navigate("/login", { state: { message: "Administrateur configuré avec succès" } });
    } catch (err: any) {
      setError(err.response?.data?.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-blue-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative z-10"
            >
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
                <Shield className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Configuration Initiale</h1>
              <p className="text-emerald-100 mt-1 font-medium">Créez le compte Administrateur Racine</p>
            </motion.div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl flex items-center gap-3"
              >
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Administrateur</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-slate-900"
                    placeholder="admin@synop.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Mot de passe</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" size={18} />
                    <input
                      type="password"
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-slate-900"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirmer</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" size={18} />
                    <input
                      type="password"
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-slate-900"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle size={16} className="text-emerald-600" />
                  <span className="text-sm font-bold text-slate-700">Sécurité de Récupération</span>
                </div>

                <div className="space-y-3">
                   <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Question Secrète</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-slate-900"
                      value={formData.securityQuestion}
                      onChange={(e) => setFormData({ ...formData, securityQuestion: e.target.value })}
                    >
                      <option value="">Sélectionnez une question</option>
                      <option value="Quel est le nom de votre premier animal de compagnie ?">Quel est le nom de votre premier animal de compagnie ?</option>
                      <option value="Quel est le nom de jeune fille de votre mère ?">Quel est le nom de jeune fille de votre mère ?</option>
                      <option value="Quelle est votre ville de naissance ?">Quelle est votre ville de naissance ?</option>
                      <option value="Quel était le nom de votre première école ?">Quel était le nom de votre première école ?</option>
                      <option value="custom">Autre (écrire ma propre question)...</option>
                    </select>
                  </div>
                  
                  {formData.securityQuestion === "custom" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Votre Question Personnalisée</label>
                      <input
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-slate-900"
                        placeholder="Ex: Quel est votre plat préféré ?"
                        onChange={(e) => setCustomQuestion(e.target.value)}
                      />
                    </div>
                  )}

                   <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Réponse Secrète</label>
                    <input
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-slate-900"
                      placeholder="Votre réponse"
                      value={formData.securityAnswer}
                      onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                  <span>Finaliser la Configuration</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 font-medium px-4">
              Ce compte aura tous les privilèges et sera obligatoire pour gérer le système SYNOP.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
