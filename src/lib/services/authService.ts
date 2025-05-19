// Import the configured Supabase client
import { supabase } from '../supabase';

// Define the expected structure for user creation parameters
interface CreateUserParams {
  emri: string; // User's full name
  email: string; // User's email address
  password_hash: string; // The user's password (should be securely hashed/stored)
  roli: 'citizen' | 'institution'; // The role assigned to the user
  leveli: number; // Initial user level (e.g., gamification or trust level)
  pike_eksperience: number; // Initial experience points for the user
}

// Function to create a new user using Supabase's built-in auth system
export async function createUser({
  emri,
  email,
  password_hash,
  roli,
  leveli,
  pike_eksperience
}: CreateUserParams) {
  // Call Supabase's signUp method to register a new user
  const { data, error } = await supabase.auth.signUp({
    email,
    password: password_hash, // Note: This should be the actual password (not already hashed) for Supabase Auth
    options: {
      // Attach additional custom user metadata to the account
      data: {
        emri,
        roli,
        leveli,
        pike_eksperience
      }
    }
  });

  // If an error occurs during sign-up, throw it to be handled by the caller
  if (error) throw error;

  // Return the newly created user data (e.g., session info or user object)
  return data;
}
