import { useEffect, useState } from 'react';
import { useAuthStore } from '../lib/services/auth';
import { useIssueStore, Issue, categoryLabels } from '../store/issues';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';

interface Comment {
  id: string;
  issue_id: string;
  content: string;
  created_at: string;
  issues?: Issue;
}

export default function UserProfile() {
  const { user, setUser } = useAuthStore();
  const { issues, fetchIssues } = useIssueStore();
  const [userIssues, setUserIssues] = useState<Issue[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedIssues, setLikedIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.emri || '');
  const navigate = useNavigate();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAll();
    // eslint-disable-next-line
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    await fetchIssues();
    await fetchUserIssues();
    await fetchUserComments();
    await fetchLikedIssues();
    setLoading(false);
  };

  const fetchUserIssues = async () => {
    if (!user) return;
    setUserIssues(issues.filter((i) => i.user_id === user.perdorues_id));
  };

  const fetchUserComments = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('perdoruesit_comments')
      .select('*, issues(*)')
      .eq('perdorues_id', user.perdorues_id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) {
      toast.error('Failed to fetch comments');
      return;
    }
    setComments(data || []);
  };

  const fetchLikedIssues = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('perdoruesit_likes')
      .select('issue_id, issues(*)')
      .eq('perdorues_id', user.perdorues_id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) {
      toast.error('Failed to fetch liked issues: ' + error.message);
      return;
    }
    console.log('Liked issues raw data:', data);
    let liked: Issue[] = [];
    if (data && data.length > 0) {
      liked = data.map((row: any) => {
        if (Array.isArray(row.issues)) {
          return row.issues[0];
        } else {
          return row.issues;
        }
      }).filter((issue: Issue | undefined) => Boolean(issue));
    }
    setLikedIssues(liked);
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setName(user?.emri || '');
  };

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('perdoruesit')
      .update({ emri: name })
      .eq('perdorues_id', user.perdorues_id);
    if (error) {
      toast.error('Failed to update profile');
      return;
    }
    setUser?.({ ...user, emri: name });
    setEditMode(false);
    toast.success('Profile updated!');
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      // Fetch user from DB to get password_hash
      const { data, error } = await supabase
        .from('perdoruesit')
        .select('password_hash')
        .eq('perdorues_id', user.perdorues_id)
        .single();
      if (error || !data) {
        toast.error('Failed to verify current password');
        setPasswordLoading(false);
        return;
      }
      const match = await bcrypt.compare(currentPassword, data.password_hash);
      if (!match) {
        toast.error('Current password is incorrect');
        setPasswordLoading(false);
        return;
      }
      const hashed = await bcrypt.hash(newPassword, 10);

      // Log the payload for debugging
      console.log('Payload:', {
        p_perdorues_id: user.perdorues_id,
        p_new_password_hash: hashed,
      });

      // Use the stored procedure here
      const { error: updateError, data: updateData } = await supabase.rpc('change_user_password', {
        p_perdorues_id: user.perdorues_id,
        p_new_password_hash: hashed,
      });

      // Log the response for debugging
      console.log('Supabase RPC response:', { updateError, updateData });

      if (updateError) {
        console.error('Supabase RPC error:', updateError);
        toast.error('Failed to update password');
        setPasswordLoading(false);
        return;
      }
      toast.success('Password updated successfully!');
      setPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error('Error updating password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
        <div className="w-full flex flex-col items-center">
          {editMode ? (
            <input
              className="text-2xl font-bold text-center border-b border-gray-300 focus:outline-none focus:border-green-500 mb-2"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          ) : (
            <h2 className="text-2xl font-bold mb-2">{user.emri}</h2>
          )}
          <p className="text-gray-600 mb-1">{user.email}</p>
          <p className="text-gray-500 mb-1 capitalize">Role: {user.roli}</p>
          <p className="text-gray-500 mb-1">Level: {user.leveli} | XP: {user.pike_eksperience}</p>
          <p className="text-gray-400 text-sm">Joined: {user.krijuar_me ? new Date(user.krijuar_me).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div className="flex gap-2 mt-4">
          {editMode ? (
            <>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" onClick={handleCancelEdit}>Cancel</button>
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleEdit}>Edit Profile</button>
              <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600" onClick={() => setPasswordModalOpen(true)}>Change Password</button>
            </>
          )}
        </div>
      </div>
      {/* Activity Summary */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="bg-blue-100 p-4 rounded-lg text-center">
          <div className="text-lg font-semibold">Issues Posted</div>
          <div className="text-3xl font-bold text-blue-600">{userIssues.length}</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg text-center">
          <div className="text-lg font-semibold">Comments</div>
          <div className="text-3xl font-bold text-yellow-600">{comments.length}</div>
        </div>
        <div className="bg-pink-100 p-4 rounded-lg text-center">
          <div className="text-lg font-semibold">Likes</div>
          <div className="text-3xl font-bold text-pink-600">{likedIssues.length}</div>
        </div>
      </div>
      {/* User's Issues List */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Your Issues</h3>
        <div className="space-y-4">
          {userIssues.length === 0 ? (
            <p className="text-gray-500">You haven't posted any issues yet.</p>
          ) : (
            userIssues.map(issue => (
              <div key={issue.id} className="bg-white shadow rounded-lg p-4 flex items-center gap-4">
                {issue.image_url && (
                  <img src={issue.image_url} alt="Issue" className="w-20 h-20 object-cover rounded-lg border" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 mb-1">{issue.description}</div>
                  <div className="text-sm text-gray-500 mb-1">{categoryLabels[issue.category]}</div>
                  <div className="text-xs text-gray-400">Status: {issue.status} | {new Date(issue.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Recent Comments */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Recent Comments</h3>
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500">No recent comments.</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-700 mb-1">{comment.content}</div>
                <div className="text-xs text-gray-400">On: {comment.issues?.description || 'Issue'} | {new Date(comment.created_at).toLocaleDateString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Liked Issues */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Liked Issues</h3>
        <div className="space-y-4">
          {likedIssues.length === 0 ? (
            <p className="text-gray-500">No liked issues yet.</p>
          ) : (
            likedIssues.map(issue => (
              <div key={issue.id} className="bg-white shadow rounded-lg p-4 flex items-center gap-4">
                {issue.image_url && (
                  <img src={issue.image_url} alt="Issue" className="w-20 h-20 object-cover rounded-lg border" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 mb-1">{issue.description}</div>
                  <div className="text-sm text-gray-500 mb-1">{categoryLabels[issue.category]}</div>
                  <div className="text-xs text-gray-400">Status: {issue.status} | {new Date(issue.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              onClick={() => setPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-4">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 pr-10"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowCurrent(v => !v)}
                    tabIndex={-1}
                  >
                    {showCurrent ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.26-2.58A9.953 9.953 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.043 5.197M15 12a3 3 0 11-6 0 3 3 0 016 0zm-6.364 6.364L6 18m0 0l-2-2m2 2l2-2m8 2l2-2m-2 2l-2-2" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 pr-10"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowNew(v => !v)}
                    tabIndex={-1}
                  >
                    {showNew ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.26-2.58A9.953 9.953 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.043 5.197M15 12a3 3 0 11-6 0 3 3 0 016 0zm-6.364 6.364L6 18m0 0l-2-2m2 2l2-2m8 2l2-2m-2 2l-2-2" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 pr-10"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirm(v => !v)}
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.26-2.58A9.953 9.953 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.043 5.197M15 12a3 3 0 11-6 0 3 3 0 016 0zm-6.364 6.364L6 18m0 0l-2-2m2 2l2-2m8 2l2-2m-2 2l-2-2" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 