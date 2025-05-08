"use client";

import React from 'react';

interface TechItemProps {
  icon: string;
  name: string;
}

function TechItem({ icon, name }: TechItemProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-4xl mb-2">{icon}</div>
      <span className="text-sm">{name}</span>
    </div>
  );
}

export default function TechStack() {
  return (
    <div className="flex justify-center items-center gap-12 my-12">
      <TechItem icon="⚡" name="Supabase" />
      <TechItem icon="▲" name="Next.js" />
      <TechItem icon="🚀" name="Vercel" />
    </div>
  );
}
