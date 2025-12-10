import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const location = useLocation();
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // Try to parse user object
    let user = null;
    try {
        user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error('Error parsing user data', e);
    }

    // Fallback for Admins who logged in before the "User" object change (legacy adminId)
    const adminId = localStorage.getItem('adminId');
    if (!user && adminId) {
        // Legacy admin login considered as Role 'admin'
        user = { role: 'admin' };
    }

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect based on role if unauthorized
        if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
        if (user.role === 'student') return <Navigate to="/student/dashboard" replace />;
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
