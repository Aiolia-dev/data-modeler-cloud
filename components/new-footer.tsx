"use client";

import React from 'react';

export default function NewFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-8 text-center border-t border-border bg-card/50">
      <p className="text-sm text-muted-foreground">
        &copy; {currentYear} DataModel Pro. All rights reserved.
      </p>
    </footer>
  );
}
