import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserGraduate, FaCalendarCheck, FaBook, FaChartLine, FaFilePdf, FaFileExcel, FaUser, FaSignOutAlt, FaBolt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../config/api';
import './StudentDashboard.css';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_ENDPOINTS.STUDENT_DASHBOARD, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data.stats);
                setStudentName(data.studentName);
            } else {
                toast.error('Failed to load dashboard data');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.info('Logged out successfully');
        navigate('/login');
    };

    const handleDownloadPDF = () => {
        toast.info('PDF Download feature coming soon!');
    };

    const handleDownloadExcel = () => {
        toast.info('Excel Download feature coming soon!');
    };

    if (loading) return (
        <div className="student-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div className="student-dashboard">
            {/* Navbar */}
            <nav className="student-navbar">
                <div className="nav-brand">
                    <FaUserGraduate />
                    <span>Student Portal</span>
                </div>
                <div className="nav-user">
                    <div className="user-info">
                        <div className="user-avatar">
                            {studentName.charAt(0)}
                        </div>
                        <span>{studentName}</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            </nav>

            <div className="dashboard-content">
                {/* Welcome Hero */}
                <div className="welcome-section">
                    <div className="welcome-text">
                        <h1>Welcome back, {studentName.split(' ')[0]}!</h1>
                        <p>Here's an overview of your academic performance.</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="dashboard-stats">
                    <div className="d-stat-card">
                        <div className="d-icon blue">
                            <FaCalendarCheck />
                        </div>
                        <div className="d-info">
                            <h3>{stats?.attendancePercentage}%</h3>
                            <p>Attendance</p>
                        </div>
                    </div>

                    <div className="d-stat-card">
                        <div className="d-icon green">
                            <FaBook />
                        </div>
                        <div className="d-info">
                            <h3>{stats?.totalSubjects}</h3>
                            <p>Total Subjects</p>
                        </div>
                    </div>

                    <div className="d-stat-card">
                        <div className="d-icon purple">
                            <FaChartLine />
                        </div>
                        <div className="d-info">
                            <h3>{stats?.totalMarks}</h3>
                            <p>Total Marks</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="actions-section">
                    <h2><FaBolt /> Quick Actions</h2>
                    <div className="actions-grid">
                        <button className="action-card-btn" onClick={() => navigate('/student/attendance')}>
                            <div className="action-icon">
                                <FaCalendarCheck />
                            </div>
                            <span className="action-text">View Attendance</span>
                        </button>

                        <button className="action-card-btn" onClick={() => navigate('/student/marks')}>
                            <div className="action-icon">
                                <FaChartLine />
                            </div>
                            <span className="action-text">View Marks</span>
                        </button>

                        <button className="action-card-btn" onClick={() => navigate('/student/profile')}>
                            <div className="action-icon">
                                <FaUser />
                            </div>
                            <span className="action-text">My Profile</span>
                        </button>

                        <button className="action-card-btn" onClick={handleDownloadPDF}>
                            <div className="action-icon" style={{ color: '#e53e3e', background: '#fff5f5' }}>
                                <FaFilePdf />
                            </div>
                            <span className="action-text">Download Report</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
