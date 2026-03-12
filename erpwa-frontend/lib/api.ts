import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

/* ================= ACCESS TOKEN (IN MEMORY) ================= */

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/* ================= AXIOS INSTANCES ================= */

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

const refreshApi = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

/* ================= REQUEST INTERCEPTOR ================= */

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Only add accessToken if Authorization header is not already set
    // This allows manual override (e.g., for password reset with resetToken)
    if (accessToken && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/* ================= REFRESH QUEUE ================= */

let isRefreshing = false;

let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}[] = [];

const processQueue = (error: AxiosError | null, token: string | null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  failedQueue = [];
};

/* ================= RESPONSE INTERCEPTOR ================= */

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!error.response || originalRequest._retry) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || "";

    /* 🚫 NEVER refresh for these routes:
       - auth endpoints (would cause loops) */
    if (
      url.includes("/auth/login") ||
      url.includes("/auth/logout") ||
      url.includes("/auth/refresh") ||
      url.includes("/super-admin/login") ||
      url.includes("/super-admin/logout") ||
      url.includes("/super-admin/refresh")
    ) {
      // ✅ Redirect super-admin to login if auth loops
      if (
        url.includes("/super-admin/") &&
        error.response?.status === 401
      ) {
        if (
          typeof window !== "undefined" &&
          window.location.pathname.startsWith("/admin-super")
        ) {
          window.location.href = "/admin-login";
        }
      }
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const isSuperAdminRoute = url.includes("/super-admin/");
        const refreshEndpoint = isSuperAdminRoute ? "/super-admin/refresh" : "/auth/refresh";

        const res = await refreshApi.post<{ accessToken: string }>(
          refreshEndpoint,
        );

        const newToken = res.data.accessToken;
        setAccessToken(newToken);

        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        setAccessToken(null);

        // 🔴 GLOBAL LOGOUT EVENT (OPTION 1)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:logout"));
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;

export function getAccessToken() {
  return accessToken;
}
