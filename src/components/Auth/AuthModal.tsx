import { useState } from 'react';
import { useAuthStore } from '../../lib/services/auth'; // Custom auth store hook
import { toast } from 'react-hot-toast'; // Notification system
import { X } from 'lucide-react'; // Icon used to close the modal

// Props definition for modal visibility and close handler
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Modal component for both sign in and sign up functionality
export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  // Local state for controlling auth mode and form inputs
  const [isSignUp, setIsSignUp] = useState(false); // false = Sign In, true = Sign Up
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, signUp } = useAuthStore(); // Extract auth actions from global state

  // Handles form submission for both Sign In and Sign Up
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page refresh
    try {
      if (isSignUp) {
        // Attempt to create account
        await signUp(email, password, email);
        toast.success('Account created successfully!');
      } else {
        // Attempt to log in
        await signIn(email, password);
        toast.success('Signed in successfully!');
      }
      onClose(); // Close modal on success
    } catch (error) {
      // Show error toast if anything fails
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  // Don't render modal if it's not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        {/* Close button in top-right corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal title based on mode */}
        <h2 className="text-2xl font-bold mb-4">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Password input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Submit button */}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Toggle between Sign In and Sign Up */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-emerald-600 hover:text-emerald-700"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
