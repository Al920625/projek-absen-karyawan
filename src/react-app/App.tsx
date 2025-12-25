import { BrowserRouter as Router, Routes, Route } from "react-router";
import Login from "@/react-app/pages/Login";
import AdminDashboard from "@/react-app/pages/AdminDashboard";
import EmployeeDashboard from "@/react-app/pages/EmployeeDashboard";
import { AppProvider } from "@/react-app/contexts/AppContext";
import NotificationToast from "@/react-app/components/NotificationToast";

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        </Routes>
      </Router>
      <NotificationToast />
    </AppProvider>
  );
}
