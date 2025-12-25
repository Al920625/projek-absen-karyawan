import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  language: 'id' | 'en';
  setLanguage: (lang: 'id' | 'en') => void;
  t: (key: string) => string;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  notifications: Notification[];
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const translations = {
  id: {
    dashboard: 'Dashboard',
    employees: 'Data Karyawan',
    attendance: 'Absensi Karyawan',
    leaveRequests: 'Permohonan Izin',
    adminPanel: 'Panel Admin',
    logout: 'Keluar',
    totalEmployees: 'Total Karyawan',
    presentToday: 'Hadir Hari Ini',
    pendingLeave: 'Izin Pending',
    totalAdmins: 'Total Admin',
    addEmployee: 'Tambah Karyawan',
    employeeId: 'ID Karyawan',
    name: 'Nama',
    email: 'Email',
    phone: 'Telepon',
    position: 'Posisi',
    password: 'Password',
    save: 'Simpan',
    cancel: 'Batal',
    edit: 'Edit',
    delete: 'Hapus',
    actions: 'Aksi',
    clockIn: 'Clock In',
    clockOut: 'Clock Out',
    photo: 'Foto',
    date: 'Tanggal',
    time: 'Waktu',
    status: 'Status',
    leaveType: 'Jenis Izin',
    reason: 'Alasan',
    startDate: 'Tanggal Mulai',
    endDate: 'Tanggal Selesai',
    approve: 'Setuju',
    reject: 'Tolak',
    pending: 'Pending',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    addAdmin: 'Tambah Admin',
    adminId: 'ID Admin',
    backupData: 'Backup Data',
    deleteAllEmployees: 'Hapus Semua Karyawan',
    deleteAllAdmins: 'Hapus Semua Admin',
    confirmDelete: 'Apakah Anda yakin ingin menghapus?',
    search: 'Cari',
    noData: 'Tidak ada data',
  },
  en: {
    dashboard: 'Dashboard',
    employees: 'Employee Data',
    attendance: 'Employee Attendance',
    leaveRequests: 'Leave Requests',
    adminPanel: 'Admin Panel',
    logout: 'Logout',
    totalEmployees: 'Total Employees',
    presentToday: 'Present Today',
    pendingLeave: 'Pending Leave',
    totalAdmins: 'Total Admins',
    addEmployee: 'Add Employee',
    employeeId: 'Employee ID',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    position: 'Position',
    password: 'Password',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    actions: 'Actions',
    clockIn: 'Clock In',
    clockOut: 'Clock Out',
    photo: 'Photo',
    date: 'Date',
    time: 'Time',
    status: 'Status',
    leaveType: 'Leave Type',
    reason: 'Reason',
    startDate: 'Start Date',
    endDate: 'End Date',
    approve: 'Approve',
    reject: 'Reject',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    addAdmin: 'Add Admin',
    adminId: 'Admin ID',
    backupData: 'Backup Data',
    deleteAllEmployees: 'Delete All Employees',
    deleteAllAdmins: 'Delete All Admins',
    confirmDelete: 'Are you sure you want to delete?',
    search: 'Search',
    noData: 'No data available',
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedLang = localStorage.getItem('language');
    if (savedTheme === 'dark') setIsDarkMode(true);
    if (savedLang === 'en') setLanguage('en');
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleSetLanguage = (lang: 'id' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.id] || key;
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  return (
    <AppContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        language,
        setLanguage: handleSetLanguage,
        t,
        showNotification,
        notifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
