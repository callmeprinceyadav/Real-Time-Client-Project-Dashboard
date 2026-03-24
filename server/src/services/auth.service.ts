import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config';
import prisma from '../config/database';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateAccessToken = (user: { id: string; email: string; role: string; name: string }): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTokenExpiry as string }
  );
};

export const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
};

export const verifyRefreshToken = async (token: string) => {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!refreshToken) return null;
  if (refreshToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: refreshToken.id } });
    return null;
  }

  return refreshToken;
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};

export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
};
