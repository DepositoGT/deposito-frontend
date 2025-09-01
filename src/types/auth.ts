export type RoleId = 0 | 1 | 2 | 3;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role_id: RoleId;
  role?: {
    id: number;
    name: string;
  } | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}
