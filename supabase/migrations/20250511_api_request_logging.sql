-- Migration: API Request Logging
-- Description: Adds a table to track API requests for monitoring and analytics

-- Create API requests table
CREATE TABLE api_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_api_requests_user_id ON api_requests(user_id);
CREATE INDEX idx_api_requests_path ON api_requests(path);
CREATE INDEX idx_api_requests_timestamp ON api_requests(request_timestamp);
CREATE INDEX idx_api_requests_method ON api_requests(method);

-- Enable RLS but allow all operations for now (we'll use service role for writes)
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to insert (via service role)
CREATE POLICY "Allow service role to insert api_requests"
  ON api_requests FOR INSERT
  WITH CHECK (true);

-- Create policy to allow only the user to view their own requests
CREATE POLICY "Allow users to view their own api_requests"
  ON api_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow superusers to view all requests
CREATE POLICY "Allow superusers to view all api_requests"
  ON api_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'is_superuser')::text = 'true'
    )
  );

-- Comment on table and columns for documentation
COMMENT ON TABLE api_requests IS 'Tracks API requests for monitoring and analytics';
COMMENT ON COLUMN api_requests.id IS 'Unique identifier for the API request';
COMMENT ON COLUMN api_requests.user_id IS 'User who made the request, if authenticated';
COMMENT ON COLUMN api_requests.path IS 'API endpoint path that was requested';
COMMENT ON COLUMN api_requests.method IS 'HTTP method used (GET, POST, PUT, DELETE, etc.)';
COMMENT ON COLUMN api_requests.status_code IS 'HTTP status code of the response';
COMMENT ON COLUMN api_requests.response_time_ms IS 'Time taken to process the request in milliseconds';
COMMENT ON COLUMN api_requests.ip_address IS 'IP address of the client making the request';
COMMENT ON COLUMN api_requests.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN api_requests.request_timestamp IS 'When the request was received';
