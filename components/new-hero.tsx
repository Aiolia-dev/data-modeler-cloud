"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function NewHero() {
  return (
    <section className="flex flex-col items-center text-center my-16">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight max-w-3xl">
        Build complex data models with intuitive visual tools
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mb-8">
        Create, visualize, and manage entity relationships for your database architecture with precision and ease
      </p>
      <div className="flex gap-4">
        <Link href="/auth-pages/sign-up" className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md font-medium transition-colors">
          Get Started
        </Link>
        <Link href="#demo" className="border border-border hover:bg-accent hover:text-accent-foreground px-6 py-3 rounded-md font-medium transition-colors">
          View Demo
        </Link>
      </div>
      
      <div className="mt-12 w-full max-w-4xl relative overflow-hidden rounded-lg shadow-xl">
        <Image 
          src="/images/herosection.png" 
          alt="DataModel Pro interface showing entity relationship diagram" 
          width={1200} 
          height={600} 
          className="w-full h-auto rounded-lg" 
          priority 
        />
      </div>
    </section>
  );
}
