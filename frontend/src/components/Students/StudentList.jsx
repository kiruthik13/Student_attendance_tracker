import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { API_ENDPOINTS } from '../../config/api';
import './Students.css';

const StudentList = ({ onAddStudent, onEditStudent, onViewStudent }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        className: selectedClass,
        section: selectedSection,
        isActive: activeFilter
      });

      const response = await fetch(`${API_ENDPOINTS.STUDENTS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
        setTotalPages(data.totalPages);
      } else {
        toast.error('Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error fetching students');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.STUDENT_CLASSES}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.STUDENT_SECTIONS}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSections(data.sections);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.STUDENTS}/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Student deleted successfully');
        fetchStudents();
      } else {
        toast.error('Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Error deleting student');
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchStudents();
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchStudents();
  };

  useEffect(() => {
    fetchStudents();
  }, [currentPage]);

  useEffect(() => {
    fetchClasses();
    fetchSections();
  }, []);

  const getStatusBadge = (isActive) => {
    return (
      <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  if (loading && students.length === 0) {
    return (
      <div className="students-container">
        <div className="loading-spinner">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="students-container">
      <div className="students-header">
        <h2>Student Management</h2>
        <button className="add-student-btn" onClick={onAddStudent}>
          <FaPlus /> Add Student
        </button>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>
            <FaSearch />
          </button>
        </div>

        <div className="filter-controls">
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              handleFilterChange();
            }}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              handleFilterChange();
            }}
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              handleFilterChange();
            }}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <div className="students-table-container">
        <table className="students-table">
          <thead>
            <tr>
              <th>Roll Number</th>
              <th>Name</th>
              <th>Email</th>
              <th>Class</th>
              <th>Section</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student._id}>
                <td>{student.rollNumber}</td>
                <td>{student.fullName}</td>
                <td>{student.email}</td>
                <td>{student.className}</td>
                <td>{student.section}</td>
                <td>{student.phoneNumber || '-'}</td>
                <td>{getStatusBadge(student.isActive)}</td>
                <td className="actions">
                  <button
                    className="action-btn view"
                    onClick={() => onViewStudent(student)}
                    title="View Details"
                  >
                    <FaEye />
                  </button>
                  <button
                    className="action-btn edit"
                    onClick={() => onEditStudent(student)}
                    title="Edit Student"
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDeleteStudent(student._id)}
                    title="Delete Student"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && !loading && (
          <div className="no-students">
            <p>No students found. Add your first student to get started!</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentList; 