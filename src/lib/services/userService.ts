// Import the configured Supabase client instance
import { supabase } from '../supabase';

// Define the structure of the parameters required to create a new user
interface CreateUserParams {
  emri: string; // User's full name
  email: string; // User's email address
  password_hash: string; // User's password (passed here as hash/plain depending on implementation)
  roli: 'citizen' | 'institution'; // User role: either citizen or institution
  leveli: number; // Initial level of the user
  pike_eksperience: number; // Initial experience points
}

// Asynchronous function to create a new user using Supabase Auth
export async function createUser({
  emri,
  email,
  password_hash,
  roli,
  leveli,
  pike_eksperience
}: CreateUserParams) {
  // Use Supabase's signUp method to register the user with email and password
  // Additional user data is passed under the `options.data` property and stored in the auth metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password: password_hash, // Supabase expects the plain password here
    options: {
      data: {
        emri,              // Custom field: full name
        roli,              // Custom field: role
        leveli,            // Custom field: user level
        pike_eksperience   // Custom field: experience points
      }
    }
  });

  // If there's an error during sign-up, throw it so it can be handled by the calling function
  if (error) throw error;

  // Return the response data from Supabase (typically includes user and session info)
  return data;
}
