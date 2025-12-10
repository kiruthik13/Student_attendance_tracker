import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaGraduationCap, FaUsers, FaCalendarCheck, FaChartBar, FaSignOutAlt, FaUserPlus, FaClipboardList, FaChartLine, FaPlus, FaList, FaUserGraduate, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { MdDashboard, MdSchool, MdAssessment } from 'react-icons/md';
import StudentList from '../Students/StudentList';
import StudentForm from '../Students/StudentForm';
import StudentDetail from '../Students/StudentDetail';
import AttendanceMarking from '../Attendance/AttendanceMarking';
import AttendanceReport from '../Attendance/AttendanceReport';
import SubjectManagementPage from '../Marks/SubjectManagementPage';
import MarksEntryPage from '../Marks/MarksEntryPage';
import ConsolidatedMarksPage from '../Marks/ConsolidatedMarksPage';
import { API_ENDPOINTS } from '../../config/api';
import { getStudents, getAttendanceToday, getHealth } from '../../utils/api';
import './Dashboard.css';

const AdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentStudents: 0,
    absentStudents: 0,
    studentsWithNoAttendance: 0,
    attendanceRate: 0,
    totalPresentPeriods: 0,
    totalMarkedPeriods: 0
  });
  const [last7Days, setLast7Days] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      toast.error('Please login to access the dashboard');
      navigate('/login', { replace: true });
      return;
    }

    // Handle Routing based on URL
    const path = window.location.pathname;
    if (path.includes('/subjects')) setCurrentView('subjects');
    else if (path.includes('/marks-entry')) setCurrentView('marks-entry');
    else if (path.includes('/marks-consolidated')) setCurrentView('marks-consolidated');
    // else default or keep current

    fetchDashboardStats();
  }, [navigate, window.location.pathname]);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('No token found');
        toast.error('Authentication required. Please login again.');
        handleLogout();
        return;
      }

      console.log('Fetching dashboard stats using fallback method');

      // Test API connection first
      await testAPIConnection();

      // Use the fallback method directly since the new endpoint isn't working
      await fetchDashboardStatsFallback();

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testAPIConnection = async () => {
    try {
      console.log('Testing API connection...');
      const token = localStorage.getItem('token');
      console.log('Token available:', !!token);

      // Test the API configuration first
      console.log('API Configuration test:', {
        API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'Not set',
        isDevelopment: import.meta.env.DEV,
        NODE_ENV: process.env.NODE_ENV,
        endpoints: {
          health: API_ENDPOINTS.HEALTH,
          students: API_ENDPOINTS.STUDENTS
        }
      });

      const healthData = await getHealth();
      console.log('Health check data:', healthData);

    } catch (error) {
      console.error('API connection test failed:', error);
      toast.error('Cannot connect to backend server. Please check your internet connection.');
    }
  };

  const fetchDashboardStatsFallback = async () => {
    try {
      console.log('Fetching students and attendance data...');
      console.log('Using API endpoints:', {
        students: API_ENDPOINTS.STUDENTS,
        attendance: API_ENDPOINTS.ATTENDANCE_TODAY
      });

      const [studentsData, attendanceData] = await Promise.all([
        getStudents(),
        getAttendanceToday()
      ]);

      console.log('Students data:', studentsData);
      console.log('Attendance data:', attendanceData);

      const totalStudents = studentsData.students?.length || 0;
      const allAttendanceRecords = attendanceData.attendance || [];

      // Filter for today's attendance only
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      const todayAttendanceRecords = allAttendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        const recordDateString = recordDate.toISOString().split('T')[0];
        return recordDateString === todayString;
      });

      console.log(`Total students: ${totalStudents}`);
      console.log(`Total attendance records: ${allAttendanceRecords.length}`);
      console.log(`Today's attendance records: ${todayAttendanceRecords.length}`);
      console.log(`Today's date: ${todayString}`);

      // Process today's attendance data
      let presentStudents = 0;
      let absentStudents = 0;
      let totalPresentPeriods = 0;
      let totalMarkedPeriods = 0;
      let studentsWithNoAttendance = 0;

      // Create a map of student attendance for today only
      const studentAttendanceMap = {};

      todayAttendanceRecords.forEach(record => {
        const studentId = record.student?._id || record.student;
        if (!studentAttendanceMap[studentId]) {
          studentAttendanceMap[studentId] = {
            presentPeriods: 0,
            totalPeriods: 0,
            hasAnyAttendance: false
          };
        }

        // Count periods based on the attendance record structure
        if (record.forenoon && record.forenoon.periods) {
          record.forenoon.periods.forEach(period => {
            studentAttendanceMap[studentId].totalPeriods++;
            studentAttendanceMap[studentId].hasAnyAttendance = true;
            if (period.status === 'present') {
              studentAttendanceMap[studentId].presentPeriods++;
            }
          });
        }

        if (record.afternoon && record.afternoon.periods) {
          record.afternoon.periods.forEach(period => {
            studentAttendanceMap[studentId].totalPeriods++;
            studentAttendanceMap[studentId].hasAnyAttendance = true;
            if (period.status === 'present') {
              studentAttendanceMap[studentId].presentPeriods++;
            }
          });
        }
      });

      console.log('Today\'s student attendance map:', studentAttendanceMap);

      // Calculate statistics for today only
      studentsData.students.forEach(student => {
        const studentId = student._id;
        const studentData = studentAttendanceMap[studentId];

        if (studentData && studentData.hasAnyAttendance) {
          totalPresentPeriods += studentData.presentPeriods;
          totalMarkedPeriods += studentData.totalPeriods;

          // A student is considered present if they have at least one present period today
          if (studentData.presentPeriods > 0) {
            presentStudents++;
          } else {
            absentStudents++;
          }
        } else {
          studentsWithNoAttendance++;
        }
      });

      // Calculate attendance rate for today
      const attendanceRate = totalMarkedPeriods > 0
        ? Math.round((totalPresentPeriods / totalMarkedPeriods) * 100)
        : 0;

      const statsData = {
        totalStudents,
        presentStudents,
        absentStudents,
        studentsWithNoAttendance,
        attendanceRate,
        totalPresentPeriods,
        totalMarkedPeriods
      };

      console.log('Calculated today\'s stats:', statsData);

      setStats(statsData);
      setLast7Days([]);
      setLastUpdated(new Date().toISOString());

    } catch (error) {
      console.error('Fallback dashboard stats error:', error);
      toast.error('Failed to load dashboard data: ' + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    localStorage.removeItem('adminId');
    if (typeof onLogout === 'function') {
      onLogout();
    }
    navigate('/login', { replace: true });
  };

  const refreshDashboard = () => {
    fetchDashboardStats();
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleNavigation = (viewId) => {
    setCurrentView(viewId);
    // Optional: Sync URL
    if (viewId === 'subjects') navigate('/admin/subjects');
    else if (viewId === 'marks-entry') navigate('/admin/marks-entry');
    else if (viewId === 'marks-consolidated') navigate('/admin/marks-consolidated');
    // For others, maybe keep at /dashboard or specific routes if needed.
    // But for now, we only enforcing the new routes.
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <MdDashboard /> },
    { id: 'students', label: 'Students', icon: <FaUsers /> },
    { id: 'add-student', label: 'Add Student', icon: <FaUserPlus /> },
    { id: 'attendance', label: 'Mark Attendance', icon: <FaCalendarCheck /> },
    { id: 'reports', label: 'Reports', icon: <MdAssessment /> },
    { id: 'subjects', label: 'Subjects', icon: <FaList /> },
    { id: 'marks-entry', label: 'Enter Marks', icon: <FaClipboardList /> },
    { id: 'marks-consolidated', label: 'Consolidated View', icon: <FaChartLine /> },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="main-content">
            <div className="content-header">
              <h1 className="welcome-message">Welcome to Student Attendance Tracker</h1>
              <p className="welcome-subtitle">Manage your students and track attendance efficiently</p>
              <div className="dashboard-info">
                <p className="today-date">Today: {getTodayDate()}</p>
                {lastUpdated && (
                  <p className="last-updated">Last updated: {new Date(lastUpdated).toLocaleString()}</p>
                )}
                <button
                  className="refresh-btn"
                  onClick={refreshDashboard}
                  disabled={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Total Students</span>
                  <div className="stat-icon">
                    <FaGraduationCap />
                  </div>
                </div>
                <div className="stat-value">{stats.totalStudents}</div>
                <div className="stat-description">Registered students</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Present Today</span>
                  <div className="stat-icon present">
                    <FaCalendarCheck />
                  </div>
                </div>
                <div className="stat-value">{stats.presentStudents}</div>
                <div className="stat-description">Students present today</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Absent Today</span>
                  <div className="stat-icon absent">
                    <FaExclamationTriangle />
                  </div>
                </div>
                <div className="stat-value">{stats.absentStudents}</div>
                <div className="stat-description">Students absent today</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Attendance Rate</span>
                  <div className="stat-icon">
                    <FaChartBar />
                  </div>
                </div>
                <div className="stat-value">{stats.attendanceRate}%</div>
                <div className="stat-description">Today's attendance rate</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Not Marked</span>
                  <div className="stat-icon pending">
                    <FaClock />
                  </div>
                </div>
                <div className="stat-value">{stats.studentsWithNoAttendance}</div>
                <div className="stat-description">Students not marked</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Periods Marked</span>
                  <div className="stat-icon">
                    <FaClipboardList />
                  </div>
                </div>
                <div className="stat-value">{stats.totalMarkedPeriods}</div>
                <div className="stat-description">Total periods marked today</div>
              </div>
            </div>

            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">
                  <div className="section-icon">
                    <MdSchool />
                  </div>
                  Quick Actions
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <button
                  className="action-button"
                  onClick={() => setCurrentView('add-student')}
                >
                  <FaUserPlus />
                  Add New Student
                </button>
                <button
                  className="action-button"
                  onClick={() => setCurrentView('attendance')}
                >
                  <FaCalendarCheck />
                  Mark Attendance
                </button>
                <button
                  className="action-button"
                  onClick={() => setCurrentView('students')}
                >
                  <FaUsers />
                  View Students
                </button>
                <button
                  className="action-button"
                  onClick={() => setCurrentView('reports')}
                >
                  <FaChartBar />
                  View Reports
                </button>
                <button
                  className="action-button"
                  onClick={() => handleNavigation('subjects')}
                >
                  <FaList />
                  Manage Subjects
                </button>
                <button
                  className="action-button"
                  onClick={() => handleNavigation('marks-entry')}
                >
                  <FaClipboardList />
                  Enter Marks
                </button>
              </div>
            </div>
          </div>
        );

      case 'students':
        return (
          <div className="main-content">
            <div className="content-header">
              <h1 className="welcome-message">Student Management</h1>
              <p className="welcome-subtitle">View and manage all registered students</p>
            </div>
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">
                  <div className="section-icon">
                    <FaUsers />
                  </div>
                  Students List
                </h2>
                <button
                  className="action-button"
                  onClick={() => setCurrentView('add-student')}
                >
                  <FaUserPlus />
                  Add Student
                </button>
              </div>
              <StudentList
                onViewStudent={(student) => {
                  setSelectedStudent(student);
                  setCurrentView('student-detail');
                }}
                onEditStudent={(student) => {
                  setSelectedStudent(student);
                  setCurrentView('edit-student');
                }}
              />
            </div>
          </div>
        );

      case 'add-student':
        return (
          <div className="main-content">
            <div className="content-header">
              <h1 className="welcome-message">Add New Student</h1>
              <p className="welcome-subtitle">Register a new student in the system</p>
            </div>
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">
                  <div className="section-icon">
                    <FaUserPlus />
                  </div>
                  Student Registration Form
                </h2>
              </div>
              <StudentForm
                onSave={(student) => {
                  setCurrentView('students');
                  fetchDashboardStats();
                }}
                onCancel={() => setCurrentView('students')}
              />
            </div>
          </div>
        );

      case 'edit-student':
        return (
          <div className="main-content">
            <div className="content-header">
              <h1 className="welcome-message">Edit Student</h1>
              <p className="welcome-subtitle">Update student information</p>
            </div>
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">
                  <div className="section-icon">
                    <FaUsers />
                  </div>
                  Edit Student Form
                </h2>
              </div>
              <StudentForm
                student={selectedStudent}
                onSave={(student) => {
                  setCurrentView('students');
                  setSelectedStudent(null);
                  fetchDashboardStats();
                }}
                onCancel={() => {
                  setCurrentView('students');
                  setSelectedStudent(null);
                }}
              />
            </div>
          </div>
        );

      case 'student-detail':
        return (
          <div className="main-content">
            <div className="content-header">
              <h1 className="welcome-message">Student Details</h1>
              <p className="welcome-subtitle">View detailed information about the student</p>
            </div>
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">
                  <div className="section-icon">
                    <FaGraduationCap />
                  </div>
                  Student Information
                </h2>
                <button
                  className="action-button secondary"
                  onClick={() => setCurrentView('students')}
                >
                  Back to Students
                </button>
              </div>
              <StudentDetail
                student={selectedStudent}
                onEdit={() => setCurrentView('edit-student')}
                onBack={() => {
                  setCurrentView('students');
                  setSelectedStudent(null);
                }}
              />
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="main-content">
            <div className="content-header">
              <h1 className="welcome-message">Attendance Management</h1>
              <p className="welcome-subtitle">Mark and manage student attendance</p>
            </div>
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">
                  <div className="section-icon">
                    <FaCalendarCheck />
                  </div>
                  Mark Attendance
                </h2>
              </div>
              <AttendanceMarking
                onSuccess={() => {
                  fetchDashboardStats();
                }}
              />
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="main-content">
            <div className="content-header">
              <h1 className="welcome-message">Attendance Reports</h1>
              <p className="welcome-subtitle">Generate and view attendance reports</p>
            </div>
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">
                  <div className="section-icon">
                    <FaChartBar />
                  </div>
                  Reports Dashboard
                </h2>
              </div>
              <AttendanceReport />
            </div>
          </div>
        );

      case 'subjects':
        return (
          <div className="main-content">
            <SubjectManagementPage />
          </div>
        );

      case 'marks-entry':
        return (
          <div className="main-content">
            <MarksEntryPage />
          </div>
        );

      case 'marks-consolidated':
        return (
          <div className="main-content">
            <ConsolidatedMarksPage />
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="college-logo-section">
            <div className="college-logo">
              <FaGraduationCap />
            </div>
            <div className="college-info">
              <h2 className="college-name">KONGU ENGINEERING COLLEGE</h2>
              <p className="college-subtitle">(Autonomous)</p>
              <p className="college-details">Affiliated to Anna University | Accredited by NAAC with A++ Grade</p>
              <p className="college-address">Perundurai Erode - 638060 Tamilnadu India</p>
            </div>
          </div>
        </div>

        <nav>
          <ul className="nav-menu">
            {navigationItems.map((item) => (
              <li key={item.id} className="nav-item">
                <button
                  className={`nav-link ${currentView === item.id ? 'active' : ''}`}
                  onClick={() => handleNavigation(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt />
          Logout
        </button>
      </aside>

      {renderContent()}
    </div>
  );
};

export default AdminDashboard; 