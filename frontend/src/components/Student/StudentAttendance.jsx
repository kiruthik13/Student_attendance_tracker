import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../../config/api';
import '../Dashboard/Dashboard.css'; // Use shared styles

const StudentAttendance = () => {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_ENDPOINTS.STUDENT_ATTENDANCE, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setAttendance(data.attendance);
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
                <h1 className="welcome-message">My Attendance</h1>
            </div>

            <div className="content-section">
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Periods Present</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="3">Loading...</td></tr>
                            ) : attendance.length > 0 ? (
                                attendance.map((record, index) => (
                                    <tr key={index}>
                                        <td>{new Date(record.date).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`status-badge status-${record.status.toLowerCase()}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td>{record.periodsPresent} / {record.totalPeriods}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3">No attendance records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentAttendance;
