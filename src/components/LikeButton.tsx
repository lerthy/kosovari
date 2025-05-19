import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/services/auth';
import toast from 'react-hot-toast';

interface LikeButtonProps {
  issueId: string;
  initialCount?: number;
  onUpdate?: (count: number) => void;
}

const LikeButton: React.FC<LikeButtonProps> = ({ issueId, initialCount = 0, onUpdate }) => {
  // Track the like count, whether user liked it, and loading state
  const [likeCount, setLikeCount] = useState(initialCount);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  // Fetch current like status and count when the component mounts or when dependencies change
  useEffect(() => {
    if (user) {
      checkIfLiked();
    }
    fetchLikeCount();

    // Subscribe to real-time updates on the 'perdoruesit_likes' table for this issue
    const subscription = supabase
      .channel('likes_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'perdoruesit_likes',
          filter: `issue_id=eq.${issueId}`
        }, 
        () => {
          fetchLikeCount(); // Re-fetch like count on any change
        }
      )
      .subscribe();

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [issueId, user]);

  // Sync internal like count if `initialCount` prop changes
  useEffect(() => {
    setLikeCount(initialCount);
  }, [initialCount]);

  // Check if the current user has already liked the issue
  const checkIfLiked = async () => {
    if (!user?.perdorues_id) return;

    try {
      const { data, error } = await supabase
        .from('perdoruesit_likes')
        .select('*')
        .eq('issue_id', issueId)
        .eq('perdorues_id', user.perdorues_id)
        .single();

      // If not found, ignore PGRST116 (no rows found)
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking like status:', error);
        return;
      }

      setIsLiked(!!data); // If data exists, user has liked it
    } catch (error) {
      console.error('Error in checkIfLiked:', error);
    }
  };

  // Fetch the total like count for the issue
  const fetchLikeCount = async () => {
    try {
      const { count, error } = await supabase
        .from('perdoruesit_likes')
        .select('*', { count: 'exact', head: true })
        .eq('issue_id', issueId);

      if (error) {
        console.error('Error fetching like count:', error);
        return;
      }

      setLikeCount(count || 0);
      onUpdate?.(count || 0); // Call parent update handler if provided
    } catch (error) {
      console.error('Error in fetchLikeCount:', error);
    }
  };

  // Toggle like/unlike when the button is clicked
  const handleLike = async () => {
    if (!user?.perdorues_id) {
      toast.error('Please log in to like issues');
      return;
    }

    setIsLoading(true); // Disable UI while processing

    try {
      // Call the stored procedure (MCP) to toggle like
      const { data, error } = await supabase.rpc('toggle_like', {
        issue_id: issueId,
        perdorues_id: user.perdorues_id
      });

      if (error) {
        console.error('Error toggling like via MCP:', error);
        throw error;
      }

      // The function returns { like_count, liked }
      if (data && data.length > 0) {
        setLikeCount(data[0].like_count);
        setIsLiked(data[0].liked);
        onUpdate?.(data[0].like_count);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full 
        transition-all duration-300 ease-in-out
        ${isLiked 
          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        transform hover:scale-105 active:scale-95
      `}
    >
      {/* Heart icon changes based on like status */}
      <span className="text-xl transition-transform duration-300 hover:scale-110">
        {isLiked ? '❤️' : '🤍'}
      </span>
      {/* Display total like count with proper pluralization */}
      <span className="font-medium transition-all duration-300">
        {likeCount} {likeCount === 1 ? 'like' : 'likes'}
      </span>
    </button>
  );
};

export default LikeButton;
