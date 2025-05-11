-- Migration: API Endpoint Counts Function
-- Description: Adds a function to get the top API endpoints by request count

-- Create function to get top API endpoints by request count
CREATE OR REPLACE FUNCTION get_endpoint_counts(limit_val integer)
RETURNS TABLE (
  path text,
  count bigint
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    path,
    COUNT(*) as count
  FROM 
    api_requests
  GROUP BY 
    path
  ORDER BY 
    count DESC
  LIMIT 
    limit_val;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_endpoint_counts IS 'Returns the top API endpoints by request count with a specified limit';
