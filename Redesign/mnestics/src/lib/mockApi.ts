/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Host, User, Group, Question, Category, Answer, Invite, Role } from '@/types';

// Mock Data
const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-nutrition', name: 'NUTRICIÓN', color: '#E8503A', moment: 'DESPERTANDO' },
  { id: 'cat-water', name: 'AGUA', color: '#5B8DE8', moment: 'MAÑANA' },
  { id: 'cat-mood', name: 'ÁNIMO', color: '#EDB828', moment: 'MAÑANA' },
  { id: 'cat-fitness', name: 'FITNESS', color: '#8A5FCC', moment: 'TARDE' },
  { id: 'cat-sleep', name: 'SUEÑO', color: '#3DB86E', moment: 'NOCHE' },
];

const INITIAL_HOSTS: Host[] = [
  { id: 'host-1', email: 'host@habitos.com', name: 'Carlos Host', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos' }
];

const INITIAL_USERS: User[] = [
  { id: 'user-1', username: 'juanito', name: 'Juan Pérez', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juan', groupIds: ['group-1'], hostId: 'host-1' },
  { id: 'user-2', username: 'maria', name: 'María García', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria', groupIds: ['group-1'], hostId: 'host-1' }
];

const INITIAL_GROUPS: Group[] = [
  { id: 'group-1', name: 'Equipo Alpha', description: 'Grupo de enfoque matutino', hostId: 'host-1', userIds: ['user-1', 'user-2'], questionIds: ['q-1', 'q-2'] }
];

const INITIAL_QUESTIONS: Question[] = [
  // Nutrición - Despertando
  { id: 'q-nut-1', text: '¿Qué comiste al despertar?', categoryId: 'cat-nutrition', groupId: 'group-1', type: 'TEXT', moment: 'DESPERTANDO' },
  { id: 'q-nut-2', text: '¿Fue algo nutritivo?', categoryId: 'cat-nutrition', groupId: 'group-1', type: 'BOOLEAN', moment: 'DESPERTANDO' },
  
  // Agua - Mañana
  { id: 'q-wat-1', text: '¿Cuánta agua llevas?', categoryId: 'cat-water', groupId: 'group-1', type: 'NUMBER', moment: 'MAÑANA' },
  { id: 'q-wat-2', text: '¿Te sientes hidratado?', categoryId: 'cat-water', groupId: 'group-1', type: 'BOOLEAN', moment: 'MAÑANA' },
  
  // Ánimo - Mañana
  { id: 'q-moo-1', text: '¿Cómo amaneciste hoy?', categoryId: 'cat-mood', groupId: 'group-1', type: 'TEXT', moment: 'MAÑANA' },
  { id: 'q-moo-2', text: 'Nivel de energía (1-10)', categoryId: 'cat-mood', groupId: 'group-1', type: 'NUMBER', moment: 'MAÑANA' },
  
  // Fitness - Tarde
  { id: 'q-fit-1', text: '¿Hiciste ejercicio?', categoryId: 'cat-fitness', groupId: 'group-1', type: 'BOOLEAN', moment: 'TARDE' },
  { id: 'q-fit-2', text: 'Minutos de actividad', categoryId: 'cat-fitness', groupId: 'group-1', type: 'NUMBER', moment: 'TARDE' },
  
  // Sueño - Noche
  { id: 'q-sle-1', text: '¿A qué hora planeas dormir?', categoryId: 'cat-sleep', groupId: 'group-1', type: 'TEXT', moment: 'NOCHE' },
  { id: 'q-sle-2', text: '¿Pantallas apagadas?', categoryId: 'cat-sleep', groupId: 'group-1', type: 'BOOLEAN', moment: 'NOCHE' },
];

// Storage Helper
const getStorage = <T>(key: string, initial: T): T => {
  const stored = localStorage.getItem(key);
  try {
    const parsed = stored ? JSON.parse(stored) : initial;
    // Check if data is stale (e.g. cat-1 instead of cat-nutrition)
    if (key === 'categories' && parsed.length > 0 && !parsed[0].id.startsWith('cat-')) {
       localStorage.removeItem('categories');
       localStorage.removeItem('questions');
       localStorage.removeItem('answers');
       return initial;
    }
    return parsed;
  } catch (e) {
    return initial;
  }
};

const setStorage = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const mockApi = {
  // Auth
  login: async (identifier: string, password: string): Promise<{ user: Host | User; role: Role }> => {
    await new Promise(r => setTimeout(r, 800));
    if (identifier.includes('@')) {
      const hosts = getStorage('hosts', INITIAL_HOSTS);
      const host = hosts.find(h => h.email === identifier);
      if (host) return { user: host, role: 'HOST' };
    } else {
      const users = getStorage('users', INITIAL_USERS);
      const user = users.find(u => u.username === identifier);
      if (user) return { user: user, role: 'USER' };
    }
    throw new Error('Credenciales inválidas');
  },

  // Host Data
  getGroups: async (hostId: string): Promise<Group[]> => {
    await new Promise(r => setTimeout(r, 500));
    const groups = getStorage('groups', INITIAL_GROUPS);
    return groups.filter(g => g.hostId === hostId);
  },

  getGroup: async (groupId: string): Promise<Group | undefined> => {
    const groups = getStorage('groups', INITIAL_GROUPS);
    return groups.find(g => g.id === groupId);
  },

  getUsersByHost: async (hostId: string): Promise<User[]> => {
    const users = getStorage('users', INITIAL_USERS);
    return users.filter(u => u.hostId === hostId);
  },

  getQuestionsByGroup: async (groupId: string): Promise<Question[]> => {
    const questions = getStorage('questions', INITIAL_QUESTIONS);
    return questions.filter(q => q.groupId === groupId);
  },

  getCategories: async (): Promise<Category[]> => {
    return MOCK_CATEGORIES;
  },

  createGroup: async (data: Partial<Group>): Promise<Group> => {
    const groups = getStorage('groups', INITIAL_GROUPS);
    const newGroup = { ...data, id: `group-${Date.now()}`, userIds: [], questionIds: [] } as Group;
    setStorage('groups', [...groups, newGroup]);
    return newGroup;
  },

  createUser: async (data: Partial<User>): Promise<User> => {
    const users = getStorage('users', INITIAL_USERS);
    const newUser = { ...data, id: `user-${Date.now()}`, groupIds: [], avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}` } as User;
    setStorage('users', [...users, newUser]);
    return newUser;
  },

  createQuestion: async (data: Partial<Question>): Promise<Question> => {
    const questions = getStorage('questions', INITIAL_QUESTIONS);
    const newQuestion = { ...data, id: `q-${Date.now()}` } as Question;
    setStorage('questions', [...questions, newQuestion]);
    
    // Update group
    const groups = getStorage('groups', INITIAL_GROUPS);
    const groupIndex = groups.findIndex(g => g.id === data.groupId);
    if (groupIndex > -1) {
      groups[groupIndex].questionIds.push(newQuestion.id);
      setStorage('groups', groups);
    }
    
    return newQuestion;
  },

  // User Data
  getUserQuestions: async (userId: string): Promise<Question[]> => {
    const users = getStorage('users', INITIAL_USERS);
    const user = users.find(u => u.id === userId);
    if (!user) return [];
    
    const questions = getStorage('questions', INITIAL_QUESTIONS);
    return questions.filter(q => user.groupIds.includes(q.groupId));
  },

  getAnswers: async (userId: string, date?: string): Promise<Answer[]> => {
    const answers = getStorage('answers', [] as Answer[]);
    if (date) {
      return answers.filter(a => a.userId === userId && a.date === date);
    }
    return answers.filter(a => a.userId === userId);
  },

  saveAnswer: async (answer: Partial<Answer>): Promise<Answer> => {
    const answers = getStorage('answers', [] as Answer[]);
    const existingIndex = answers.findIndex(a => a.userId === answer.userId && a.questionId === answer.questionId && a.date === answer.date);
    
    const newAnswer = { ...answer, id: `ans-${Date.now()}` } as Answer;
    if (existingIndex > -1) {
      answers[existingIndex] = newAnswer;
    } else {
      answers.push(newAnswer);
    }
    setStorage('answers', answers);
    return newAnswer;
  },

  getInvites: async (userId: string): Promise<Invite[]> => {
    const invites = getStorage('invites', [] as Invite[]);
    return invites.filter(i => i.userId === userId);
  }
};
