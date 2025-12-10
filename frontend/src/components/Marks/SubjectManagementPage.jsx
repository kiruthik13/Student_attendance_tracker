import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaList } from 'react-icons/fa';
import { API_ENDPOINTS } from '../../config/api';

const SubjectManagementPage = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSubject, setCurrentSubject] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        maxMarks: 100
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(API_ENDPOINTS.SUBJECTS, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubjects(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching subjects:', error);
            toast.error('Failed to load subjects');
            setLoading(false);
        }
    };

    const handleOpenModal = (subject = null) => {
        if (subject) {
            setCurrentSubject(subject);
            setFormData({
                name: subject.name,
                code: subject.code,
                maxMarks: subject.maxMarks
            });
        } else {
            setCurrentSubject(null);
            setFormData({
                name: '',
                code: '',
                maxMarks: 100
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentSubject(null);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            if (currentSubject) {
                // Update
                await axios.put(`${API_ENDPOINTS.SUBJECTS}/${currentSubject._id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Subject updated successfully');
            } else {
                // Create
                await axios.post(API_ENDPOINTS.SUBJECTS, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Subject created successfully');
            }
            fetchSubjects();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving subject:', error);
            toast.error(error.response?.data?.msg || 'Failed to save subject');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this subject?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_ENDPOINTS.SUBJECTS}/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Subject deleted successfully');
                fetchSubjects();
            } catch (error) {
                console.error('Error deleting subject:', error);
                toast.error('Failed to delete subject');
            }
        }
    };

    const filteredSubjects = subjects.filter(subject =>
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="main-content">
            <div className="content-header">
                <h1 className="welcome-message">Subject Management</h1>
                <p className="welcome-subtitle">Create, edit and manage subjects for the curriculum</p>
                <div className="dashboard-info">
                    <div style={{ position: 'relative', width: '300px' }}>
                        <FaSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                        <input
                            className="form-input"
                            style={{ paddingLeft: '2.5rem' }}
                            type="text"
                            placeholder="Search subjects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="action-button" onClick={() => handleOpenModal()}>
                        <FaPlus /> Add Subject
                    </button>
                </div>
            </div>

            <div className="content-section">
                <div className="section-header">
                    <h2 className="section-title">
                        <div className="section-icon">
                            <FaList />
                        </div>
                        Subjects List ({subjects.length})
                    </h2>
                </div>

                {loading ? (
                    <div className="loading" style={{ minHeight: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="loading-spinner"></div>
                    </div>
                ) : (
                    <div className="data-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject Code</th>
                                    <th>Subject Name</th>
                                    <th>Max Marks</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubjects.length > 0 ? (
                                    filteredSubjects.map((subject) => (
                                        <tr key={subject._id}>
                                            <td><strong>{subject.code}</strong></td>
                                            <td>{subject.name}</td>
                                            <td>{subject.maxMarks}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleOpenModal(subject)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--info)', marginRight: '1rem', cursor: 'pointer', fontSize: '1.1rem' }}
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(subject._id)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.1rem' }}
                                                    title="Delete"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                                            No subjects found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">{currentSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Subject Code *</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    placeholder="e.g. MAT101"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Subject Name *</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Mathematics"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Max Marks *</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    name="maxMarks"
                                    value={formData.maxMarks}
                                    onChange={handleChange}
                                    min="1"
                                    max="1000"
                                    required
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={handleCloseModal} className="action-button secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="action-button">
                                    {currentSubject ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectManagementPage;
