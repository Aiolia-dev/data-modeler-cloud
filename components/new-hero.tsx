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
      
      <div className="mt-12 w-full max-w-4xl h-[400px] bg-card rounded-lg relative overflow-hidden">
        <div className="absolute top-[60px] left-[120px] bg-primary rounded-lg p-4 w-[120px] h-[80px] flex justify-center items-center font-semibold">
          Customer
        </div>
        <div className="absolute top-[200px] left-[350px] bg-primary rounded-lg p-4 w-[120px] h-[80px] flex justify-center items-center font-semibold">
          Order
        </div>
        <div className="absolute top-[120px] right-[150px] bg-primary rounded-lg p-4 w-[120px] h-[80px] flex justify-center items-center font-semibold">
          Product
        </div>
        <div className="absolute bottom-[70px] left-[180px] bg-primary rounded-lg p-4 w-[120px] h-[80px] flex justify-center items-center font-semibold">
          Address
        </div>
        
        {/* Relationships */}
        <div className="absolute w-[240px] h-[2px] bg-background top-[100px] left-[240px] origin-top-left rotate-[30deg]"></div>
        <div className="absolute w-[180px] h-[2px] bg-background top-[240px] left-[470px] origin-top-left rotate-[-30deg]"></div>
        <div className="absolute w-[160px] h-[2px] bg-background top-[140px] left-[180px] origin-top-left rotate-[90deg]"></div>
        <div className="absolute w-[270px] h-[2px] bg-background top-[160px] left-[300px] origin-top-left rotate-[140deg]"></div>
      </div>
    </section>
  );
}
