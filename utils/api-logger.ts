import { createClient } from '@supabase/supabase-js';

/**
 * Utility for logging API requests to the database
 */

// Create a Supabase client with the service role key to bypass RLS
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or service role key for API logging');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * Log an API request to the database
 */
export async function logApiRequest({
  userId,
  path,
  method,
  statusCode,
  responseTimeMs,
  ipAddress,
  userAgent
}: {
  userId?: string;
  path: string;
  method: string;
  statusCode?: number;
  responseTimeMs?: number;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const supabase = getAdminClient();
    if (!supabase) return;
    
    await supabase.from('api_requests').insert({
      user_id: userId || null,
      path,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: ipAddress,
      user_agent: userAgent,
      request_timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Log error but don't throw - we don't want API logging to break the application
    console.error('Error logging API request:', error);
  }
}

/**
 * Get the count of API requests in the last 24 hours
 */
export async function getApiRequestCount(hours: number = 24): Promise<number> {
  try {
    const supabase = getAdminClient();
    if (!supabase) return 0;
    
    const now = new Date();
    const pastDate = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    const { count, error } = await supabase
      .from('api_requests')
      .select('*', { count: 'exact', head: true })
      .gte('request_timestamp', pastDate.toISOString());
    
    if (error) {
      console.error('Error getting API request count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error getting API request count:', error);
    return 0;
  }
}

/**
 * Get the average API requests per day over the past week
 */
export async function getAverageApiRequestCount(): Promise<number> {
  try {
    const supabase = getAdminClient();
    if (!supabase) return 0;
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const { count, error } = await supabase
      .from('api_requests')
      .select('*', { count: 'exact', head: true })
      .gte('request_timestamp', oneWeekAgo.toISOString());
    
    if (error) {
      console.error('Error getting average API request count:', error);
      return 0;
    }
    
    // Calculate average per day
    return Math.round((count || 0) / 7);
  } catch (error) {
    console.error('Error getting average API request count:', error);
    return 0;
  }
}
