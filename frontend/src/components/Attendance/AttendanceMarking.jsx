import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaSave, FaCalendar, FaUsers, FaCheck, FaTimes, FaClock, FaMinus, FaEdit } from 'react-icons/fa';
import { API_ENDPOINTS } from '../../config/api';
import './Attendance.css';

const AttendanceMarking = () => {
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { studentId: { period: { status, remarks, attendanceId } } }
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState('forenoon');
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Define periods and labels at the top
  const allPeriods = [1,2,3,4,5,6,7];
  const periodLabels = {
    1: '8:45-9:35 am',
    2: '9:35-10:25 am',
    3: '10:45-11:35 am',
    4: '11:35 am-12:25 pm',
    5: '1:25-2:15 pm',
    6: '2:15-3:05 pm',
    7: '3:25-4:15 pm',
  };
  // Define sessionPeriods at the top so it's available everywhere
  const sessionPeriods = selectedSession === 'forenoon' ? [1,2,3,4] : [5,6,7];
  // Add state for bulk period selection
  const [bulkPeriod, setBulkPeriod] = useState('all'); // 'all' or a specific period

  useEffect(() => {
    fetchClasses();
    fetchSections();
  }, []);

  const periodOptions = {
    forenoon: [
      { value: 1, label: '1st Period (8:45-9:35 am)' },
      { value: 2, label: '2nd Period (9:35-10:25 am)' },
      { value: 3, label: '3rd Period (10:45-11:35 am)' },
      { value: 4, label: '4th Period (11:35 am-12:25 pm)' },
    ],
    afternoon: [
      { value: 5, label: '5th Period (1:25-2:15 pm)' },
      { value: 6, label: '6th Period (2:15-3:05 pm)' },
      { value: 7, label: '7th Period (3:25-4:15 pm)' },
    ]
  };

  // Update period when session changes
  useEffect(() => {
    // This useEffect is no longer needed as periods are fixed
  }, [selectedSession]);

  // Update fetchStudentsAndAttendance to include period
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
      
      // Fetch attendance for this class/section/session/date
      const attendanceUrl = `${API_ENDPOINTS.ATTENDANCE_CLASS}?className=${selectedClass}&section=${selectedSection}&date=${selectedDate}&session=${selectedSession}`;
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
      
      // Merge students with attendance, filter by session and period
      const newAttendanceData = {};
      studentsData.students.forEach(student => {
        newAttendanceData[student._id] = {};
        allPeriods.forEach(period => {
          const att = attendanceData.attendance?.find(a => a.student && a.student._id === student._id && a.period === period);
          newAttendanceData[student._id][period] = {
          status: att ? att.status : 'present',
            remarks: att ? att.remarks : '',
            attendanceId: att ? att._id : null
        };
        });
      });
      setAttendanceData(newAttendanceData);
      
      console.log('Fetched students:', studentsData.students);
      console.log('Fetched attendance:', attendanceData.attendance);
      
    } catch (error) {
      console.error('Network or other error:', error);
      toast.error(`Failed to fetch data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, period, field, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [period]: {
          ...prev[studentId][period],
          [field]: value
        }
      }
    }));
  };

  // Update handleBulkAction to support all periods
  const handleBulkAction = (status) => {
    setAttendanceData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(studentId => {
        if (bulkPeriod === 'all') {
          sessionPeriods.forEach(period => {
            updated[studentId][period].status = status;
          });
        } else {
          updated[studentId][bulkPeriod].status = status;
        }
      });
      return updated;
    });
  };

  // Save attendance: PUT if exists, POST if not
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClass || !selectedSection) {
      toast.error('Please select class and section');
      return;
    }
    setSubmitting(true);
    const token = localStorage.getItem('token');
    const bulkData = [];
    Object.entries(attendanceData).forEach(([studentId, periodsObj]) => {
      sessionPeriods.forEach(period => {
        if (![1,2,3,4,5,6,7].includes(period)) return; // skip invalid
        // Default status to 'present' if not set
        const status = (periodsObj[period] && periodsObj[period].status) ? periodsObj[period].status : 'present';
        const remarks = periodsObj[period]?.remarks || '';
        bulkData.push({
          student: studentId,
          date: selectedDate,
          status,
          remarks,
          session: selectedSession,
          period
        });
      });
    });
    try {
      const res = await fetch(API_ENDPOINTS.ATTENDANCE_BULK_MARK, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: selectedDate,
          session: selectedSession,
          attendanceData: bulkData
        })
      });
      if (res.ok) {
        toast.success('Attendance saved for all periods!');
        fetchStudentsAndAttendance();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to save some attendance records.');
      }
    } catch (error) {
      toast.error('Network error while saving attendance.');
    } finally {
      setSubmitting(false);
    }
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
                <select value={bulkPeriod} onChange={e => setBulkPeriod(e.target.value)} style={{ marginRight: 8 }}>
                  <option value="all">All Periods</option>
                  {sessionPeriods.map(period => (
                    <option key={period} value={period}>{`P${period} (${periodLabels[period]})`}</option>
                  ))}
                </select>
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
                    <th>Roll No</th>
                    <th>Name</th>
                    {sessionPeriods.map(period => (
                      <th key={period}>{`P${period}`}<br/>{periodLabels[period]}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                      <tr key={student._id}>
                        <td>{student.rollNumber}</td>
                        <td>{student.fullName}</td>
                      {sessionPeriods.map(period => (
                        <td key={period}>
                          <div className="status-selector">
                            {['present', 'absent', 'late', 'half-day'].map(status => (
                              <button
                                key={status}
                                type="button"
                                className={`status-btn ${attendanceData[student._id]?.[period]?.status === status ? 'active' : ''}`}
                                onClick={() => handleAttendanceChange(student._id, period, 'status', status)}
                                style={{
                                  backgroundColor: attendanceData[student._id]?.[period]?.status === status ? getStatusColor(status) : 'transparent',
                                  color: attendanceData[student._id]?.[period]?.status === status ? 'white' : getStatusColor(status),
                                  borderColor: getStatusColor(status)
                                }}
                              >
                                {getStatusIcon(status)}
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Remarks"
                            value={attendanceData[student._id]?.[period]?.remarks || ''}
                            onChange={e => handleAttendanceChange(student._id, period, 'remarks', e.target.value)}
                            maxLength="200"
                            style={{ marginTop: 4, width: '90%' }}
                          />
                        </td>
                      ))}
                      </tr>
                  ))}
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