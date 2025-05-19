"use client";

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoRequestModal({ isOpen, onClose }: DemoRequestModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    companyWebsite: '',
    email: '',
    phoneNumber: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setShowSuccessMessage(true);
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          companyName: '',
          companyWebsite: '',
          email: '',
          phoneNumber: ''
        });
        
        // Close the modal after 5 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
          onClose();
        }, 5000);
      } else {
        setErrorMessage(data.error || 'Failed to submit demo request. Please try again.');
      }
    } catch (error) {
      setErrorMessage('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Request a Demo</DialogTitle>
          <DialogDescription className="text-gray-300">
            Fill out the form below to request a personalized demo of Data Modeler Cloud.
          </DialogDescription>
        </DialogHeader>
        
        {showSuccessMessage ? (
          <div className="bg-green-900/30 border border-green-700 rounded-md p-4 my-4 text-center">
            <h3 className="text-green-300 font-medium text-lg mb-2">Success!</h3>
            <p className="text-green-100">Your demo request was received, we will be contacting you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-200">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-200">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-200">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-gray-200">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-gray-200">Company Name</Label>
              <Input
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyWebsite" className="text-gray-200">Company Website</Label>
              <Input
                id="companyWebsite"
                name="companyWebsite"
                type="url"
                value={formData.companyWebsite}
                onChange={handleChange}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="https://"
              />
            </div>
            
            {errorMessage && (
              <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-200">
                {errorMessage}
              </div>
            )}
            
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Demo Request'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
