
import { api } from "./api";

export async function login({ username, password }) {
  // Django SimpleJWT typically expects {username, password}.
  // Some projects use email; we attempt username first.
  try {
    const { data } = await api.post("auth/login/", { username, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    return data;
  } catch (e) {
    // fallback: try email
    const { data } = await api.post("auth/login/", { email: username, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    return data;
  }
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function isAuthenticated() {
  return !!localStorage.getItem("access_token");
}
