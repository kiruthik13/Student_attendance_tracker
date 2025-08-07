// API Configuration
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isDevelopment 
  ? 'http://localhost:5000' 
  : 'https://student-attendance-tracker-1-n2l2.onrender.com');

console.log('API Configuration:', {
  isDevelopment,
  API_BASE_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  importMetaEnv: import.meta.env
});

export const API_ENDPOINTS = {
  // Admin endpoints
  ADMIN_LOGIN: `${API_BASE_URL}/api/admin/login`,
  ADMIN_REGISTER: `${API_BASE_URL}/api/admin/register`,
  ADMIN_PROFILE: `${API_BASE_URL}/api/admin/profile`,
  ADMIN_FORGOT_PASSWORD: `${API_BASE_URL}/api/admin/forgot-password`,
  ADMIN_RESET_PASSWORD: `${API_BASE_URL}/api/admin/reset-password`,
  
  // Student endpoints
  STUDENTS: `${API_BASE_URL}/api/students`,
  STUDENT_CLASSES: `${API_BASE_URL}/api/students/classes/list`,
  STUDENT_SECTIONS: `${API_BASE_URL}/api/students/sections/list`,
  
  // Attendance endpoints
  ATTENDANCE_MARK: `${API_BASE_URL}/api/attendance/mark`,
  ATTENDANCE_BULK_MARK: `${API_BASE_URL}/api/attendance/bulk-mark`,
  ATTENDANCE_TODAY: `${API_BASE_URL}/api/attendance/today`,
  ATTENDANCE_CLASS: `${API_BASE_URL}/api/attendance/class`,
  ATTENDANCE_RANGE_REPORT: `${API_BASE_URL}/api/attendance/range-report`,
  ATTENDANCE_DATE_RANGE_REPORT: `${API_BASE_URL}/api/attendance/date-range-report`,
  ATTENDANCE_EXPORT_DATE_RANGE_EXCEL: `${API_BASE_URL}/api/attendance/export-date-range-excel`,
  ATTENDANCE_DASHBOARD_STATS: `${API_BASE_URL}/api/attendance/dashboard-stats`,
  ATTENDANCE_SEND_CSV_REPORT: `${API_BASE_URL}/api/attendance/send-csv-report`,
  ATTENDANCE_DEBUG: `${API_BASE_URL}/api/attendance/debug-attendance`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/api/health`,
  ATTENDANCE_HEALTH: `${API_BASE_URL}/api/attendance/health`
};

export default API_BASE_URL; 