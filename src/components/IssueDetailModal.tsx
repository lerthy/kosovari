// export default IssueDetailModal; 
import React, { useState, useEffect } from 'react';
import { Issue } from '../store/issues';
import { supabase } from '../lib/supabase';
import { useAuthStore, subscribeToLevelUp, subscribeToXPChange, getXPToNextLevel } from '../lib/services/auth';
import MonsterIcon from './MonsterIcon';
import { toast } from 'react-hot-toast';

// Comment interface representing structure of a comment from the DB
interface Comment {
  id: string;
  issue_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
  auth_user?: {
    email: string;
    profiles?: {
      email: string;
    }[];
  };
}

// Props expected by the IssueDetailModal component
interface IssueDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: Issue;
  onLikeUpdate?: (issueId: string, newCount: number) => void;
}

const IssueDetailModal: React.FC<IssueDetailModalProps> = ({ isOpen, onClose, issue, onLikeUpdate }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const { user, updateUserXP } = useAuthStore();
  const [session, setSession] = useState<any>(null);
  const [showLevelUp, setShowLevelUp] = useState<{ show: boolean, level: number, quote: string }>({ show: false, level: 0, quote: '' });
  const [showXPQuote, setShowXPQuote] = useState<{ show: boolean, quote: string }>({ show: false, quote: '' });

  // Helper function to convert numeric ID to UUID format
  const toUUID = (id: number | string) => {
    if (typeof id === 'string' && id.includes('-')) return id; // Already a UUID
    const numericId = typeof id === 'string' ? parseInt(id) : id;
    return `00000000-0000-0000-0000-${String(numericId).padStart(12, '0')}`;
  };

  useEffect(() => {
    if (isOpen && issue) {
      fetchComments();
      fetchLikes();

      // Subscribe to real-time changes to the "comments" table
      const subscription = supabase
        .channel('comments_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `issue_id=eq.${toUUID(issue.id)}`,
          },
          () => {
            fetchComments(); // Refresh comments on any DB change
          }
        )
        .subscribe();

      // Clean up subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isOpen, issue]);

  useEffect(() => {
    // Get the current session when component mounts
    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      // Also subscribe to auth changes
      const { data: { subscription } } = await supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });

      return () => subscription.unsubscribe();
    };
    
    if (isOpen) {
      getSession();
    }
  }, [isOpen]);

  // Add debug log to check session state
  useEffect(() => {
    console.log('Current session state:', session);
    console.log('Current user state:', user);
  }, [session, user]);

  // Add debug logging for auth state
  useEffect(() => {
    console.log('Current user state:', {
      user,
      hasAuthId: !!user?.auth_id,
      email: user?.email
    });
  }, [user]);

  // Fetch all comments for the current issue along with user emails
  const fetchComments = async () => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('perdoruesit_comments')
        .select(`
          *,
          perdoruesit:perdorues_id (
            email,
            emri
          )
        `)
        .eq('issue_id', toUUID(issue.id))
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        throw commentsError;
      }

      // Append user names or mark as anonymous if not found
      const commentsWithUsernames = commentsData.map(comment => ({
        ...comment,
        user_name: comment.perdoruesit?.emri || 'Anonymous',
      }));

      console.log('Fetched comments:', commentsWithUsernames);
      setComments(commentsWithUsernames);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  // Fetch current like count and whether user has already liked the issue
  const fetchLikes = async () => {
    if (!issue) return;

    try {
      const issueId = toUUID(issue.id);

      // Count total likes
      const { count, error: countError } = await supabase
        .from('perdoruesit_likes')
        .select('*', { count: 'exact', head: true })
        .eq('issue_id', issueId);

      if (countError) throw countError;
      setLikeCount(count || 0);

      // Check if current user has liked the issue
      if (user?.perdorues_id) {
        const { data, error: likeError } = await supabase
          .from('perdoruesit_likes')
          .select('*')
          .eq('issue_id', issueId)
          .eq('perdorues_id', user.perdorues_id)
          .single();

        if (likeError && likeError.code !== 'PGRST116') throw likeError;
        setIsLiked(!!data);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  // Toggle like/unlike on the issue
  const handleLike = async () => {
    if (!user?.perdorues_id || !issue) {
      console.error('Missing user or issue:', { user, issue });
      return;
    }

    try {
      setIsLoading(true);
      const issueId = toUUID(issue.id);

      console.log('Attempting like operation:', {
        isLiked,
        perdorues_id: user.perdorues_id,
        issue_id: issueId
      });

      if (isLiked) {
        // If liked, remove the like
        const { error } = await supabase
          .from('perdoruesit_likes')
          .delete()
          .eq('issue_id', issueId)
          .eq('perdorues_id', user.perdorues_id);

        if (error) {
          console.error('Error deleting like:', error);
          throw error;
        }
        setIsLiked(false);
      } else {
        // If not liked, insert a new like
        const { error } = await supabase
          .from('perdoruesit_likes')
          .insert([
            {
              issue_id: issueId,
              perdorues_id: user.perdorues_id,
            },
          ]);

        if (error) {
          console.error('Error inserting like:', error);
          throw error;
        }
        setIsLiked(true);
        // Award XP for like
        await updateUserXP(user.perdorues_id, 5);
      }

      // Update like count
      const { count, error: countError } = await supabase
        .from('perdoruesit_likes')
        .select('*', { count: 'exact', head: true })
        .eq('issue_id', issueId);

      if (countError) {
        console.error('Error getting like count:', countError);
        throw countError;
      }

      const newCount = count || 0;
      setLikeCount(newCount);

      if (onLikeUpdate) {
        onLikeUpdate(issue.id, newCount);
      }
    } catch (error: any) {
      console.error('Error toggling like:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      toast.error(error.message || 'Failed to update like. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle comment form submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.perdorues_id || !newComment.trim()) {
      toast.error(!user ? 'Please log in to comment' : 'Please enter a comment');
      return;
    }

    try {
      setIsLoading(true);
      const issueId = toUUID(issue.id);

      console.log('Attempting to submit comment with:', {
        issue_id: issueId,
        perdorues_id: user.perdorues_id,
        content: newComment.trim()
      });

      // Use the new stored procedure to insert the comment
      const { data: commentData, error: commentError } = await supabase.rpc('add_comment', {
        p_issue_id: issueId,
        p_perdorues_id: user.perdorues_id,
        p_content: newComment.trim(),
      });

      if (commentError) {
        console.error('Comment insertion error:', {
          error: commentError,
          code: commentError.code,
          message: commentError.message,
          details: commentError.details,
          hint: commentError.hint
        });
        throw commentError;
      }

      // Award XP for comment
      await updateUserXP(user.perdorues_id, 10);

      console.log('Comment posted successfully:', commentData);
      setNewComment('');
      await fetchComments();
      toast.success('Comment posted successfully');
    } catch (error: any) {
      console.error('Error adding comment:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast.error(error.message || 'Failed to add comment');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for deleting a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('perdoruesit_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
      await fetchComments();
      toast.success('Comment deleted successfully');
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error(error.message || 'Failed to delete comment');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Subscribe to level up events
    const unsubscribeLevel = subscribeToLevelUp((level, quote) => {
      setShowLevelUp({ show: true, level, quote });
      setTimeout(() => setShowLevelUp({ show: false, level: 0, quote: '' }), 4000);
    });
    // Subscribe to XP change events (not level up)
    const unsubscribeXP = subscribeToXPChange((_, quote) => {
      setShowXPQuote({ show: true, quote });
      setTimeout(() => setShowXPQuote({ show: false, quote: '' }), 3000);
    });
    return () => { unsubscribeLevel(); unsubscribeXP(); };
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Level Up Popup */}
      {showLevelUp.show && user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center animate-bounce-in min-w-[320px]">
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-2xl font-bold text-green-700 mb-2">Congratulations!</div>
            <div className="text-lg text-gray-700 mb-2">You've reached <span className="font-bold text-emerald-600">Level {showLevelUp.level}</span>!</div>
            <div className="text-base text-gray-600 mb-2">XP: <span className="font-semibold">{user.pike_eksperience}</span></div>
            <div className="text-base text-gray-600 mb-2">{getXPToNextLevel(user.pike_eksperience)} XP to Level {showLevelUp.level + 1}</div>
            <div className="italic text-emerald-700 mb-4">{showLevelUp.quote}</div>
            <button
              className="mt-2 px-4 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 transition"
              onClick={() => setShowLevelUp({ show: false, level: 0, quote: '' })}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* XP Motivational Quote Popup */}
      {showXPQuote.show && !showLevelUp.show && (
        <div className="fixed top-8 left-1/2 z-[99] -translate-x-1/2 flex items-center justify-center">
          <div className="bg-emerald-100 border border-emerald-300 rounded-xl px-6 py-3 shadow text-emerald-800 text-lg font-medium animate-fade-in">
            {showXPQuote.quote}
          </div>
        </div>
      )}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white rounded-lg w-full max-w-4xl p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{issue.description}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* User Level/XP Indicator (if user is present) */}
            {user && (
              <div className="mb-4 flex items-center gap-4">
                <div className="px-3 py-1 bg-emerald-100 rounded-full text-emerald-700 font-semibold text-sm">
                  Level {user.leveli}
                </div>
                <div className="text-gray-700 text-sm">XP: <span className="font-semibold">{user.pike_eksperience}</span></div>
                <div className="text-gray-500 text-xs">{getXPToNextLevel(user.pike_eksperience)} XP to Level {user.leveli + 1}</div>
              </div>
            )}

            {/* Category badge */}
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <MonsterIcon category={issue.category} size="small" className="mr-1" />
                {issue.category}
              </span>
            </div>

            {/* Issue image (if exists) */}
            {issue.image_url && (
              <div className="mb-4 flex justify-center">
                <img
                  src={issue.image_url}
                  alt="Issue related"
                  className="max-h-64 w-full max-w-md object-cover rounded-lg border border-gray-200 shadow-sm"
                  style={{ aspectRatio: '4/3', background: '#f3f4f6' }}
                />
              </div>
            )}

            {/* Issue description */}
            <div className="mb-4">
              <p className="text-gray-600">{issue.description}</p>
            </div>

            {/* Like and Date */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLike}
                  disabled={isLoading}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full ${
                    isLiked ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
                  } hover:bg-red-600 transition-colors`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill={isLiked ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <span>{likeCount}</span>
                </button>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(issue.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Comments section */}
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Comments ({comments.length})</h3>
              <div className="space-y-4">
                {comments && comments.length > 0 ? (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-gray-900">
                          {comment.user_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </div>
                          {user?.roli === 'institution' && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs"
                              title="Delete Comment"
                              disabled={isLoading}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-gray-700">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center">No comments yet. Be the first to comment!</p>
                )}
              </div>
            </div>

            {/* Add a comment section */}
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Add a Comment</h3>
              {!user && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-700">Please log in to post a comment</p>
                </div>
              )}
              <form onSubmit={handleCommentSubmit}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={user ? "Write your comment here..." : "Please log in to comment"}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                  rows={4}
                  disabled={!user}
                />
                <button
                  type="submit"
                  disabled={isLoading || !newComment.trim() || !user}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? 'Posting...' : user ? 'Post Comment' : 'Log in to Comment'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default IssueDetailModal;
