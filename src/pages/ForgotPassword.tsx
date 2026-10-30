import * as React from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Lock, Mail, HelpCircle, CheckCircle2, ChevronLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFetchQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/recovery-question", { email });
      setQuestion(res.data.question);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || "Utilisateur introuvable");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (newPassword !== confirmPassword) {
      return setError("Les mots de passe ne correspondent pas");
    }

    setLoading(true);
    try {
      await axios.post("/api/auth/reset-password", {
        email,
        answer,
        newPassword
      });
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || "Réponse incorrecte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-emerald-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Link to="/login" className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-6 font-bold text-sm">
          <ChevronLeft size={18} />
          <span>Retour à la connexion</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 p-8 text-center text-white relative">
            <h1 className="text-2xl font-bold tracking-tight">Récupération</h1>
            <p className="text-slate-400 mt-1 text-sm font-medium">Réinitialisez votre mot de passe</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleFetchQuestion}
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">votre email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" size={18} />
                      <input
                        type="email"
                        required
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Vérifier l'email <ArrowRight size={18} /></>}
                  </button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleResetPassword}
                  className="space-y-6"
                >
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                       <HelpCircle size={16} className="text-emerald-600" />
                       <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Question de sécurité</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{question}</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">votre réponse</label>
                      <input
                        required
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-slate-900"
                        placeholder="Répondez à la question"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">nouveau pass</label>
                        <input
                          type="password"
                          required
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-slate-900 font-mono"
                          placeholder="••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirmation</label>
                        <input
                          type="password"
                          required
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-slate-900 font-mono"
                          placeholder="••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Réinitialiser le mot de passe <CheckCircle2 size={18} /></>}
                  </button>
                </motion.form>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6 py-4"
                >
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                    <CheckCircle2 size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-900">Succès !</h2>
                    <p className="text-slate-500 text-sm font-medium">Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.</p>
                  </div>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-slate-200"
                  >
                    Aller à la connexion
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
