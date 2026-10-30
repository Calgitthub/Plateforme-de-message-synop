import * as React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { Users, Database, Filter, Search, UserPlus, Trash2, Eye, Calendar, MapPin, ExternalLink, Shield, Edit2, History, ChevronRight, Clock, Activity, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend 
} from "recharts";

export default function AdminDashboard() {
  return (
    <Routes>
      <Route path="/" element={<AdminHome />} />
      <Route path="/users" element={<AdminUsers />} />
      <Route path="/entries" element={<AdminEntries />} />
      <Route path="/dmz" element={<AdminDMZ />} />
    </Routes>
  );
}

const getLast7DaysData = (saisiesList: any[]) => {
  const days: { [key: string]: { label: string; before15: number; after15: number } } = {};
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;
    days[key] = {
      label: dateStr,
      before15: 0,
      after15: 0
    };
  }

  if (Array.isArray(saisiesList)) {
    saisiesList.forEach(item => {
      if (!item.createdAt) return;
      const itemDate = new Date(item.createdAt);
      const year = itemDate.getFullYear();
      const month = String(itemDate.getMonth() + 1).padStart(2, '0');
      const day = String(itemDate.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      
      if (days[key]) {
        const minutes = itemDate.getMinutes();
        if (minutes <= 15) {
          days[key].before15 += 1;
        } else {
          days[key].after15 += 1;
        }
      }
    });
  }

  return Object.keys(days).sort().map(k => days[k]);
};

const getLast24HoursData = (saisiesList: any[]) => {
  const hours: { [key: string]: { label: string; before15: number; after15: number; timestamp: number } } = {};
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourStr = `${d.getHours()}h`;
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}`;
    hours[key] = {
      label: hourStr,
      before15: 0,
      after15: 0,
      timestamp: d.getTime()
    };
  }

  if (Array.isArray(saisiesList)) {
    saisiesList.forEach(item => {
      if (!item.createdAt) return;
      const itemDate = new Date(item.createdAt);
      const key = `${itemDate.getFullYear()}-${itemDate.getMonth() + 1}-${itemDate.getDate()}-${itemDate.getHours()}`;
      
      if (hours[key]) {
        const minutes = itemDate.getMinutes();
        if (minutes <= 15) {
          hours[key].before15 += 1;
        } else {
          hours[key].after15 += 1;
        }
      }
    });
  }

  return Object.values(hours).sort((a, b) => a.timestamp - b.timestamp);
};

const ConnectionTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/98 text-white p-4 rounded-2xl shadow-xl border border-slate-800 text-xs font-sans space-y-2 backdrop-blur-sm">
        <p className="font-bold text-slate-300 border-b border-slate-850 pb-1.5">{label}</p>
        <p className="flex items-center gap-2 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>À temps (≤ 15 min) : <strong>{payload[0].value}</strong></span>
        </p>
        <p className="flex items-center gap-2 text-amber-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>En retard (&gt; 15 min) : <strong>{payload[1].value}</strong></span>
        </p>
        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between gap-4 font-medium">
          <span>Total : {payload[0].value + payload[1].value} msg</span>
          {payload[0].value + payload[1].value > 0 ? (
            <span className="text-emerald-400 font-bold">
              {Math.round((payload[0].value / (payload[0].value + payload[1].value)) * 100)}% ponctuel
            </span>
          ) : null}
        </div>
      </div>
    );
  }
  return null;
};

function AdminHome() {
  const [stats, setStats] = useState({ users: 0, entries: 0 });
  const [entriesData, setEntriesData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<"7days" | "24hours">("7days");
  const [loadingEntries, setLoadingEntries] = useState(true);
  
  const fetchStats = async () => {
    setLoadingEntries(true);
    try {
      const [users, entries] = await Promise.all([
        axios.get("/api/users"),
        axios.get("/api/saisies")
      ]);
      const usersList = (users.data?.success && Array.isArray(users.data?.data)) ? users.data.data : [];
      const entriesList = (entries.data?.success && Array.isArray(entries.data?.data)) ? entries.data.data : [];
      
      setStats({
        users: usersList.length,
        entries: entriesList.length
      });
      setEntriesData(entriesList);
    } catch (err) { 
      console.error(err);
      setStats({ users: 0, entries: 0 });
      setEntriesData([]);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExport = async () => {
    try {
      const response = await axios.get("/api/backup/export", { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_synop_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err.response?.status !== 403) {
        alert("Erreur lors de l'exportation. Veuillez réessayer.");
      }
    }
  };

  const chartData = timeframe === "7days" 
    ? getLast7DaysData(entriesData) 
    : getLast24HoursData(entriesData);

  let before15InTimeframe = 0;
  let after15InTimeframe = 0;

  chartData.forEach(d => {
    before15InTimeframe += d.before15;
    after15InTimeframe += d.after15;
  });
  
  const totalInTimeframe = before15InTimeframe + after15InTimeframe;
  const before15Pct = totalInTimeframe > 0 ? Math.round((before15InTimeframe / totalInTimeframe) * 100) : 0;
  const after15Pct = totalInTimeframe > 0 ? Math.round((after15InTimeframe / totalInTimeframe) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Vue Globale Admin</h2>
          <p className="text-slate-500 font-medium">Surveillance et gestion de la plateforme SYNOP</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <Database size={18} />
          Sauvegarder Données
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/admin/users" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all group">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <Users size={24} />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">UTILISATEURS</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-slate-900">{stats.users}</p>
            <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        <Link to="/admin/entries" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <Database size={24} />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">TOTAL SAISIES</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-slate-900">{stats.entries}</p>
            <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        
        {/* Taux de Ponctualité Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all">
            <Activity size={24} />
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">PONCTUALITÉ</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black text-slate-900">{before15Pct}%</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">dans les temps (≤15m)</p>
            </div>
            <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${before15Pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Interactive Stats Card for System State */}
        <div 
          onClick={() => { fetchStats(); alert("État du système : 100% opérationnel. Données synchronisées."); }}
          className="bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-200 flex flex-col justify-between text-white cursor-pointer hover:bg-emerald-700 transition-all active:scale-95 group"
        >
          <div className="flex justify-between items-start">
            <Shield size={24} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
          </div>
          <div>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">ÉTAT SYSTÈME</p>
            <p className="text-xl font-bold">Opérationnel</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Line Chart Section */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Analyse de Ponctualité</h3>
                <p className="text-slate-400 text-xs font-medium">Comparaison des messages envoyés dans les 15 premières minutes de l'heure vs après</p>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 self-start">
                <button
                  onClick={() => setTimeframe("7days")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    timeframe === "7days" 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  7 Jours
                </button>
                <button
                  onClick={() => setTimeframe("24hours")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    timeframe === "24hours" 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  24 Heures
                </button>
              </div>
            </div>

            {loadingEntries ? (
              <div className="h-[320px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
                <span className="text-sm font-medium">Analyse des données en cours...</span>
              </div>
            ) : entriesData.length === 0 ? (
              <div className="h-[320px] flex flex-col items-center justify-center text-slate-400">
                <Activity size={40} className="stroke-1 mb-2 text-slate-300" />
                <span className="text-sm font-medium">Aucun rapport SYNOP enregistré.</span>
              </div>
            ) : (
              <div className="h-[325px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      tickLine={false} 
                      axisLine={false}
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight="bold"
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight="bold"
                      allowDecimals={false}
                    />
                    <RechartsTooltip content={<ConnectionTooltip />} />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => {
                        return <span className="text-xs font-bold text-slate-600 font-sans">{value}</span>;
                      }}
                    />
                    <Line 
                      name="À temps (≤ 15 min)" 
                      type="monotone" 
                      dataKey="before15" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      dot={{ r: 3, strokeWidth: 1 }}
                    />
                    <Line 
                      name="En retard (> 15 min)" 
                      type="monotone" 
                      dataKey="after15" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      dot={{ r: 3, strokeWidth: 1 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Quality and Actions Section */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Qualité Générale</h3>
              <p className="text-xs text-slate-400 font-medium mb-6">Vue statistique de l'assiduité du réseau de transmission</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-55">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">REÇUS À TEMPS</p>
                      <p className="text-sm font-black text-slate-800">{before15InTimeframe} messages</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100/50 px-2.5 py-1 rounded-lg">{before15Pct}%</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-55">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">REÇUS EN RETARD</p>
                      <p className="text-sm font-black text-slate-800">{after15InTimeframe} messages</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-amber-600 bg-amber-100/50 px-2.5 py-1 rounded-lg">{after15Pct}%</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-50 pt-6 mt-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Actions Rapides</h4>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/admin/users" className="p-4 bg-slate-50 rounded-2xl hover:bg-emerald-50 hover:text-emerald-700 transition-all flex flex-col items-center gap-2 border border-slate-100 group">
                  <UserPlus size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  <span className="font-extrabold text-[12px]">Ajouter Agent</span>
                </Link>
                <Link to="/admin/entries" className="p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 hover:text-blue-700 transition-all flex flex-col items-center gap-2 border border-slate-100 group">
                  <Database size={18} className="text-slate-400 group-hover:text-blue-600" />
                  <span className="font-extrabold text-[12px]">Voir Saisies</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [dmzs, setDmzs] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", dmzId: "", roleId: "" });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [u, d, r] = await Promise.all([
        axios.get("/api/users"),
        axios.get("/api/dmzs"),
        axios.get("/api/roles")
      ]);
      setUsers(Array.isArray(u.data?.data) ? u.data.data : []);
      setDmzs(Array.isArray(d.data?.data) ? d.data.data : []);
      setRoles(Array.isArray(r.data?.data) ? r.data.data : []);
    } catch(err: any) { 
      console.error(err);
      setUsers([]);
      setDmzs([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dmzId || !formData.roleId) {
      alert("Veuillez sélectionner une station et un rôle");
      return;
    }
    setLoading(true);
    try {
      if (editingUserId) {
        await axios.put(`/api/users/${editingUserId}`, {
          ...formData,
          dmzId: parseInt(formData.dmzId),
          roleId: parseInt(formData.roleId)
        });
      } else {
        await axios.post("/api/users", {
          ...formData,
          dmzId: parseInt(formData.dmzId),
          roleId: parseInt(formData.roleId)
        });
      }
      setFormData({ email: "", password: "", dmzId: "", roleId: "" });
      setEditingUserId(null);
      setShowAddModal(false);
      await fetchData();
      alert(editingUserId ? "Utilisateur mis à jour" : "Utilisateur créé");
    } catch(err: any) { 
      if (err.response?.status !== 403) {
        alert(err.response?.data?.message || "Erreur lors de l'opération"); 
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    setLoading(true);
    try {
      await axios.delete(`/api/users/${id}`);
      await fetchData();
      alert("Utilisateur supprimé");
    } catch (err: any) {
      if (err.response?.status !== 403) {
        alert(err.response?.data?.message || "Erreur lors de la suppression");
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Gestion Utilisateurs</h2>
            <button 
              onClick={fetchData} 
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              title="Rafraîchir"
            >
              <History size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <p className="text-slate-500 font-medium">Contrôlez les accès aux stations DMZ</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all font-sans"
        >
          <UserPlus size={20} />
          Nouvel Agent
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Utilisateur</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Station DMZ</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">Chargement des utilisateurs...</td>
              </tr>
            ) : (Array.isArray(users) && users.length === 0) ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">Aucun utilisateur trouvé.</td>
              </tr>
            ) : (
              Array.isArray(users) && users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all capitalize">
                        {u.email?.[0] || 'U'}
                      </div>
                      <span className="font-bold text-slate-900">{u.email || "Utilisateur inconnu"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                      {u.dmz?.name || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                      u.role?.name === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {u.role?.name}
                    </span>
                    {u.isRootAdmin && (
                      <span className="ml-2 px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-black rounded-lg border border-yellow-100 uppercase tracking-tighter">
                        RACINE
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 text-right">
                      <button 
                        onClick={() => {
                          setFormData({
                             email: u.email,
                             password: "", 
                             dmzId: u.dmzId.toString(),
                             roleId: u.roleId.toString()
                          });
                          setEditingUserId(u.id);
                          setShowAddModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      {!u.isRootAdmin && (
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">{editingUserId ? "Modifier l'Utilisateur" : "Ajouter un Utilisateur"}</h3>
              <form onSubmit={handleAdd} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500"
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mot de passe {editingUserId && "(laisser vide pour ne pas changer)"}</label>
                  <input
                    type="password"
                    required={!editingUserId}
                    value={formData.password}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500"
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Station DMZ</label>
                    <select
                      required
                      value={formData.dmzId}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500"
                      onChange={e => setFormData({...formData, dmzId: e.target.value})}
                    >
                      <option value="">Sélectionner</option>
                      {Array.isArray(dmzs) && dmzs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Rôle</label>
                    <select
                      required
                      disabled={users.find(u => u.id === editingUserId)?.isRootAdmin}
                      value={formData.roleId}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 disabled:opacity-50"
                      onChange={e => setFormData({...formData, roleId: e.target.value})}
                    >
                      <option value="">Sélectionner</option>
                      {Array.isArray(roles) && roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowAddModal(false); setEditingUserId(null); }} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50">Annuler</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100">
                    {loading ? "Chargement..." : editingUserId ? "Mettre à jour" : "Créer"}
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

function AdminDMZ() {
  const [dmzs, setDmzs] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchDmzs = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/dmzs");
      setDmzs(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error(err);
      setDmzs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDmzs(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Le nom de la station ne peut pas être vide");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/api/dmzs", { name: name.trim() });
      setName("");
      await fetchDmzs();
      alert("Station ajoutée avec succès");
    } catch (err: any) {
      if (err.response?.status !== 403) {
        alert(err.response?.data?.message || "Erreur lors de l'ajout");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) {
      if (!editName.trim()) alert("Le nom ne peut pas être vide");
      return;
    }
    setLoading(true);
    try {
      await axios.put(`/api/dmzs/${editingId}`, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      await fetchDmzs();
      alert("Station mise à jour");
    } catch (err: any) {
      if (err.response?.status !== 403) {
        alert(err.response?.data?.message || "Erreur de modification");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette station ?")) return;
    try {
      await axios.delete(`/api/dmzs/${id}`);
      await fetchDmzs();
      alert("Station supprimée");
    } catch (err: any) {
      if (err.response?.status !== 403) {
        alert(err.response?.data?.message || "Erreur de suppression");
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Stations DMZ</h2>
            <button 
              onClick={fetchDmzs} 
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              title="Rafraîchir"
            >
              <History size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <p className="text-slate-500 font-medium">Gérez le réseau des stations météorologiques</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm sticky top-8">
            <h3 className="font-bold text-slate-900 mb-6">{editingId ? "Modifier la Station" : "Ajouter une Station"}</h3>
            <form onSubmit={editingId ? handleUpdate : handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nom de la station</label>
                <input
                  value={editingId ? editName : name}
                  onChange={e => editingId ? setEditName(e.target.value) : setName(e.target.value)}
                  placeholder="ex: Parakou, Natitingou..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                >
                  {loading ? "Chargement..." : editingId ? "Mettre à jour" : "Ajouter la station"}
                </button>
                {editingId && (
                  <button 
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-center">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nom de la station</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">Chargement des stations...</td>
                  </tr>
                ) : (Array.isArray(dmzs) && dmzs.length === 0) ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">Aucune station trouvée.</td>
                  </tr>
                ) : (
                  Array.isArray(dmzs) && dmzs.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">#{d.id}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900">{d.name}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingId(d.id);
                              setEditName(d.name);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(d.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminEntries() {
  const [entries, setEntries] = useState<any[]>([]);
  const [filters, setFilters] = useState({ date: "", hour: "", dmzId: "", userId: "" });
  const [dmzs, setDmzs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedLogs, setSelectedLogs] = useState<any[] | null>(null);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filters.date) q.append("date", filters.date);
      if (filters.hour) q.append("hour", filters.hour);
      if (filters.dmzId) q.append("dmzId", filters.dmzId);
      if (filters.userId) q.append("userId", filters.userId);

      const [e, d, u] = await Promise.all([
        axios.get(`/api/saisies?${q.toString()}`),
        axios.get("/api/dmzs"),
        axios.get("/api/users")
      ]);
      setEntries(Array.isArray(e.data?.data) ? e.data.data : []);
      setDmzs(Array.isArray(d.data?.data) ? d.data.data : []);
      setUsers(Array.isArray(u.data?.data) ? u.data.data : []);
    } catch(err) { 
      console.error(err); 
      setEntries([]);
      setDmzs([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (id: number) => {
    try {
      const res = await axios.get(`/api/logs/${id}`);
      setSelectedLogs(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error(err);
      setSelectedLogs([]);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette saisie ?")) return;
    try {
      await axios.delete(`/api/saisies/${id}`);
      fetchData();
      alert("Saisie supprimée");
    } catch (err: any) { 
      if (err.response?.status !== 403) {
        alert("Erreur lors de la suppression"); 
      }
    }
  };

  const handleUpdate = async () => {
    if (!editingEntry || !editContent.trim()) return;
    setLoading(true);
    try {
      await axios.put(`/api/saisies/${editingEntry.id}`, { content: editContent.trim() });
      setEditingEntry(null);
      fetchData();
      alert("Saisie mise à jour");
    } catch (err: any) { 
      if (err.response?.status !== 403) {
        alert("Erreur lors de la modification"); 
      }
    }
    finally { setLoading(false); }
  };

  const exportToCSV = () => {
    if (!entries || entries.length === 0) {
      alert("Aucune donnée disponible pour l'exportation.");
      return;
    }

    const headers = ["ID Saisie", "Date de Saisie", "Heure de Saisie", "Station DMZ", "Agent", "Message SYNOP"];
    const rows = entries.map(e => [
      e.id,
      e.createdAt ? new Date(e.createdAt).toLocaleDateString("fr-FR") : "",
      e.createdAt ? new Date(e.createdAt).toLocaleTimeString("fr-FR") : "",
      e.dmz?.name || "N/A",
      e.user?.email || "N/A",
      (e.content || "").replace(/"/g, '""').replace(/\r?\n|\r/g, " ")
    ]);

    const csvRows = [
      headers.map(h => `"${h}"`).join(";"),
      ...rows.map(row => row.map(val => `"${val}"`).join(";"))
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `rapports_meteo_synop_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (!entries || entries.length === 0) {
      alert("Aucune donnée disponible pour l'exportation.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const primaryColor = [15, 23, 42]; 
    const secondaryColor = [71, 85, 105]; 
    const lightBg = [248, 250, 252]; 
    const borderGray = [226, 232, 240]; 

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 297, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PLATEFORME METEOROLOGIQUE - SAISIES SYNOP", 15, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(148, 163, 184); 
    doc.text("Rapport d'historique de transmission des donnees meteorologiques", 15, 26);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Rapport genere le : ${new Date().toLocaleString("fr-FR")}`, 210, 18);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(191, 219, 254);
    doc.text(`Total rapports exportes : ${entries.length}`, 210, 25);

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.rect(15, 48, 267, 12, "FD");
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    
    let filterText = "Filtres actifs : ";
    const activeFilters = [];
    if (filters.date) activeFilters.push(`Date: ${filters.date}`);
    if (filters.hour) activeFilters.push(`Heure: ${filters.hour}h00`);
    if (filters.dmzId) {
      const dmzName = dmzs.find(d => d.id.toString() === filters.dmzId)?.name || "Inconnue";
      activeFilters.push(`Station: ${dmzName}`);
    }
    if (filters.userId) {
      const userEmail = users.find(u => u.id.toString() === filters.userId)?.email || "Inconnu";
      activeFilters.push(`Agent: ${userEmail}`);
    }
    filterText += activeFilters.length > 0 ? activeFilters.join(" | ") : "Aucun filtre (Historique complet)";
    doc.text(filterText, 18, 55.5);

    const startY = 68;
    const colWidths = {
      date: 45,
      station: 45,
      agent: 60,
      content: 110
    };
    
    let currentY = startY;

    const drawTableHeader = () => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY, 267, 10, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      let currentX = 15;
      
      doc.text("Date & Heure", currentX + 3, currentY + 6.5);
      currentX += colWidths.date;

      doc.text("Station DMZ", currentX + 3, currentY + 6.5);
      currentX += colWidths.station;

      doc.text("Agent / Utilisateur", currentX + 3, currentY + 6.5);
      currentX += colWidths.agent;

      doc.text("Message SYNOP de Transmission", currentX + 3, currentY + 6.5);
      
      currentY += 10;
    };

    drawTableHeader();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    entries.forEach((e, idx) => {
      if (currentY > 180) {
        doc.addPage();
        currentY = 15;
        drawTableHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }

      if (idx % 2 === 0) {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      
      const contentText = e.content || "";
      const splitContent = doc.splitTextToSize(contentText, colWidths.content - 6);
      
      const rowHeight = Math.max(12, splitContent.length * 4.5 + 4);

      doc.rect(15, currentY, 267, rowHeight, "FD");

      doc.line(15 + colWidths.date, currentY, 15 + colWidths.date, currentY + rowHeight);
      doc.line(15 + colWidths.date + colWidths.station, currentY, 15 + colWidths.date + colWidths.station, currentY + rowHeight);
      doc.line(15 + colWidths.date + colWidths.station + colWidths.agent, currentY, 15 + colWidths.date + colWidths.station + colWidths.agent, currentY + rowHeight);

      doc.setTextColor(51, 65, 85); 

      const dateStr = e.createdAt ? new Date(e.createdAt).toLocaleString("fr-FR") : "N/A";
      doc.text(dateStr, 15 + 3, currentY + (rowHeight / 2) + 1.5);

      doc.setFont("helvetica", "bold");
      doc.text(e.dmz?.name || "N/A", 15 + colWidths.date + 3, currentY + (rowHeight / 2) + 1.5);

      doc.setFont("helvetica", "normal");
      doc.text(e.user?.email || "N/A", 15 + colWidths.date + colWidths.station + 3, currentY + (rowHeight / 2) + 1.5);

      doc.setFont("courier", "normal"); 
      doc.setFontSize(8);
      
      let textY = currentY + 5;
      splitContent.forEach((line: string) => {
        doc.text(line, 15 + colWidths.date + colWidths.station + colWidths.agent + 3, textY);
        textY += 4.5;
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      currentY += rowHeight;
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); 
      doc.text(`Page ${i} sur ${pageCount}`, 282, 202, { align: "right" });
      doc.text(`CONFIDENTIEL - DIRECTION METEOROLOGIQUE NATIONALE`, 15, 202);
    }

    doc.save(`export_meteo_synop_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  useEffect(() => { fetchData(); }, [filters]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Journal de Supervision</h2>
            <button 
              onClick={fetchData} 
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              title="Rafraîchir"
            >
              <History size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <p className="text-slate-500 font-medium">Consultez l'historique complet des saisies DMZ</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-slate-100 shadow-sm">
            <Calendar className="text-slate-400" size={18} />
            <input 
              type="date" 
              className="outline-none text-sm font-bold text-slate-700" 
              onChange={e => setFilters({...filters, date: e.target.value})}
            />
          </div>
          <select 
            className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm outline-none text-sm font-bold text-slate-700" 
            onChange={e => setFilters({...filters, hour: e.target.value})}
            value={filters.hour}
          >
            <option value="">Toute heure</option>
            {hours.map(h => <option key={h} value={h.toString()}>{h}h00</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select 
          className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-emerald-500"
          onChange={e => setFilters({...filters, dmzId: e.target.value})}
          value={filters.dmzId}
        >
          <option value="">Toutes les stations</option>
          {Array.isArray(dmzs) && dmzs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select 
          className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-emerald-500"
          onChange={e => setFilters({...filters, userId: e.target.value})}
          value={filters.userId}
        >
          <option value="">Tous les utilisateurs</option>
          {Array.isArray(users) && users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
        </select>
        <div className="flex items-center justify-end">
           <button onClick={() => setFilters({date: "", hour: "", dmzId: "", userId: ""})} className="text-xs font-bold text-slate-400 hover:text-emerald-600 transition-all uppercase tracking-wider">Réinitialiser les filtres</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-sm animate-fade-in">
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{entries.length} rapports météorologiques prêts à être exportés</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
          >
            <FileSpreadsheet size={16} className="text-emerald-500" />
            Exporter CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
          >
            <FileText size={16} className="text-red-500" />
            Exporter PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Utilisateur</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Station</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Heure</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contenu</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Logs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
               <tr>
                 <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">Chargement des rapports...</td>
               </tr>
            ) : (Array.isArray(entries) && entries.length === 0) ? (
               <tr>
                 <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">Aucune saisie trouvée avec ces filtres.</td>
               </tr>
            ) : (
              Array.isArray(entries) && entries.map(e => (
                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-sm">{e.user?.email || "Utilisateur inconnu"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <span className="text-xs font-bold text-blue-600">{e.dmz?.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col text-xs font-medium text-slate-500">
                      <span>{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : ""}</span>
                      <span>{e.createdAt ? new Date(e.createdAt).toLocaleTimeString() : ""}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-fit min-w-[600px] group/entry">
                      <div className="space-y-1">
                        <p className="font-mono text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                          SYNOP Message
                        </p>
                        <div className="font-mono text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-100 shadow-inner">
                          <div className="flex flex-col gap-2">
                            <div className="border-b border-slate-50 pb-2">
                              <span className="text-slate-400 mr-2 font-sans font-bold text-[10px]">LIGNE 1 :</span>
                              <span className="tracking-wider whitespace-nowrap">{e.content?.split(' ').slice(0, 10).join(' ') || ""}</span>
                            </div>
                            {(e.content?.split(' ').length || 0) > 10 && (
                              <div className="pt-1">
                                <span className="text-slate-400 mr-2 font-sans font-bold text-[10px]">LIGNE 2 :</span>
                                <span className="tracking-wider whitespace-nowrap">{e.content?.split(' ').slice(10).join(' ') || ""}</span>
                              </div>
                            )}
                            <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                               <span className="flex items-center gap-1"><Clock size={10} /> {e.createdAt ? new Date(e.createdAt).toLocaleTimeString() : ""} le {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : ""}</span>
                               <span className="flex items-center gap-1"><MapPin size={10} /> DMZ: {e.dmz?.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingEntry(e);
                          setEditContent(e.content);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Modifier"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => fetchLogs(e.id)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Historique"
                      >
                        <History size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(e.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Entry Modal */}
      <AnimatePresence>
        {editingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingEntry(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg p-8 relative z-10 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">Modifier la Saisie</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Informations</p>
                   <p className="text-xs text-slate-600">Station : <strong>{editingEntry.dmz?.name || "N/A"}</strong></p>
                   <p className="text-xs text-slate-600">Agent : <strong>{editingEntry.user?.email || "N/A"}</strong></p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Contenu SYNOP</label>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-mono text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                   <button onClick={() => setEditingEntry(null)} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50">Annuler</button>
                   <button 
                    onClick={handleUpdate} 
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100"
                   >
                     {loading ? "Enregistrement..." : "Enregistrer"}
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logs Modal */}
      <AnimatePresence>
        {selectedLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLogs(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl p-8 relative z-10 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <History className="text-emerald-600" />
                Historique des modifications
              </h3>
              <div className="space-y-6">
                {selectedLogs.map((l, idx) => (
                  <div key={l.id} className="relative pl-6 border-l-2 border-slate-100 last:border-0 pb-6">
                    <div className="absolute left-[-9px] top-0 w-4 h-4 bg-emerald-500 rounded-full ring-4 ring-white" />
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Version {(selectedLogs?.length || 0) - idx}</span>
                      <span className="text-xs font-bold text-slate-900">{l.changedAt ? new Date(l.changedAt).toLocaleString() : ""} par {l.user?.email || "Inconnu"}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                          <p className="text-[10px] font-black text-red-400 uppercase mb-2">Ancien Contenu</p>
                          <p className="text-sm text-red-700 whitespace-pre-wrap">{l.oldContent}</p>
                       </div>
                       <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-400 uppercase mb-2">Nouveau Contenu</p>
                          <p className="text-sm text-emerald-700 whitespace-pre-wrap">{l.newContent}</p>
                       </div>
                    </div>
                  </div>
                ))}
                {(selectedLogs?.length || 0) === 0 && <p className="text-center text-slate-400 py-8">Aucune modification enregistrée pour cette saisie.</p>}
              </div>
              <button 
                onClick={() => setSelectedLogs(null)}
                className="w-full mt-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800"
              >
                Fermer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
