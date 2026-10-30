/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import SetupAdmin from "./pages/SetupAdmin";
import AdminDashboard from "./pages/AdminDashboard";
import MemberDashboard from "./pages/MemberDashboard";
import Layout from "./components/Layout";

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (user?.role === "MEMBER") return <Navigate to="/member" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/setup" element={<SetupAdmin />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute role="ADMIN">
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/*"
            element={
              <ProtectedRoute role="MEMBER">
                <Layout>
                  <MemberDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

