import React from 'react';

// Password strength evaluation helper
function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 10) score++;

  if (score <= 1) return { level: 'weak', color: 'bg-red-500', emoji: '🔓', label: 'Weak', bar: 1 };
  if (score <= 3) return { level: 'medium', color: 'bg-yellow-400', emoji: '🛡️', label: 'Medium', bar: 2 };
  return { level: 'strong', color: 'bg-green-500', emoji: '✅', label: 'Strong', bar: 3 };
}

// Helper to get unmet requirements
function getUnmetRequirements(password: string) {
  const requirements = [
    { test: (pw: string) => pw.length >= 6, label: 'At least 6 characters' },
    { test: (pw: string) => /[A-Z]/.test(pw), label: 'An uppercase letter (A-Z)' },
    { test: (pw: string) => /[0-9]/.test(pw), label: 'A number (0-9)' },
    { test: (pw: string) => /[^A-Za-z0-9]/.test(pw), label: 'A special character (!@#$...)' },
    { test: (pw: string) => pw.length >= 10, label: '10+ characters for best security' },
  ];
  return requirements.filter(r => !r.test(password)).map(r => r.label);
}

interface PasswordStrengthProps {
  password: string;
  isActive?: boolean;
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password, isActive }) => {
  const { color, emoji, label, bar, level } = getPasswordStrength(password);
  const bars = [1, 2, 3];
  const unmet = getUnmetRequirements(password);
  const barBase = `h-2 rounded${isActive ? ' transition-all duration-500' : ''}`;

  // Accessibility: ARIA live region for screen readers
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <span
          className={`text-xl transition-transform duration-300 ${isActive && level === 'weak' && password ? 'animate-shake' : ''}`}
          aria-label={label}
        >
          {emoji}
        </span>
        <div className="flex-1 flex gap-1">
          {bars.map((b) => (
            <div
              key={b}
              className={`h-2 rounded ${b <= bar ? color : 'bg-gray-200'} ${b === bar ? 'scale-y-125' : ''}`}
              style={{ width: '33%', transition: isActive ? 'all 0.5s' : 'none' }}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold ml-2 ${level === 'weak' ? 'text-red-600' : level === 'medium' ? 'text-yellow-700' : 'text-green-700'}`}>{label}</span>
      </div>
      {/* Suggestions for improvement */}
      {level !== 'strong' && password && (
        <ul className="mt-2 text-xs text-gray-600 space-y-1" aria-live="polite">
          {unmet.map((req, i) => (
            <li key={i} className="flex items-center gap-1">
              <span aria-hidden="true">•</span> {req}
            </li>
          ))}
        </ul>
      )}
      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
          100% { transform: translateX(0); }
        }
        .animate-shake {
          animation: shake 0.4s;
        }
      `}</style>
    </div>
  );
};

export default PasswordStrength; 