import axios from 'axios';
import type { COGNAPSE_Output } from '../types';

const API_URL = 'http://localhost:3001/api';

export const dbService = {
  // Auth
  async register(username: string, password: string) {
    const response = await axios.post(`${API_URL}/auth/register`, { username, password });
    return response.data;
  },

  async login(username: string, password: string) {
    const response = await axios.post(`${API_URL}/auth/login`, { username, password });
    return response.data;
  },

  // Persistence for intelligence reports
  async saveReport(id: string, userId: string, query: string, data: COGNAPSE_Output) {
    try {
      await axios.post(`${API_URL}/reports`, { id, userId, query, data });
    } catch (error) {
      console.warn("Vault unavailable.");
    }
  },

  async getAllReports(userId: string) {
    try {
      const response = await axios.get(`${API_URL}/reports/${userId}`);
      return response.data;
    } catch (error) {
       return [];
    }
  },

  // Persistence for user telemetry
  async syncStats(userId: string, stats: { xp: number; search_count: number; rank: string; game_scores: Record<string, number> }) {
    try {
      await axios.post(`${API_URL}/stats`, { ...stats, userId });
    } catch (error) {
      console.warn("Vault sync failed.");
    }
  },

  async loadStats(userId: string) {
    try {
      const response = await axios.get(`${API_URL}/stats/${userId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // Notebook Sync
  async getNotes(userId: string) {
    try {
      const response = await axios.get(`${API_URL}/notebook/${userId}`);
      return response.data;
    } catch (error) {
      return [];
    }
  },

  async addNote(id: string, userId: string, content: string, sourceQuery: string) {
    try {
      await axios.post(`${API_URL}/notebook`, { id, userId, content, sourceQuery });
    } catch (error) {
      console.warn("Vault note sync failed.");
    }
  },

  async deleteNote(noteId: string) {
    try {
      await axios.delete(`${API_URL}/notebook/${noteId}`);
    } catch (error) {
      console.warn("Vault note deletion failed.");
    }
  },

  async clearNotebook(userId: string) {
    try {
      await axios.delete(`${API_URL}/notebook/user/${userId}`);
    } catch (error) {
      console.warn("Vault notebook purge failed.");
    }
  }
};
