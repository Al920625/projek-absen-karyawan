import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, Eye, EyeOff, FileSpreadsheet, FileText } from 'lucide-react';
import { useApp } from '@/react-app/contexts/AppContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Admin {
  id: number;
  admin_id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPanelSettings() {
  const { t, showNotification, isDarkMode } = useApp();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    admin_id: '',
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const response = await fetch('/api/admins');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      }
    } catch (err) {
      showNotification('Gagal memuat data admin', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAdmin ? `/api/admins/${editingAdmin.id}` : '/api/admins';
      const method = editingAdmin ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showNotification(
          editingAdmin ? 'Admin berhasil diperbarui' : 'Admin berhasil ditambahkan',
          'success'
        );
        setShowModal(false);
        setEditingAdmin(null);
        setFormData({
          admin_id: '',
          name: '',
          email: '',
          password: '',
        });
        loadAdmins();
      } else {
        const data = await response.json();
        showNotification(data.error || 'Gagal menyimpan data', 'error');
      }
    } catch (err) {
      showNotification('Terjadi kesalahan', 'error');
    }
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      admin_id: admin.admin_id,
      name: admin.name,
      email: admin.email || '',
      password: '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const response = await fetch(`/api/admins/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showNotification('Admin berhasil dihapus', 'success');
        loadAdmins();
      } else {
        showNotification('Gagal menghapus admin', 'error');
      }
    } catch (err) {
      showNotification('Terjadi kesalahan', 'error');
    }
  };

  const handleBackupExcel = async () => {
    try {
      const response = await fetch('/api/backup');
      if (!response.ok) {
        showNotification('Gagal membuat backup', 'error');
        return;
      }

      const data = await response.json();
      const wb = XLSX.utils.book_new();

      // Employees sheet
      if (data.employees && data.employees.length > 0) {
        const employeesData = data.employees.map((emp: any) => ({
          'ID Karyawan': emp.employee_id,
          'Nama': emp.name,
          'Email': emp.email || '-',
          'Telepon': emp.phone || '-',
          'Posisi': emp.position || '-',
          'Status': emp.is_active ? 'Aktif' : 'Tidak Aktif',
          'Tanggal Dibuat': new Date(emp.created_at).toLocaleString('id-ID')
        }));
        const ws1 = XLSX.utils.json_to_sheet(employeesData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Karyawan');
      }

      // Admins sheet
      if (data.admins && data.admins.length > 0) {
        const adminsData = data.admins.map((admin: any) => ({
          'ID Admin': admin.admin_id,
          'Nama': admin.name,
          'Email': admin.email || '-',
          'Status': admin.is_active ? 'Aktif' : 'Tidak Aktif',
          'Tanggal Dibuat': new Date(admin.created_at).toLocaleString('id-ID')
        }));
        const ws2 = XLSX.utils.json_to_sheet(adminsData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Admin');
      }

      // Attendance sheet
      if (data.attendance && data.attendance.length > 0) {
        const attendanceData = data.attendance.map((att: any) => ({
          'ID Karyawan': att.employee_id,
          'Clock In': att.clock_in_at ? new Date(att.clock_in_at).toLocaleString('id-ID') : '-',
          'Clock Out': att.clock_out_at ? new Date(att.clock_out_at).toLocaleString('id-ID') : '-',
          'Lokasi': att.location_address || (att.location_latitude && att.location_longitude ? `${att.location_latitude}, ${att.location_longitude}` : '-'),
          'Status': att.status,
          'Tanggal': new Date(att.created_at).toLocaleDateString('id-ID')
        }));
        const ws3 = XLSX.utils.json_to_sheet(attendanceData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Absensi');
      }

      // Leave requests sheet
      if (data.leave_requests && data.leave_requests.length > 0) {
        const leaveData = data.leave_requests.map((leave: any) => ({
          'ID Karyawan': leave.employee_id,
          'Jenis Izin': leave.leave_type,
          'Alasan': leave.reason,
          'Tanggal Mulai': new Date(leave.start_date).toLocaleDateString('id-ID'),
          'Tanggal Selesai': new Date(leave.end_date).toLocaleDateString('id-ID'),
          'Status': leave.status === 'pending' ? 'Pending' : leave.status === 'approved' ? 'Disetujui' : 'Ditolak',
          'Tanggal Pengajuan': new Date(leave.created_at).toLocaleString('id-ID')
        }));
        const ws4 = XLSX.utils.json_to_sheet(leaveData);
        XLSX.utils.book_append_sheet(wb, ws4, 'Permohonan Izin');
      }

      XLSX.writeFile(wb, `backup-malaka-${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Backup Excel berhasil diunduh', 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showNotification('Terjadi kesalahan saat membuat backup Excel', 'error');
    }
  };

  const handleBackupPDF = async () => {
    try {
      const response = await fetch('/api/backup');
      if (!response.ok) {
        showNotification('Gagal membuat backup', 'error');
        return;
      }

      const data = await response.json();
      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('PT Malaka Express Line', 105, yPos, { align: 'center' });
      yPos += 10;
      doc.setFontSize(14);
      doc.text('Laporan Backup Data', 105, yPos, { align: 'center' });
      yPos += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 105, yPos, { align: 'center' });
      yPos += 15;

      // Employees section
      if (data.employees && data.employees.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Data Karyawan', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['ID', 'Nama', 'Email', 'Posisi', 'Status']],
          body: data.employees.map((emp: any) => [
            emp.employee_id,
            emp.name,
            emp.email || '-',
            emp.position || '-',
            emp.is_active ? 'Aktif' : 'Tidak Aktif'
          ]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [220, 38, 38] }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Admins section
      if (data.admins && data.admins.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Data Admin', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['ID', 'Nama', 'Email', 'Status']],
          body: data.admins.map((admin: any) => [
            admin.admin_id,
            admin.name,
            admin.email || '-',
            admin.is_active ? 'Aktif' : 'Tidak Aktif'
          ]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [220, 38, 38] }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Attendance section
      if (data.attendance && data.attendance.length > 0) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Data Absensi', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['ID Karyawan', 'Clock In', 'Clock Out', 'Status']],
          body: data.attendance.slice(0, 50).map((att: any) => [
            att.employee_id,
            att.clock_in_at ? new Date(att.clock_in_at).toLocaleString('id-ID') : '-',
            att.clock_out_at ? new Date(att.clock_out_at).toLocaleString('id-ID') : '-',
            att.status
          ]),
          theme: 'grid',
          styles: { fontSize: 7 },
          headStyles: { fillColor: [220, 38, 38] }
        });
      }

      // Leave requests section
      if (data.leave_requests && data.leave_requests.length > 0) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Data Permohonan Izin', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['ID Karyawan', 'Jenis', 'Tanggal', 'Status']],
          body: data.leave_requests.map((leave: any) => [
            leave.employee_id,
            leave.leave_type,
            `${new Date(leave.start_date).toLocaleDateString('id-ID')} - ${new Date(leave.end_date).toLocaleDateString('id-ID')}`,
            leave.status === 'pending' ? 'Pending' : leave.status === 'approved' ? 'Disetujui' : 'Ditolak'
          ]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [220, 38, 38] }
        });
      }

      doc.save(`backup-malaka-${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification('Backup PDF berhasil diunduh', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showNotification('Terjadi kesalahan saat membuat backup PDF', 'error');
    }
  };

  const handleDeleteAllEmployees = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus SEMUA data karyawan? Tindakan ini tidak dapat dibatalkan!')) {
      return;
    }

    try {
      const response = await fetch('/api/employees/delete-all', {
        method: 'DELETE',
      });

      if (response.ok) {
        showNotification('Semua data karyawan berhasil dihapus', 'success');
      } else {
        showNotification('Gagal menghapus data karyawan', 'error');
      }
    } catch (err) {
      showNotification('Terjadi kesalahan', 'error');
    }
  };

  const handleDeleteAllAdmins = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus SEMUA data admin? Tindakan ini tidak dapat dibatalkan!')) {
      return;
    }

    try {
      const response = await fetch('/api/admins/delete-all', {
        method: 'DELETE',
      });

      if (response.ok) {
        showNotification('Semua data admin berhasil dihapus', 'success');
        loadAdmins();
      } else {
        showNotification('Gagal menghapus data admin', 'error');
      }
    } catch (err) {
      showNotification('Terjadi kesalahan', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Management */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Manajemen Admin</h3>
          <button
            onClick={() => {
              setEditingAdmin(null);
              setFormData({
                admin_id: '',
                name: '',
                email: '',
                password: '',
              });
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            {t('addAdmin')}
          </button>
        </div>

        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{t('adminId')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{t('name')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{t('email')}</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 font-medium">{admin.admin_id}</td>
                      <td className="px-6 py-4">{admin.name}</td>
                      <td className="px-6 py-4">{admin.email || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(admin)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(admin.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* System Actions */}
      <div className={`rounded-2xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className="text-xl font-bold mb-4">Aksi Sistem</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleBackupExcel}
            className="flex items-center gap-3 p-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <div className="text-left">
              <p className="font-semibold">Backup Excel</p>
              <p className="text-xs text-green-100">Unduh data dalam format Excel</p>
            </div>
          </button>

          <button
            onClick={handleBackupPDF}
            className="flex items-center gap-3 p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-5 h-5" />
            <div className="text-left">
              <p className="font-semibold">Backup PDF</p>
              <p className="text-xs text-blue-100">Unduh data dalam format PDF</p>
            </div>
          </button>

          <button
            onClick={handleDeleteAllEmployees}
            className="flex items-center gap-3 p-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
          >
            <AlertTriangle className="w-5 h-5" />
            <div className="text-left">
              <p className="font-semibold">{t('deleteAllEmployees')}</p>
              <p className="text-xs text-orange-100">Hapus semua data karyawan</p>
            </div>
          </button>

          <button
            onClick={handleDeleteAllAdmins}
            className="flex items-center gap-3 p-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="w-5 h-5" />
            <div className="text-left">
              <p className="font-semibold">{t('deleteAllAdmins')}</p>
              <p className="text-xs text-red-100">Hapus semua data admin</p>
            </div>
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-6">
                {editingAdmin ? 'Edit Admin' : t('addAdmin')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('adminId')}</label>
                  <input
                    type="text"
                    required
                    value={formData.admin_id}
                    onChange={(e) => setFormData({ ...formData, admin_id: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    disabled={!!editingAdmin}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('name')}</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('password')} {editingAdmin && '(kosongkan jika tidak diubah)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingAdmin}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full px-4 py-3 pr-12 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`flex-1 py-3 rounded-xl font-semibold ${
                      isDarkMode
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg"
                  >
                    {t('save')}
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
