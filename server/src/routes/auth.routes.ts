import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { validate } from '../middleware/validate.middleware';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from '../services/auth.service';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['ADMIN', 'PM', 'DEVELOPER']),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// POST /api/auth/register — Admin only
router.post(
  '/register',
  authenticate,
  authorize('ADMIN'),
  validate(registerSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password, name, role } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(409).json({ success: false, error: 'Email already registered' });
        return;
      }

      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });

      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to register user' });
    }
  }
);

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    const refreshToken = await generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, error: 'Refresh token required' });
      return;
    }

    const storedToken = await verifyRefreshToken(token);
    if (!storedToken) {
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
      return;
    }

    // Rotate refresh token
    await revokeRefreshToken(token);
    const newRefreshToken = await generateRefreshToken(storedToken.user.id);
    const accessToken = generateAccessToken({
      id: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      name: storedToken.user.name,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: storedToken.user.id,
          email: storedToken.user.email,
          name: storedToken.user.name,
          role: storedToken.user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await revokeRefreshToken(token);
    }

    res.clearCookie('refreshToken', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get user info' });
  }
});

export default router;
