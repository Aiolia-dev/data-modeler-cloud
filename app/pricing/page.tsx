"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckIcon } from 'lucide-react';
import DemoRequestModal from '@/components/demo-request-modal';

export default function PricingPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const openDemoModal = () => setIsDemoModalOpen(true);
  const closeDemoModal = () => setIsDemoModalOpen(false);

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-gray-400">
          Choose the plan that's right for your team and scale as you grow.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Free Plan */}
        <div className="flex flex-col border border-gray-700 rounded-lg p-8 bg-gray-900/50 hover:border-indigo-500 transition-colors">
          <h2 className="text-2xl font-bold mb-4">Free</h2>
          <p className="text-gray-400 mb-6">Perfect for individuals and small projects</p>
          <div className="text-4xl font-bold mb-6">$0</div>
          
          <ul className="space-y-4 mb-8 flex-grow">
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Up to 3 data models</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Basic entity relationships</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>SQL generation</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Community support</span>
            </li>
          </ul>
          
          <Button 
            onClick={openDemoModal}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            Request a Demo
          </Button>
        </div>

        {/* Professional Plan */}
        <div className="flex flex-col border border-indigo-500 rounded-lg p-8 bg-gray-900/50 shadow-lg shadow-indigo-500/20 relative">
          <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
            Popular
          </div>
          <h2 className="text-2xl font-bold mb-4">Professional</h2>
          <p className="text-gray-400 mb-6">For professional developers and teams</p>
          <div className="text-4xl font-bold mb-6">$29<span className="text-xl text-gray-400">/user/month</span></div>
          
          <p className="text-gray-400 mb-4 text-sm italic">Volume discounts available for teams of 5+</p>
          <ul className="space-y-4 mb-8 flex-grow">
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Unlimited data models</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Advanced relationships</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>SQL & NoSQL generation</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Version history</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Priority support</span>
            </li>
          </ul>
          
          <Button 
            onClick={openDemoModal}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            Request a Demo
          </Button>
        </div>

        {/* Enterprise Plan */}
        <div className="flex flex-col border border-gray-700 rounded-lg p-8 bg-gray-900/50 hover:border-indigo-500 transition-colors">
          <h2 className="text-2xl font-bold mb-4">Enterprise</h2>
          <p className="text-gray-400 mb-6">For organizations with advanced needs</p>
          <div className="text-4xl font-bold mb-6">Custom</div>
          
          <ul className="space-y-4 mb-8 flex-grow">
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Everything in Professional</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>On-premises installation</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Custom integrations</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Dedicated support</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>SLA guarantees</span>
            </li>
          </ul>
          
          <Button 
            onClick={openDemoModal}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            Request a Demo
          </Button>
        </div>
      </div>

      <div className="mt-16 text-center">
        <h3 className="text-2xl font-bold mb-4">Need a custom solution?</h3>
        <p className="max-w-2xl mx-auto text-gray-400 mb-8">
          Contact our sales team for a tailored plan that meets your specific requirements.
        </p>
        <Button 
          onClick={openDemoModal}
          className="bg-indigo-600 hover:bg-indigo-700 px-8"
        >
          Contact Us
        </Button>
      </div>

      <DemoRequestModal isOpen={isDemoModalOpen} onClose={closeDemoModal} />
    </div>
  );
}
