module.exports = (req, res, next) => {
  const clientIP = req.ip || req.connection?.remoteAddress || '';
  // Strip IPv6 prefix if present
  const cleanIP = clientIP.replace('::ffff:', '');

  // Allow localhost and your current local IP for testing
  const whitelist = ['127.0.0.1', '::1', 'localhost', '192.168.31.68'];
  if (whitelist.includes(cleanIP) || cleanIP === process.env.OFFICE_PUBLIC_IP) {
    return next();
  }

  return res.status(403).json({
    error: 'Access denied. You must be on office WiFi.',
    yourIP: cleanIP
  });
};
