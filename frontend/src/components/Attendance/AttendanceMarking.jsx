import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaSave, FaCalendar, FaUsers, FaCheck, FaTimes, FaClock, FaMinus, FaEdit } from 'react-icons/fa';
import { API_ENDPOINTS } from '../../config/api';
import './Attendance.css';

const AttendanceMarking = () => {
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState('forenoon');
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchSections();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchStudentsAndAttendance();
    }
  }, [selectedClass, selectedSection, selectedDate, selectedSession]);

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

  // Fetch students and today's attendance for the selected class/section
  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token missing. Please login again.');
        return;
      }

      // Fetch students
      const params = new URLSearchParams({
        className: selectedClass,
        section: selectedSection,
        isActive: 'true'
      });
      
      console.log('Fetching students from:', `${API_ENDPOINTS.STUDENTS}?${params}`);
      const studentsRes = await fetch(`${API_ENDPOINTS.STUDENTS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!studentsRes.ok) {
        console.error('Students API error:', studentsRes.status, studentsRes.statusText);
        toast.error(`Failed to fetch students: ${studentsRes.status} ${studentsRes.statusText}`);
        return;
      }
      
      const studentsData = await studentsRes.json();
      setStudents(studentsData.students);
      
      // Fetch today's attendance for this class/section and session (if you have a session-based GET endpoint, update here)
      // For now, just merge as before
      const attendanceUrl = `${API_ENDPOINTS.ATTENDANCE_CLASS}?className=${selectedClass}&section=${selectedSection}&date=${selectedDate}`;
      console.log('Fetching attendance from:', attendanceUrl);
      
      const attendanceRes = await fetch(attendanceUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!attendanceRes.ok) {
        console.error('Attendance API error:', attendanceRes.status, attendanceRes.statusText);
        toast.error(`Failed to fetch attendance: ${attendanceRes.status} ${attendanceRes.statusText}`);
        return;
      }
      
      const attendanceData = await attendanceRes.json();
      
      // Merge students with attendance, filter by session if available
      const merged = studentsData.students.map(student => {
        const att = attendanceData.attendance.find(a => a.student && a.student._id === student._id && a.session === selectedSession);
        return {
          student: student._id,
          attendanceId: att ? att._id : null,
          status: att ? att.status : 'present',
          remarks: att ? att.remarks : ''
        };
      });
      setAttendanceData(merged);
      
    } catch (error) {
      console.error('Network or other error:', error);
      toast.error(`Failed to fetch data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, field, value) => {
    setAttendanceData(prev =>
      prev.map(item =>
        item.student === studentId
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const handleBulkAction = (status) => {
    setAttendanceData(prev =>
      prev.map(item => ({ ...item, status }))
    );
  };

  // Save attendance: PUT if exists, POST if not
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClass || !selectedSection) {
      toast.error('Please select class and section');
      return;
    }
    if (attendanceData.length === 0) {
      toast.error('No students to mark attendance for');
      return;
    }
    setSubmitting(true);
    const token = localStorage.getItem('token');
    let successCount = 0;
    let failCount = 0;
    for (const record of attendanceData) {
      try {
        if (record.attendanceId) {
          // Update existing attendance
          const res = await fetch(`${API_ENDPOINTS.ATTENDANCE_MARK}/${record.attendanceId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              student: record.student,
              date: selectedDate,
              status: record.status,
              remarks: record.remarks,
              session: selectedSession
            })
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          // Create new attendance
          const res = await fetch(API_ENDPOINTS.ATTENDANCE_MARK, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              student: record.student,
              date: selectedDate,
              status: record.status,
              remarks: record.remarks,
              session: selectedSession
            })
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        }
      } catch (error) {
        failCount++;
      }
    }
    toast.success(`Attendance saved. ${successCount} successful, ${failCount} failed`);
    setSubmitting(false);
    // Refresh data
    fetchStudentsAndAttendance();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <FaCheck className="status-icon present" />;
      case 'absent':
        return <FaTimes className="status-icon absent" />;
      case 'late':
        return <FaClock className="status-icon late" />;
      case 'half-day':
        return <FaMinus className="status-icon half-day" />;
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

  return (
    <div className="attendance-marking-container">
      <div className="attendance-header">
        <h2>Mark/Edit Attendance</h2>
        <div className="header-info">
          <FaCalendar /> {selectedDate}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="attendance-form">
        <div className="form-controls">
          <div className="control-group">
            <label htmlFor="className">Class *</label>
            <select
              id="className"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              required
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="section">Section *</label>
            <select
              id="section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              required
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="session">Session *</label>
            <select
              id="session"
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              required
            >
              <option value="forenoon">Forenoon</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </div>
        </div>
        {loading && (
          <div className="loading-message">
            Loading students...
          </div>
        )}
        {students.length > 0 && (
          <>
            <div className="bulk-actions">
              <h3>Bulk Actions</h3>
              <div className="bulk-buttons">
                <button
                  type="button"
                  className="bulk-btn present"
                  onClick={() => handleBulkAction('present')}
                >
                  <FaCheck /> Mark All Present
                </button>
                <button
                  type="button"
                  className="bulk-btn absent"
                  onClick={() => handleBulkAction('absent')}
                >
                  <FaTimes /> Mark All Absent
                </button>
                <button
                  type="button"
                  className="bulk-btn late"
                  onClick={() => handleBulkAction('late')}
                >
                  <FaClock /> Mark All Late
                </button>
                <button
                  type="button"
                  className="bulk-btn half-day"
                  onClick={() => handleBulkAction('half-day')}
                >
                  <FaMinus /> Mark All Half-Day
                </button>
              </div>
            </div>
            <div className="attendance-table-container">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const attendance = attendanceData.find(a => a.student === student._id);
                    return (
                      <tr key={student._id}>
                        <td>{student.rollNumber}</td>
                        <td>{student.fullName}</td>
                        <td>
                          <div className="status-selector">
                            {['present', 'absent', 'late', 'half-day'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                className={`status-btn ${attendance?.status === status ? 'active' : ''}`}
                                onClick={() => handleAttendanceChange(student._id, 'status', status)}
                                style={{
                                  backgroundColor: attendance?.status === status ? getStatusColor(status) : 'transparent',
                                  color: attendance?.status === status ? 'white' : getStatusColor(status),
                                  borderColor: getStatusColor(status)
                                }}
                              >
                                {getStatusIcon(status)}
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Optional remarks"
                            value={attendance?.remarks || ''}
                            onChange={(e) => handleAttendanceChange(student._id, 'remarks', e.target.value)}
                            maxLength="200"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : <><FaSave /> Save Attendance</>}
              </button>
            </div>
          </>
        )}
        {students.length === 0 && !loading && selectedClass && selectedSection && (
          <div className="no-students">
            <FaUsers />
            <p>No active students found in {selectedClass}-{selectedSection}</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default AttendanceMarking; 