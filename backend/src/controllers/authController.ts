import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserDocument } from '../models/userModel';
import { AuthenticatedRequest, signAccessToken } from '../middleware/authMiddleware';
import { sendData, sendError } from '../utils/apiResponse';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const PASSWORD_MIN_LENGTH = 6;
const BCRYPT_ROUNDS = 12;
const MONGO_DUPLICATE_KEY = 11000;

/** Usernames are matched without regard to case. */
const CASE_INSENSITIVE = { locale: 'en', strength: 2 } as const;

function toPublicUser(user: Pick<UserDocument, '_id' | 'username'>) {
  return { id: String(user._id), username: user.username };
}

function findUserByUsername(username: string) {
  return User.findOne({ username }).collation(CASE_INSENSITIVE);
}

export async function registerUser(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      sendError(res, 400, 'Username and password are required');
      return;
    }
    if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
      sendError(res, 400, `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters`);
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      sendError(res, 400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }

    const cleanUsername = String(username).trim();
    if (await findUserByUsername(cleanUsername)) {
      sendError(res, 409, 'Username already taken');
      return;
    }

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(BCRYPT_ROUNDS));
    const user = await new User({ username: cleanUsername, password: passwordHash }).save();

    sendData(res, { user: toPublicUser(user), token: signAccessToken(String(user._id)) }, 201);
  } catch (error: any) {
    // Two concurrent registrations can both pass the check above; the unique
    // index is what actually decides, so surface its rejection as a conflict.
    if (error?.code === MONGO_DUPLICATE_KEY) {
      sendError(res, 409, 'Username already taken');
      return;
    }
    console.error('[auth] register failed:', error);
    sendError(res, 500, 'Failed to register user');
  }
}

export async function loginUser(req: Request, res: Response): Promise<void> {
  try {
    const { login, password } = req.body ?? {};

    if (!login || !password) {
      sendError(res, 400, 'Username and password are required');
      return;
    }

    const user = await findUserByUsername(String(login).trim());
    if (!user || !(await user.comparePassword(String(password)))) {
      sendError(res, 401, 'Invalid credentials');
      return;
    }

    sendData(res, { user: toPublicUser(user), token: signAccessToken(String(user._id)) });
  } catch (error) {
    console.error('[auth] login failed:', error);
    sendError(res, 500, 'Failed to login');
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      sendError(res, 404, 'User not found');
      return;
    }
    sendData(res, { user: toPublicUser(user) });
  } catch (error) {
    console.error('[auth] profile lookup failed:', error);
    sendError(res, 500, 'Failed to get profile');
  }
}
