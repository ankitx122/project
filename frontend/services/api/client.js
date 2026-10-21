import axios from "axios";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, "");

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 120_000,
});

client.interceptors.response.use(
  (res) => (res.status === 204 ? null : res.data?.data),
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    if (!error.response) {
      const reason = error.code === "ECONNABORTED" ? "The API took too long to respond." : `Can't reach the API at ${API_URL}. Is the backend running?`;
      return Promise.reject(new Error(reason));
    }
    const { status, data } = error.response;
    const err = new Error(data?.data?.error ?? `Request failed (${status})`);
    err.status = status;
    return Promise.reject(err);
  },
);

export default client;
