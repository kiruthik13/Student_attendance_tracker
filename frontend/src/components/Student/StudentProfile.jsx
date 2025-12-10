import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';
import './StudentProfile.css';

const StudentProfile = () => {
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(API_ENDPOINTS.STUDENT_PROFILE, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudent(response.data.student);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch profile details');
            setLoading(false);
            console.error(err);
        }
    };

    if (loading) return <div className="loading">Loading profile...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!student) return <div className="no-data">No profile data found</div>;

    return (
        <div className="student-profile-container">
            <h1>My Profile</h1>

            <div className="profile-card">
                <div className="profile-header">
                    <div className="avatar-circle">
                        {student.fullName.charAt(0)}
                    </div>
                    <div className="header-info">
                        <h2>{student.fullName}</h2>
                        <p className="roll-number">Roll No: {student.rollNumber}</p>
                    </div>
                </div>

                <div className="profile-details-grid">
                    <div className="detail-item">
                        <span className="label">Class & Section</span>
                        <span className="value">{student.className} - {student.section}</span>
                    </div>

                    <div className="detail-item">
                        <span className="label">Email</span>
                        <span className="value">{student.email}</span>
                    </div>

                    <div className="detail-item">
                        <span className="label">Phone Number</span>
                        <span className="value">{student.phoneNumber || 'N/A'}</span>
                    </div>

                    <div className="detail-item">
                        <span className="label">Parent Name</span>
                        <span className="value">{student.parentName || 'N/A'}</span>
                    </div>

                    <div className="detail-item">
                        <span className="label">Parent Phone</span>
                        <span className="value">{student.parentPhone || 'N/A'}</span>
                    </div>

                    <div className="detail-item full-width">
                        <span className="label">Address</span>
                        <span className="value">{student.address || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
