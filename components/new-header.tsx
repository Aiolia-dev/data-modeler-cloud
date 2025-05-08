"use client";

import React from 'react';
import Link from 'next/link';

export default function NewHeader() {
  return (
    <header className="flex justify-between items-center py-4 px-8 bg-card/50 border-b border-border">
      <div className="flex items-center">
        <div className="h-10 w-10 bg-primary flex items-center justify-center rounded-md mr-3">
          <span className="text-xl font-bold text-white">D</span>
        </div>
        <span className="text-xl font-semibold">DataModel Pro</span>
      </div>
      <div className="flex gap-4">
        <Link 
          href="/auth-pages/sign-up" 
          className="px-4 py-2 rounded-md border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Sign up
        </Link>
        <Link 
          href="/auth-pages/sign-in" 
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
