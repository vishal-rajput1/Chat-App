const localViteOrigin = /^http:\/\/localhost:\d+$/;
const renderAppOrigin = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i;

export const isAllowedOrigin = (origin) => {
  if (!origin || localViteOrigin.test(origin)) return true;

  const configuredOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredOrigins.includes(origin)) return true;

  // Render serves the frontend and API from the same deployed service.
  return process.env.NODE_ENV === "production" && renderAppOrigin.test(origin);
};

export const corsOrigin = (origin, callback) => {
  if (isAllowedOrigin(origin)) return callback(null, true);
  callback(new Error("Origin not allowed by CORS"));
};
