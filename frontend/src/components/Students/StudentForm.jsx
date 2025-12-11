import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../config/api';
import './Students.css';

const StudentForm = ({ student, onSave, onCancel }) => {
  const isEditMode = !!student;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    rollNumber: '',
    className: '',
    section: '',
    phoneNumber: '',
    parentName: '',
    parentPhone: '',
    address: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditMode && student) {
      setFormData({
        fullName: student.fullName || '',
        email: student.email || '',
        rollNumber: student.rollNumber || '',
        className: student.className || '',
        section: student.section || '',
        phoneNumber: student.phoneNumber || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        address: student.address || ''
      });
    }
  }, [student, isEditMode]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      let response;

      if (isEditMode) {
        response = await axios.put(`${API_ENDPOINTS.STUDENTS}/${student._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('✅ Student updated successfully!', {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        response = await axios.post(API_ENDPOINTS.STUDENTS, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(
          <div>
            <strong>🎉 Student Created Successfully!</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9em', color: '#ffffff' }}>
              User account has been created with default password.
            </p>
          </div>,
          {
            position: "top-right",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            closeButton: true,
          }
        );
      }

      if (onSave) onSave(response.data.student);

    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-form-container">
      <div className="form-header">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="student-form">
        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>Roll Number *</label>
            <input
              type="text"
              name="rollNumber"
              value={formData.rollNumber}
              onChange={handleChange}
              required
              disabled={isEditMode} // Usually roll number shouldn't change
            />
          </div>
          <div className="form-group half">
            <label>Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>Class *</label>
            <input
              type="text"
              name="className"
              value={formData.className}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group half">
            <label>Section *</label>
            <input
              type="text"
              name="section"
              value={formData.section}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>Parent Name</label>
            <input
              type="text"
              name="parentName"
              value={formData.parentName}
              onChange={handleChange}
            />
          </div>
          <div className="form-group half">
            <label>Parent Phone</label>
            <input
              type="text"
              name="parentPhone"
              value={formData.parentPhone}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="3"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Saving...' : (isEditMode ? 'Update Student' : 'Create Student')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentForm;