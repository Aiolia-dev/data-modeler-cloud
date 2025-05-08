"use client";

import React from 'react';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-card rounded-lg p-6 transition-transform hover:translate-y-[-5px]">
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-2xl">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export default function FeaturesSection() {
  const features = [
    {
      icon: '📊',
      title: 'Visual Data Modeling',
      description: 'Create comprehensive data models with an intuitive drag-and-drop interface. Define entities, attributes, and relationships visually.'
    },
    {
      icon: '🔄',
      title: 'Automatic SQL Generation',
      description: 'Convert your visual models to SQL automatically. Support for multiple database types with optimized query generation.'
    },
    {
      icon: '🔍',
      title: 'Entity Relationship Diagrams',
      description: 'Generate interactive ERD diagrams to visualize your data structure. Easily share and collaborate with your team.'
    },
    {
      icon: '🔒',
      title: 'Compliance & Validation',
      description: 'Ensure your data models meet regulatory requirements with built-in validation rules and compliance checks.'
    },
    {
      icon: '⚙️',
      title: 'Advanced Rules Engine',
      description: 'Define complex business rules and constraints that automatically apply to your data models and generated code.'
    },
    {
      icon: '🔄',
      title: 'Version Control',
      description: 'Track changes to your data models over time with built-in versioning. Easily roll back to previous versions when needed.'
    }
  ];

  return (
    <section className="my-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <FeatureCard 
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </section>
  );
}
