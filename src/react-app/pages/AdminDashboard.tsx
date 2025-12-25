import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Moon,
  Sun,
  Globe,
  Calendar,
} from "lucide-react";

import { useApp } from "@/react-app/contexts/AppContext";

import EmployeeManagement from "@/react-app/components/EmployeeManagement";
import AttendanceManagement from "@/react-app/components/AttendanceManagement";
import LeaveRequestManagement from "@/react-app/components/LeaveRequestManagement";
import AdminPanelSettings from "@/react-app/components/AdminPanelSettings";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, isDarkMode, toggleDarkMode, language, setLanguage } = useApp();

  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeave: 0,
    totalAdmins: 0,
  });

  useEffect(() => {
    const userType = localStorage.getItem("userType");
    if (userType !== "admin") {
      navigate("/");
    }
    loadStats();
  }, [navigate]);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch {
      console.error("Failed to load stats");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userType");
    localStorage.removeItem("userId");
    navigate("/");
  };

  const menuItems = [
    { id: "dashboard", label: t("dashboard"), icon: Home },
    { id: "employees", label: t("employees"), icon: Users },
    { id: "attendance", label: t("attendance"), icon: Calendar },
    { id: "leave", label: t("leaveRequests"), icon: FileText },
    { id: "settings", label: t("adminPanel"), icon: Settings },
  ];

  return (
    <div
      className={`min-h-screen ${
        isDarkMode
          ? "bg-gray-900 text-white"
          : "bg-gradient-to-b from-red-600 via-yellow-400 to-red-600"
      }`}
    >
      {/* Mobile header */}
      <div
        className={`lg:hidden fixed top-0 left-0 right-0 p-4 flex items-center justify-between z-50 shadow-lg ${
          isDarkMode
            ? "bg-gray-800"
            : "bg-gradient-to-r from-red-600 to-orange-500"
        } text-white`}
      >
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
        <h1 className="text-lg font-bold">PT Malaka Express Line</h1>
        <div className="flex gap-2">
          <button onClick={toggleDarkMode}>
            {isDarkMode ? <Sun /> : <Moon />}
          </button>
          <button onClick={() => setLanguage(language === "id" ? "en" : "id")}>
            <Globe />
          </button>
        </div>
      </div>

      <div className="flex pt-16 lg:pt-0">
        {/* Sidebar */}
        <div
          className={`w-64 p-4 ${
            isDarkMode ? "bg-gray-800" : "bg-red-600"
          } text-white`}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 ${
                  activeMenu === item.id
                    ? "bg-white text-red-600"
                    : "hover:bg-white/10"
                }`}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={handleLogout}
            className="mt-6 flex items-center gap-2"
          >
            <LogOut /> {t("logout")}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 bg-white text-black">
          {activeMenu === "dashboard" && <div>Dashboard</div>}
          {activeMenu === "employees" && <EmployeeManagement />}
          {activeMenu === "attendance" && <AttendanceManagement />}
          {activeMenu === "leave" && <LeaveRequestManagement />}
          {activeMenu === "settings" && <AdminPanelSettings />}
        </div>
      </div>
    </div>
  );
}

