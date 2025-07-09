import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaCalendar, FaUsers, FaDownload, FaFilter, FaChartBar } from 'react-icons/fa';
import { API_ENDPOINTS } from '../../config/api';
import './Attendance.css';

const AttendanceReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [reportType, setReportType] = useState('daily'); // daily, student, class
  const [selectedSession, setSelectedSession] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchSections();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent && startDate && endDate) {
      fetchStudentAttendance();
    } else if (selectedClass && selectedSection && selectedDate) {
      fetchAttendanceReport();
    }
  }, [selectedClass, selectedSection, selectedDate, selectedSession, selectedStudent, reportType, startDate, endDate]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.STUDENT_CLASSES, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.STUDENT_SECTIONS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSections(data.sections);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        className: selectedClass,
        section: selectedSection,
        isActive: 'true'
      });
      const response = await fetch(`${API_ENDPOINTS.STUDENTS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
      }
    } catch (error) {
      // ignore
    }
  };

  const fetchAttendanceReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        className: selectedClass,
        section: selectedSection,
        date: selectedDate
      });
      if (selectedSession) params.append('session', selectedSession);
      if (selectedStudent) params.append('studentId', selectedStudent);
      const response = await fetch(`${API_ENDPOINTS.ATTENDANCE_CLASS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data.attendance);
      } else {
        toast.error('Failed to fetch attendance report');
      }
    } catch (error) {
      toast.error('Error fetching attendance report');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAttendance = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate,
        endDate
      });
      const response = await fetch(`${API_ENDPOINTS.ATTENDANCE_MARK.replace('/mark','/student')}/${selectedStudent}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data.attendance);
      } else {
        toast.error('Failed to fetch student attendance');
      }
    } catch (error) {
      toast.error('Error fetching student attendance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusCounts = () => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      'half-day': 0,
      total: reports.length
    };

    reports.forEach(record => {
      if (counts.hasOwnProperty(record.status)) {
        counts[record.status]++;
      }
    });

    return counts;
  };

  const getStatusPercentage = (count, total) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <FaCalendar className="status-icon present" />;
      case 'absent':
        return <FaCalendar className="status-icon absent" />;
      case 'late':
        return <FaCalendar className="status-icon late" />;
      case 'half-day':
        return <FaCalendar className="status-icon half-day" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return '#28a745';
      case 'absent':
        return '#dc3545';
      case 'late':
        return '#ffc107';
      case 'half-day':
        return '#fd7e14';
      default:
        return '#6c757d';
    }
  };

  const exportToCSV = () => {
    if (reports.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Roll Number', 'Name', 'Status', 'Remarks', 'Date'];
    const csvData = reports.map(record => [
      record.student.rollNumber,
      record.student.fullName,
      record.status,
      record.remarks || '',
      new Date(record.date).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedClass}_${selectedSection}_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="attendance-report-container">
      <div className="report-header">
        <h2>Attendance Report</h2>
        <div className="header-actions">
          <button className="export-btn" onClick={exportToCSV} disabled={reports.length === 0}>
            <FaDownload /> Export CSV
          </button>
        </div>
      </div>

      <div className="report-filters">
        <div className="filter-group">
          <label htmlFor="reportClass">Class</label>
          <select
            id="reportClass"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="reportSection">Section</label>
          <select
            id="reportSection"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="">Select Section</option>
            {sections.map((section) => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="reportDate">Date</label>
          <input
            type="date"
            id="reportDate"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="reportSession">Session</label>
          <select
            id="reportSession"
            value={selectedSession}
            onChange={e => setSelectedSession(e.target.value)}
          >
            <option value="">All</option>
            <option value="forenoon">Forenoon</option>
            <option value="afternoon">Afternoon</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="reportStudent">Student</label>
          <select
            id="reportStudent"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            <option value="">All</option>
            {students.map((student) => (
              <option key={student._id} value={student._id}>{student.fullName} ({student.rollNumber})</option>
            ))}
          </select>
        </div>
        {selectedStudent && (
          <>
            <div className="filter-group">
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {selectedClass && selectedSection && selectedDate && (
        <div className="report-summary">
          <div className="summary-cards">
            <div className="summary-card total">
              <div className="card-icon">
                <FaChartBar />
              </div>
              <div className="card-content">
                <h3>{statusCounts.total}</h3>
                <p>Total Students</p>
              </div>
            </div>

            <div className="summary-card present">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{statusCounts.present}</h3>
                <p>Present ({getStatusPercentage(statusCounts.present, statusCounts.total)}%)</p>
              </div>
            </div>

            <div className="summary-card absent">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{statusCounts.absent}</h3>
                <p>Absent ({getStatusPercentage(statusCounts.absent, statusCounts.total)}%)</p>
              </div>
            </div>

            <div className="summary-card late">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{statusCounts.late}</h3>
                <p>Late ({getStatusPercentage(statusCounts.late, statusCounts.total)}%)</p>
              </div>
            </div>

            <div className="summary-card half-day">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{statusCounts['half-day']}</h3>
                <p>Half-Day ({getStatusPercentage(statusCounts['half-day'], statusCounts.total)}%)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-message">
          Loading attendance report...
        </div>
      )}

      {reports.length > 0 && (
        <div className="report-table-container">
          <h3>Detailed Report - {selectedClass}-{selectedSection} ({selectedDate})</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Name</th>
                <th>Status</th>
                <th>Session</th>
                <th>Date</th>
                <th>Remarks</th>
                <th>Marked By</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((record) => (
                <tr key={record._id}>
                  <td>{record.student.rollNumber}</td>
                  <td>{record.student.fullName}</td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(record.status),
                        color: 'white'
                      }}
                    >
                      {getStatusIcon(record.status)}
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </td>
                  <td>{record.session ? record.session.charAt(0).toUpperCase() + record.session.slice(1) : '-'}</td>
                  <td>{new Date(record.date).toLocaleDateString()}</td>
                  <td>{record.remarks || '-'}</td>
                  <td>{record.markedBy?.fullName || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reports.length === 0 && !loading && selectedClass && selectedSection && selectedDate && (
        <div className="no-data">
          <FaFilter />
          <p>No attendance records found for {selectedClass}-{selectedSection} on {selectedDate}</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport; 