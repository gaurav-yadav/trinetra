import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '../api/client';
import type { CreateSessionPayload, RenameSessionPayload } from '@trinetra/shared';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: sessionApi.list,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: () => sessionApi.get(id),
    enabled: !!id,
    refetchInterval: 3000, // Poll more frequently for active session
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSessionPayload) => sessionApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useRenameSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RenameSessionPayload }) =>
      sessionApi.rename(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useKillSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sessionApi.kill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useInterruptSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sessionApi.interrupt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useSyncSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => sessionApi.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
