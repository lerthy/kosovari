// Import Zustand's create method for creating a store
import { create } from 'zustand';
// Import configured Supabase client
import { supabase } from '../supabase';
import bcrypt from 'bcryptjs';

// Define the structure of a user object
interface User {
  perdorues_id: number;
  emri: string;
  email: string;
  roli: 'citizen' | 'institution' | 'admin';
  leveli: number;
  pike_eksperience: number;
  auth_id?: string; // optional field for Supabase auth ID
  profile_pic_url?: string | null; // optional profile picture URL
  krijuar_me?: string; // optional date joined
}

// Define the structure of the Auth store's state and actions
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, emri: string, roli: 'citizen' | 'institution') => Promise<{ user: User | null }>;
  signOut: () => Promise<void>;
  getSession: () => Promise<void>;
  setUser?: (user: User) => void; // add setUser for updating user in the store
}

// Motivational quotes
const MOTIVATIONAL_QUOTES = [
  "Keep going, you're doing great!",
  "Every interaction counts!",
  "Level up your impact!",
  "The more you engage, the more you grow!",
  "Small steps, big progress!",
  "Your actions make a difference!"
];

function getRandomQuote() {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

// Helper to calculate level from XP
function calculateLevel(xp: number): number {
  return Math.floor(xp / 50) + 1;
}

// Helper to get XP needed for next level
export function getXPToNextLevel(xp: number) {
  const nextLevel = calculateLevel(xp) + 1;
  const nextLevelXP = (nextLevel - 1) * 50;
  return nextLevelXP - xp;
}

// In-memory variable to track last congratulated level per user (not persisted)
const lastCongratulatedLevel: Record<number, number> = {};
let levelUpListeners: ((level: number, quote: string) => void)[] = [];
let xpChangeListeners: ((xp: number, quote: string) => void)[] = [];

export function subscribeToLevelUp(listener: (level: number, quote: string) => void) {
  levelUpListeners.push(listener);
  return () => {
    levelUpListeners = levelUpListeners.filter(l => l !== listener);
  };
}

export function subscribeToXPChange(listener: (xp: number, quote: string) => void) {
  xpChangeListeners.push(listener);
  return () => {
    xpChangeListeners = xpChangeListeners.filter(l => l !== listener);
  };
}

function notifyLevelUp(level: number) {
  const quote = getRandomQuote();
  for (const listener of levelUpListeners) {
    listener(level, quote);
  }
}

function notifyXPChange(xp: number) {
  const quote = getRandomQuote();
  for (const listener of xpChangeListeners) {
    listener(xp, quote);
  }
}

// Create a Zustand store for handling authentication state
export const useAuthStore = create<AuthState & { updateUserXP: (userId: number, deltaXP: number) => Promise<void> }>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  // Function to register a new user
  signUp: async (email: string, password: string, emri: string, roli: 'citizen' | 'institution') => {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    // Insert a new user record into the 'perdoruesit' table
    const { data: profileData, error: profileError } = await supabase
      .from('perdoruesit')
      .insert([
        {
          emri,
          email: email,
          password_hash: hashedPassword, // Store hashed password
          roli: roli,
          leveli: 0,
          pike_eksperience: 0,
          krijuar_me: new Date().toISOString()
        }
      ])
      .select()
      .single();

    // Handle any error from Supabase
    if (profileError) {
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    // Construct a User object from returned data
    const user = profileData ? {
      perdorues_id: profileData.perdorues_id,
      emri: profileData.emri,
      email: profileData.email,
      roli: profileData.roli,
      leveli: profileData.leveli,
      pike_eksperience: profileData.pike_eksperience,
      profile_pic_url: profileData.profile_pic_url || null,
      krijuar_me: profileData.krijuar_me || null
    } : null;

    // Update the state with the new user
    set({ user });
    return { user };
  },

  // Function to log in a user
  signIn: async (email: string, password: string) => {
    try {
      // First fetch user record matching the email
      const { data: perdoruesitData, error: perdoruesitError } = await supabase
        .from('perdoruesit')
        .select('*')
        .eq('email', email)
        .single();

      // If user not found or Supabase returns error
      if (perdoruesitError || !perdoruesitData) {
        throw new Error('Invalid email or password');
      }

      // Compare the entered password with the stored hash
      const passwordMatch = await bcrypt.compare(password, perdoruesitData.password_hash);
      if (!passwordMatch) {
        throw new Error('Invalid password');
      }

      // Try to find existing auth user
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      const existingAuthUser = users?.find(u => u.email === email);

      let authUser;
      if (existingAuthUser) {
        // If auth user exists, try to sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (!error) {
          authUser = data.user;
        }
      }

      if (!authUser) {
        // If no auth user exists or sign in failed, create one
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              perdorues_id: perdoruesitData.perdorues_id
            }
          }
        });
        if (!error) {
          authUser = data.user;
        }
      }

      // Update perdoruesit with auth_id if we have it
      if (authUser) {
        await supabase
          .from('perdoruesit')
          .update({ auth_id: authUser.id })
          .eq('perdorues_id', perdoruesitData.perdorues_id);
      }

      // Construct and set the user object
      const user = {
        perdorues_id: perdoruesitData.perdorues_id,
        emri: perdoruesitData.emri,
        email: perdoruesitData.email,
        roli: perdoruesitData.roli as 'citizen' | 'institution' | 'admin',
        leveli: perdoruesitData.leveli,
        pike_eksperience: perdoruesitData.pike_eksperience,
        auth_id: authUser?.id,
        profile_pic_url: perdoruesitData.profile_pic_url || null,
        krijuar_me: perdoruesitData.krijuar_me || null
      };

      set({ user });
      console.log('Login successful:', user);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  // Function to sign out the current user
  signOut: async () => {
    try {
      // Set loading state before starting
      set({ loading: true, error: null });

      // Call Supabase signOut
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear user state
      set({ user: null, loading: false });
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during sign out';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Function to restore user session on app load
  getSession: async () => {
    try {
      set({ loading: true, error: null });

      // Get the session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session?.user) {
        // Fetch user profile by email from 'perdoruesit'
        const { data: userData, error: userError } = await supabase
          .from('perdoruesit')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          throw userError;
        }

        // If user data found, set user in state
        if (userData) {
          const user = {
            perdorues_id: userData.perdorues_id,
            emri: userData.emri,
            email: userData.email,
            roli: userData.roli as 'citizen' | 'institution' | 'admin',
            leveli: userData.leveli,
            pike_eksperience: userData.pike_eksperience,
            auth_id: session.user.id,
            profile_pic_url: userData.profile_pic_url || null,
            krijuar_me: userData.krijuar_me || null
          };
          set({ user, loading: false });
        } else {
          set({ user: null, loading: false });
        }
      } else {
        // No session exists
        set({ user: null, loading: false });
      }
    } catch (error: any) {
      console.error('Session error:', error);
      set({ error: error.message || 'An error occurred during session check', loading: false });
    }
  },

  updateUserXP: async (userId: number, deltaXP: number) => {
    // Get current user XP
    const { data, error } = await supabase
      .from('perdoruesit')
      .select('pike_eksperience')
      .eq('perdorues_id', userId)
      .single();
    if (error) throw error;
    const currentXP = data?.pike_eksperience || 0;
    const newXP = currentXP + deltaXP;
    const newLevel = calculateLevel(newXP);
    // Update in DB
    const { error: updateError } = await supabase
      .from('perdoruesit')
      .update({ pike_eksperience: newXP, leveli: newLevel })
      .eq('perdorues_id', userId);
    if (updateError) throw updateError;
    // If this is the logged-in user, update local state
    const user = get().user;
    if (user && user.perdorues_id === userId) {
      // Check for level up
      if ((lastCongratulatedLevel[userId] ?? user.leveli) < newLevel) {
        lastCongratulatedLevel[userId] = newLevel;
        notifyLevelUp(newLevel);
      }
      set({ user: { ...user, pike_eksperience: newXP, leveli: newLevel } });
      notifyXPChange(newXP);
    }
  },

  setUser: (user: User) => {
    set({ user });
  }
}));
