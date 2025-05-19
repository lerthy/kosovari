import create from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/services/auth';

export type IssueCategory = 'traffic' | 'environment' | 'economy' | 'living' | 'damage' | 'heritage';

export interface Issue {
  id: string; // This will be a UUID from the database
  category: IssueCategory;
  description: string;
  latitude: number;
  longitude: number;
  status: 'open' | 'in_progress' | 'resolved';
  user_id: number;
  created_at: string;
  image_url?: string;
  username?: string;
}

interface IssueStore {
  issues: Issue[];
  loading: boolean;
  error: string | null;
  isReportingMode: boolean;
  fetchIssues: () => Promise<void>;
  addIssue: (issue: Omit<Issue, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateIssueStatus: (issueId: string, newStatus: 'open' | 'in_progress' | 'resolved') => Promise<void>;
  setReportingMode: (mode: boolean) => void;
  deleteIssue: (issueId: string) => Promise<void>;
  updateIssue: (issueId: string, updatedFields: Partial<Omit<Issue, 'id' | 'user_id' | 'created_at'>>) => Promise<void>;
}

export const useIssueStore = create<IssueStore>((set, get) => ({
  issues: [],
  loading: false,
  error: null,
  isReportingMode: false,

  setReportingMode: (mode) => set({ isReportingMode: mode }),

  fetchIssues: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*, perdoruesit:user_id(perdorues_id, emri)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map username from joined perdoruesit
      const issuesWithUsername = (data || []).map((issue: any) => ({
        ...issue,
        username: issue.perdoruesit?.emri || undefined,
      }));
      set({ issues: issuesWithUsername, loading: false });
    } catch (error: any) {
      console.error('Error fetching issues:', error);
      set({ error: error.message || 'Failed to fetch issues', loading: false });
    }
  },

  addIssue: async (issue) => {
    set({ loading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user?.perdorues_id) throw new Error('User not authenticated');

      // Upload image if it's a File object
      let imageUrl = issue.image_url;
      if (imageUrl && typeof imageUrl !== 'string') {
        const uploadedUrl = await uploadImage(imageUrl);
        imageUrl = uploadedUrl;
      }

      // Call the stored procedure instead of direct insert
      const { data, error } = await supabase.rpc('insert_issue', {
        p_category: issue.category,
        p_description: issue.description,
        p_latitude: issue.latitude,
        p_longitude: issue.longitude,
        p_user_id: Number(user.perdorues_id),
        p_image_url: imageUrl || null
      });

      if (error) throw error;

      // Fetch the newly created issue by its ID
      const { data: newIssue, error: fetchError } = await supabase
        .from('issues')
        .select('*, perdoruesit:user_id(perdorues_id, emri)')
        .eq('id', data)
        .single();
      if (fetchError) throw fetchError;

      const issueWithUsername = {
        ...newIssue,
        username: newIssue.perdoruesit?.emri || undefined,
      };

      set((state) => ({
        issues: [issueWithUsername, ...state.issues],
        loading: false
      }));

      return issueWithUsername;
    } catch (error: any) {
      console.error('Error adding issue:', error);
      set({ error: error.message || 'Failed to add issue', loading: false });
      throw error;
    }
  },

  updateIssueStatus: async (issueId, newStatus) => {
    set({ loading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      // Find the old value for audit
      const oldIssue = (get()?.issues || []).find((issue) => issue.id === issueId);
      const oldStatus = oldIssue?.status;
      const { error } = await supabase
        .from('issues')
        .update({ status: newStatus })
        .eq('id', issueId);

      if (error) throw error;

      set((state) => ({
        issues: state.issues.map((issue) =>
          issue.id === issueId ? { ...issue, status: newStatus } : issue
        ),
        loading: false
      }));

      // MCP: Save to ndryshimet if user is institution
      if (user?.roli === 'institution') {
        await supabase.from('ndryshimet').insert({
          issue_id: issueId,
          perdorues_id: user.perdorues_id,
          action: 'status_update',
          old_value: oldStatus,
          new_value: newStatus,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Error updating issue status:', error);
      set({ error: error.message || 'Failed to update issue status', loading: false });
    }
  },

  deleteIssue: async (issueId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', issueId);

      if (error) throw error;

      set((state) => ({
        issues: state.issues.filter((issue) => issue.id !== issueId),
        loading: false
      }));
    } catch (error: any) {
      console.error('Error deleting issue:', error);
      set({ error: error.message || 'Failed to delete issue', loading: false });
    }
  },

  updateIssue: async (issueId: string, updatedFields: Partial<Omit<Issue, 'id' | 'user_id' | 'created_at'>>) => {
    set({ loading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      // Find the old value for audit
      const oldIssue = (get()?.issues || []).find((issue) => issue.id === issueId);
      let fieldsToUpdate = { ...updatedFields };
      if (fieldsToUpdate.image_url && typeof fieldsToUpdate.image_url !== 'string') {
        const uploadedUrl = await uploadImage(fieldsToUpdate.image_url as File);
        fieldsToUpdate.image_url = uploadedUrl;
      }
      const { data, error } = await supabase
        .from('issues')
        .update(fieldsToUpdate)
        .eq('id', issueId)
        .select()
        .single();
      if (error) throw error;
      set((state) => ({
        issues: state.issues.map((issue) =>
          issue.id === issueId ? { ...issue, ...fieldsToUpdate } : issue
        ),
        loading: false
      }));
      // MCP: Save to ndryshimet if user is institution
      if (user?.roli === 'institution') {
        // For audit, store old and new values as JSON
        await supabase.from('ndryshimet').insert({
          issue_id: issueId,
          perdorues_id: user.perdorues_id,
          action: 'edit',
          old_value: JSON.stringify({
            description: oldIssue?.description,
            category: oldIssue?.category,
          }),
          new_value: JSON.stringify({
            description: updatedFields.description,
            category: updatedFields.category,
          }),
          created_at: new Date().toISOString(),
        });
      }
      return data;
    } catch (error: any) {
      console.error('Error updating issue:', error);
      set({ error: error.message || 'Failed to update issue', loading: false });
      throw error;
    }
  }
}));

// Helper function to upload images
const uploadImage = async (file: File): Promise<string | undefined> => {
  try {
    // Check file size and type
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size too large. Please upload an image smaller than 5MB.');
    }

    // Ensure the file is an image
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file.');
    }

    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `issue-images/${fileName}`;

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('issues')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data } = supabase.storage
      .from('issues')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const categoryLabels: Record<IssueCategory, string> = {
  traffic: 'Traffic',
  environment: 'Environment',
  economy: 'Economy',
  living: 'Living',
  damage: 'Damage',
  heritage: 'Heritage'
};

export const categoryIcons: Record<IssueCategory, string> = {
  traffic: '🚗',
  environment: '🌱',
  economy: '💼',
  living: '🏘️',
  damage: '🔧',
  heritage: '🏛️'
};

export const categoryMonsters: Record<IssueCategory, string> = {
  traffic: '/assets/monsters/monster-damage.png',
  environment: '/assets/monsters/monster-damage.png',
  economy: '/assets/monsters/monster-damage.png',
  living: '/assets/monsters/monster-damage.png',
  damage: '/assets/monsters/monster-damage.png',
  heritage: '/assets/monsters/monster-damage.png'
}; 
