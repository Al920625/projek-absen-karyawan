import { useState, useEffect } from 'react';
import { Calendar, Image as ImageIcon, Search, MapPin } from 'lucide-react';
import { useApp } from '@/react-app/contexts/AppContext';

interface Attendance {
  id: number;
  employee_id: number;
  employee_name: string;
  clock_in_at: string;
  clock_out_at: string | null;
  clock_in_photo: string | null;
  clock_out_photo: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  location_address: string | null;
  status: string;
  created_at: string;
}

export default function AttendanceManagement() {
  const { t, showNotification, isDarkMode } = useApp();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadAttendances();
  }, [selectedDate]);

  const loadAttendances = async () => {
    try {
      const response = await fetch(`/api/attendance?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setAttendances(data);
      }
    } catch (err) {
      showNotification('Gagal memuat data absensi', 'error');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredAttendances = attendances.filter((att) =>
    att.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`pl-10 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">{t('name')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{t('date')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Clock In</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Clock Out</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Lokasi</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Foto Clock In</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Foto Clock Out</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((attendance) => (
                  <tr key={attendance.id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 font-medium">{attendance.employee_name}</td>
                    <td className="px-6 py-4">{formatDate(attendance.created_at)}</td>
                    <td className="px-6 py-4">{formatTime(attendance.clock_in_at)}</td>
                    <td className="px-6 py-4">
                      {attendance.clock_out_at ? formatTime(attendance.clock_out_at) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {attendance.location_latitude && attendance.location_longitude ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-blue-600 font-medium">
                            <MapPin className="w-4 h-4" />
                            <span>{attendance.location_latitude.toFixed(6)}, {attendance.location_longitude.toFixed(6)}</span>
                          </div>
                          {attendance.location_address && (
                            <div className="max-w-xs text-xs text-gray-500 truncate" title={attendance.location_address}>
                              {attendance.location_address}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Tidak ada data lokasi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {attendance.clock_in_photo ? (
                        <button
                          onClick={() => setSelectedPhoto(attendance.clock_in_photo)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Lihat
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {attendance.clock_out_photo ? (
                        <button
                          onClick={() => setSelectedPhoto(attendance.clock_out_photo)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Lihat
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          attendance.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {attendance.status === 'present' ? 'Hadir' : attendance.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-2xl w-full">
            <img
              src={selectedPhoto}
              alt="Attendance photo"
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
