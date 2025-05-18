"use client";

import { signUpAction } from "@/app/actions";
import { Message } from "@/components/form-message";
import { PasswordStrength, isStrongPassword } from "@/components/password-strength";
import { SafeFormMessage } from "@/components/safe-form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState, useEffect } from "react";
import { SmtpMessage } from "../smtp-message";

export default function Signup(props: {
  searchParams: any;
}) {
  const [password, setPassword] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      const searchParams = await props.searchParams;
      if (searchParams && "message" in searchParams) {
        setMessage(searchParams as Message);
      }
    };
    fetchData();
  }, [props.searchParams]);
  
  if (message && ('message' in message || 'error' in message || 'success' in message)) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 w-[450px] shadow-xl">
        <SafeFormMessage message={message} />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-8 w-[450px] shadow-xl">
      <form className="flex flex-col w-full" method="post" action={signUpAction} onSubmit={(e) => {
        if (!isPasswordValid) {
          e.preventDefault();
          alert('Please create a stronger password that meets all requirements.');
        }
      }}>
        <h1 className="text-2xl font-medium mb-2">Sign up</h1>
        <p className="text-sm text-gray-400 mb-8">
          Create your data modeling workspace
        </p>
        
        <div className="mb-4">
          <Label htmlFor="email" className="block mb-2">Email</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>
            <Input 
              name="email" 
              placeholder="you@example.com" 
              required 
              className="pl-10 bg-gray-800 border-gray-700 text-white auth-input" 
            />
          </div>
        </div>
        
        <div className="mb-4">
          <Label htmlFor="password" className="block mb-2">Password</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <Input
              type="password"
              name="password"
              placeholder="Create a password"
              minLength={10}
              required
              className="pl-10 bg-gray-800 border-gray-700 text-white auth-input"
              value={password}
              onChange={(e) => {
                const newPassword = e.target.value;
                setPassword(newPassword);
                setIsPasswordValid(isStrongPassword(newPassword));
              }}
            />
          </div>
          <PasswordStrength password={password} />
        </div>
        
        <SubmitButton 
          pendingText="Signing up..."
          className={`${isPasswordValid ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-400 cursor-not-allowed'} text-white py-2 rounded-md mt-2 mb-4`}
          disabled={!isPasswordValid}
        >
          Sign up
        </SubmitButton>
        
        <SafeFormMessage message={message} />
        
        <div className="text-center mt-4 text-gray-400 text-sm">
          Already have an account?{" "}
          <Link className="text-indigo-400 hover:text-indigo-300" href="/sign-in">
            Sign in
          </Link>
        </div>
      </form>
      <SmtpMessage />
    </div>
  );
}
