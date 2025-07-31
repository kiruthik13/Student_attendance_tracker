import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaGraduationCap, FaUsers, FaCalendarCheck, FaChartBar, FaSignOutAlt, FaUserPlus, FaClipboardList, FaChartLine, FaPlus, FaList, FaUserGraduate } from 'react-icons/fa';
import { MdDashboard, MdSchool, MdAssessment } from 'react-icons/md';
import StudentList from '../Students/StudentList';
import StudentForm from '../Students/StudentForm';
import StudentDetail from '../Students/StudentDetail';
import AttendanceMarking from '../Attendance/AttendanceMarking';
import AttendanceReport from '../Attendance/AttendanceReport';
import { API_ENDPOINTS } from '../../config/api';
import './Dashboard.css';

const AdminDashboard = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const [studentsResponse, attendanceResponse] = await Promise.all([
        fetch(API_ENDPOINTS.STUDENTS, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(API_ENDPOINTS.ATTENDANCE_TODAY, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const studentsData = await studentsResponse.json();
      const attendanceData = await attendanceResponse.json();

      const totalStudents = studentsData.students?.length || 0;
      const attendanceRecords = attendanceData.attendance || [];

      // Group attendance by student
      const studentAttendanceMap = {};
      attendanceRecords.forEach(a => {
        const sid = a.student?._id || a.student;
        if (!studentAttendanceMap[sid]) studentAttendanceMap[sid] = [];
        studentAttendanceMap[sid].push(a);
      });

      let presentToday = 0;
      let absentToday = 0;
      let totalPresentPeriods = 0;
      let totalMarkedPeriods = 0;

      studentsData.students.forEach(student => {
        const sid = student._id;
        const records = studentAttendanceMap[sid] || [];
        // For this student, count periods
        let studentPresentPeriods = 0;
        let studentMarkedPeriods = 0;
        records.forEach(r => {
          if (["present", "late", "half-day"].includes(r.status)) {
            studentPresentPeriods++;
          }
          if (["present", "late", "half-day", "absent"].includes(r.status)) {
            studentMarkedPeriods++;
          }
        });
        totalPresentPeriods += studentPresentPeriods;
        totalMarkedPeriods += studentMarkedPeriods;

        if (studentPresentPeriods > 0) {
          presentToday++;
        }
      });

      absentToday = totalStudents - presentToday;

      // Attendance rate: present periods / total marked periods
      const attendanceRate = totalMarkedPeriods > 0
        ? Math.round((totalPresentPeriods / totalMarkedPeriods) * 100)
        : 0;

      setStats({
        totalStudents,
        presentToday,
        absentToday,
        attendanceRate
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminId');
    window.location.href = '/';
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <MdDashboard /> },
    { id: 'students', label: 'Students', icon: <FaUsers /> },
    { id: 'add-student', label: 'Add Student', icon: <FaUserPlus /> },
    { id: 'attendance', label: 'Mark Attendance', icon: <FaCalendarCheck /> },
    { id: 'reports', label: 'Reports', icon: <MdAssessment /> },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="main-content">
            <div className="content-header">
              <h1 className="welcome-message">Welcome to Student Attendance Tracker</h1>
              <p className="welcome-subtitle">Manage your students and track attendance efficiently</p>
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
                  <div className="stat-icon">
                    <FaCalendarCheck />
                  </div>
                </div>
                <div className="stat-value">{stats.presentToday}</div>
                <div className="stat-description">Students present today</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Absent Today</span>
                  <div className="stat-icon">
                    <FaClipboardList />
                  </div>
                </div>
                <div className="stat-value">{stats.absentToday}</div>
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
                onSuccess={() => {
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
                onSuccess={() => {
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
                  onClick={() => setCurrentView(item.id)}
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