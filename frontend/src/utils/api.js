// API utility functions
import { API_ENDPOINTS } from '../config/api';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  console.log('API Call:', {
    endpoint,
    token: token ? 'Present' : 'Missing',
    options
  });
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    console.log('API Response:', {
      url: endpoint,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('adminId');
        window.location.href = '/login';
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('API Call Error:', {
      endpoint,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export const getStudents = () => apiCall(API_ENDPOINTS.STUDENTS);
export const getStudentClasses = () => apiCall(API_ENDPOINTS.STUDENT_CLASSES);
export const getStudentSections = () => apiCall(API_ENDPOINTS.STUDENT_SECTIONS);
export const getAttendanceToday = () => apiCall(API_ENDPOINTS.ATTENDANCE_TODAY);
export const getHealth = () => apiCall(API_ENDPOINTS.HEALTH);
