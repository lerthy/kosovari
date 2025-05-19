// Import necessary modules and hooks
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // For navigation between routes
import { toast } from 'react-hot-toast'; // For displaying toast notifications
import { useAuthStore } from '../lib/services/auth'; // Custom auth store for sign-in logic

// Define the Login component
const Login: React.FC = () => {
  const navigate = useNavigate(); // Hook to navigate programmatically
  const [email, setEmail] = useState(''); // State for email input
  const [password, setPassword] = useState(''); // State for password input
  const [loading, setLoading] = useState(false); // State to manage loading indicator
  const { signIn } = useAuthStore(); // Function to handle user sign-in from the auth store
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form behavior
    setLoading(true); // Set loading state to true during API call

    try {
      await signIn(email, password); // Attempt to sign in with email and password
      toast.success('Signed in successfully!'); // Show success toast
      navigate('/'); // Redirect to homepage after successful login
    } catch (error) {
      // Handle error and display an appropriate message
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      toast.error(errorMessage);
    } finally {
      setLoading(false); // Reset loading state regardless of outcome
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {/* Page heading */}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        {/* Login form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Email input field */}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password input field */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm pr-14"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center focus:outline-none z-10 hover:bg-gray-100 rounded"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ pointerEvents: 'auto' }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.249-2.383A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.973 9.973 0 01-4.21 5.442M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          {/* Navigation to registration page */}
          <div className="text-sm text-center">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-medium text-green-600 hover:text-green-500"
            >
              Don't have an account? Sign up
            </button>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="font-medium text-green-600 hover:text-green-500 mt-2"
              style={{ display: 'block', width: '100%' }}
            >
              Forgot password? Click to change
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Export the Login component for use in other parts of the app
export default Login;
