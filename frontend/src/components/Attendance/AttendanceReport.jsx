import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaCalendar, FaUsers, FaDownload, FaFilter, FaChartBar } from 'react-icons/fa';
import { API_ENDPOINTS } from '../../config/api';
import { getStudentAttendance } from '../../utils/api';
import './Attendance.css';

const AttendanceReport = () => {
  // Period timings mapping
  const periodTimings = {
    1: '8:45-9:35 am',
    2: '9:35-10:25 am',
    3: '10:45-11:35 am',
    4: '11:35 am-12:25 pm',
    5: '1:25-2:15 pm',
    6: '2:15-3:05 pm',
    7: '3:25-4:15 pm'
  };

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
  const [dateRangeError, setDateRangeError] = useState('');

  // Helper function to validate and fix date range
  const validateDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { valid: false, message: 'Invalid date format' };
    }

    if (startDate > endDate) {
      return { valid: false, message: 'Start date cannot be after end date' };
    }

    return { valid: true };
  };

  // Function to swap dates if they're in wrong order
  const fixDateRange = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        setStartDate(endDate);
        setEndDate(startDate);
        toast.success('Date range fixed! Start and end dates have been swapped.');
      }
    }
  };

  // Check date range validity whenever dates change
  useEffect(() => {
    if (startDate && endDate) {
      const validation = validateDateRange(startDate, endDate);
      setDateRangeError(validation.valid ? '' : validation.message);
    } else {
      setDateRangeError('');
    }
  }, [startDate, endDate]);
  const [rangeReport, setRangeReport] = useState([]);
  const [rangeDates, setRangeDates] = useState([]);
  const [periods, setPeriods] = useState([]); // Added periods state
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);

  useEffect(() => {
    fetchClasses();
    fetchSections();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchStudents();
    }
  }, [selectedClass, selectedSection]);

  useEffect(() => {
    // Clear selectedStudent only if it's not in the current students list
    if (selectedStudent && students.length > 0) {
      const studentExists = students.some(student => student._id === selectedStudent);
      if (!studentExists) {
        setSelectedStudent('');
      }
    }
  }, [students, selectedStudent]);

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
        // Don't clear selectedStudent here as it breaks the filtering
      }
    } catch (error) {
      // ignore
    }
  };

  const fetchAttendanceReport = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!selectedClass || !selectedSection || !selectedDate) {
        toast.error('Please select class, section, and date');
        return;
      }

      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        className: selectedClass,
        section: selectedSection,
        date: selectedDate
      });
      if (selectedSession) params.append('session', selectedSession);
      if (selectedStudent) params.append('studentId', selectedStudent);

      console.log('Fetching attendance report with params:', {
        className: selectedClass,
        section: selectedSection,
        date: selectedDate,
        session: selectedSession,
        studentId: selectedStudent
      });

      const response = await fetch(`${API_ENDPOINTS.ATTENDANCE_CLASS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Attendance report response:', data);

        let filtered = data.attendance;
        // Filter to only the selected student if selectedStudent is set
        if (selectedStudent) {
          filtered = filtered.filter(r => r.studentId === selectedStudent);
        }

        setReports(filtered);
        setPeriods(data.periods || [1, 2, 3, 4, 5, 6, 7]);

        if (filtered.length > 0) {
          toast.success(`Generated report for ${filtered.length} students`);
        } else {
          toast.info('No attendance data found for the selected criteria');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch attendance report:', response.status, response.statusText, errorData);
        toast.error(errorData.message || 'Failed to fetch attendance report');
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching attendance report:', error);
      toast.error('Error fetching attendance report');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAttendance = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!selectedStudent || !startDate || !endDate) {
        toast.error('Please select student, start date, and end date');
        return;
      }

      console.log('Fetching student attendance with params:', {
        studentId: selectedStudent,
        startDate,
        endDate
      });

      const data = await getStudentAttendance(selectedStudent, startDate, endDate);
      console.log('Student attendance response:', data);

      // Get student details from the first attendance record or from students list
      let studentDetails = null;
      if (data.attendance && data.attendance.length > 0) {
        const firstRecord = data.attendance[0];
        if (firstRecord.student) {
          studentDetails = firstRecord.student;
        }
      }

      // If no student details from attendance, get from students list
      if (!studentDetails) {
        const selectedStudentObj = students.find(s => s._id === selectedStudent);
        if (selectedStudentObj) {
          studentDetails = selectedStudentObj;
        }
      }

      setSelectedStudentDetails(studentDetails);

      // Process the attendance data to create a proper report format
      const processedReports = [];

      if (data.attendance && data.attendance.length > 0) {
        data.attendance.forEach(record => {
          // Ensure proper date formatting
          const recordDate = new Date(record.date);
          if (isNaN(recordDate.getTime())) {
            console.warn('Invalid date found:', record.date);
            return; // Skip invalid dates
          }

          const date = recordDate.toLocaleDateString('en-GB');

          // Process forenoon periods
          if (record.forenoon && record.forenoon.periods) {
            record.forenoon.periods.forEach(period => {
              processedReports.push({
                date: date,
                period: period.period,
                status: period.status || 'not-marked',
                remarks: period.remarks || '-',
                session: 'Forenoon',
                studentId: record.student?._id || record.student,
                studentName: record.student?.fullName || studentDetails?.fullName || 'Unknown',
                rollNumber: record.student?.rollNumber || studentDetails?.rollNumber || '-'
              });
            });
          }

          // Process afternoon periods
          if (record.afternoon && record.afternoon.periods) {
            record.afternoon.periods.forEach(period => {
              processedReports.push({
                date: date,
                period: period.period,
                status: period.status || 'not-marked',
                remarks: period.remarks || '-',
                session: 'Afternoon',
                studentId: record.student?._id || record.student,
                studentName: record.student?.fullName || studentDetails?.fullName || 'Unknown',
                rollNumber: record.student?.rollNumber || studentDetails?.rollNumber || '-'
              });
            });
          }
        });
      }

      // If no attendance records found, create entries for the date range showing "not-marked"
      if (processedReports.length === 0) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Generate entries for each date in the range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const date = d.toLocaleDateString('en-GB');

          // Add entries for all periods (1-7)
          for (let period = 1; period <= 7; period++) {
            const session = period <= 4 ? 'Forenoon' : 'Afternoon';
            processedReports.push({
              date: date,
              period: period,
              status: 'not-marked',
              remarks: '-',
              session: session,
              studentId: selectedStudent,
              studentName: studentDetails?.fullName || 'Unknown',
              rollNumber: studentDetails?.rollNumber || '-'
            });
          }
        }
      }

      // Sort by date and period
      processedReports.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }
        return a.period - b.period;
      });

      setReports(processedReports);

      if (processedReports.length > 0) {
        const markedCount = processedReports.filter(r => r.status !== 'not-marked').length;
        const totalCount = processedReports.length;
        toast.success(`Generated report: ${markedCount} marked out of ${totalCount} total records`);
      } else {
        toast.info('No attendance data found for the selected student and date range');
      }
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      toast.error('Error fetching student attendance: ' + error.message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRangeReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Validate required fields
      if (!selectedClass || !selectedSection || !startDate || !endDate) {
        toast.error('Please select class, section, start date, and end date');
        return;
      }

      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast.error('Invalid date format');
        return;
      }

      if (start > end) {
        toast.error('Start date cannot be after end date. Please select a valid date range.');
        return;
      }

      const params = new URLSearchParams({
        className: selectedClass,
        section: selectedSection,
        startDate,
        endDate
      });

      console.log('Fetching range report with params:', {
        className: selectedClass,
        section: selectedSection,
        startDate,
        endDate
      });

      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(`${API_ENDPOINTS.ATTENDANCE_RANGE_REPORT}?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log('Range report response:', data);

          if (data.report && data.report.length > 0) {
            // Debug: Check if totalAttendance data is present
            const studentsWithTotalAttendance = data.report.filter(r => r.totalAttendance && r.totalAttendance.marked > 0);
            console.log('Students with total attendance data:', studentsWithTotalAttendance.length);
            console.log('Sample student data:', data.report[0]);
            console.log('Overall stats from backend:', data.overallStats);

            // Store backend data for comparison
            window.lastRangeReportData = data;

            setRangeReport(data.report);
            setRangeDates(data.dates || []);
            setPeriods(data.periods || [1, 2, 3, 4, 5, 6, 7]);
            toast.success(`Generated report for ${data.totalStudents || data.report.length} students`);
          } else {
            setRangeReport([]);
            setRangeDates([]);
            setPeriods([]);
            toast.info('No attendance data found for the selected date range');
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to fetch range report:', response.status, response.statusText, errorData);

          if (response.status === 401) {
            toast.error('Authentication failed. Please log in again.');
          } else if (response.status === 500) {
            toast.error('Server error. Please try again later.');
          } else {
            toast.error(errorData.message || 'Failed to fetch range report');
          }

          setRangeReport([]);
          setRangeDates([]);
          setPeriods([]);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          toast.error('Request timeout. Please try again.');
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          toast.error('Connection failed. Please check your internet connection and try again.');
        } else {
          toast.error('Network error. Please try again.');
        }

        console.error('Fetch error:', fetchError);
        setRangeReport([]);
        setRangeDates([]);
        setPeriods([]);
      }
    } catch (error) {
      console.error('Error fetching range report:', error);
      toast.error('Error fetching range report');
      setRangeReport([]);
      setRangeDates([]);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const exportRangeCSV = () => {
    if (!rangeReport.length || !rangeDates.length || !periods) {
      toast.error('No data available for export');
      return;
    }

    const headers = ['Student Name', 'Roll Number', 'Class', 'Section'];
    rangeDates.forEach(date => {
      periods.forEach(period => {
        headers.push(`${date} P${period}`);
      });
    });
    // Add total attendance columns
    headers.push('Total Present Periods', 'Total Marked Periods', 'Total Attendance %');

    const rows = rangeReport.map(r => {
      const row = [r.fullName, r.rollNumber, r.className, r.section];
      if (r.attendance) {
        if (Array.isArray(r.attendance)) {
          // Range report structure: array of date objects
          r.attendance.forEach(a => {
            periods.forEach(period => {
              row.push(a[`period${period}`] || 'not-marked');
            });
          });
        } else if (typeof r.attendance === 'object' && r.attendance !== null) {
          // Date range report structure: object with date keys
          rangeDates && rangeDates.forEach(date => {
            periods.forEach(period => {
              row.push(r.attendance[date] || 'not-marked');
            });
          });
        }
      }
      // Add total attendance data
      if (r.totalAttendance) {
        row.push(r.totalAttendance.present, r.totalAttendance.marked, `${r.totalAttendance.percentage}%`);
      } else {
        row.push('', '', '');
      }
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
    link.setAttribute('download', `attendance_range_report_${selectedClass}_${selectedSection}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV file downloaded successfully');
  };

  const exportRangeExcel = async () => {
    if (!rangeReport.length || !rangeDates.length || !periods) {
      toast.error('No data available for export');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        className: selectedClass,
        section: selectedSection,
        startDate,
        endDate
      });

      const response = await fetch(`${API_ENDPOINTS.ATTENDANCE_EXPORT_DATE_RANGE_EXCEL}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `attendance_range_report_${selectedClass}_${selectedSection}_${startDate}_to_${endDate}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Excel file downloaded successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to export Excel file');
      }
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Error exporting Excel file');
    }
  };

  const fetchDateRangeReport = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!selectedClass || !selectedSection || !startDate || !endDate) {
        toast.error('Please select class, section, start date, and end date');
        return;
      }

      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast.error('Invalid date format');
        return;
      }

      if (start > end) {
        toast.error('Start date cannot be after end date. Please select a valid date range.');
        return;
      }

      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        className: selectedClass,
        section: selectedSection,
        startDate,
        endDate
      });

      console.log('Fetching date range report with params:', {
        className: selectedClass,
        section: selectedSection,
        startDate,
        endDate
      });

      const response = await fetch(`${API_ENDPOINTS.ATTENDANCE_DATE_RANGE_REPORT}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Date range report response:', data);

        if (data.report && data.report.length > 0) {
          setRangeReport(data.report);
          setRangeDates(data.dates || []);
          toast.success(`Generated date range report for ${data.totalStudents || data.report.length} students`);
        } else {
          setRangeReport([]);
          setRangeDates([]);
          toast.info('No attendance data found for the selected date range');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch date range report:', response.status, response.statusText, errorData);
        toast.error(errorData.message || 'Failed to fetch date range report');
        setRangeReport([]);
        setRangeDates([]);
      }
    } catch (error) {
      console.error('Error fetching date range report:', error);
      toast.error('Error fetching date range report');
      setRangeReport([]);
      setRangeDates([]);
    } finally {
      setLoading(false);
    }
  };

  const debugAttendanceData = async () => {
    try {
      if (!selectedClass || !selectedSection || !startDate || !endDate) {
        toast.error('Please select class, section, start date, and end date');
        return;
      }

      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        className: selectedClass,
        section: selectedSection,
        startDate,
        endDate
      });

      const response = await fetch(`${API_ENDPOINTS.ATTENDANCE_DEBUG}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Debug data:', data);
        alert(`Debug Info:\nTotal Students: ${data.totalStudents}\nTotal Attendance Records: ${data.totalAttendanceRecords}\nDate Range: ${data.dateRange.start} to ${data.dateRange.end}\n\nCheck console for detailed sample records.`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Debug failed:', errorData);
        toast.error('Debug failed');
      }
    } catch (error) {
      console.error('Error in debug:', error);
      toast.error('Debug error');
    }
  };

  const testConnection = async () => {
    try {
      toast.info('Testing connection to backend...');

      // Test basic health endpoint
      const healthResponse = await fetch(`${API_ENDPOINTS.HEALTH}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('Health check response:', healthData);

        // Test attendance health endpoint
        const token = localStorage.getItem('token');
        const attendanceHealthResponse = await fetch(`${API_ENDPOINTS.ATTENDANCE_HEALTH}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (attendanceHealthResponse.ok) {
          const attendanceHealthData = await attendanceHealthResponse.json();
          console.log('Attendance health response:', attendanceHealthData);
          toast.success('Connection test successful! Backend is responding.');
        } else {
          toast.warning('Basic connection works, but attendance routes may have issues.');
        }
      } else {
        toast.error('Backend connection failed. Please check if the server is running.');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast.error('Connection test failed. Please check your internet connection and server status.');
    }
  };

  const getStatusCounts = () => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      'half-day': 0,
      'not-marked': 0,
      totalPeriods: 0, // total periods (students x 7)
      totalMarked: 0   // periods with a valid status (not 'not-marked')
    };

    reports.forEach(record => {
      const periods = [1, 2, 3, 4, 5, 6, 7];
      periods.forEach(period => {
        const status = record[`period${period}`];
        counts.totalPeriods++;
        if (status && counts.hasOwnProperty(status)) {
          counts[status]++;
        }
        if (status && status !== 'not-marked' && ['present', 'absent', 'late', 'half-day'].includes(status)) {
          counts.totalMarked++;
        }
      });
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
    if (!reports.length) return;
    const periodsToUse = periods && periods.length ? periods : [1, 2, 3, 4, 5, 6, 7];
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

  const sendReportViaEmail = async (reportType, reportData) => {
    if (!emailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    if (!emailAddress.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.ATTENDANCE_SEND_CSV_REPORT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportType,
          reportData,
          email: emailAddress
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Report sent successfully via email!');
        setEmailAddress('');
      } else {
        toast.error(data.message || 'Failed to send report via email');
      }
    } catch (error) {
      console.error('Error sending report via email:', error);
      toast.error('Failed to send report via email');
    } finally {
      setSendingEmail(false);
    }
  };

  const statusCounts = getStatusCounts();

  const getStudentDayStatus = (record) => {
    const periods = [1, 2, 3, 4, 5, 6, 7];
    const statuses = periods.map(period => record[`period${period}`]);
    const marked = statuses.filter(s => s && s !== 'not-marked');
    if (marked.length === 0) return 'not-marked';
    if (marked.every(s => s === 'absent')) return 'absent';
    if (marked.includes('present')) return 'present';
    if (marked.includes('late')) return 'late';
    if (marked.includes('half-day')) return 'half-day';
    return 'not-marked';
  };

  const getStudentDayCounts = () => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      'half-day': 0,
      'not-marked': 0,
      total: 0
    };

    reports.forEach(record => {
      counts.total++;
      // Calculate status from period data
      const status = getStudentDayStatus(record);
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      } else {
        counts['not-marked']++;
      }
    });

    return counts;
  };

  const studentDayCounts = getStudentDayCounts();

  const getPeriodTime = (period) => {
    return periodTimings[period] || '-';
  };

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
          <div className="filter-group">
            <label>Email Address</label>
            <input
              type="email"
              value={emailAddress}
              onChange={e => setEmailAddress(e.target.value)}
              placeholder="Enter email to send report"
              style={{ width: '250px' }}
            />
          </div>
          <div className="filter-group" style={{ alignSelf: 'end' }}>
            <button
              className="export-btn"
              onClick={fetchAttendanceReport}
              disabled={loading || !selectedClass || !selectedSection || !selectedDate}
              style={{ backgroundColor: '#007bff' }}
            >
              {loading ? 'Loading...' : 'Fetch Report'}
            </button>
            <button className="export-btn" onClick={exportToCSV} disabled={!reports.length} style={{ marginLeft: 8, backgroundColor: '#17a2b8' }}>
              Export CSV
            </button>
            <button
              className="export-btn"
              style={{ marginLeft: 8, backgroundColor: '#28a745' }}
              onClick={() => {
                if (!reports || reports.length === 0) {
                  toast.error('No attendance data available to send. Please generate a report first.');
                  return;
                }

                console.log('Reports data before processing:', reports);

                // Use the same logic as exportToCSV function
                const periodsToUse = periods && periods.length ? periods : [1, 2, 3, 4, 5, 6, 7];
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
                  console.log('Processing report record:', r);
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

                console.log('Generated rows:', rows);
                console.log('Generated headers:', headers);

                const emailData = {
                  headers,
                  rows,
                  date: selectedDate,
                  className: selectedClass,
                  section: selectedSection,
                  totalStudents: reports.length,
                  generatedAt: new Date().toLocaleString('en-IN')
                };
                console.log('Sending email with data:', emailData);
                sendReportViaEmail('daily', emailData);
              }}
              disabled={!reports.length || !emailAddress || sendingEmail}
            >
              {sendingEmail ? 'Sending...' : 'Send Email'}
            </button>
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
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{
                borderColor: dateRangeError ? '#dc3545' : '#ddd',
                borderWidth: dateRangeError ? '2px' : '1px'
              }}
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{
                borderColor: dateRangeError ? '#dc3545' : '#ddd',
                borderWidth: dateRangeError ? '2px' : '1px'
              }}
            />
          </div>
          {dateRangeError && (
            <div className="filter-group" style={{ gridColumn: '1 / -1', marginTop: '-10px' }}>
              <div style={{
                color: '#dc3545',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: '#f8d7da',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #f5c6cb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>⚠️ {dateRangeError}</span>
                {dateRangeError.includes('Start date cannot be after end date') && (
                  <button
                    onClick={fixDateRange}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Fix Dates
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="filter-group">
            <label>Email Address</label>
            <input
              type="email"
              value={emailAddress}
              onChange={e => setEmailAddress(e.target.value)}
              placeholder="Enter email to send report"
              style={{ width: '250px' }}
            />
          </div>
          <div className="filter-group" style={{ alignSelf: 'end' }}>
            <button
              className="export-btn"
              onClick={fetchRangeReport}
              disabled={loading || !selectedClass || !selectedSection || !startDate || !endDate || !!dateRangeError}
              style={{ backgroundColor: '#007bff' }}
            >
              {loading ? 'Loading...' : 'Fetch Period Report'}
            </button>
            <button
              className="export-btn"
              onClick={fetchDateRangeReport}
              disabled={loading || !selectedClass || !selectedSection || !startDate || !endDate || !!dateRangeError}
              style={{ marginLeft: 8, backgroundColor: '#6f42c1' }}
            >
              {loading ? 'Loading...' : 'Fetch Summary Report'}
            </button>
            <button
              className="export-btn"
              onClick={debugAttendanceData}
              disabled={!selectedClass || !selectedSection || !startDate || !endDate || !!dateRangeError}
              style={{ marginLeft: 8, backgroundColor: '#dc3545' }}
            >
              Debug Data
            </button>
            <button
              className="export-btn"
              onClick={testConnection}
              style={{ marginLeft: 8, backgroundColor: '#6c757d' }}
            >
              Test Connection
            </button>
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
          <div className="filter-group">
            <label>Email Address</label>
            <input
              type="email"
              value={emailAddress}
              onChange={e => setEmailAddress(e.target.value)}
              placeholder="Enter email to send report"
              style={{ width: '250px' }}
            />
          </div>
          <div className="filter-group" style={{ alignSelf: 'end' }}>
            <button
              className="export-btn"
              onClick={fetchStudentAttendance}
              disabled={loading || !selectedStudent || !startDate || !endDate}
              style={{ backgroundColor: '#007bff' }}
            >
              {loading ? 'Loading...' : 'Fetch Report'}
            </button>
            <button className="export-btn" onClick={exportToCSV} disabled={!reports.length} style={{ marginLeft: 8, backgroundColor: '#17a2b8' }}>
              Export CSV
            </button>
            <button
              className="export-btn"
              style={{ marginLeft: 8, backgroundColor: '#28a745' }}
              onClick={() => {
                if (!reports.length) return;
                const selectedStudentData = students.find(s => s._id === selectedStudent);
                const headers = ['Date', 'Period', 'Status', 'Remarks'];
                const rows = reports.map(r => [
                  r.date,
                  r.period,
                  r.status,
                  r.remarks || ''
                ]);
                sendReportViaEmail('student', {
                  headers,
                  rows,
                  studentName: selectedStudentData?.fullName || 'Unknown Student',
                  startDate,
                  endDate,
                  totalRecords: reports.length,
                  generatedAt: new Date().toLocaleString('en-IN')
                });
              }}
              disabled={!reports.length || !emailAddress || sendingEmail}
            >
              {sendingEmail ? 'Sending...' : 'Send Email'}
            </button>
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
                    {(periods && periods.length ? periods : [1, 2, 3, 4, 5, 6, 7]).map(period => (
                      <th key={'period' + period}>P{period}<br /><span style={{ fontWeight: 400, fontSize: '11px' }}>{periodTimings[period]}</span></th>
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
                      {(periods && periods.length ? periods : [1, 2, 3, 4, 5, 6, 7]).map(period => (
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
              {rangeReport.length > 0 && (
                <span style={{ marginLeft: '20px', color: '#666', fontSize: '14px' }}>
                  ({rangeReport.length} students)
                </span>
              )}
            </div>
          )}

          {/* Total Attendance Summary for Range Report */}
          {rangeReport.length > 0 && (
            <div className="total-attendance-summary">
              <h3>📊 Total Attendance Summary for Date Range</h3>
              <div className="total-attendance-grid">
                {rangeReport.map((student, index) => (
                  <div key={student.studentId} className="student-attendance-card">
                    <div className="student-name">
                      {student.fullName}
                    </div>
                    <div className="student-info">
                      {student.rollNumber} - {student.className} {student.section}
                    </div>
                    {student.totalAttendance && student.totalAttendance.marked > 0 ? (
                      <div className={`attendance-summary-box ${student.totalAttendance.percentage >= 75 ? 'good' :
                          student.totalAttendance.percentage >= 50 ? 'average' : 'poor'
                        }`}>
                        <span className="attendance-label">
                          Total Attendance:
                        </span>
                        <span className={`attendance-value ${student.totalAttendance.percentage >= 75 ? 'good' :
                            student.totalAttendance.percentage >= 50 ? 'average' : 'poor'
                          }`}>
                          {student.totalAttendance.present}/{student.totalAttendance.marked} ({student.totalAttendance.percentage}%)
                        </span>
                      </div>
                    ) : (
                      <div className="attendance-summary-box poor">
                        <span className="attendance-label">
                          Total Attendance:
                        </span>
                        <span className="attendance-value poor">
                          No attendance data
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall Statistics for Range Report */}
          {rangeReport.length > 0 && (
            <div className="overall-statistics">
              <h3>📈 Overall Statistics for Date Range</h3>
              <div className="statistics-grid">
                {(() => {
                  const stats = {
                    totalStudents: rangeReport.length,
                    totalPresentPeriods: 0,
                    totalMarkedPeriods: 0,
                    averageAttendance: 0,
                    studentsWithGoodAttendance: 0, // >= 75%
                    studentsWithAverageAttendance: 0, // 50-74%
                    studentsWithPoorAttendance: 0, // < 50%
                    studentsWithNoAttendance: 0 // no attendance data
                  };

                  // Calculate statistics from the range report data
                  rangeReport.forEach(student => {
                    // Check if student has totalAttendance data
                    if (student.totalAttendance && student.totalAttendance.marked > 0) {
                      stats.totalPresentPeriods += student.totalAttendance.present || 0;
                      stats.totalMarkedPeriods += student.totalAttendance.marked || 0;

                      const percentage = student.totalAttendance.percentage || 0;
                      if (percentage >= 75) {
                        stats.studentsWithGoodAttendance++;
                      } else if (percentage >= 50) {
                        stats.studentsWithAverageAttendance++;
                      } else {
                        stats.studentsWithPoorAttendance++;
                      }
                    } else {
                      // If no attendance data, count as no attendance
                      stats.studentsWithNoAttendance++;
                    }
                  });

                  // If we have backend overallStats, use them for verification
                  if (window.lastRangeReportData && window.lastRangeReportData.overallStats) {
                    const backendStats = window.lastRangeReportData.overallStats;
                    console.log('Backend vs Frontend stats comparison:', {
                      backend: backendStats,
                      frontend: {
                        totalPresentPeriods: stats.totalPresentPeriods,
                        totalMarkedPeriods: stats.totalMarkedPeriods,
                        studentsWithData: stats.totalStudents - stats.studentsWithNoAttendance
                      }
                    });
                  }

                  // Calculate average attendance percentage
                  stats.averageAttendance = stats.totalMarkedPeriods > 0 ?
                    Math.round((stats.totalPresentPeriods / stats.totalMarkedPeriods) * 100) : 0;

                  // Debug logging
                  console.log('Overall Statistics Calculation:', {
                    totalStudents: stats.totalStudents,
                    studentsWithData: rangeReport.filter(s => s.totalAttendance && s.totalAttendance.marked > 0).length,
                    studentsWithNoData: stats.studentsWithNoAttendance,
                    totalPresentPeriods: stats.totalPresentPeriods,
                    totalMarkedPeriods: stats.totalMarkedPeriods,
                    averageAttendance: stats.averageAttendance
                  });

                  return [
                    { label: 'Total Students', value: stats.totalStudents, color: '#2196f3' },
                    { label: 'Total Present Periods', value: stats.totalPresentPeriods, color: '#4caf50' },
                    { label: 'Total Marked Periods', value: stats.totalMarkedPeriods, color: '#ff9800' },
                    { label: 'Average Attendance %', value: `${stats.averageAttendance}%`, color: '#9c27b0' },
                    { label: 'Good Attendance (≥75%)', value: stats.studentsWithGoodAttendance, color: '#4caf50' },
                    { label: 'Average Attendance (50-74%)', value: stats.studentsWithAverageAttendance, color: '#ff9800' },
                    { label: 'Poor Attendance (<50%)', value: stats.studentsWithPoorAttendance, color: '#f44336' },
                    { label: 'No Attendance Data', value: stats.studentsWithNoAttendance, color: '#6c757d' }
                  ].map((stat, index) => (
                    <div key={index} className="stat-card">
                      <div className="stat-value" style={{ color: stat.color }}>
                        {stat.value}
                      </div>
                      <div className="stat-label">
                        {stat.label}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Export buttons for range report */}
          {rangeReport.length > 0 && (
            <div style={{ margin: '16px 0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="export-btn"
                onClick={exportRangeCSV}
                style={{ backgroundColor: '#17a2b8' }}
              >
                <FaDownload style={{ marginRight: '4px' }} />
                Export CSV
              </button>
              <button
                className="export-btn"
                onClick={exportRangeExcel}
                style={{ backgroundColor: '#28a745' }}
              >
                <FaDownload style={{ marginRight: '4px' }} />
                Export Excel
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  placeholder="Enter email to send report"
                  style={{ width: '250px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <button
                  className="export-btn"
                  style={{ backgroundColor: '#ffc107', color: '#000' }}
                  onClick={() => {
                    if (!rangeReport.length || !rangeDates.length || !periods) {
                      toast.error('No data available to send. Please generate a report first.');
                      return;
                    }

                    // Use the same logic as exportRangeCSV function
                    const headers = ['Student Name', 'Roll Number', 'Class', 'Section'];
                    rangeDates.forEach(date => {
                      periods.forEach(period => {
                        headers.push(`${date} P${period}`);
                      });
                    });
                    // Add total attendance columns
                    headers.push('Total Present Periods', 'Total Marked Periods', 'Total Attendance %');

                    const rows = rangeReport.map(r => {
                      const row = [r.fullName, r.rollNumber, r.className, r.section];
                      if (r.attendance) {
                        if (Array.isArray(r.attendance)) {
                          // Range report structure: array of date objects
                          r.attendance.forEach(a => {
                            periods.forEach(period => {
                              row.push(a[`period${period}`] || 'not-marked');
                            });
                          });
                        } else if (typeof r.attendance === 'object' && r.attendance !== null) {
                          // Date range report structure: object with date keys
                          rangeDates && rangeDates.forEach(date => {
                            periods.forEach(period => {
                              row.push(r.attendance[date] || 'not-marked');
                            });
                          });
                        }
                      }
                      // Add total attendance data
                      if (r.totalAttendance) {
                        row.push(r.totalAttendance.present, r.totalAttendance.marked, `${r.totalAttendance.percentage}%`);
                      } else {
                        row.push('', '', '');
                      }
                      return row;
                    });

                    console.log('Range report email data:', { headers, rows, rangeReport });

                    sendReportViaEmail('range', {
                      headers,
                      rows,
                      startDate,
                      endDate,
                      className: selectedClass,
                      section: selectedSection,
                      totalStudents: rangeReport.length,
                      generatedAt: new Date().toLocaleString('en-IN')
                    });
                  }}
                  disabled={!rangeReport.length || !emailAddress || sendingEmail}
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
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
                      {rangeDates && (periods && periods.length ? periods : [1, 2, 3, 4, 5, 6, 7]) && rangeDates.map(date => (periods && periods.length ? periods : [1, 2, 3, 4, 5, 6, 7]).map(period => (
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
                        {r.attendance && (() => {
                          // Handle different attendance data structures
                          if (Array.isArray(r.attendance)) {
                            // Range report structure: array of date objects
                            return r.attendance.map((a, aidx) => (periods && periods.length ? periods : [1, 2, 3, 4, 5, 6, 7]).map(period => (
                              <td key={aidx + '-p' + period}>{a[`period${period}`] || '-'}</td>
                            )));
                          } else if (typeof r.attendance === 'object' && r.attendance !== null) {
                            // Date range report structure: object with date keys
                            return rangeDates && rangeDates.map((date, dateIdx) => (periods && periods.length ? periods : [1, 2, 3, 4, 5, 6, 7]).map(period => (
                              <td key={dateIdx + '-p' + period}>{r.attendance[date] || '-'}</td>
                            )));
                          }
                          return null;
                        })()}
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

      {/* Summary Cards for Student Report */}
      {reportType === 'student' && reports.length > 0 && (
        <div className="report-summary">
          <div className="summary-cards">
            <div className="summary-card total">
              <div className="card-icon">
                <FaChartBar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts.total}</h3>
                <p>Total Periods</p>
              </div>
            </div>
            <div className="summary-card present">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts.present}</h3>
                <p>Present ({getStatusPercentage(studentDayCounts.present, studentDayCounts.total)}%)</p>
              </div>
            </div>
            <div className="summary-card absent">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts.absent}</h3>
                <p>Absent ({getStatusPercentage(studentDayCounts.absent, studentDayCounts.total)}%)</p>
              </div>
            </div>
            <div className="summary-card late">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts.late}</h3>
                <p>Late ({getStatusPercentage(studentDayCounts.late, studentDayCounts.total)}%)</p>
              </div>
            </div>
            <div className="summary-card half-day">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts['half-day']}</h3>
                <p>Half-Day ({getStatusPercentage(studentDayCounts['half-day'], studentDayCounts.total)}%)</p>
              </div>
            </div>
            <div className="summary-card not-marked">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts['not-marked']}</h3>
                <p>Not Marked ({getStatusPercentage(studentDayCounts['not-marked'], studentDayCounts.total)}%)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards for Class Reports (Daily and Date Range) */}
      {reportType !== 'student' && selectedClass && selectedSection && selectedDate && (
        <div className="report-summary">
          <div className="summary-cards">
            <div className="summary-card total">
              <div className="card-icon">
                <FaChartBar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts.total}</h3>
                <p>Total Students</p>
              </div>
            </div>
            <div className="summary-card present">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts.present}</h3>
                <p>Present ({getStatusPercentage(studentDayCounts.present, studentDayCounts.total)}%)</p>
              </div>
            </div>
            <div className="summary-card absent">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts.absent}</h3>
                <p>Absent ({getStatusPercentage(studentDayCounts.absent, studentDayCounts.total)}%)</p>
              </div>
            </div>
            <div className="summary-card late">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts.late}</h3>
                <p>Late ({getStatusPercentage(studentDayCounts.late, studentDayCounts.total)}%)</p>
              </div>
            </div>
            <div className="summary-card half-day">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts['half-day']}</h3>
                <p>Half-Day ({getStatusPercentage(studentDayCounts['half-day'], studentDayCounts.total)}%)</p>
              </div>
            </div>
            <div className="summary-card not-marked">
              <div className="card-icon">
                <FaCalendar />
              </div>
              <div className="card-content">
                <h3>{studentDayCounts['not-marked']}</h3>
                <p>Not Marked ({getStatusPercentage(studentDayCounts['not-marked'], studentDayCounts.total)}%)</p>
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

      {reports.length > 0 && reportType === 'student' && (
        <div className="report-table-container">
          <h3>
            Detailed Report - {selectedStudentDetails?.fullName || reports[0]?.studentName || reports[0]?.student?.fullName || 'Student'}
            ({selectedStudentDetails?.rollNumber || reports[0]?.rollNumber || reports[0]?.student?.rollNumber || 'N/A'})
            {startDate && endDate ? `(${startDate} to ${endDate})` : `(${new Date().toLocaleDateString()})`}
          </h3>
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
              {reports.map((record, idx) => {
                const period = record.period || record.periodNumber || null;
                const periodDisplay = period ? `P${period} (${getPeriodTime(period)})` : '-';
                return (
                  <tr key={`${record.studentId || idx}-${record.date}-${period || idx}`}>
                    <td>{record.rollNumber || record.student?.rollNumber || '-'}</td>
                    <td>{record.studentName || record.student?.fullName || record.fullName || '-'}</td>
                    <td>{periodDisplay}</td>
                    <td>
                      <span className={`status-badge ${record.status || 'not-marked'}`}>
                        {record.status === 'not-marked' || !record.status ? 'Not Marked' : record.status}
                      </span>
                    </td>
                    <td>{record.session || '-'}</td>
                    <td>{record.date ? (typeof record.date === 'string' ? record.date : new Date(record.date).toLocaleDateString('en-GB')) : '-'}</td>
                    <td>{record.remarks || '-'}</td>
                  </tr>
                );
              })}
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