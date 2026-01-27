/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { apiFetch } from "./api";

export interface User {
  id: string;
  name: string;
  email: string;
  role_id: number;
  role: {
    id: number;
    name: string;
  };
}

export interface Role {
  id: number;
  name: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role_id: number;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role_id?: number;
  password?: string;
}

export const getUsers = async (): Promise<User[]> => {
  return apiFetch<User[]>("/api/auth/users", {
    method: "GET",
  });
};

export const getUserById = async (id: string): Promise<User> => {
  return apiFetch<User>(`/api/auth/users/${id}`, {
    method: "GET",
  });
};

export const createUser = async (payload: CreateUserPayload): Promise<{ user: User; token: string }> => {
  return apiFetch<{ user: User; token: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateUser = async (id: string, payload: UpdateUserPayload): Promise<User> => {
  return apiFetch<User>(`/api/auth/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const deleteUser = async (id: string): Promise<{ message: string; id: string }> => {
  return apiFetch<{ message: string; id: string }>(`/api/auth/users/${id}`, {
    method: "DELETE",
  });
};

export const getRoles = async (): Promise<Role[]> => {
  return apiFetch<Role[]>("/api/auth/roles", {
    method: "GET",
  });
};
