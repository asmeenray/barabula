import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const secretKey = process.env.SECRET_KEY || 'your-secret-key';
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const secretKey = process.env.SECRET_KEY || 'your-secret-key';
      const decoded = jwt.verify(token, secretKey);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
