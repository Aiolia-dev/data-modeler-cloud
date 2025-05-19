"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SecurityCheckContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [grid, setGrid] = useState<number[]>([]);
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [countdown, setCountdown] = useState(0);

  // Get the redirect URL from the query parameters
  const redirectTo = searchParams.get("redirectTo") || "/sign-in";

  // Generate a random grid when the component mounts
  useEffect(() => {
    // Create an array of numbers 0-9
    const numbers = Array.from({ length: 10 }, (_, i) => i);
    
    // Shuffle the array
    const shuffled = [...numbers].sort(() => Math.random() - 0.5);
    
    setGrid(shuffled);
  }, []);

  // Handle countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && remainingAttempts === 0) {
      setRemainingAttempts(5);
    }
  }, [countdown, remainingAttempts]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (remainingAttempts === 0) {
      setError("Too many failed attempts. Please wait before trying again.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/security-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: inputCode }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to the intended destination
        router.push(redirectTo);
      } else {
        // Handle error
        setError(data.error || "Invalid security code");
        setRemainingAttempts(remainingAttempts - 1);
        
        // If no more attempts, start countdown
        if (remainingAttempts - 1 === 0) {
          setCountdown(30);
        }
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear the input field
  const handleClear = () => {
    setInputCode("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 rounded-lg p-8 w-[450px] shadow-xl">
        <h1 className="text-2xl font-medium mb-2">Security Check</h1>
        <p className="text-sm text-gray-400 mb-8">
          Please enter your security code using the grid below
        </p>

        {countdown > 0 ? (
          <div className="text-center mb-6">
            <p className="text-amber-500 mb-2">Too many failed attempts</p>
            <p className="text-gray-400">Please wait {countdown} seconds before trying again</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col w-full">
            <div className="mb-6">
              <Label htmlFor="securityCode" className="block mb-2">Security Code</Label>
              <Input
                id="securityCode"
                type="password"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter your security code"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {grid.map((number, index) => (
                <Button
                  key={index}
                  type="button"
                  onClick={() => setInputCode(prev => prev + number)}
                  className="h-14 text-xl font-medium bg-gray-800 hover:bg-gray-700"
                >
                  {number}
                </Button>
              ))}
              <Button
                type="button"
                onClick={handleClear}
                className="h-14 text-xl font-medium bg-red-900 hover:bg-red-800 col-span-3"
              >
                Clear
              </Button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-md text-red-200">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Attempts remaining: {remainingAttempts}
              </div>
              <Button
                type="submit"
                disabled={isLoading || countdown > 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-md"
              >
                {isLoading ? "Verifying..." : "Submit"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SecurityCheck() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900 rounded-lg p-8 w-[450px] shadow-xl">
          <h1 className="text-2xl font-medium mb-2">Security Check</h1>
          <p className="text-sm text-gray-400 mb-8">Loading security grid...</p>
        </div>
      </div>
    }>
      <SecurityCheckContent />
    </Suspense>
  );
}
