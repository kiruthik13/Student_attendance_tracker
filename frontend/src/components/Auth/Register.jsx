import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaGraduationCap, FaUser, FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import { MdEmail, MdPerson } from 'react-icons/md';
import { API_ENDPOINTS } from '../../config/api';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 6,
      hasNumber: /\d/.test(password),
      hasLetter: /[a-zA-Z]/.test(password)
    };
    return requirements;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
        const response = await fetch(API_ENDPOINTS.ADMIN_REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.name, // <-- changed from 'name' to 'fullName'
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Registration successful! You can now login.');
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        // Auto switch to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setErrors({ general: data.message || 'Registration failed. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please check your connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = validatePassword(formData.password);

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
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join us to manage student attendance</p>
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

          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="name"
                name="name"
                className={`form-input ${errors.name ? 'error' : ''}`}
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
              />
              <MdPerson className="input-icon" />
            </div>
            {errors.name && (
              <div className="error-message">
                <span>⚠️</span>
                {errors.name}
              </div>
            )}
          </div>

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
                placeholder="Create a password"
                autoComplete="new-password"
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
            
            {formData.password && (
              <div className="password-requirements">
                <div className="requirements-title">Password Requirements:</div>
                <div className={`requirement ${passwordRequirements.length ? 'met' : ''}`}>
                  <div className="requirement-icon">
                    {passwordRequirements.length ? <FaCheck /> : <FaTimes />}
                  </div>
                  At least 6 characters long
                </div>
                <div className={`requirement ${passwordRequirements.hasLetter ? 'met' : ''}`}>
                  <div className="requirement-icon">
                    {passwordRequirements.hasLetter ? <FaCheck /> : <FaTimes />}
                  </div>
                  Contains at least one letter
                </div>
                <div className={`requirement ${passwordRequirements.hasNumber ? 'met' : ''}`}>
                  <div className="requirement-icon">
                    {passwordRequirements.hasNumber ? <FaCheck /> : <FaTimes />}
                  </div>
                  Contains at least one number
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="error-message">
                <span>⚠️</span>
                {errors.confirmPassword}
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
                Creating Account...
              </>
            ) : (
              <>
                <FaUser />
                Create Account
              </>
            )}
          </button>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => navigate('/login')}
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
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register; 