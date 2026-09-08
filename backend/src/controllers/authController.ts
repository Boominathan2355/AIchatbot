import { Request, Response } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import { generateToken, AuthRequest } from '../middleware/auth';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: { message: 'Username and password are required' } });
      return;
    }

    if (username.length < 3 || username.length > 30) {
      res.status(400).json({ error: { message: 'Username must be 3-30 characters' } });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: { message: 'Password must be at least 6 characters' } });
      return;
    }

    const cleanUsername = String(username).trim();
    const existingUser = await User.findOne({ username: cleanUsername }).collation({ locale: 'en', strength: 2 });
    if (existingUser) {
      res.status(409).json({ error: { message: 'Username already taken' } });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ username: cleanUsername, password: hashedPassword });
    await user.save();

    const token = generateToken(user._id.toString());

    res.status(201).json({
      user: { id: user._id.toString(), username: user.username },
      token,
    });
  } catch (error: any) {
    // Two concurrent registrations can both pass the check above; the unique
    // index is what actually decides, so surface its rejection as a conflict.
    if (error?.code === 11000) {
      res.status(409).json({ error: { message: 'Username already taken' } });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: { message: 'Failed to register user' } });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      res.status(400).json({ error: { message: 'Username and password are required' } });
      return;
    }

    const cleanLogin = String(login).trim();
    const user = await User.findOne({ username: cleanLogin }).collation({ locale: 'en', strength: 2 });
    if (!user) {
      res.status(401).json({ error: { message: 'Invalid credentials' } });
      return;
    }

    const isMatch = await user.comparePassword(String(password));
    if (!isMatch) {
      res.status(401).json({ error: { message: 'Invalid credentials' } });
      return;
    }

    const token = generateToken(user._id.toString());

    res.json({
      user: { id: user._id.toString(), username: user.username },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: { message: 'Failed to login' } });
  }
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: { message: 'User not found' } });
      return;
    }
    res.json({ user: { id: user._id.toString(), username: user.username } });
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to get profile' } });
  }
}