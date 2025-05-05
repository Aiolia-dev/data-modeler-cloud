"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function AdminSimple() {
  const [email, setEmail] = useState("cedric.kerbidi@outscale.com");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSetSuperuser = async () => {
    if (!email) {
      setStatus("Email is required");
      return;
    }

    try {
      setLoading(true);
      setStatus("Setting superuser status...");

      // Direct API call to set superuser status without authentication
      const response = await fetch('/api/admin/direct-superuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          force: true
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to set superuser");
      }

      setStatus(`Successfully set superuser status for ${email}`);
      setSuccess(true);
    } catch (error: any) {
      console.error("Error:", error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 flex flex-col items-center">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Simple Admin Access</CardTitle>
          <CardDescription>
            Direct superuser assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {status && (
              <div className={`p-4 rounded ${success ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                {status}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="bg-white"
              />
            </div>

            <Button 
              onClick={handleSetSuperuser}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Processing..." : "Set Superuser Status"}
            </Button>

            {success && (
              <div className="space-y-2 pt-4">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => window.location.href = "/admin-access"}
                >
                  Go to Admin Access
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = "/auth-bypass"}
                >
                  Try Auth Bypass
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
