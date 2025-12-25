import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Moon, Sun, Globe } from 'lucide-react';
import { useApp } from '@/react-app/contexts/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode, language, setLanguage, showNotification } = useApp();
  const [userType, setUserType] = useState<'admin' | 'karyawan'>('admin');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType, userId, password }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification(
          language === 'id' ? 'Login berhasil!' : 'Login successful!',
          'success'
        );
        localStorage.setItem('userType', userType);
        localStorage.setItem('userId', userId);
        setTimeout(() => {
          if (userType === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/employee/dashboard');
          }
        }, 500);
      } else {
        const errorMsg = data.error || (language === 'id' ? 'Login gagal' : 'Login failed');
        setError(errorMsg);
        showNotification(errorMsg, 'error');
      }
    } catch (err) {
      const errorMsg = language === 'id' ? 'Terjadi kesalahan. Silakan coba lagi.' : 'An error occurred. Please try again.';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center px-3 py-4 sm:p-4 relative overflow-hidden transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-b from-red-600 via-yellow-400 to-red-600'
    }`}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 ${
          isDarkMode ? 'bg-red-500/10' : 'bg-red-500/20'
        }`}></div>
        <div className={`absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 ${
          isDarkMode ? 'bg-orange-600/10' : 'bg-orange-600/20'
        }`}></div>
      </div>

      {/* Login container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-4 sm:mb-8">
          <div className={`backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border-3 sm:border-4 w-64 sm:w-80 ${
            isDarkMode 
              ? 'bg-gray-800/95 border-gray-700' 
              : 'bg-white/95 border-gray-900'
          }`}>
            <div className="flex flex-col">
              <div className={`h-12 sm:h-16 ${
                isDarkMode 
                  ? 'bg-gradient-to-b from-red-700 to-red-800' 
                  : 'bg-gradient-to-b from-red-600 to-red-700'
              }`}></div>
              <div className={`h-16 sm:h-24 flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-gradient-to-b from-yellow-500 to-yellow-600' 
                  : 'bg-gradient-to-b from-yellow-400 to-yellow-500'
              }`}>
                <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-wider">MALAKA</h1>
              </div>
              <div className={`h-12 sm:h-16 ${
                isDarkMode 
                  ? 'bg-gradient-to-b from-red-800 to-red-700' 
                  : 'bg-gradient-to-b from-red-700 to-red-600'
              }`}></div>
            </div>
          </div>
        </div>

        {/* Login form card */}
        <div className={`backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 border-4 ${
          isDarkMode 
            ? 'bg-gray-800/95 border-gray-700' 
            : 'bg-gradient-to-br from-orange-50/95 to-orange-100/95 border-gray-900'
        }`}>
          <h2 className={`text-lg sm:text-2xl font-bold text-center mb-4 sm:mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            PT Malaka Express Line
          </h2>

          {/* User type toggle */}
          <div className={`flex rounded-xl sm:rounded-2xl overflow-hidden border-3 sm:border-4 mb-4 sm:mb-6 ${
            isDarkMode ? 'border-gray-700' : 'border-gray-900'
          }`}>
            <button
              onClick={() => setUserType('admin')}
              className={`flex-1 py-2.5 sm:py-3 text-base sm:text-lg font-bold transition-all duration-200 ${
                userType === 'admin'
                  ? 'bg-gradient-to-r from-red-600 via-yellow-400 to-red-600 text-white shadow-lg'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-white text-gray-700'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setUserType('karyawan')}
              className={`flex-1 py-2.5 sm:py-3 text-base sm:text-lg font-bold transition-all duration-200 ${
                userType === 'karyawan'
                  ? 'bg-gradient-to-r from-red-600 via-yellow-400 to-red-600 text-white shadow-lg'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-white text-gray-700'
              }`}
            >
              {language === 'id' ? 'Karyawan' : 'Employee'}
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            {/* User ID input */}
            <div>
              <label className={`block font-bold text-sm sm:text-base mb-1.5 sm:mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {language === 'id' 
                  ? `Masukkan ID ${userType === 'admin' ? 'Admin' : 'Karyawan'}`
                  : `Enter ${userType === 'admin' ? 'Admin' : 'Employee'} ID`
                }
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={language === 'id' 
                  ? `Masukkan ID ${userType === 'admin' ? 'Admin' : 'Karyawan'}`
                  : `Enter ${userType === 'admin' ? 'Admin' : 'Employee'} ID`
                }
                className={`w-full px-3 py-3 sm:px-4 sm:py-3.5 border-3 sm:border-4 rounded-xl sm:rounded-2xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 text-sm sm:text-base font-bold ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-900 text-gray-900 placeholder-gray-400'
                }`}
                required
              />
            </div>

            {/* Password input */}
            <div>
              <label className={`block font-bold text-sm sm:text-base mb-1.5 sm:mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3 py-3 sm:px-4 sm:py-3.5 pr-10 sm:pr-12 border-3 sm:border-4 rounded-xl sm:rounded-2xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 text-sm sm:text-base font-bold ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-900 text-gray-900 placeholder-gray-400'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={`border-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm ${
                isDarkMode 
                  ? 'bg-red-900/50 border-red-700 text-red-300' 
                  : 'bg-red-100 border-red-400 text-red-700'
              }`}>
                {error}
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 via-yellow-400 to-red-600 text-white font-bold text-base sm:text-lg py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl active:scale-95 active:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading 
                ? 'Loading...' 
                : language === 'id' 
                  ? `Login ${userType === 'admin' ? 'Admin' : 'Karyawan'}`
                  : `Login as ${userType === 'admin' ? 'Admin' : 'Employee'}`
              }
            </button>
          </form>
        </div>

        {/* Settings controls below login form */}
        <div className="mt-4 sm:mt-6">
          <div className={`w-full flex items-center justify-between px-4 py-3 sm:py-3.5 border-3 sm:border-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-900 text-gray-900'
          }`}>
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-5 h-5 text-orange-400" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5 text-gray-700" />
                  <span>Mode Gelap</span>
                </>
              )}
            </button>

            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
              className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
            >
              <Globe className={`w-5 h-5 ${isDarkMode ? 'text-orange-400' : 'text-gray-700'}`} />
              <span>{language === 'id' ? 'ID' : 'EN'}</span>
            </button>
          </div>
        </div>

        {/* Developer credit */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className={`text-sm sm:text-base font-bold tracking-wide ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
          style={{ fontFamily: "'Inter', 'Poppins', 'Montserrat', sans-serif" }}>
            developed by <span className="text-base sm:text-lg">Ali</span>
          </p>
        </div>
      </div>
    </div>
  );
}
