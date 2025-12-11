import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserGraduate, FaCalendarCheck, FaBook, FaChartLine, FaFilePdf, FaFileExcel, FaUser, FaSignOutAlt, FaBolt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../config/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

    const handleDownloadPDF = async () => {
        try {
            toast.info('Generating PDF report...');

            // Fetch detailed student data
            const token = localStorage.getItem('token');
            const studentData = JSON.parse(localStorage.getItem('user') || '{}');

            // Create new PDF document
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Colors
            const primaryColor = [102, 126, 234]; // #667eea
            const secondaryColor = [118, 75, 162]; // #764ba2
            const textDark = [51, 51, 51];
            const textLight = [102, 102, 102];

            // === HEADER SECTION ===
            // Gradient background (simulated with rectangles)
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, pageWidth, 45, 'F');

            // College name
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('KONGU ENGINEERING COLLEGE', pageWidth / 2, 15, { align: 'center' });

            // Subtitle
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('(Autonomous)', pageWidth / 2, 22, { align: 'center' });
            doc.text('Affiliated to Anna University | Accredited by NAAC with A++ Grade', pageWidth / 2, 28, { align: 'center' });
            doc.text('Perundurai, Erode - 638060, Tamil Nadu, India', pageWidth / 2, 34, { align: 'center' });

            // Report title
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('STUDENT ACADEMIC REPORT', pageWidth / 2, 42, { align: 'center' });

            // === STUDENT INFORMATION SECTION ===
            let yPos = 55;

            // Section title
            doc.setFillColor(240, 240, 250);
            doc.rect(10, yPos, pageWidth - 20, 8, 'F');
            doc.setTextColor(textDark[0], textDark[1], textDark[2]);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('📋 Student Information', 15, yPos + 5.5);

            yPos += 12;

            // Student details
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const studentInfo = [
                ['Full Name:', studentName || 'N/A'],
                ['Roll Number:', studentData.rollNumber || 'N/A'],
                ['Class:', studentData.className || 'N/A'],
                ['Section:', studentData.section || 'N/A'],
                ['Email:', studentData.email || 'N/A']
            ];

            studentInfo.forEach(([label, value]) => {
                doc.setFont('helvetica', 'bold');
                doc.text(label, 15, yPos);
                doc.setFont('helvetica', 'normal');
                doc.text(value, 60, yPos);
                yPos += 6;
            });

            yPos += 5;

            // === ATTENDANCE SUMMARY SECTION ===
            doc.setFillColor(240, 240, 250);
            doc.rect(10, yPos, pageWidth - 20, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('📊 Attendance Summary', 15, yPos + 5.5);

            yPos += 12;

            // Attendance statistics
            const attendancePercentage = stats?.attendancePercentage || 0;
            const totalDays = stats?.totalDays || 0;
            const presentDays = Math.round((attendancePercentage / 100) * totalDays);
            const absentDays = totalDays - presentDays;

            // Attendance percentage with color indicator
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Attendance Percentage:', 15, yPos);

            // Color code based on percentage
            if (attendancePercentage >= 75) {
                doc.setTextColor(40, 167, 69); // Green
            } else if (attendancePercentage >= 50) {
                doc.setTextColor(255, 193, 7); // Yellow
            } else {
                doc.setTextColor(220, 53, 69); // Red
            }
            doc.setFontSize(14);
            doc.text(`${attendancePercentage}%`, 70, yPos);

            doc.setTextColor(textDark[0], textDark[1], textDark[2]);
            yPos += 8;

            // Attendance details table
            doc.autoTable({
                startY: yPos,
                head: [['Metric', 'Value']],
                body: [
                    ['Total Days', totalDays.toString()],
                    ['Present Days', presentDays.toString()],
                    ['Absent Days', absentDays.toString()],
                    ['Attendance %', `${attendancePercentage}%`]
                ],
                theme: 'grid',
                headStyles: {
                    fillColor: primaryColor,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 10
                },
                bodyStyles: {
                    fontSize: 9
                },
                alternateRowStyles: {
                    fillColor: [250, 250, 255]
                },
                margin: { left: 15, right: 15 }
            });

            yPos = doc.lastAutoTable.finalY + 10;

            // === MARKS SUMMARY SECTION ===
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFillColor(240, 240, 250);
            doc.rect(10, yPos, pageWidth - 20, 8, 'F');
            doc.setTextColor(textDark[0], textDark[1], textDark[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('📚 Academic Performance', 15, yPos + 5.5);

            yPos += 12;

            // Total subjects and marks
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Total Subjects: ${stats?.totalSubjects || 0}`, 15, yPos);
            doc.text(`Total Marks: ${stats?.totalMarks || 0}`, 100, yPos);

            yPos += 8;

            // Sample marks table (you can fetch real data from API)
            const marksData = [
                ['Mathematics', '85', 'A'],
                ['Physics', '78', 'B+'],
                ['Chemistry', '92', 'A+'],
                ['Computer Science', '88', 'A'],
                ['English', '75', 'B+']
            ];

            doc.autoTable({
                startY: yPos,
                head: [['Subject', 'Marks', 'Grade']],
                body: marksData,
                theme: 'grid',
                headStyles: {
                    fillColor: primaryColor,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 10
                },
                bodyStyles: {
                    fontSize: 9
                },
                alternateRowStyles: {
                    fillColor: [250, 250, 255]
                },
                margin: { left: 15, right: 15 }
            });

            // === FOOTER SECTION ===
            const finalY = doc.lastAutoTable.finalY || yPos;
            const footerY = pageHeight - 25;

            // Divider line
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

            // Generated timestamp
            doc.setFontSize(8);
            doc.setTextColor(textLight[0], textLight[1], textLight[2]);
            doc.setFont('helvetica', 'normal');
            const generatedDate = new Date().toLocaleString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            doc.text(`Generated on: ${generatedDate}`, 15, footerY);

            // Copyright
            doc.text('© 2024 Kongu Engineering College. All rights reserved.', pageWidth / 2, footerY + 5, { align: 'center' });

            // Page number
            doc.text(`Page 1 of 1`, pageWidth - 15, footerY, { align: 'right' });

            // === SAVE PDF ===
            const fileName = `Student_Report_${studentData.rollNumber || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            toast.success('PDF report downloaded successfully!');

        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('Failed to generate PDF report. Please try again.');
        }
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
