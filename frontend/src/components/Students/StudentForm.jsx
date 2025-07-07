import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaSave, FaTimes } from 'react-icons/fa';
import { API_ENDPOINTS } from '../../config/api';
import './Students.css';

const StudentForm = ({ student, onSave, onCancel }) => {
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
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (student) {
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
  }, [student]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name must be at least 2 characters';
    } else if (formData.fullName.trim().length > 50) {
      newErrors.fullName = 'Full Name cannot exceed 50 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.fullName.trim())) {
      newErrors.fullName = 'Full name can only contain letters and spaces';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Roll Number validation
    if (!formData.rollNumber.trim()) {
      newErrors.rollNumber = 'Roll Number is required';
    }

    // Class validation
    if (!formData.className.trim()) {
      newErrors.className = 'Class is required';
    }

    // Section validation
    if (!formData.section.trim()) {
      newErrors.section = 'Section is required';
    } else if (formData.section.trim().length > 2) {
      newErrors.section = 'Section cannot exceed 2 characters';
    }

    // Phone Number validation (optional)
    if (formData.phoneNumber && !/^[0-9]{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must be 10 digits';
    }

    // Parent Phone validation (optional)
    if (formData.parentPhone && !/^[0-9]{10}$/.test(formData.parentPhone)) {
      newErrors.parentPhone = 'Parent phone number must be 10 digits';
    }

    // Address validation (optional)
    if (formData.address && formData.address.length > 200) {
      newErrors.address = 'Address cannot exceed 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const url = student 
        ? `${API_ENDPOINTS.STUDENTS}/${student._id}`
        : API_ENDPOINTS.STUDENTS;
      
      const method = student ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        onSave(data.student);
        return;
      } else {
        const data = await response.json();
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach(error => {
            toast.error(`${error.field}: ${error.message}`);
          });
        } else {
          toast.error(data.message || 'Failed to save student');
        }
      }
    } catch (error) {
      console.error('Save student error:', error);
      toast.error('Failed to save student');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="student-form-overlay">
      <div className="student-form-modal">
        <div className="form-header">
          <h3>{student ? 'Edit Student' : 'Add New Student'}</h3>
          <button className="close-btn" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="student-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={errors.fullName ? 'error' : ''}
                placeholder="Enter full name"
              />
              <small className="form-help-text">
                Only letters and spaces allowed (2-50 characters)
              </small>
              {errors.fullName && <span className="error-message">{errors.fullName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="Enter email address"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="rollNumber">Roll Number *</label>
              <input
                type="text"
                id="rollNumber"
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
                className={errors.rollNumber ? 'error' : ''}
                placeholder="Enter roll number"
                disabled={!!student} // Cannot edit roll number
              />
              {errors.rollNumber && <span className="error-message">{errors.rollNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="className">Class *</label>
              <input
                type="text"
                id="className"
                name="className"
                value={formData.className}
                onChange={handleChange}
                className={errors.className ? 'error' : ''}
                placeholder="Enter class"
              />
              {errors.className && <span className="error-message">{errors.className}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="section">Section *</label>
              <input
                type="text"
                id="section"
                name="section"
                value={formData.section}
                onChange={handleChange}
                className={errors.section ? 'error' : ''}
                placeholder="Enter section"
                maxLength="2"
              />
              {errors.section && <span className="error-message">{errors.section}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={errors.phoneNumber ? 'error' : ''}
                placeholder="Enter 10-digit phone number"
                maxLength="10"
              />
              <small className="form-help-text">
                Optional - 10 digits only
              </small>
              {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="parentName">Parent Name</label>
              <input
                type="text"
                id="parentName"
                name="parentName"
                value={formData.parentName}
                onChange={handleChange}
                placeholder="Enter parent name"
                maxLength="50"
              />
            </div>

            <div className="form-group">
              <label htmlFor="parentPhone">Parent Phone</label>
              <input
                type="tel"
                id="parentPhone"
                name="parentPhone"
                value={formData.parentPhone}
                onChange={handleChange}
                className={errors.parentPhone ? 'error' : ''}
                placeholder="Enter 10-digit phone number"
                maxLength="10"
              />
              <small className="form-help-text">
                Optional - 10 digits only
              </small>
              {errors.parentPhone && <span className="error-message">{errors.parentPhone}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={errors.address ? 'error' : ''}
              placeholder="Enter address"
              rows="3"
              maxLength="200"
            />
            <small className="form-help-text">
              Optional - Maximum 200 characters
            </small>
            {errors.address && <span className="error-message">{errors.address}</span>}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : <><FaSave /> Save Student</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm; 