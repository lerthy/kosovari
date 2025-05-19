// Import necessary React hooks and libraries
import { useEffect, useState } from 'react';
import { useIssueStore, categoryLabels, Issue } from '../store/issues';
import { supabase } from '../lib/supabase';
// Import component dependencies
import ARQRCodeModal from '../components/ARQRCodeModal';
import IssueDetailModal from '../components/IssueDetailModal';
import LikeButton from '../components/LikeButton';
import MonsterIcon from '../components/MonsterIcon';
import { getCurrentLocation } from '../lib/services/location';
import { calculateDistance } from '../lib/services/location';
import { toast } from 'react-hot-toast';

export default function Issues() {
  // State management using custom hook
  const { issues, loading, error, fetchIssues } = useIssueStore();
  // Component state declarations
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'nearest'>('newest');
  const [sortedIssues, setSortedIssues] = useState<Issue[]>([]);
  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null);

  // Get user's location when component mounts
  useEffect(() => {
    const getLocation = async () => {
      try {
        const position = await getCurrentLocation();
        setUserLocation(position);
      } catch (err) {
        console.error('Error getting location:', err);
        if (sortOrder === 'nearest') {
          toast.error('Please allow location access to sort by distance');
          setSortOrder('newest');
        }
      }
    };
    getLocation();
  }, []);

  // Sort issues when sort order changes or issues update
  useEffect(() => {
    const sorted = [...issues].sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortOrder === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortOrder === 'nearest' && userLocation) {
        // Calculate distances from user's location
        const distanceA = calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          a.latitude,
          a.longitude
        );
        const distanceB = calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          b.latitude,
          b.longitude
        );
        return distanceA - distanceB;
      }
      return 0;
    });
    setSortedIssues(sorted);
  }, [issues, sortOrder, userLocation]);

  // Handle sort order change
  const handleSortChange = async (newOrder: 'newest' | 'oldest' | 'nearest') => {
    if (newOrder === 'nearest' && !userLocation) {
      try {
        const position = await getCurrentLocation();
        setUserLocation(position);
        setSortOrder(newOrder);
      } catch (err) {
        console.error('Error getting location:', err);
        toast.error('Please allow location access to sort by distance');
        return;
      }
    }
    setSortOrder(newOrder);
  };

  // Fetch initial issues data on component mount
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Update like counts when issues change
  useEffect(() => {
    if (issues.length > 0) {
      fetchLikeCounts();
    }
  }, [issues]);

  // Real-time subscription for issues updates
  useEffect(() => {
    const subscription = supabase
      .channel('issues_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'issues' 
        }, 
        (payload) => {
          console.log('Real-time update received:', payload);
          fetchIssues(); // Refresh issues list on any changes
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchIssues]);

  // Debugging effect to track issues state changes
  useEffect(() => {
    console.log('Issues state updated:', issues);
  }, [issues]);

  // Fetch and manage like counts for issues
  const fetchLikeCounts = async () => {
    try {
      // Get like counts for all issues in parallel
      const promises = issues.map(issue => 
        supabase
          .from('perdoruesit_likes')
          .select('*', { count: 'exact', head: true })
          .eq('issue_id', issue.id)
      );

      const results = await Promise.all(promises);
      
      // Transform results into a key-value object
      const counts: { [key: string]: number } = {};
      issues.forEach((issue, index) => {
        counts[issue.id] = results[index].count || 0;
      });
      
      setLikeCounts(counts);
    } catch (error) {
      console.error('Error fetching like counts:', error);
    }
  };

  // Real-time subscription for likes updates
  useEffect(() => {
    const subscription = supabase
      .channel('likes_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'perdoruesit_likes' 
        }, 
        () => {
          fetchLikeCounts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [issues]);

  // Handle image URL transformation for Supabase storage
  const getImageUrl = (imageUrl: string | null | undefined): string | undefined => {
    if (!imageUrl) return undefined;

    // Handle full Supabase URLs
    if (imageUrl.includes('supabase')) {
      try {
        const url = new URL(imageUrl);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        // Generate new public URL
        const { data } = supabase.storage
          .from('issues')
          .getPublicUrl(`issue-images/${fileName}`);
        
        return data.publicUrl;
      } catch (error) {
        console.error('Error processing existing URL:', error);
        return undefined;
      }
    }

    // Handle direct storage paths
    try {
      const { data } = supabase.storage
        .from('issues')
        .getPublicUrl(imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting public URL:', error);
      return undefined;
    }
  };

  // Load and cache image URLs for issues
  useEffect(() => {
    const loadImageUrls = async () => {
      const urlPromises = issues.map(async (issue) => {
        if (!issue.image_url) return null;
        const url = await getImageUrl(issue.image_url);
        return { id: issue.id, url };
      });

      const resolvedUrls = await Promise.all(urlPromises);
      const urlMap = resolvedUrls.reduce((acc, curr) => {
        if (curr && curr.url) {
          acc[curr.id] = curr.url;
        }
        return acc;
      }, {} as { [key: string]: string });

      setImageUrls(urlMap);
    };

    loadImageUrls();
  }, [issues]);

  // Loading state UI
  if (loading && issues.length === 0) {
    return (
      <div className="flex-1 bg-gray-50 p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Error state UI
  if (error) {
    return (
      <div className="flex-1 bg-gray-50 p-4">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  // Date formatting helper
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Event handlers
  const handleCardClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsDetailModalOpen(true);
  };

  const handleModalClose = () => {
    setIsDetailModalOpen(false);
    fetchLikeCounts(); // Refresh likes when closing detail modal
  };

  const handleViewMonster = (issue: Issue, index: number) => {
    setSelectedIssue(issue);
    setSelectedIndex(index);
  };

  const handleLikeUpdate = (issueId: string, count: number) => {
    setLikeCounts(prev => ({
      ...prev,
      [issueId]: count
    }));
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Community Reports</h1>
            <div className="relative">
              <select
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer hover:border-green-400 transition-colors"
                value={sortOrder}
                onChange={(e) => handleSortChange(e.target.value as 'newest' | 'oldest' | 'nearest')}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="nearest">Nearest to Me</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Issues Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {sortedIssues.map((issue, index) => {
              const imageUrl = imageUrls[issue.id];
              const distance = userLocation && sortOrder === 'nearest' ? 
                calculateDistance(
                  userLocation.coords.latitude,
                  userLocation.coords.longitude,
                  issue.latitude,
                  issue.longitude
                ) : null;
              
              return (
                <div
                  key={issue.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  onClick={() => handleCardClick(issue)}
                >
                  {/* Image Section */}
                  {imageUrl ? (
                    <div className="relative w-full pt-[56.25%] bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={`${issue.category} issue`}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image failed to load:', {
                            original_url: issue.image_url,
                            processed_url: imageUrl
                          });
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/400x225?text=Image+Not+Available';
                        }}
                      />
                      <div className="absolute top-4 left-4 z-10">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100/90 text-emerald-800 backdrop-blur-sm">
                          <MonsterIcon category={issue.category} size="small" className="mr-1" />
                          {categoryLabels[issue.category]}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Image placeholder
                    <div className="relative w-full pt-[56.25%] bg-gray-100">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray-400">No image available</span>
                      </div>
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="p-6">
                    <p className="text-gray-900 text-lg mb-3 line-clamp-2">{issue.description}</p>
                    
                    {/* Location Information */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <span>📍</span>
                      <span>
                        {issue.latitude.toFixed(3)}°N, {issue.longitude.toFixed(3)}°E
                        {distance !== null && (
                          <span className="ml-2 text-green-600">
                            ({distance < 1 ? 
                              `${Math.round(distance * 1000)}m` : 
                              `${distance.toFixed(1)}km`} away)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Status and Interaction Section */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          issue.status === 'open' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : issue.status === 'in_progress'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {issue.status === 'open' 
                            ? '🟡' 
                            : issue.status === 'in_progress' 
                            ? '🟣' 
                            : '🟢'} {issue.status.replace('_', ' ')}
                        </span>
                        <span className="text-gray-500">
                          {formatDate(issue.created_at)}
                        </span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <LikeButton
                          issueId={issue.id}
                          initialCount={likeCounts[issue.id] || 0}
                          onUpdate={(count) => handleLikeUpdate(issue.id, count)}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewMonster(issue, index);
                          }}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                        >
                          View Monster in AR 🎮
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Components */}
      {selectedIssue && (
        <>
          <ARQRCodeModal
            isOpen={selectedIndex !== -1}
            onClose={() => setSelectedIndex(-1)}
            issue={selectedIssue}
            issueIndex={selectedIndex}
          />

          <IssueDetailModal
            isOpen={isDetailModalOpen}
            onClose={handleModalClose}
            issue={selectedIssue}
            onLikeUpdate={handleLikeUpdate}
          />
        </>
      )}
    </div>
  );
}
