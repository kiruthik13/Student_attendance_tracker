import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../config/api';
import { FaChartLine, FaFileDownload, FaTable } from 'react-icons/fa';

const ConsolidatedMarksPage = () => {
    // Filters
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedExamType, setSelectedExamType] = useState('Internal 1');
    const [term, setTerm] = useState('Current');

    // Data
    const [reportData, setReportData] = useState([]); // Array of student objects with calculated results
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);

    const examTypes = ['Internal 1', 'Internal 2', 'Assignment', 'Semester'];

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    const fetchFilterOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [classRes, sectionRes] = await Promise.all([
                axios.get(API_ENDPOINTS.STUDENT_CLASSES, { headers }),
                axios.get(API_ENDPOINTS.STUDENT_SECTIONS, { headers })
            ]);
            setClasses(classRes.data.classes || []);
            setSections(sectionRes.data.sections || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load filters');
        }
    };

    const generateReport = async () => {
        if (!selectedClass || !selectedSection) {
            toast.warning('Please select Class and Section');
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Fetch filtered Student list
            const studentsRes = await axios.get(API_ENDPOINTS.STUDENTS, {
                params: { className: selectedClass, section: selectedSection, limit: 1000 },
                headers
            });
            const students = studentsRes.data.students || [];

            // 2. Fetch all subjects (to define columns)
            const subjectsRes = await axios.get(API_ENDPOINTS.SUBJECTS, { headers });
            const allSubjects = subjectsRes.data || [];
            setSubjects(allSubjects);

            // 3. Fetch marks for this criteria
            // Ideally we fetch marks for ALL subjects for this class/exam
            const marksRes = await axios.get(API_ENDPOINTS.MARKS, {
                params: {
                    class: selectedClass,
                    examType: selectedExamType,
                    term: term
                },
                headers
            });
            const marks = marksRes.data || [];

            // 4. Consolidate Data
            // Create a lookup: studentId -> { subjectId: markValue }
            const studentMarksMap = {};
            marks.forEach(m => {
                const sId = m.studentId._id || m.studentId;
                const subjId = m.subjectId._id || m.subjectId;

                if (!studentMarksMap[sId]) studentMarksMap[sId] = {};
                studentMarksMap[sId][subjId] = m.marksObtained;
            });

            // Build rows
            const rows = students.map(student => {
                const sMarks = studentMarksMap[student._id] || {};
                let totalObtained = 0;
                let totalMax = 0;

                const subjectResults = allSubjects.map(subj => {
                    const val = sMarks[subj._id];
                    if (val !== undefined && val !== null) {
                        totalObtained += val;
                        totalMax += subj.maxMarks;
                        return { id: subj._id, value: val };
                    }
                    return { id: subj._id, value: '-' }; // Missing mark
                });

                const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : '-';

                return {
                    ...student,
                    subjectResults,
                    totalObtained,
                    totalMax,
                    percentage
                };
            });

            setReportData(rows);
            if (rows.length === 0) toast.info("No students found");

        } catch (error) {
            console.error('Error fetching consolidated marks:', error);
            toast.error('Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        // Simple CSV Export logic
        if (reportData.length === 0) return;

        const header = ['Roll No', 'Name', ...subjects.map(s => s.code), 'Total', 'Percentage'];
        const rows = reportData.map(student => [
            student.rollNumber,
            student.fullName,
            ...student.subjectResults.map(r => r.value === '-' ? '' : r.value),
            student.totalObtained,
            student.percentage + '%'
        ]);

        const csvContent = [
            header.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Consolidated_Marks_${selectedClass}_${selectedSection}_${selectedExamType}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="main-content">
            <div className="content-header">
                <h1 className="welcome-message">Consolidated Marks View</h1>
                <p className="welcome-subtitle">View and export class-wise performance reports</p>
            </div>

            {/* Filter */}
            <div className="content-section">
                <div className="section-header">
                    <h2 className="section-title">
                        <div className="section-icon">
                            <FaChartLine />
                        </div>
                        Report Criteria
                    </h2>
                </div>
                <div className="grid-cols-4">
                    <div className="form-group">
                        <label className="form-label">Class</label>
                        <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Section</label>
                        <select className="form-select" value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
                            <option value="">Select Section</option>
                            {sections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Exam</label>
                        <select className="form-select" value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)}>
                            {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button className="action-button" onClick={generateReport} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                            <FaTable style={{ marginRight: '0.5rem' }} />
                            {loading ? 'Generating...' : 'View Report'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            {reportData.length > 0 && (
                <div className="content-section">
                    <div className="section-header" style={{ justifyContent: 'space-between' }}>
                        <h2 className="section-title">
                            Performance Report
                        </h2>
                        <button className="action-button secondary" onClick={handleExport}>
                            <FaFileDownload />
                            Download CSV
                        </button>
                    </div>

                    <div className="data-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Name</th>
                                    {subjects.map(subj => (
                                        <th key={subj._id} style={{ textAlign: 'center' }} title={subj.name}>
                                            {subj.code} <br /> <small style={{ color: 'var(--gray-500)', fontWeight: 400 }}>({subj.maxMarks})</small>
                                        </th>
                                    ))}
                                    <th style={{ textAlign: 'center', color: 'var(--primary-color)' }}>Total</th>
                                    <th style={{ textAlign: 'center', color: 'var(--primary-color)' }}>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map(student => (
                                    <tr key={student._id}>
                                        <td>{student.rollNumber}</td>
                                        <td>{student.fullName}</td>
                                        {student.subjectResults.map(res => (
                                            <td key={res.id} style={{ textAlign: 'center' }}>
                                                {res.value}
                                            </td>
                                        ))}
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{student.totalObtained} / {student.totalMax}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary-color)' }}>{student.percentage}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsolidatedMarksPage;
