import type { Role } from 'shared/type/type.role';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
