import { supabase } from '../supabase.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ message: 'Invalid or expired session.' });
    }

    req.user = data.user;
    req.userRole = data.user.user_metadata?.role ?? null;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed.' });
  }
};

export const requireRole = (allowedRoles = []) => (req, res, next) => {
  const userRole = String(req.userRole || '').toUpperCase();

  if (!userRole || !allowedRoles.map((role) => String(role).toUpperCase()).includes(userRole)) {
    return res.status(403).json({ message: 'Forbidden: insufficient role permissions.' });
  }

  return next();
};
