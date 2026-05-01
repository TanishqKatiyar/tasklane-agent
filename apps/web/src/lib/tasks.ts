import type { Task } from "./types";

export async function updateTaskAPI(taskId: string, updates: Partial<Task>): Promise<Task> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // To test error rollback, we could randomly throw here, but for normal operation we resolve.
  // if (Math.random() > 0.8) throw new Error("Random network error");
  
  return { id: taskId, ...updates } as Task;
}
