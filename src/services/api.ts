import { Employee, AttendanceLog, GatePass, LeaveRequest, GeofenceZone, SystemSettings, Notification, Student } from '../types';

// @ts-ignore
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://10.10.220.53:3001/api';

// Get auth token from localStorage
const getToken = () => localStorage.getItem('omniguard_token');

// Generic fetch wrapper
const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// ===== AUTH API =====
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (response.token) {
      localStorage.setItem('omniguard_token', response.token);
      localStorage.setItem('omniguard_user', JSON.stringify(response.user));
    }
    return response;
  },

  logout: () => {
    localStorage.removeItem('omniguard_token');
    localStorage.removeItem('omniguard_user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('omniguard_user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => !!getToken()
};

// ===== USERS API =====
export const usersAPI = {
  getAll: (): Promise<Employee[]> => fetchAPI('/users'),
  
  getById: (id: string): Promise<Employee> => fetchAPI(`/users/${id}`),
  
  create: (user: Partial<Employee> & { password: string }) => 
    fetchAPI('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    }),
  
  update: (id: string, user: Partial<Employee>) => 
    fetchAPI(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    }),
  
  delete: (id: string) => 
    fetchAPI(`/users/${id}`, {
      method: 'DELETE'
    }),
  
  bulkCreate: (users: Array<Partial<Employee> & { password?: string }>) => 
    fetchAPI('/users/bulk', {
      method: 'POST',
      body: JSON.stringify({ users })
    })
};

// ===== STUDENTS API =====
export const studentsAPI = {
  getAll: (): Promise<Student[]> => fetchAPI('/students'),
  
  create: (student: Partial<Student>) => 
    fetchAPI('/students', {
      method: 'POST',
      body: JSON.stringify(student)
    })
};

// ===== ATTENDANCE API =====
export const attendanceAPI = {
  getAll: (filters?: { user_id?: string; date_from?: string; date_to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.user_id) params.append('user_id', filters.user_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    return fetchAPI(`/attendance?${params.toString()}`) as Promise<AttendanceLog[]>;
  },
  
  create: (log: Partial<AttendanceLog>) => 
    fetchAPI('/attendance', {
      method: 'POST',
      body: JSON.stringify(log)
    })
};

// ===== GATE PASSES API =====
export const gatePassAPI = {
  getAll: (): Promise<GatePass[]> => fetchAPI('/gate-passes'),
  
  create: (pass: Partial<GatePass>) => 
    fetchAPI('/gate-passes', {
      method: 'POST',
      body: JSON.stringify(pass)
    }),
  
  updateStatus: (id: string, status: string, authorized_by?: string) => 
    fetchAPI(`/gate-passes/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, authorized_by })
    })
};

// ===== GEOFENCES API =====
export const geofenceAPI = {
  getAll: (): Promise<GeofenceZone[]> => fetchAPI('/geofences'),
  
  create: (geofence: Partial<GeofenceZone>) => 
    fetchAPI('/geofences', {
      method: 'POST',
      body: JSON.stringify(geofence)
    })
};

// ===== LEAVES API =====
export const leavesAPI = {
  getAll: (): Promise<LeaveRequest[]> => fetchAPI('/leaves'),
  
  create: (leave: Partial<LeaveRequest>) => 
    fetchAPI('/leaves', {
      method: 'POST',
      body: JSON.stringify(leave)
    }),
  
  updateStatus: (id: string, status: string, approver_notes?: string) => 
    fetchAPI(`/leaves/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, approver_notes })
    })
};

// ===== NOTIFICATIONS API =====
export const notificationsAPI = {
  getAll: (recipient_id: string): Promise<Notification[]> => 
    fetchAPI(`/notifications?recipient_id=${recipient_id}`),
  
  create: (notification: Partial<Notification>) => 
    fetchAPI('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification)
    }),
  
  markAsRead: (id: string) => 
    fetchAPI(`/notifications/${id}/read`, {
      method: 'PUT'
    })
};

// ===== EVENTS API =====
export const eventsAPI = {
  getAll: () => fetchAPI('/events'),
  
  create: (event: any) => 
    fetchAPI('/events', {
      method: 'POST',
      body: JSON.stringify(event)
    }),
  
  getAttendees: (eventId: string) => 
    fetchAPI(`/events/${eventId}/attendees`),
  
  addAttendees: (eventId: string, attendees: any[]) => 
    fetchAPI(`/events/${eventId}/attendees`, {
      method: 'POST',
      body: JSON.stringify({ attendees })
    }),
  
  updateAttendeeStatus: (eventId: string, attendeeId: string, status: string, entry_time?: string, exit_time?: string) => 
    fetchAPI(`/events/${eventId}/attendees/${attendeeId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, entry_time, exit_time })
    })
};

// ===== SETTINGS API =====
export const settingsAPI = {
  get: (): Promise<SystemSettings> => fetchAPI('/settings'),
  
  update: (settings: Partial<SystemSettings>) => 
    fetchAPI('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
};

// ===== DASHBOARD API =====
export const dashboardAPI = {
  getStats: () => fetchAPI('/dashboard/stats')
};

export default {
  auth: authAPI,
  users: usersAPI,
  students: studentsAPI,
  attendance: attendanceAPI,
  gatePass: gatePassAPI,
  geofence: geofenceAPI,
  leaves: leavesAPI,
  notifications: notificationsAPI,
  events: eventsAPI,
  settings: settingsAPI,
  dashboard: dashboardAPI
};
