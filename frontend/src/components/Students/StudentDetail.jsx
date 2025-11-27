import React from 'react';
import { FaTimes, FaEdit, FaPhone, FaEnvelope, FaMapMarkerAlt, FaUser } from 'react-icons/fa';
import './Students.css';

const StudentDetail = ({ student, onClose, onEdit }) => {
  if (!student) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="student-detail-overlay">
      <div className="student-detail-modal">
        <div className="detail-header">
          <h3>Student Details</h3>
          <div className="header-actions">
            <button className="edit-btn" onClick={() => onEdit(student)}>
              <FaEdit /> Edit
            </button>
            <button className="close-btn detail-close-btn" onClick={onClose} aria-label="Close student details">
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="student-detail-content">
          <div className="student-basic-info">
            <div className="student-avatar">
              <FaUser />
            </div>
            <div className="student-name-section">
              <h2>{student.fullName}</h2>
              <p className="student-roll">Roll Number: {student.rollNumber}</p>
              <span className={`status-badge ${student.isActive ? 'active' : 'inactive'}`}>
                {student.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="detail-sections">
            <div className="detail-section">
              <h4>Academic Information</h4>
              <div className="info-grid">
                <div className="info-item">
                  <label>Class:</label>
                  <span>{student.className}</span>
                </div>
                <div className="info-item">
                  <label>Section:</label>
                  <span>{student.section}</span>
                </div>
                <div className="info-item">
                  <label>Email:</label>
                  <span>
                    <FaEnvelope className="icon" />
                    {student.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Contact Information</h4>
              <div className="info-grid">
                {student.phoneNumber && (
                  <div className="info-item">
                    <label>Phone Number:</label>
                    <span>
                      <FaPhone className="icon" />
                      {student.phoneNumber}
                    </span>
                  </div>
                )}
                {student.parentName && (
                  <div className="info-item">
                    <label>Parent Name:</label>
                    <span>{student.parentName}</span>
                  </div>
                )}
                {student.parentPhone && (
                  <div className="info-item">
                    <label>Parent Phone:</label>
                    <span>
                      <FaPhone className="icon" />
                      {student.parentPhone}
                    </span>
                  </div>
                )}
                {student.address && (
                  <div className="info-item full-width">
                    <label>Address:</label>
                    <span>
                      <FaMapMarkerAlt className="icon" />
                      {student.address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h4>System Information</h4>
              <div className="info-grid">
                <div className="info-item">
                  <label>Created:</label>
                  <span>{formatDate(student.createdAt)}</span>
                </div>
                <div className="info-item">
                  <label>Last Updated:</label>
                  <span>{formatDate(student.updatedAt)}</span>
                </div>
                <div className="info-item">
                  <label>Student ID:</label>
                  <span className="student-id">{student._id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDetail; 