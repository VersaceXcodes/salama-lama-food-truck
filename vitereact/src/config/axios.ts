import axios from 'axios';

// Configure axios to send cookies with all requests
// This is critical for guest session tracking via cookies
axios.defaults.withCredentials = true;

// Optional: Set base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
axios.defaults.baseURL = API_BASE_URL;

export default axios;
