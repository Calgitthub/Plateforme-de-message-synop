import * as React from "react";
import { useAuth } from "../AuthContext";
import { LogOut, User, Database, History, LayoutDashboard, MapPin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import ToastNotification from "./ToastNotification";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = user?.role === "ADMIN" 
    ? [
        { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
        { name: "Utilisateurs", path: "/admin/users", icon: User },
        { name: "Stations DMZ", path: "/admin/dmz", icon: MapPin },
        { name: "Supervision", path: "/admin/entries", icon: Database },
      ]
    : [
        { name: "Mes Saisies", path: "/member", icon: History },
      ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
              SYNOP
            </h1>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? "bg-emerald-50 text-emerald-700" 
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4">
            <p className="text-xs text-slate-500 font-medium mb-1">CONNECTÉ EN TANT QUE</p>
            <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
              <span className={`w-2 h-2 rounded-full ${user?.role === 'ADMIN' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
              {user?.role} • {user?.dmz}
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-200"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 relative">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 -z-10 translate-x-1/4 -translate-y-1/4 opacity-20 pointer-events-none">
          <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#10b981" d="M44.7,-76.4C58.2,-69.2,70,-58.5,78.2,-45.5C86.4,-32.5,91.1,-17.3,90.4,-2.2C89.7,12.9,83.6,27.8,74.7,40.8C65.8,53.8,54.1,64.9,40.8,72.4C27.5,79.9,12.7,83.8,-2.6,88.1C-17.9,92.4,-35.8,97,-50.2,92.1C-64.6,87.2,-75.4,72.8,-82.1,57.5C-88.8,42.2,-91.3,26.1,-89.7,10.6C-88.1,-4.9,-82.4,-19.8,-74.6,-33.2C-66.8,-46.6,-57,-58.5,-44.7,-66.6C-32.4,-74.7,-17.7,-79,1.5,-81.4C20.7,-83.8,41.4,-84.3,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>

        {/* Top Utility Bar with Notification Bell */}
        <div className="max-w-6xl mx-auto mb-6 flex justify-end">
          <ToastNotification />
        </div>
        
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.3 }}
           className="max-w-6xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
