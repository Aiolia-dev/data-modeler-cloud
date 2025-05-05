import React from 'react';

interface PasswordRequirement {
  regex: RegExp;
  text: string;
}

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  const requirements: PasswordRequirement[] = [
    { regex: /.{10,}/, text: 'At least 10 characters' },
    { regex: /[A-Z]/, text: 'At least one capital letter' },
    { regex: /[0-9]/, text: 'At least one digit' },
    { regex: /[^A-Za-z0-9]/, text: 'At least one special character' },
  ];

  const allRequirementsMet = requirements.every(req => req.regex.test(password));

  return (
    <div className="mt-2 mb-4">
      <div className="flex gap-2 mb-2">
        {[...Array(4)].map((_, i) => {
          const meetsRequirements = requirements.slice(0, i + 1).every(req => req.regex.test(password));
          return (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded-full ${
                password.length === 0
                  ? 'bg-gray-700'
                  : meetsRequirements
                    ? i < 1 ? 'bg-red-500' : i < 2 ? 'bg-orange-500' : i < 3 ? 'bg-yellow-500' : 'bg-green-500'
                    : 'bg-gray-700'
              }`}
            />
          );
        })}
      </div>
      
      <div className="text-xs space-y-1">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center gap-2">
            {req.regex.test(password) ? (
              <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
            ) : (
              <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            )}
            <span className={req.regex.test(password) ? "text-green-500" : "text-gray-500"}>
              {req.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function isStrongPassword(password: string): boolean {
  const requirements = [
    /.{10,}/,        // At least 10 characters
    /[A-Z]/,         // At least one capital letter
    /[0-9]/,         // At least one digit
    /[^A-Za-z0-9]/,  // At least one special character
  ];
  
  return requirements.every(regex => regex.test(password));
}
