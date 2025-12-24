import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaGraduationCap, FaLock, FaEye, FaEyeSlash, FaUserShield, FaUserGraduate } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import { API_ENDPOINTS } from '../../config/api';
import './Auth.css';

const Login = ({ fixedRole }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: fixedRole || 'student' // Use fixedRole if provided, otherwise default to 'student'
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({ ...prev, role }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setSuccessMessage('');

    try {
      // Always use the unified auth login endpoint
      // This works for both Students and Admins (who are Users with role='admin')
      const endpoint = API_ENDPOINTS.LOGIN;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Login successful! Redirecting...');
        localStorage.setItem('token', data.token);

        // Get user data
        const user = data.user;

        // Verify role matches
        if (formData.role !== user.role) {
          console.warn(`Warning: Login role ${formData.role} does not match user role ${user.role}`);

          // If fixedRole is set, enforce strict role matching
          if (fixedRole) {
            const roleLabel = fixedRole === 'admin' ? 'Admin' : 'Student';
            setErrors({ general: `Invalid credentials for ${roleLabel} login. Please use the correct login page.` });
            setIsLoading(false);
            return;
          }
        }

        if (user.role === 'admin') {
          // Store as admin for backward compatibility with Admin Dashboard
          localStorage.setItem('admin', JSON.stringify(user));
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('adminId', user.id || user._id);

          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1500);
        } else {
          // Student login
          localStorage.setItem('user', JSON.stringify(user));

          setTimeout(() => {
            navigate('/student/dashboard', { replace: true });
          }, 1500);
        }
      } else {
        setErrors({ general: data.message || 'Login failed. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please check your connection.' });
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Floating Elements */}
      <div className="floating-element"></div>
      <div className="floating-element"></div>
      <div className="floating-element"></div>

      <div className="auth-form-container">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-header">
            <div className="college-logo-section">
              <div className="college-logo">
                <FaGraduationCap />
              </div>
              <div className="college-info">
                <h2 className="college-name">KONGU ENGINEERING COLLEGE</h2>
                <p className="college-subtitle">(Autonomous)</p>
                <p className="college-details">Affiliated to Anna University | Accredited by NAAC with A++ Grade</p>
                <p className="college-address">Perundurai Erode - 638060 Tamilnadu India</p>
              </div>
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your account to continue</p>
          </div>

          {errors.general && (
            <div className="error-message">
              <span>⚠️</span>
              {errors.general}
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              <span>✅</span>
              {successMessage}
            </div>
          )}

          {/* Role Selection - Hidden when fixedRole is set */}
          {!fixedRole && (
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${formData.role === 'student' ? 'active' : ''}`}
                onClick={() => handleRoleChange('student')}
              >
                <FaUserGraduate /> Student
              </button>
              <button
                type="button"
                className={`role-btn ${formData.role === 'admin' ? 'active' : ''}`}
                onClick={() => handleRoleChange('admin')}
              >
                <FaUserShield /> Admin
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                id="email"
                name="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="email"
              />
              <MdEmail className="input-icon" />
            </div>
            {errors.email && (
              <div className="error-message">
                <span>⚠️</span>
                {errors.email}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray-400)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && (
              <div className="error-message">
                <span>⚠️</span>
                {errors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Signing In...
              </>
            ) : (
              <>
                <FaLock />
                Sign In as {formData.role === 'admin' ? 'Admin' : 'Student'}
              </>
            )}
          </button>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => navigate('/register')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  cursor: 'pointer',
                  color: '#3b82f6',
                  textDecoration: 'underline'
                }}
              >
                Create one here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;