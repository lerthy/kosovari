// Import necessary React hooks and libraries
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/services/auth';
import { useIssueStore, Issue, IssueCategory } from '../store/issues';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const categoryOptions = [
  { value: 'traffic', label: 'Traffic' },
  { value: 'environment', label: 'Environment' },
  { value: 'economy', label: 'Economy' },
  { value: 'living', label: 'Living' },
  { value: 'damage', label: 'Damage' },
  { value: 'heritage', label: 'Heritage' },
];

export function Admin() {
  // Initialize navigation and state management hooks
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { issues, fetchIssues, updateIssueStatus, deleteIssue, updateIssue } = useIssueStore();
  
  // Component state management
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [editForm, setEditForm] = useState<{ description: string; category: string }>({ description: '', category: '' });
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Effect hook for authentication check and data fetching
  useEffect(() => {
    // Check if user is admin, redirect if not
    if (!user?.roli || user.roli !== 'institution') {
      navigate('/');
      return;
    }

    // Fetch issues from backend and update loading state
    fetchIssues().finally(() => setLoading(false));
  }, [user, navigate, fetchIssues]);

  // Handler for updating issue status
  const handleStatusUpdate = async (
    issueId: string, 
    newStatus: 'open' | 'in_progress' | 'resolved'
  ) => {
    try {
      await updateIssueStatus(issueId, newStatus);
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Handler for deleting an issue
  const handleDeleteIssue = async (issueId: string) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    try {
      await deleteIssue(issueId);
      toast.success('Issue deleted successfully');
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error('Failed to delete issue');
    }
  };

  const openEditModal = (issue: Issue) => {
    setEditingIssue(issue);
    setEditForm({
      description: issue.description || '',
      category: issue.category || '',
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingIssue(null);
  };

  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    if (!editingIssue) return;
    try {
      await updateIssue(editingIssue.id, {
        description: editForm.description,
        category: editForm.category as IssueCategory,
      });
      toast.success('Issue updated successfully');
      closeEditModal();
      fetchIssues();
    } catch (error) {
      toast.error('Failed to update issue');
    }
  };

  const handleCommentSubmit = async () => {
    if (!editingIssue || !comment.trim() || !user?.perdorues_id) {
      toast.error(!user ? 'User not authenticated' : 'Please enter a comment');
      return;
    }
    setCommentLoading(true);
    try {
      const { error } = await supabase.from('perdoruesit_comments').insert({
        issue_id: editingIssue.id,
        perdorues_id: user.perdorues_id,
        content: comment.trim(),
      });
      if (error) throw error;
      toast.success('Comment added successfully');
      setComment('');
      // Optionally, refresh comments or issues
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  // Filter issues based on selected status
  const filteredIssues = selectedStatus === 'all' 
    ? issues 
    : issues.filter(issue => issue.status === selectedStatus);

  // Loading state UI
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Main component UI
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {/* Total Issues Card */}
          <div className="bg-blue-100 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Total Issues</h3>
            <p className="text-3xl font-bold text-blue-600">{issues.length}</p>
          </div>
          
          {/* Open Issues Card */}
          <div className="bg-yellow-100 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Open Issues</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {issues.filter(i => i.status === 'open').length}
            </p>
          </div>
          
          {/* In Progress Card */}
          <div className="bg-purple-100 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">In Progress</h3>
            <p className="text-3xl font-bold text-purple-600">
              {issues.filter(i => i.status === 'in_progress').length}
            </p>
          </div>
          
          {/* Resolved Issues Card */}
          <div className="bg-green-100 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Resolved</h3>
            <p className="text-3xl font-bold text-green-600">
              {issues.filter(i => i.status === 'resolved').length}
            </p>
          </div>
        </div>

        {/* Issues Management Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Issues Management</h2>
          <div className="flex justify-between items-center mb-4">
            {/* Status Filter Dropdown */}
            <div className="w-64">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Issues Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploader</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIssues.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{issue.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{issue.username || 'Unknown'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {issue.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Status Badge with conditional styling */}
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      issue.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                      issue.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(issue.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Status Update Dropdown */}
                    <select
                      value={issue.status}
                      onChange={(e) => handleStatusUpdate(issue.id, e.target.value as 'open' | 'in_progress' | 'resolved')}
                      className="p-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteIssue(issue.id)}
                      className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs"
                      title="Delete Issue"
                    >
                      Delete
                    </button>
                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(issue)}
                      className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs"
                      title="Edit Issue"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Edit Issue Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              onClick={closeEditModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-4">Edit Issue</h2>
            <div className="space-y-4">
              {/* Show image if available */}
              {editingIssue?.image_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uploaded Image</label>
                  <img
                    src={editingIssue.image_url}
                    alt="Issue"
                    className="w-full h-48 object-cover rounded-lg border mb-2"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  name="category"
                  value={editForm.category}
                  onChange={handleEditFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              {/* Comment Box */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Add Comment</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  rows={2}
                  placeholder="Write a comment..."
                  disabled={commentLoading}
                />
                <button
                  onClick={handleCommentSubmit}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={commentLoading || !comment.trim()}
                >
                  {commentLoading ? 'Submitting...' : 'Submit Comment'}
                </button>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
