import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const UserManagement = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Không thể phân tích phản hồi lỗi từ server.' }));
        throw new Error(errorData.detail || `Lỗi ${response.status}: Không thể tải danh sách người dùng.`);
      }
      const data = await response.json();
      console.log('Fetched users data:', data);
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Đã xảy ra sự cố. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenEditModal = (user) => {
    console.log('Selected user:', user);
    setSelectedUser(user);
    setEditFormData({
      username: user.username || '',
      email: user.email || '',
      name: user.name || '',
      phone: user.phone || ''
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const handleFormChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedUser) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Cập nhật thông tin người dùng thất bại.');
      }
      handleCloseModals();
      fetchUsers(); // Refresh user list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async () => {
    setError('');
    if (!selectedUser) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Xóa người dùng thất bại.');
      }
      handleCloseModals();
      fetchUsers(); // Refresh user list
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">User Management</h1>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => navigate('/dashboard')}
        >
          Home
        </button>
      </header>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-white shadow-xl rounded-2xl overflow-x-auto dark:bg-gray-800 transition-colors duration-300">
        {loading ? (
          <div className="text-center p-10">
            <p className="text-lg text-gray-600 dark:text-gray-100">Loading user data...</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-none">
            <thead className="dark:bg-gray-800 transition-colors duration-300">
              <tr className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-800 transition-colors duration-300 border-t-0">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:bg-gray-800 dark:text-white">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:bg-gray-800 dark:text-white">Full Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:bg-gray-800 dark:text-white">Phone</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider dark:bg-gray-800 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 dark:bg-gray-800 dark:divide-gray-700 transition-colors duration-300">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50 transition-all group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold dark:bg-gray-800 dark:text-white">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:bg-gray-800 dark:text-white">{user.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:bg-gray-800 dark:text-white">{user.phone || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium flex items-center justify-center gap-2">
                    <button onClick={() => handleOpenEditModal(user)}
                      className="p-2 rounded-full hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-all"
                      title="Edit">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleOpenDeleteModal(user)}
                      className="p-2 rounded-full hover:bg-red-100 text-red-600 hover:text-red-800 transition-all"
                      title="Delete">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md dark:bg-gray-800 dark:text-white transition-colors duration-300">
            <h2 className="text-xl font-semibold mb-4">Edit User Information</h2>
            <form onSubmit={handleUpdateUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-white">Username</label>
                <input type="text" name="username" value={editFormData.username} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"/>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-white">Email</label>
                <input type="email" name="email" value={editFormData.email} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"/>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-white">Full Name</label>
                <input type="text" name="name" value={editFormData.name} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"/>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-white">Phone</label>
                <input type="tel" name="phone" value={editFormData.phone} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"/>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={handleCloseModals} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:bg-indigo-700 dark:text-white dark:hover:bg-indigo-800">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm dark:bg-gray-800 dark:text-gray-100 transition-colors duration-300">
            <h2 className="text-xl font-semibold mb-4">Xác nhận Xóa</h2>
            <p>Bạn có chắc chắn muốn xóa người dùng <strong className="text-red-600">{selectedUser?.username}</strong> không? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={handleCloseModals} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">Hủy</button>
              <button onClick={handleDeleteUser} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-700 dark:text-gray-100 dark:hover:bg-red-800">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 