import { create } from 'zustand';

interface UIState {
  createProjectOpen: boolean;
  createTaskOpen: boolean;
  setCreateProjectOpen: (open: boolean) => void;
  setCreateTaskOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  createProjectOpen: false,
  createTaskOpen: false,
  setCreateProjectOpen: (open) => set({ createProjectOpen: open }),
  setCreateTaskOpen: (open) => set({ createTaskOpen: open }),
}));
