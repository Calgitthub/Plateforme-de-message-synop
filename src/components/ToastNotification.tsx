import * as React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import { Clock, X, Bell, Activity } from "lucide-react";
import { useAuth } from "../AuthContext";

interface LateStation {
  key: string;
  dmzId: number;
  dmzName: string;
  hour: string;
  date: string;
  timestamp: number;
  message: string;
}

export default function ToastNotification() {
  const { user, token } = useAuth();
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [lateStations, setLateStations] = useState<LateStation[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  const checkLateTransmissions = async () => {
    if (!user || !token || user.role === "MEMBER" || user.role === "member") return;
    try {
      const response = await axios.get("/api/monitoring/late-stations", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const data: LateStation[] = response.data.data;
        setLateStations(data);
        setActiveAlertsCount(data.length);
      }
    } catch (error) {
      console.warn("Failed to check late transmissions, retrying...", error);
    }
  };

  // Poll every 15 seconds
  useEffect(() => {
    if (user && token && user.role !== "MEMBER" && user.role !== "member") {
      checkLateTransmissions();
      const interval = setInterval(checkLateTransmissions, 15000);
      return () => clearInterval(interval);
    }
  }, [user, token]);

  if (!user || user.role === "MEMBER" || user.role === "member") return null;

  return (
    <>
      {/* Bell Icon Trigger */}
      <div className="relative">
        <motion.button
          onClick={() => setShowHistoryPanel(!showHistoryPanel)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative p-2.5 rounded-2xl border transition-all cursor-pointer bg-white text-slate-700 shadow-xs hover:bg-slate-50 ${
            activeAlertsCount > 0
              ? "border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-50"
              : "border-slate-200 hover:border-slate-300"
          }`}
          title="Notifications"
        >
          <Bell size={20} className={activeAlertsCount > 0 ? "animate-pulse text-rose-600" : "text-slate-500"} />
          
          {/* Badge top right of the bell */}
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white animate-fade-in shadow-sm">
              {activeAlertsCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* History and Status Dashboard Panel Drawer (Tableau de Notifications) */}
      <AnimatePresence>
        {showHistoryPanel && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryPanel(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs pointer-events-auto cursor-pointer"
            />
            
            {/* Slide-over Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col pointer-events-auto overflow-hidden text-slate-700"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600">
                    <Bell size={20} className="text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-none">Notifications</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Tableau d'alertes des DMZs</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryPanel(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Alerts List */}
              <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-1">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest leading-none">État de conformité DMZ</span>
                    <span className="text-sm font-extrabold text-slate-900 mt-1">
                      {activeAlertsCount > 0 ? "⚠️ ANOMALIES DÉTECTÉES" : "✅ CONFORME"}
                    </span>
                  </div>
                  <div className={`px-2.5 py-1.5 border rounded-xl text-xs font-black ${
                    activeAlertsCount > 0 
                      ? "bg-rose-50 border-rose-100 text-rose-700" 
                      : "bg-emerald-50 border-emerald-100 text-emerald-700"
                  }`}>
                    {activeAlertsCount} retard(s)
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                    Retards de Transmission récents
                  </h4>

                  {lateStations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-100 rounded-3xl text-center">
                      <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3">
                        <Activity size={20} className="text-emerald-500" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-900">Toutes les stations sont à jour</p>
                      <p className="text-xs text-slate-400 mt-1">Aucun retard de transmission détecté au cours des 12 dernières heures.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lateStations.map((item) => (
                        <div
                          key={item.key}
                          className="p-4 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-2xl transition-all space-y-2 group"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="px-2 py-0.5 bg-rose-100/60 font-black text-[9px] text-rose-700 rounded-md tracking-wider uppercase">
                              DMZ: {item.dmzName}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              Créneau de {item.hour}00
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-normal font-semibold">
                            {item.message}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-extrabold uppercase tracking-wide">
                            <Clock size={12} />
                            <span>Contrôle de transmission échu (H+15m)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Vérification temps réel</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Services actifs
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
