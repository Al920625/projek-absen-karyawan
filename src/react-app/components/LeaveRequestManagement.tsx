import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '@/react-app/contexts/AppContext';

interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  leave_type: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function LeaveRequestManagement() {
  const { t, showNotification, isDarkMode } = useApp();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await fetch('/api/leave-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (err) {
      showNotification('Gagal memuat permohonan izin', 'error');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(`/api/leave-requests/${id}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        showNotification('Permohonan izin disetujui', 'success');
        loadRequests();
      } else {
        showNotification('Gagal menyetujui permohonan', 'error');
      }
    } catch (err) {
      showNotification('Terjadi kesalahan', 'error');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const response = await fetch(`/api/leave-requests/${id}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        showNotification('Permohonan izin ditolak', 'success');
        loadRequests();
      } else {
        showNotification('Gagal menolak permohonan', 'error');
      }
    } catch (err) {
      showNotification('Terjadi kesalahan', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = req.employee_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      {/* Cards/Table */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className={`rounded-2xl shadow-lg p-8 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className="text-gray-500">{t('noData')}</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className={`rounded-2xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{request.employee_name}</h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      <span className="font-medium">Jenis Izin:</span> {request.leave_type}
                    </p>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      <span className="font-medium">Periode:</span> {formatDate(request.start_date)} -{' '}
                      {formatDate(request.end_date)}
                    </p>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      <span className="font-medium">Alasan:</span> {request.reason}
                    </p>
                  </div>
                </div>
                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {t('approve')}
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      {t('reject')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
