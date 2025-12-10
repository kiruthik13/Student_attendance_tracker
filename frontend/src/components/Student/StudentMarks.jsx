import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../../config/api';
import '../Dashboard/Dashboard.css';

const StudentMarks = () => {
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMarks();
    }, []);

    const fetchMarks = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_ENDPOINTS.STUDENT_MARKS, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setMarks(data.marks);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="main-content">
            <div className="content-header">
                <h1 className="welcome-message">My Marks</h1>
            </div>

            <div className="content-section">
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Exam Type</th>
                                <th>Marks Obtained</th>
                                <th>Max Marks</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5">Loading...</td></tr>
                            ) : marks.length > 0 ? (
                                marks.map((mark, index) => (
                                    <tr key={index}>
                                        <td>{mark.subjectName} <small>({mark.subjectCode})</small></td>
                                        <td>{mark.examType}</td>
                                        <td>{mark.marksObtained}</td>
                                        <td>{mark.maxMarks}</td>
                                        <td>{mark.percentage}%</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5">No marks found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentMarks;
