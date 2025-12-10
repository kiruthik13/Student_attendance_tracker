import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../config/api';
import { FaClipboardList, FaSave } from 'react-icons/fa';

const MarksEntryPage = () => {
    // Filters
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedExamType, setSelectedExamType] = useState('Internal 1'); // Default
    const [term, setTerm] = useState('Current'); // Default term

    // Data
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState({}); // Mapping studentId -> marksObtained
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Constants
    const examTypes = ['Internal 1', 'Internal 2', 'Assignment', 'Semester'];

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Parallel fetch for classes, sections, subjects
            const [classRes, sectionRes, subjectRes] = await Promise.all([
                axios.get(API_ENDPOINTS.STUDENT_CLASSES, { headers }),
                axios.get(API_ENDPOINTS.STUDENT_SECTIONS, { headers }),
                axios.get(API_ENDPOINTS.SUBJECTS, { headers })
            ]);

            setClasses(classRes.data.classes || []);
            setSections(sectionRes.data.sections || []);
            setSubjects(subjectRes.data || []);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            toast.error('Failed to load filter options');
        }
    };

    const handleFetchStudents = async () => {
        if (!selectedClass || !selectedSection || !selectedSubject) {
            toast.warning('Please select Class, Section, and Subject');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Fetch Students
            const studentsRes = await axios.get(API_ENDPOINTS.STUDENTS, {
                params: { className: selectedClass, section: selectedSection, limit: 1000 },
                headers
            });

            // 2. Fetch Existing Marks
            const marksRes = await axios.get(API_ENDPOINTS.MARKS, {
                params: {
                    class: selectedClass, // Backend uses this to filter students if needed
                    subjectId: selectedSubject,
                    examType: selectedExamType,
                    term: term
                },
                headers
            });

            const fetchedStudents = studentsRes.data.students || [];
            const fetchedMarks = marksRes.data || [];

            // Map existing marks to student IDs
            const marksMap = {};
            fetchedMarks.forEach(mark => {
                if (mark.studentId && (mark.studentId._id || mark.studentId)) {
                    const sId = mark.studentId._id || mark.studentId;
                    marksMap[sId] = mark.marksObtained;
                }
            });

            setStudents(fetchedStudents);
            setMarksData(marksMap);

            if (fetchedStudents.length === 0) {
                toast.info('No students found for this class/section');
            }

        } catch (error) {
            console.error('Error fetching students/marks:', error);
            toast.error('Error loading data');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (studentId, value) => {
        // Validate input (allow empty strings for clearing)
        if (value === '') {
            const newMarks = { ...marksData };
            delete newMarks[studentId]; // Remove from state if empty
            setMarksData(newMarks);
            return;
        }

        const numValue = Number(value);
        if (isNaN(numValue)) return; // Reject non-numbers

        // Check max marks logic removed here, handled in rendering for visual feedback
        setMarksData({
            ...marksData,
            [studentId]: value
        });
    };

    const validateMarks = () => {
        const subject = subjects.find(s => s._id === selectedSubject);
        const max = subject ? subject.maxMarks : 100;
        let isValid = true;

        for (const [studentId, mark] of Object.entries(marksData)) {
            const numMark = Number(mark);
            if (isNaN(numMark)) isValid = false;
            if (numMark < 0 || numMark > max) isValid = false;
        }
        return isValid;
    }

    const handleSaveAll = async () => {
        if (!validateMarks()) {
            toast.error('Some marks are invalid. Please check values.');
            return;
        }

        setIsSaving(true);
        try {
            const marksPayload = Object.keys(marksData).map(studentId => ({
                studentId,
                marksObtained: Number(marksData[studentId])
            }));

            if (marksPayload.length === 0) {
                toast.info('No marks to save');
                setIsSaving(false);
                return;
            }

            const token = localStorage.getItem('token');
            await axios.post(API_ENDPOINTS.MARKS_BULK, {
                marks: marksPayload,
                subjectId: selectedSubject,
                examType: selectedExamType,
                term
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Marks saved successfully');
            // Optionally refresh data
        } catch (error) {
            console.error('Error saving marks:', error);
            toast.error('Failed to save marks');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="main-content">
            <div className="content-header">
                <h1 className="welcome-message">Marks Entry</h1>
                <p className="welcome-subtitle">Enter and update marks for students</p>
            </div>

            {/* Filters Card */}
            <div className="content-section">
                <div className="section-header">
                    <h2 className="section-title">
                        <div className="section-icon">
                            <FaClipboardList />
                        </div>
                        Select Criteria
                    </h2>
                </div>

                <div className="grid-cols-3">
                    {/* Row 1 */}
                    <div className="form-group">
                        <label className="form-label">Class</label>
                        <select
                            className="form-select"
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                        >
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Section</label>
                        <select
                            className="form-select"
                            value={selectedSection}
                            onChange={e => setSelectedSection(e.target.value)}
                        >
                            <option value="">Select Section</option>
                            {sections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Subject</label>
                        <select
                            className="form-select"
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                        >
                            <option value="">Select Subject</option>
                            {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>

                    {/* Row 2 */}
                    <div className="form-group">
                        <label className="form-label">Exam Type</label>
                        <select
                            className="form-select"
                            value={selectedExamType}
                            onChange={e => setSelectedExamType(e.target.value)}
                        >
                            {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Term / Year</label>
                        <input
                            className="form-input"
                            type="text"
                            value={term}
                            onChange={e => setTerm(e.target.value)}
                            placeholder="e.g. 2023-2024"
                        />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            className="action-button"
                            onClick={handleFetchStudents}
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            {loading ? 'Loading...' : 'Fetch Students'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Marks Table */}
            {students.length > 0 && (
                <div className="content-section">
                    <div className="section-header" style={{ justifyContent: 'space-between' }}>
                        <h2 className="section-title">
                            Students List
                            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--gray-500)', marginLeft: '1rem' }}>
                                (Max: {subjects.find(s => s._id === selectedSubject)?.maxMarks})
                            </span>
                        </h2>
                        <button
                            className="action-button"
                            onClick={handleSaveAll}
                            disabled={isSaving}
                        >
                            <FaSave />
                            {isSaving ? 'Saving...' : 'Save All Marks'}
                        </button>
                    </div>

                    <div className="data-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Student Name</th>
                                    <th style={{ width: '200px' }}>Marks Obtained</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => {
                                    const currentMark = marksData[student._id] || '';
                                    const subjectMatcher = subjects.find(s => s._id === selectedSubject);
                                    const max = subjectMatcher ? subjectMatcher.maxMarks : 100;
                                    const isInvalid = Number(currentMark) > max || Number(currentMark) < 0;

                                    return (
                                        <tr key={student._id}>
                                            <td>{student.rollNumber}</td>
                                            <td>{student.fullName}</td>
                                            <td>
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    value={currentMark}
                                                    onChange={(e) => handleMarkChange(student._id, e.target.value)}
                                                    style={{
                                                        borderColor: isInvalid ? 'var(--danger)' : undefined,
                                                        background: isInvalid ? '#fff0f0' : undefined
                                                    }}
                                                    min="0"
                                                    max={max}
                                                />
                                                {isInvalid && <small style={{ color: 'var(--danger)', display: 'block', marginTop: '0.25rem' }}>Invalid marks</small>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {students.length === 0 && !loading && (
                <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--gray-500)' }}>
                    Select filters and click "Fetch Students" to start entering marks.
                </div>
            )}
        </div>
    );
};

export default MarksEntryPage;
