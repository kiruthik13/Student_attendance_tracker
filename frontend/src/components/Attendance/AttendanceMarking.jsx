import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const allPeriods = [1,2,3,4,5,6,7];
const periodLabels = {
  1: '8:45-9:35 am', 2: '9:35-10:25 am', 3: '10:45-11:35 am', 4: '11:35 am-12:25 pm',
  5: '1:25-2:15 pm', 6: '2:15-3:05 pm', 7: '3:25-4:15 pm'
};
const statusOptions = ['present', 'absent', 'late', 'half-day'];

// Get periods for session
const getSessionPeriods = (session) => {
  if (session === 'forenoon') return [1, 2, 3, 4];
  if (session === 'afternoon') return [5, 6, 7];
  return [];
};

export default function AttendanceMarking() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('/api/students/classes/list', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => setClasses(res.data.classes));
    axios.get('/api/students/sections/list', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => setSections(res.data.sections));
  }, []);

  useEffect(() => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    axios.get(`/api/students?className=${selectedClass}&section=${selectedSection}&isActive=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        setStudents(res.data.students);
        const data = {};
        res.data.students.forEach(student => {
          data[student._id] = {};
          allPeriods.forEach(period => {
            data[student._id][period] = { status: 'present', remarks: '' };
          });
        });
        setAttendanceData(data);
        setSelectedStudent(''); // Reset selected student when class/section changes
      })
      .finally(() => setLoading(false));
  }, [selectedClass, selectedSection]);

  const handleAttendanceChange = (studentId, period, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [period]: { ...prev[studentId][period], status }
      }
    }));
  };

  const handleRemarksChange = (studentId, period, remarks) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [period]: { ...prev[studentId][period], remarks }
      }
    }));
  };

  const handleBulkAction = (status) => {
    setAttendanceData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(studentId => {
        allPeriods.forEach(period => {
          updated[studentId][period] = { ...updated[studentId][period], status };
        });
      });
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('You are not logged in.');
      return;
    }

    try {
      // Prepare all periods data (1-7)
      const allAttendanceData = [];
      const studentIdsToSubmit = selectedStudent ? [selectedStudent] : Object.keys(attendanceData);
      studentIdsToSubmit.forEach(studentId => {
        [1, 2, 3, 4, 5, 6, 7].forEach(period => {
          // If attendance for this period is not marked, set default values
          const periodData = attendanceData[studentId] && attendanceData[studentId][period]
            ? attendanceData[studentId][period]
            : { status: 'absent', remarks: '' };
          allAttendanceData.push({
            student: studentId,
            period,
            status: periodData.status,
            remarks: periodData.remarks
          });
        });
      });

      // Send single request with all periods
      const payload = {
        date: selectedDate,
        session: 'all', // We'll handle this in backend
        attendanceData: allAttendanceData
      };

      console.log('Sending payload with all periods:', payload);
      console.log("attendanceData length:", allAttendanceData.length);
      console.table(allAttendanceData);
      
      // Log each record individually
      allAttendanceData.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, {
          student: record.student,
          period: record.period,
          status: record.status,
          remarks: record.remarks
        });
      });

      const response = await axios.post('/api/attendance/bulk-mark', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response:', response.data);

      toast.success('Attendance saved successfully for all periods!');
    } catch (err) {
      console.error('Attendance submission error:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    }
  };

  return (
    <div className="attendance-marking-container">
        <h2>Mark/Edit Attendance</h2>
      <form onSubmit={handleSubmit} className="attendance-form">
        <div className="form-controls">
          <div className="control-group">
            <label>Class *</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} required>
              <option value="">Select Class</option>
              {classes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label>Section *</label>
            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} required>
              <option value="">Select Section</option>
              {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label>Date *</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              required
            />
          </div>
          <div className="control-group">
            <label>Student (optional)</label>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">All Students</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.fullName}</option>)}
            </select>
          </div>
        </div>
            <div className="bulk-actions">
              <h3>Bulk Actions</h3>
              <div className="bulk-buttons">
            <button type="button" className="bulk-btn present" onClick={() => handleBulkAction('present')}>Mark All Present</button>
            <button type="button" className="bulk-btn absent" onClick={() => handleBulkAction('absent')}>Mark All Absent</button>
            <button type="button" className="bulk-btn late" onClick={() => handleBulkAction('late')}>Mark All Late</button>
            <button type="button" className="bulk-btn half-day" onClick={() => handleBulkAction('half-day')}>Mark All Half-Day</button>
              </div>
            </div>
        {loading ? <p>Loading students...</p> : (
            <div className="attendance-table-container">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                  {allPeriods.map(period => (
                    <th key={period}>P{period}<br/>{periodLabels[period]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedStudent ? students.filter(s => s._id === selectedStudent) : students).map(student => (
                      <tr key={student._id}>
                        <td>{student.rollNumber}</td>
                        <td>{student.fullName}</td>
                    {allPeriods.map(period => (
                        <td key={period}>
                          <div className="status-selector">
                          {statusOptions.map(status => (
                              <button
                                key={status}
                                type="button"
                              className={`status-btn ${attendanceData[student._id]?.[period]?.status === status ? 'active' : ''} ${status}`}
                              onClick={() => handleAttendanceChange(student._id, period, status)}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                          placeholder="Remark"
                            value={attendanceData[student._id]?.[period]?.remarks || ''}
                          onChange={e => handleRemarksChange(student._id, period, e.target.value)}
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
        )}
            <div className="form-actions">
          <button type="submit" className="submit-btn">Save Attendance</button>
          </div>
      </form>
    </div>
  );
} 