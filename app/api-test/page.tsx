'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

export default function ApiTestPage() {
  const [endpoint, setEndpoint] = useState('/api/test');
  const [method, setMethod] = useState('GET');
  const [requestBody, setRequestBody] = useState('{\n  "name": "Test Project",\n  "description": "A test project created via API"\n}');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestHeaders, setRequestHeaders] = useState('{\n  "Content-Type": "application/json"\n}');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      let headers = {};
      try {
        headers = JSON.parse(requestHeaders);
      } catch (e) {
        throw new Error('Invalid headers JSON');
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (method !== 'GET' && method !== 'HEAD') {
        try {
          options.body = requestBody.trim() ? requestBody : undefined;
        } catch (e) {
          throw new Error('Invalid request body JSON');
        }
      }

      console.log(`Making ${method} request to ${endpoint}`, options);
      const res = await fetch(endpoint, options);
      
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data
      });
    } catch (err) {
      console.error('API request error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const predefinedEndpoints = [
    { name: 'Test API', endpoint: '/api/test', method: 'GET' },
    { name: 'Test API (POST)', endpoint: '/api/test', method: 'POST' },
    { name: 'Get Projects', endpoint: '/api/projects', method: 'GET' },
    { name: 'Create Project', endpoint: '/api/projects', method: 'POST' }
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">API Test Tool</h1>
        <Link href="/protected" className="text-blue-500 hover:underline">
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {predefinedEndpoints.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            onClick={() => {
              setEndpoint(item.endpoint);
              setMethod(item.method);
              if (item.endpoint === '/api/projects' && item.method === 'POST') {
                setRequestBody('{\n  "name": "Test Project",\n  "description": "A test project created via API"\n}');
              } else if (item.method === 'POST') {
                setRequestBody('{\n  "testData": "This is a test",\n  "timestamp": "' + new Date().toISOString() + '"\n}');
              } else {
                setRequestBody('');
              }
            }}
          >
            {item.name}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Endpoint</label>
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/endpoint"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Headers (JSON)</label>
              <Textarea
                value={requestHeaders}
                onChange={(e) => setRequestHeaders(e.target.value)}
                placeholder='{"Content-Type": "application/json"}'
                rows={4}
              />
            </div>
            
            {method !== 'GET' && method !== 'HEAD' && (
              <div>
                <label className="block text-sm font-medium mb-1">Request Body</label>
                <Textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={8}
                />
              </div>
            )}
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Sending...' : 'Send Request'}
            </Button>
          </form>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Response</h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
              <h3 className="font-semibold">Error</h3>
              <p>{error}</p>
            </div>
          )}
          
          {response && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded text-white ${
                  response.status >= 200 && response.status < 300 ? 'bg-green-500' : 
                  response.status >= 400 ? 'bg-red-500' : 'bg-yellow-500'
                }`}>
                  {response.status}
                </div>
                <div className="text-gray-600">{response.statusText}</div>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Headers</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(response.headers, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Body</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto max-h-96">
                  {typeof response.data === 'string' 
                    ? response.data 
                    : JSON.stringify(response.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {!error && !response && (
            <div className="text-gray-500 text-center py-12">
              Send a request to see the response here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
