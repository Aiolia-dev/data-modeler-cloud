/**
 * API Traffic Chart Component
 * 
 * Displays a bar chart showing API traffic by endpoint
 */
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface ApiEndpoint {
  path: string;
  count: number;
}

interface ApiTrafficChartProps {
  className?: string;
}

export default function ApiTrafficChart({ className }: ApiTrafficChartProps) {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxCount, setMaxCount] = useState(0);

  useEffect(() => {
    const fetchEndpoints = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/metrics/endpoints?limit=6');
        if (!response.ok) {
          throw new Error('Failed to fetch API endpoints');
        }
        const data = await response.json();
        if (data.endpoints && Array.isArray(data.endpoints)) {
          setEndpoints(data.endpoints);
          
          // Find the maximum count for scaling the bars
          const max = data.endpoints.reduce((max: number, endpoint: ApiEndpoint) => 
            endpoint.count > max ? endpoint.count : max, 0);
          setMaxCount(max);
        } else {
          setEndpoints([]);
        }
      } catch (err) {
        console.error('Error fetching API endpoints:', err);
        setError('Failed to load API traffic data');
      } finally {
        setLoading(false);
      }
    };

    fetchEndpoints();
  }, []);

  return (
    <Card className={`bg-gray-800 border border-gray-700 shadow-md ${className}`}>
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">API Traffic by Endpoint</h3>
        
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-blue-400">Loading API traffic data...</div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-100 p-4 rounded">
            {error}
          </div>
        )}
        
        {!loading && !error && endpoints.length === 0 && (
          <div className="text-gray-400 text-center py-8">
            No API traffic data available
          </div>
        )}
        
        {!loading && !error && endpoints.length > 0 && (
          <div className="space-y-4">
            {endpoints.map((endpoint, index) => (
              <div key={index} className="flex flex-col space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300 truncate" title={endpoint.path}>
                    {endpoint.path}
                  </span>
                  <span className="text-gray-300 font-medium">
                    {endpoint.count.toLocaleString()} requests
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ 
                      width: `${maxCount ? (endpoint.count / maxCount) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
