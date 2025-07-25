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
  const [rangeReport, setRangeReport] = useState([]);
  const [rangeDates, setRangeDates] = useState([]);
  const [periods, setPeriods] = useState([]); // Added periods state

  useEffect(() => {
    fetchClasses();
    fetchSections();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (reportType === 'range' && selectedClass && selectedSection && startDate && endDate) {
      fetchRangeReport();
    } else if (reportType === 'student' && selectedStudent && startDate && endDate) {
      fetchStudentAttendance();
    } else if (reportType === 'daily' && selectedClass && selectedSection && selectedDate) {
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

  const fetchRangeReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        className: selectedClass,
        section: selectedSection,
        startDate,
        endDate
      });
      const response = await fetch(`/api/attendance/range-report?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRangeReport(data.report);
        setRangeDates(data.dates);
        setPeriods(data.periods); // Set periods from backend
      } else {
        toast.error('Failed to fetch range report');
        setRangeReport([]);
        setRangeDates([]);
        setPeriods([]); // Clear periods on error
      }
    } catch (error) {
      toast.error('Error fetching range report');
      setRangeReport([]);
      setRangeDates([]);
      setPeriods([]); // Clear periods on error
    } finally {
      setLoading(false);
    }
  };

  const exportRangeCSV = () => {
    if (!rangeReport.length || !rangeDates.length || !periods) return;
    const headers = ['Student Name', 'Roll Number', 'Class', 'Section'];
    rangeDates.forEach(date => {
      periods.forEach(period => {
        headers.push(`${date} P${period}`);
      });
    });
    const rows = rangeReport.map(r => {
      const row = [r.fullName, r.rollNumber, r.className, r.section];
      r.attendance.forEach(a => {
        periods.forEach(period => {
          row.push(a[`period${period}`]);
        });
      });
      return row;
    });
    let csvContent = '';
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(field => `"${(field ?? '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_range_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  // For period timings
  const periodTimings = {
    1: '8:45-9:35 am',
    2: '9:35-10:25 am',
    3: '10:45-11:35 am',
    4: '11:35 am-12:25 pm',
    5: '1:25-2:15 pm',
    6: '2:15-3:05 pm',
    7: '3:25-4:15 pm'
  };

  const exportToCSV = () => {
    if (!reports.length) return;
    const periodsToUse = periods && periods.length ? periods : [1,2,3,4,5,6,7];
    const periodDuration = 1; // 1 hour per period
    const headers = [
      'Student Name',
      'Roll Number',
      'Class',
      'Section',
      ...periodsToUse.map(p => `P${p} (${periodTimings[p]})`),
      'Scheduled Hours',
      'Attended Hours',
      'Attendance %'
    ];
    const rows = reports.map(r => {
      const periodStatuses = periodsToUse.map(period => r[`period${period}`] || '-');
      const scheduled = periodsToUse.length * periodDuration;
      // Count attended periods: present, late, half-day all count as attended
      const attended = periodStatuses.filter(status => ['present', 'late', 'half-day'].includes((status || '').toLowerCase())).length * periodDuration;
      const percentage = scheduled > 0 ? ((attended / scheduled) * 100).toFixed(2) : '0.00';
      return [
      r.fullName || r.student?.fullName || '-',
      r.rollNumber || r.student?.rollNumber || '-',
      r.className || r.student?.className || '-',
      r.section || r.student?.section || '-',
        ...periodStatuses,
        scheduled,
        attended,
        percentage
      ];
    });
    let csvContent = '';
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(field => `"${(field ?? '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_daily_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="attendance-report-container">
      <div className="report-header">
        <h2>Attendance Report</h2>
      </div>
      <div className="report-type-toggle" style={{ marginBottom: 20 }}>
        <button onClick={() => setReportType('daily')} className={reportType === 'daily' ? 'active' : ''}>Daily</button>
        <button onClick={() => setReportType('range')} className={reportType === 'range' ? 'active' : ''}>Date Range</button>
        <button onClick={() => setReportType('student')} className={reportType === 'student' ? 'active' : ''}>Student</button>
      </div>

      {/* Filters for all report types */}
      {reportType === 'daily' && (
        <div className="report-filters">
          <div className="filter-group">
            <label>Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Section</label>
            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
              <option value="">Select Section</option>
              {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Student</label>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">All</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.fullName}</option>)}
            </select>
          </div>
          <div className="filter-group" style={{ alignSelf: 'end' }}>
            <button className="export-btn" onClick={exportToCSV} disabled={!reports.length}>Export CSV</button>
          </div>
        </div>
      )}
      {reportType === 'range' && (
        <div className="report-filters">
          <div className="filter-group">
            <label>Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Section</label>
            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
              <option value="">Select Section</option>
              {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="filter-group" style={{ alignSelf: 'end' }}>
            <button className="export-btn" onClick={exportRangeCSV} disabled={!rangeReport.length}>Export CSV</button>
            <button className="export-btn" style={{ marginLeft: 8 }} onClick={fetchRangeReport} disabled={loading || !selectedClass || !selectedSection || !startDate || !endDate}>Fetch Report</button>
          </div>
        </div>
      )}
      {reportType === 'student' && (
        <div className="report-filters">
          <div className="filter-group">
            <label>Student</label>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">Select Student</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.fullName}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="filter-group" style={{ alignSelf: 'end' }}>
            <button className="export-btn" onClick={exportToCSV} disabled={!reports.length}>Export CSV</button>
          </div>
        </div>
      )}

      {/* Table for Daily Report */}
      {reportType === 'daily' && (
        <div className="attendance-table-container">
          {loading ? <div className="loading-message">Loading...</div> : (
            reports.length ? (
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Roll Number</th>
                    <th>Class</th>
                    <th>Section</th>
                    {(periods && periods.length ? periods : [1,2,3,4,5,6,7]).map(period => (
                      <th key={'period' + period}>P{period}<br /><span style={{fontWeight:400, fontSize:'11px'}}>{periodTimings[period]}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, idx) => (
                    <tr key={r.studentId || idx}>
                      <td>{r.fullName || r.student?.fullName || '-'}</td>
                      <td>{r.rollNumber || r.student?.rollNumber || '-'}</td>
                      <td>{r.className || r.student?.className || '-'}</td>
                      <td>{r.section || r.student?.section || '-'}</td>
                      {(periods && periods.length ? periods : [1,2,3,4,5,6,7]).map(period => (
                        <td key={`${r.studentId || idx}-p${period}`}>{r[`period${period}`] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="no-data">No data to display.</div>
          )}
        </div>
      )}

      {/* Table for Date Range Report */}
      {reportType === 'range' && (
        <>
          {startDate && endDate && (
            <div style={{ margin: '16px 0', fontWeight: 500, color: '#444', fontSize: '16px' }}>
              Showing results from <span style={{ color: '#2e7d32' }}>{startDate}</span> to <span style={{ color: '#2e7d32' }}>{endDate}</span>
            </div>
          )}
          <div className="attendance-table-container">
            {loading ? <div className="loading-message">Loading...</div> : (
              rangeReport.length ? (
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                      <th>Class</th>
                      <th>Section</th>
                      {rangeDates && (periods && periods.length ? periods : [1,2,3,4,5,6,7]) && rangeDates.map(date => (periods && periods.length ? periods : [1,2,3,4,5,6,7]).map(period => (
                        <th key={date + '-p' + period}>
                          {date} P{period}
                        </th>
                      )))}
                    </tr>
                  </thead>
                  <tbody>
                    {rangeReport.map((r, idx) => (
                      <tr key={r.studentId || idx}>
                        <td>{r.fullName || r.student?.fullName || '-'}</td>
                        <td>{r.rollNumber || r.student?.rollNumber || '-'}</td>
                        <td>{r.className || r.student?.className || '-'}</td>
                        <td>{r.section || r.student?.section || '-'}</td>
                        {r.attendance && r.attendance.map((a, aidx) => (periods && periods.length ? periods : [1,2,3,4,5,6,7]).map(period => (
                          <td key={aidx + '-p' + period}>{a[`period${period}`] || '-'}</td>
                        )))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="no-data">No data to display.</div>
            )}
          </div>
        </>
      )}

      {/* Table for Student Report */}
      {reportType === 'student' && (
        <div className="attendance-table-container">
          {loading ? <div className="loading-message">Loading...</div> : (
            reports.length ? (
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.sort((a, b) => new Date(a.date) - new Date(b.date) || a.period - b.period).map((r, idx) => (
                    <tr key={r._id || idx}>
                      <td>{r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>
                      <td>{r.period ? `P${r.period} (${periodTimings[r.period]})` : '-'}</td>
                      <td>{r.status}</td>
                      <td>{r.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="no-data">No data to display.</div>
          )}
        </div>
      )}

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
                <th>Period</th>
                <th>Status</th>
                <th>Session</th>
                <th>Date</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((record, idx) => (
                (periods && periods.length ? periods : [1,2,3,4,5,6,7]).map(period => (
                  <tr key={`${record.studentId || idx}-p${period}`}>
                    <td>{record.rollNumber || record.student?.rollNumber || '-'}</td>
                    <td>{record.fullName || record.student?.fullName || '-'}</td>
                    <td>{`P${period}`}</td>
                    <td>{record[`period${period}`] || '-'}</td>
                    <td>{period >= 1 && period <= 4 ? 'Forenoon' : 'Afternoon'}</td>
                    <td>{selectedDate ? new Date(selectedDate).toLocaleDateString() : '-'}</td>
                    <td>-</td>
                  </tr>
                ))
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