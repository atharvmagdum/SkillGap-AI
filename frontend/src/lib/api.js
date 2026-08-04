import axios from "axios";

// ✅ Fallback if env not set
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL;

export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
});

// ✅ Attach token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("cp_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Save auth
export const setAuth = (token, user) => {
  localStorage.setItem("cp_token", token);
  localStorage.setItem("cp_user", JSON.stringify(user));
};

// ✅ Clear auth
export const clearAuth = () => {
  localStorage.removeItem("cp_token");
  localStorage.removeItem("cp_user");
};

// ✅ Get user safely
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("cp_user") || "null");
  } catch {
    return null;
  }
};

// ✅ Get token
export const getToken = () => {
  return localStorage.getItem("cp_token");
};  
