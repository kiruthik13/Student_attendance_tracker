// API Configuration
const API_BASE_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Admin endpoints
  ADMIN_LOGIN: `${API_BASE_URL}/api/admin/login`,
  ADMIN_REGISTER: `${API_BASE_URL}/api/admin/register`,
  ADMIN_PROFILE: `${API_BASE_URL}/api/admin/profile`,
  
  // Student endpoints
  STUDENTS: `${API_BASE_URL}/api/students`,
  STUDENT_CLASSES: `${API_BASE_URL}/api/students/classes/list`,
  STUDENT_SECTIONS: `${API_BASE_URL}/api/students/sections/list`,
  
  // Attendance endpoints
  ATTENDANCE_MARK: `${API_BASE_URL}/api/attendance/mark`,
  ATTENDANCE_BULK_MARK: `${API_BASE_URL}/api/attendance/bulk-mark`,
  ATTENDANCE_TODAY: `${API_BASE_URL}/api/attendance/today`,
  ATTENDANCE_CLASS: `${API_BASE_URL}/api/attendance/class`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/api/health`
};

export default API_BASE_URL; 