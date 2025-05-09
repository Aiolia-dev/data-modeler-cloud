import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="bg-gray-900 rounded-lg p-8 w-[450px] shadow-xl">
      <form className="flex flex-col w-full">
        <h1 className="text-2xl font-medium mb-2">Sign in</h1>
        <p className="text-sm text-gray-400 mb-8">
          Access your data modeling workspace
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
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="password">Password</Label>
            <Link
              className="text-indigo-400 hover:text-indigo-300 text-sm"
              href="/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>
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
              placeholder="Enter your password"
              required
              className="pl-10 bg-gray-800 border-gray-700 text-white auth-input"
            />
          </div>
        </div>
        
        <SubmitButton 
          pendingText="Signing In..." 
          formAction={signInAction}
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md mt-2 mb-4"
        >
          Sign in
        </SubmitButton>
        
        <FormMessage message={searchParams} />
        
        <div className="text-center mt-4 text-gray-400 text-sm">
          Don't have an account?{" "}
          <Link className="text-indigo-400 hover:text-indigo-300" href="/sign-up">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}
