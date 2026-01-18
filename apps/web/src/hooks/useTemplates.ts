import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templateApi } from '../api/client';
import type { CreateTemplatePayload, UpdateTemplatePayload } from '@trinetra/shared';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: templateApi.list,
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => templateApi.get(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => templateApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTemplatePayload }) =>
      templateApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templateApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
