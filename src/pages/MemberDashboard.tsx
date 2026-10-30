import * as React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { History, Plus, Edit2, AlertCircle, CheckCircle2, ChevronRight, Clock, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../AuthContext";

interface Saisie {
  id: number;
  content: string;
  createdAt: string;
}

export default function MemberDashboard() {
  const [saisies, setSaisies] = useState<Saisie[]>([]);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchSaisies();
  }, []);

  const fetchSaisies = async () => {
    try {
      const response = await axios.get("/api/saisies/me");
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setSaisies(response.data.data);
      } else {
        setSaisies([]);
        console.error("Format de données invalide:", response.data);
      }
    } catch (err) {
      console.error(err);
      setSaisies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    try {
      await axios.post("/api/saisies", { content: newContent.trim() });
      setNewContent("");
      setShowModal(false);
      await fetchSaisies();
      alert("Saisie enregistrée avec succès");
    } catch (err: any) {
      if (err.response?.status !== 403) {
        alert("Erreur lors de la création. Veuillez vérifier votre connexion.");
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editContent.trim()) return;
    try {
      await axios.put(`/api/saisies/${editingId}`, { content: editContent.trim() });
      setEditingId(null);
      await fetchSaisies();
      alert("Saisie mise à jour avec succès");
    } catch (err: any) {
      if (err.response?.status !== 403) {
        alert("Erreur lors de la modification");
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mes Saisies DMZ</h2>
          <p className="text-slate-500 font-medium">Gérez vos rapports pour la station <span className="text-emerald-600">{user?.dmz}</span></p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <Plus size={20} />
          Nouvelle Saisie
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
            <History size={20} />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">TOTAL SAISIES</p>
          <p className="text-3xl font-black text-slate-900">{(Array.isArray(saisies) ? saisies.length : 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <Clock size={20} />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">DERNIÈRE SAISIE</p>
          <p className="text-lg font-bold text-slate-900">
            {(Array.isArray(saisies) && saisies.length > 0) ? new Date(saisies[0].createdAt).toLocaleDateString() : "Aucune"}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4">
            <MapPin size={20} />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">STATION ACTIVE</p>
          <p className="text-lg font-bold text-slate-900 truncate">{user?.dmz}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <History size={18} className="text-emerald-600" />
            Historique personnel
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Heure</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contenu</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Chargement de vos saisies...
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {Array.isArray(saisies) && saisies.map((s) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}</span>
                          <span className="text-xs text-slate-500">{s.createdAt ? new Date(s.createdAt).toLocaleTimeString() : ""}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-fit min-w-[600px] group/entry">
                          <div className="space-y-1">
                            <p className="font-mono text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                              SYNOP Message
                            </p>
                            <div className="font-mono text-sm text-emerald-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-100 shadow-inner">
                              <div className="flex flex-col gap-2">
                                <div className="border-b border-slate-50 pb-2">
                                  <span className="text-slate-400 mr-2 font-sans font-bold text-[10px]">LIGNE 1 :</span>
                                  <span className="tracking-wider whitespace-nowrap">{s.content?.split(' ').slice(0, 10).join(' ') || ""}</span>
                                </div>
                                {(s.content?.split(' ').length || 0) > 10 && (
                                  <div className="pt-1">
                                    <span className="text-slate-400 mr-2 font-sans font-bold text-[10px]">LIGNE 2 :</span>
                                    <span className="tracking-wider whitespace-nowrap">{s.content?.split(' ').slice(10).join(' ') || ""}</span>
                                  </div>
                                )}
                                <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                   <span className="flex items-center gap-1"><Clock size={10} /> {s.createdAt ? new Date(s.createdAt).toLocaleTimeString() : ""} le {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}</span>
                                   <span className="flex items-center gap-1"><MapPin size={10} /> Station: {user?.dmz}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setEditingId(s.id);
                            setEditContent(s.content);
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
              {(Array.isArray(saisies) && saisies.length === 0) && !loading && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Aucune saisie enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg p-8 relative z-10 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">Nouvelle Saisie DMZ</h3>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Contenu du rapport</label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium resize-none"
                    placeholder="Entrez les données observées..."
                    required
                  />
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400 px-1">
                    <span>min 3 chars</span>
                    <span>{newContent.length} / 2000</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg p-8 relative z-10 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-6">
                 <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                    <AlertCircle size={20} />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-900">Modifier Saisie</h3>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Un log sera créé</p>
                 </div>
              </div>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nouveau contenu</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium resize-none"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
                  >
                    Mettre à jour
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
