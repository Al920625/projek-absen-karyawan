import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { 
  LogOut,
  Camera,
  User,
  Moon,
  Sun,
  Globe,
  X,
  FileText
} from 'lucide-react';
import { useApp } from '@/react-app/contexts/AppContext';

const leaveTypes = [
  'Cuti Tahunan',
  'Sakit',
  'Izin Menikah',
  'Izin Melahirkan',
  'Izin Keluarga',
  'Lainnya',
];

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode, language, setLanguage, showNotification } = useApp();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [clockAction, setClockAction] = useState<'in' | 'out'>('in');
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [leaveFormData, setLeaveFormData] = useState({
    leave_type: 'Cuti Tahunan',
    reason: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    if (userType !== 'karyawan') {
      navigate('/');
    }
    checkClockStatus();
    loadLeaveRequests();
    checkLocationPermission();
  }, [navigate]);

  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      showNotification('Browser Anda tidak mendukung lokasi GPS', 'error');
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'denied') {
        showNotification('Harap aktifkan akses lokasi di pengaturan browser untuk melakukan absensi', 'error');
      } else if (permission.state === 'prompt') {
        showNotification('Anda akan diminta mengaktifkan lokasi saat melakukan clock in', 'info');
      }

      permission.addEventListener('change', () => {
        if (permission.state === 'denied') {
          showNotification('Akses lokasi ditolak. Harap aktifkan untuk melakukan clock in', 'error');
        } else if (permission.state === 'granted') {
          showNotification('Akses lokasi diaktifkan', 'success');
        }
      });
    } catch (err) {
      console.error('Error checking location permission:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const checkClockStatus = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`/api/attendance/status?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setIsClockedIn(data.isClockedIn);
      }
    } catch (err) {
      console.error('Failed to check clock status');
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const response = await fetch('/api/leave-requests');
      if (response.ok) {
        const data = await response.json();
        const userId = localStorage.getItem('userId');
        const myRequests = data.filter((req: any) => req.employee_id === userId);
        setLeaveRequests(myRequests);
      }
    } catch (err) {
      console.error('Failed to load leave requests');
    }
  };

  const handleClockAction = async () => {
    setClockAction(isClockedIn ? 'out' : 'in');
    setShowCamera(true);
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      showNotification('Gagal mengakses kamera', 'error');
      setShowCamera(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const photoDataUrl = canvas.toDataURL('image/jpeg');

    // Stop camera
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    // Get location if clocking in
    let locationData: { latitude?: number; longitude?: number; address?: string } = {};
    
    if (clockAction === 'in') {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        
        locationData.latitude = position.coords.latitude;
        locationData.longitude = position.coords.longitude;
        
        // Try to get address from coordinates using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.latitude}&lon=${locationData.longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'Malaka Attendance App'
              }
            }
          );
          if (response.ok) {
            const data = await response.json();
            locationData.address = data.display_name;
          }
        } catch (err) {
          console.error('Failed to get address:', err);
        }
      } catch (err) {
        console.error('Location access denied:', err);
        showNotification('Harap aktifkan akses lokasi di pengaturan browser untuk melakukan clock in', 'error');
        setShowCamera(false);
        return;
      }
    }

    // Submit attendance
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('/api/attendance/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: clockAction,
          photo: photoDataUrl,
          ...locationData,
        }),
      });

      if (response.ok) {
        showNotification(
          clockAction === 'in' ? 'Clock in berhasil!' : 'Clock out berhasil!',
          'success'
        );
        setIsClockedIn(clockAction === 'in');
        setShowCamera(false);
      } else {
        const data = await response.json();
        showNotification(data.error || 'Gagal melakukan clock', 'error');
      }
    } catch (err) {
      showNotification('Terjadi kesalahan', 'error');
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...leaveFormData,
        }),
      });

      if (response.ok) {
        showNotification('Permohonan izin berhasil diajukan', 'success');
        setShowLeaveModal(false);
        setLeaveFormData({
          leave_type: 'Cuti Tahunan',
          reason: '',
          start_date: '',
          end_date: '',
        });
        loadLeaveRequests();
      } else {
        const data = await response.json();
        showNotification(data.error || 'Gagal mengajukan izin', 'error');
      }
    } catch (err) {
      showNotification('Terjadi kesalahan', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('userId');
    navigate('/');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'Pending',
      approved: 'Disetujui',
      rejected: 'Ditolak',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-b from-red-600 via-yellow-400 to-red-600'}`}>
      {/* Header */}
      <div className={isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-red-600 to-orange-500'}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isDarkMode ? 'bg-gray-700' : 'bg-white'
              }`}>
                <User className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-red-600'}`} />
              </div>
              <div className="text-white">
                <h1 className="text-xl font-bold">PT Malaka Express Line</h1>
                <p className="text-sm text-white/80">Portal Karyawan</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleDarkMode} className="p-2 hover:bg-white/10 rounded-lg text-white">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => setLanguage(language === 'id' ? 'en' : 'id')} className="p-2 hover:bg-white/10 rounded-lg text-white">
                <Globe className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className={`shadow-md sticky top-0 z-10 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveMenu('dashboard')}
              className={`flex-1 min-w-max px-6 py-4 font-medium transition-all duration-200 ${
                activeMenu === 'dashboard'
                  ? isDarkMode
                    ? 'text-red-400 border-b-2 border-red-400 bg-gray-700'
                    : 'text-red-600 border-b-2 border-red-600 bg-red-50'
                  : isDarkMode
                    ? 'text-gray-400 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveMenu('leave')}
              className={`flex-1 min-w-max px-6 py-4 font-medium transition-all duration-200 ${
                activeMenu === 'leave'
                  ? isDarkMode
                    ? 'text-red-400 border-b-2 border-red-400 bg-gray-700'
                    : 'text-red-600 border-b-2 border-red-600 bg-red-50'
                  : isDarkMode
                    ? 'text-gray-400 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Permohonan Izin
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {activeMenu === 'dashboard' && (
          <div className="space-y-6">
            {/* Clock in/out card */}
            <div className={`rounded-2xl shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`p-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-red-600 to-orange-500'} text-white`}>
                <h2 className="text-2xl font-bold mb-2">Absensi Hari Ini</h2>
                <p className="text-white/90">{new Date().toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>
              <div className="p-6">
                <div className="flex flex-col items-center gap-6">
                  <div className={`text-6xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {new Date().toLocaleTimeString('id-ID', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  
                  <button
                    onClick={handleClockAction}
                    className={`w-full max-w-md py-4 px-6 rounded-2xl font-bold text-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                      isClockedIn
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:shadow-xl'
                        : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-xl'
                    }`}
                  >
                    <Camera className="w-6 h-6" />
                    {isClockedIn ? 'Clock Out' : 'Clock In'}
                  </button>

                  <p className={`text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {isClockedIn 
                      ? 'Anda sudah melakukan clock in hari ini' 
                      : 'Ambil foto selfie untuk clock in'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'leave' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowLeaveModal(true)}
                className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
              >
                <FileText className="w-5 h-5" />
                Ajukan Izin
              </button>
            </div>

            {leaveRequests.length === 0 ? (
              <div className={`rounded-2xl shadow-lg p-8 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Belum ada permohonan izin</p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaveRequests.map((request) => (
                  <div key={request.id} className={`rounded-2xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h3 className="font-bold text-lg">{request.leave_type}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p><span className="font-medium">Periode:</span> {new Date(request.start_date).toLocaleDateString('id-ID')} - {new Date(request.end_date).toLocaleDateString('id-ID')}</p>
                      <p><span className="font-medium">Alasan:</span> {request.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className={`w-full mt-6 font-semibold py-3 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
            isDarkMode
              ? 'bg-gray-800 text-red-400'
              : 'bg-white text-red-600'
          }`}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>

      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Ambil Foto Selfie</h3>
              <button
                onClick={() => {
                  if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                  }
                  setShowCamera(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="aspect-square bg-gray-900 rounded-xl mb-4 overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <button
              onClick={capturePhoto}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg"
            >
              Ambil Foto & {clockAction === 'in' ? 'Clock In' : 'Clock Out'}
            </button>
          </div>
        </div>
      )}

      {/* Leave request modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-6">Ajukan Permohonan Izin</h3>
              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Jenis Izin</label>
                  <select
                    value={leaveFormData.leave_type}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, leave_type: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    {leaveTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={leaveFormData.start_date}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, start_date: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={leaveFormData.end_date}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, end_date: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Alasan</label>
                  <textarea
                    required
                    rows={4}
                    value={leaveFormData.reason}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    placeholder="Jelaskan alasan permohonan izin..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className={`flex-1 py-3 rounded-xl font-semibold ${
                      isDarkMode
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg"
                  >
                    Ajukan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
