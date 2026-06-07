/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'HOST' | 'USER';

export interface Host {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  groupIds: string[];
  hostId: string;
}

export type Moment = 'DESPERTANDO' | 'MAÑANA' | 'TARDE' | 'NOCHE';

export interface Category {
  id: string;
  name: string;
  color: string;
  moment?: Moment;
}

export interface Question {
  id: string;
  text: string;
  categoryId: string;
  groupId: string;
  type: 'TEXT' | 'BOOLEAN' | 'NUMBER';
  moment?: Moment;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  hostId: string;
  userIds: string[];
  questionIds: string[];
}

export interface Answer {
  id: string;
  questionId: string;
  userId: string;
  value: string | number | boolean;
  date: string; // ISO date string
}

export interface Collection {
  id: string;
  userId: string;
  date: string;
  answerIds: string[];
}

export interface Invite {
  id: string;
  groupId: string;
  userId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface AuthState {
  user: Host | User | null;
  role: Role | null;
  isAuthenticated: boolean;
}
