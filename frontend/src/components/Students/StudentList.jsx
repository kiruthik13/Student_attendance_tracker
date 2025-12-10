import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';
import './Students.css';

const StudentList = ({ onViewStudent, onEditStudent }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [searchTerm]);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.STUDENTS, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchTerm }
      });
      setStudents(response.data.students);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch students');
      setLoading(false);
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student? This will also delete their login account.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_ENDPOINTS.STUDENTS}/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchStudents(); // Refresh list
      } catch (err) {
        alert('Failed to delete student');
        console.error(err);
      }
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="student-list-container">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name, roll number, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-responsive">
        <table className="student-table">
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Name</th>
              <th>Class</th>
              <th>Section</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((student) => (
                <tr key={student._id}>
                  <td>{student.rollNumber}</td>
                  <td>{student.fullName}</td>
                  <td>{student.className}</td>
                  <td>{student.section}</td>
                  <td>{student.email}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-view"
                      onClick={() => onViewStudent && onViewStudent(student)}
                    >
                      View
                    </button>
                    <button
                      className="btn-edit"
                      onClick={() => onEditStudent && onEditStudent(student)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(student._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">No students found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentList;