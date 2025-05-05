import * as React from "react";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  fallback?: React.ReactNode;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 32, fallback, className = "" }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || "User Avatar"}
        width={size}
        height={size}
        className={`rounded-full object-cover border border-gray-700 bg-gray-800 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-white font-semibold ${className}`}
      style={{ width: size, height: size }}
    >
      {fallback || <span>?</span>}
    </div>
  );
};
