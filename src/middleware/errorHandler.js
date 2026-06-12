export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Endpoint không tồn tại.' });
}

export function errorHandler(err, req, res, next) {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, error: 'CORS_FORBIDDEN', message: 'Domain không được phép gọi API.' });
  }

  console.error('Server error:', { name: err?.name, message: err?.message });
  return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Server đang gặp lỗi.' });
}
