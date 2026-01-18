import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../api/client';
import type { CreateWorkspacePayload, UpdateWorkspacePayload } from '@trinetra/shared';

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.list,
  });
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: ['workspaces', id],
    queryFn: () => workspaceApi.get(id),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => workspaceApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWorkspacePayload }) =>
      workspaceApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
