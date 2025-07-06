// src/utils/httpClient.js

import axios from 'axios';

/**
 * httpClient.js
 *
 * A simple wrapper around Axios to centralize HTTP requests,
 * set default headers, handle retries, and standardize error responses.
 *
 * Usage:
 *   import httpClient from '../utils/httpClient.js';
 *   const response = await httpClient.get('/api/some-endpoint', { params: { user_id } });
 */

const DEFAULT_TIMEOUT = 5000;       // 5 seconds
const MAX_RETRIES     = 2;          // retry failed requests this many times
const RETRY_DELAY_MS  = 1000;       // wait 1 second between retries

// Create an Axios instance with defaults
const instance = axios.create({
  baseURL: process.env.SERVICE_BASE_URL || 'http://localhost:3001',
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json'
  }
});

// Request interceptor: you can add auth tokens here
instance.interceptors.request.use(config => {
  // Example: attach a bearer token if available
  // const token = getAuthToken();
  // if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
}, error => {
  return Promise.reject(error);
});

// Response interceptor: handle global errors or refresh tokens
instance.interceptors.response.use(response => {
  return response;
}, async error => {
  const { config, response } = error;
  // Retry logic for network errors or 5xx responses
  if (!config._retryCount) {
    config._retryCount = 0;
  }
  const shouldRetry = config._retryCount < MAX_RETRIES
    && (!response || response.status >= 500);

  if (shouldRetry) {
    config._retryCount += 1;
    await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
    return instance(config);
  }

  // Standardize error format
  const standardizedError = {
    message: error.message,
    status:  response?.status || null,
    data:    response?.data || null
  };
  return Promise.reject(standardizedError);
});

/**
 * Shorthand methods for HTTP verbs.
 */
export default {
  get:    (url, config) => instance.get(url, config).then(res => res.data),
  post:   (url, data, config) => instance.post(url, data, config).then(res => res.data),
  put:    (url, data, config) => instance.put(url, data, config).then(res => res.data),
  delete: (url, config) => instance.delete(url, config).then(res => res.data),
  // Generic request
  request: (config) => instance.request(config).then(res => res.data)
};