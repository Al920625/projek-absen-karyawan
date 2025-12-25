import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
  Globe
} from 'lucide-react';
import { useApp } from '@/react-app/contexts/AppContext';
import EmployeeManagement from '@/react-app/components/EmployeeManagement';
import AttendanceManagement from '@/react-app/components/AttendanceManagement';
import LeaveRequestManagement from '@/react-app/components/LeaveRequestManagement';
import AdminPanelSettings from '@/react-app/components/AdminPanelSettings';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, isDarkMode, toggleDarkMode, language, setLanguage } = useApp();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeave: 0,
    totalAdmins: 0,
  });

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    if (userType !== 'admin') {
      navigate('/');
    }
    loadStats();
  }, [navigate]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('userId');
    navigate('/');
  };

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: Home },
    { id: 'employees', label: t('employees'), icon: Users },
    { id: 'attendance', label: t('attendance'), icon: ClipboardList },
    { id: 'leave', label: t('leaveRequests'), icon: FileText },
    { id: 'settings', label: t('adminPanel'), icon: Settings },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-b from-red-600 via-yellow-400 to-red-600'}`}>
      {/* Mobile header */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 p-4 flex items-center justify-between z-50 shadow-lg ${
        isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-red-600 to-orange-500'
      } text-white`}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <h1 className="text-lg font-bold">PT Malaka Express Line</h1>
        <div className="flex items-center gap-2">
          <button onClick={toggleDarkMode} className="p-2">
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setLanguage(language === 'id' ? 'en' : 'id')} className="p-2">
            <Globe className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex pt-16 lg:pt-0">
        {/* Sidebar */}
        <div className={`fixed lg:sticky top-16 lg:top-0 left-0 h-[calc(100vh-4rem)] lg:h-screen transition-all duration-300 z-40 ${
          isSidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } overflow-hidden ${
          isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-b from-red-600 to-orange-600'
        } text-white`}>
          <div className="p-6 hidden lg:block">
            <div className="flex items-center gap-3 mb-8">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-gray-700' : 'bg-white'
              }`}>
                <span className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-red-600'}`}>M</span>
              </div>
              {isSidebarOpen && (
                <div>
                  <h1 className="font-bold text-lg">Malaka</h1>
                  <p className="text-xs text-white/80">Admin Panel</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mb-6">
              <button onClick={toggleDarkMode} className="p-2 hover:bg-white/10 rounded-lg">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => setLanguage(language === 'id' ? 'en' : 'id')} className="p-2 hover:bg-white/10 rounded-lg">
                <Globe className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl transition-all duration-200 ${
                    activeMenu === item.id
                      ? isDarkMode 
                        ? 'bg-gray-700 text-white shadow-lg'
                        : 'bg-white text-red-600 shadow-lg'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isSidebarOpen && <span className="font-medium">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span className="font-medium">{t('logout')}</span>}
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {menuItems.find(m => m.id === activeMenu)?.label || t('dashboard')}
              </h2>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Selamat datang di panel admin PT Malaka Express Line
              </p>
            </div>

            {/* Dashboard content */}
            {activeMenu === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`rounded-2xl shadow-lg p-6 border-l-4 border-red-500 ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('totalEmployees')}
                      </p>
                      <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {stats.totalEmployees}
                      </p>
                    </div>
                    <Users className="w-12 h-12 text-red-500" />
                  </div>
                </div>

                <div className={`rounded-2xl shadow-lg p-6 border-l-4 border-orange-500 ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('presentToday')}
                      </p>
                      <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {stats.presentToday}
                      </p>
                    </div>
                    <ClipboardList className="w-12 h-12 text-orange-500" />
                  </div>
                </div>

                <div className={`rounded-2xl shadow-lg p-6 border-l-4 border-yellow-500 ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('pendingLeave')}
                      </p>
                      <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {stats.pendingLeave}
                      </p>
                    </div>
                    <FileText className="w-12 h-12 text-yellow-500" />
                  </div>
                </div>

                <div className={`rounded-2xl shadow-lg p-6 border-l-4 border-green-500 ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('totalAdmins')}
                      </p>
                      <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {stats.totalAdmins}
                      </p>
                    </div>
                    <Settings className="w-12 h-12 text-green-500" />
                  </div>
                </div>
              </div>
            )}

            {activeMenu === 'employees' && <EmployeeManagement />}
            {activeMenu === 'attendance' && <AttendanceManagement />}
            {activeMenu === 'leave' && <LeaveRequestManagement />}
            {activeMenu === 'settings' && <AdminPanelSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
