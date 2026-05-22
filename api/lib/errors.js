export function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

export function sendSafeError(res, status, message, err) {
  console.error(`[API ${status}]`, message, err?.message || err);
  sendError(res, status, message);
}
