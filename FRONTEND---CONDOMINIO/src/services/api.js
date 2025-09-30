
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/";
export const api = axios.create({
  baseURL: BASE_URL,
});

// Attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optional: refresh token on 401
let isRefreshing = false;
let queue = [];

function processQueue(error, token = null) {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response && error.response.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = "Bearer " + token;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        if (!refresh) throw error;
        const { data } = await axios.post(BASE_URL + "auth/refresh/", { refresh });
        localStorage.setItem("access_token", data.access);
        isRefreshing = false;
        processQueue(null, data.access);
        original.headers.Authorization = "Bearer " + data.access;
        return api(original);
      } catch (err) {
        isRefreshing = false;
        processQueue(err, null);
        // logout
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);
