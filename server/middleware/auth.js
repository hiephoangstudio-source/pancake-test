/**
 * JWT Authentication Middleware
 * 
 * Protects all /api/* routes except public ones.
 * Token: Bearer <JWT> in Authorization header.
 * 
 * Generate token: POST /api/auth/login { username, password }
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '2hstudio_secret_key_change_in_production';
// Paths that skip JWT auth (relative to mount point /api AND absolute)
const PUBLIC_PATHS = ['/health', '/auth/login', '/api/health', '/api/auth/login'];

/**
 * Middleware: verify JWT on all protected routes.
 */
export function authMiddleware(req, res, next) {
    // Skip public paths (check both mounted path and original URL)
    const checkPath = req.originalUrl || req.path;
    if (PUBLIC_PATHS.some(p => checkPath === p || checkPath.startsWith(p))) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

/**
 * Generate a JWT token for a user.
 */
export function generateToken(user) {
    return jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

export { JWT_SECRET };
