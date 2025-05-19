import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/services/auth';
import { useIssueStore } from '../../store/issues';
import { useEffect, useRef, useState } from 'react';
import { getXPToNextLevel, subscribeToLevelUp } from '../../lib/services/auth';

// Header component shown on all pages
export function Header() {
  const navigate = useNavigate(); // Hook for navigation
  const { user, signOut } = useAuthStore(); // Access authentication state and actions
  const { setReportingMode } = useIssueStore(); // Access issue reporting state
  const [animate, setAnimate] = useState(false);
  const prevLevel = useRef(user?.leveli);

  useEffect(() => {
    // Subscribe to level up for pulse animation
    const unsub = subscribeToLevelUp((level: number) => {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 1200);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user?.leveli !== prevLevel.current) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 1200);
      prevLevel.current = user?.leveli;
    }
  }, [user?.leveli]);

  // Level badge style for green theme
  function getGreenBadgeStyle() {
    return {
      background: 'linear-gradient(90deg, #34d399 0%, #059669 100%)',
      boxShadow: '0 2px 8px 0 rgba(16, 185, 129, 0.10)',
      borderRadius: '9999px',
      color: '#fff',
      fontWeight: 700,
      letterSpacing: '0.03em',
      fontFamily: 'inherit',
      fontSize: '1rem',
      minHeight: '2.25rem', // ~36px
      minWidth: '64px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      transition: 'box-shadow 0.2s, filter 0.2s',
    };
  }

  // Trigger issue reporting mode and redirect to home
  const handleReportProblem = () => {
    setReportingMode(true); // Activate reporting mode
    navigate('/'); // Redirect to home for reporting interface
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / App Name */}
          <div className="flex items-center">
            <h1 
              onClick={() => navigate('/')} 
              className="text-xl font-bold text-green-600 cursor-pointer"
            >
              KosovAR
            </h1>
          </div>

          {/* Navigation and user controls */}
          <div className="flex items-center space-x-4">
            {/* Static button to view reported issues */}
            <button
              onClick={() => navigate('/issues')}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              View Issues
            </button>

            {/* If user is logged in */}
            {user ? (
              <>
                {/* Report a new problem */}
                <button
                  onClick={handleReportProblem}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Report Problem
                </button>

                {/* Debug logs - can be removed in production */}
                {(() => {
                  console.log('Header - User:', user);
                  console.log('Header - User role:', user.roli);
                  return null;
                })()}

                {/* Admin Dashboard access - visible only to institution users */}
                {user.roli === 'institution' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Admin Dashboard
                  </button>
                )}

                {/* Display user level - Green Themed Badge */}
                <div
                  className={`relative flex items-center group select-none`}
                  style={{ minWidth: 64 }}
                >
                  <div
                    className={`flex items-center gap-1 border-2 border-white hover:brightness-105 hover:shadow-md transition-all duration-200`}
                    style={getGreenBadgeStyle()}
                  >
                    {/* Minimal Star Icon */}
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="mr-1" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.5l-4.1 2.2.8-4.7-3.4-3.3 4.7-.7L10 2z" fill="#fff" stroke="#10b981" strokeWidth="1"/>
                    </svg>
                    <span className="text-white font-bold">Lvl {user.leveli}</span>
                  </div>
                  {/* Tooltip on hover for XP info */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 hidden group-hover:flex flex-col items-center">
                    <div className="bg-white text-gray-800 text-xs rounded-lg shadow-lg px-3 py-2 border border-emerald-200 whitespace-nowrap">
                      XP: <span className="font-bold">{user.pike_eksperience}</span><br/>
                      {getXPToNextLevel(user.pike_eksperience)} XP to Level {user.leveli + 1}
                    </div>
                  </div>
                </div>

                {/* Display logged-in user's name or email */}
                <button
                  className="text-lg font-semibold text-emerald-700 hover:underline focus:outline-none"
                  onClick={() => navigate('/profile')}
                  title="View Profile"
                >
                  {user.emri ? user.emri : user.email}
                </button>

                {/* Sign out button */}
                <button
                  onClick={() => signOut()}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                {/* If user is not logged in: show sign in/up buttons */}
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes pulse-glow {
      0% { box-shadow: 0 0 0 0 rgba(251,191,36,0.7), 0 2px 8px 0 rgba(0,0,0,0.08); }
      70% { box-shadow: 0 0 0 10px rgba(251,191,36,0.0), 0 2px 16px 0 rgba(0,0,0,0.12); }
      100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.7), 0 2px 8px 0 rgba(0,0,0,0.08); }
    }
    .animate-pulse-glow {
      animation: pulse-glow 1.2s cubic-bezier(0.4,0,0.6,1);
    }
  `;
  if (!document.head.querySelector('style[data-pulse-glow]')) {
    style.setAttribute('data-pulse-glow', 'true');
    document.head.appendChild(style);
  }
}
