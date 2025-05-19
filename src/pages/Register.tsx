// Import necessary React and library functions
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Hook for navigation
import { useAuthStore } from '../lib/services/auth'; // Custom authentication store
import { toast } from 'react-hot-toast'; // Toast notifications for success/error
import supabase from '../lib/supabase'; // Import the Supabase client
import PasswordStrength from '../components/Auth/PasswordStrength';

// Register component definition
export default function Register() {
    // State for form inputs and validation
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [emri, setEmri] = useState(''); // Full name
    const [loading, setLoading] = useState(false); // Controls button state during async action
    const [error, setError] = useState<string | null>(null); // Holds error message to display
    const [role, setRole] = useState<'citizen' | 'institution'>('citizen');
    const [secretKey, setSecretKey] = useState('');
    const [isPasswordActive, setIsPasswordActive] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate(); // Hook to navigate programmatically
    const { signUp } = useAuthStore(); // Custom sign-up function from auth store

    // Form submission handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submit behavior
        setLoading(true);
        setError(null); // Clear previous errors

        // Basic form validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        if (!emri.trim()) {
            setError('Name is required');
            setLoading(false);
            return;
        }

        // Secret key validation for institution
        if (role === 'institution') {
            if (!secretKey || secretKey !== 'çelsisekretperadmin') {
                setError('Çelësi sekret është i pasaktë ose i zbrazët.');
                setLoading(false);
                return;
            }
        }

        try {
            // Call the Supabase stored procedure for signup
            const { data, error: rpcError } = await supabase.rpc('register_user', {
                emri: emri.trim(),
                email,
                password,
                roli: role,
                secret_key: secretKey || null,
            });

            if (rpcError) {
                setError(rpcError.message);
                toast.error(rpcError.message);
                setLoading(false);
                return;
            }

            if (data && data.error) {
                setError(data.error);
                toast.error(data.error);
                setLoading(false);
                return;
            }

            if (data && data.success) {
                toast.success('Registration successful! Please log in.');
                navigate('/login');
            } else {
                setError('Unknown error occurred');
                toast.error('Unknown error occurred');
            }
        } catch (err: any) {
            // Handle errors and show a toast
            console.error('Registration error:', err);
            const errorMessage = err.message || 'Failed to sign up';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false); // Always reset loading
        }
    };

    // Render the registration form
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Page title */}
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Create your account
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {/* Registration form */}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Email input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    placeholder="Enter your email"
                                />
                            </div>
                        </div>

                        {/* Full name input */}
                        <div>
                            <label htmlFor="emri" className="block text-sm font-medium text-gray-700">
                                Full Name
                            </label>
                            <div className="mt-1">
                                <input
                                    id="emri"
                                    name="emri"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={emri}
                                    onChange={(e) => setEmri(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    placeholder="Enter your full name"
                                />
                            </div>
                        </div>

                        {/* Password input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1 relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setIsPasswordActive(true)}
                                    onBlur={() => setIsPasswordActive(false)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 pr-14"
                                    placeholder="At least 6 characters"
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
                            {isPasswordActive && (
                              <PasswordStrength password={password} isActive={isPasswordActive} />
                            )}
                        </div>

                        {/* Confirm password input */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm Password
                            </label>
                            <div className="mt-1 relative">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 pr-14"
                                    placeholder="Confirm your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center focus:outline-none z-10 hover:bg-gray-100 rounded"
                                    tabIndex={-1}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                    style={{ pointerEvents: 'auto' }}
                                >
                                    {showConfirmPassword ? (
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

                        {/* Role selection */}
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                                Role
                            </label>
                            <select
                                id="role"
                                value={role}
                                onChange={e => {
                                    setRole(e.target.value as 'citizen' | 'institution');
                                    setSecretKey('');
                                    setError(null);
                                }}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                            >
                                <option value="citizen">Citizen</option>
                                <option value="institution">Institution</option>
                            </select>
                        </div>

                        {/* Secret Key Field (only for institution) */}
                        {role === 'institution' && (
                            <div>
                                <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700">
                                    Secret Key for Institution
                                </label>
                                <input
                                    type="password"
                                    id="secretKey"
                                    value={secretKey}
                                    onChange={e => setSecretKey(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                                    required
                                />
                            </div>
                        )}

                        {/* Display error messages if any */}
                        {error && (
                            <div className="text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit button */}
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                                {loading ? 'Creating account...' : 'Sign up'}
                            </button>
                        </div>

                        {/* Link to login page */}
                        <div className="text-sm text-center">
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="font-medium text-green-600 hover:text-green-500"
                            >
                                Already have an account? Sign in
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
