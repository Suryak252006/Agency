'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Query key factories for consistent key generation
 */
export const queryKeys = {
  marks: {
    all: ['marks'] as const,
    lists: () => [...queryKeys.marks.all, 'list'] as const,
    list: (examId: string, classId?: string) => [
      ...queryKeys.marks.lists(),
      examId,
      classId,
    ] as const,
    details: () => [...queryKeys.marks.all, 'detail'] as const,
    detail: (marksId: string) => [...queryKeys.marks.details(), marksId] as const,
    history: (marksId: string) => [...queryKeys.marks.detail(marksId), 'history'] as const,
  },
  requests: {
    all: ['requests'] as const,
    lists: () => [...queryKeys.requests.all, 'list'] as const,
    list: (status?: string, type?: string) => [
      ...queryKeys.requests.lists(),
      status,
      type,
    ] as const,
    details: () => [...queryKeys.requests.all, 'detail'] as const,
    detail: (requestId: string) => [...queryKeys.requests.details(), requestId] as const,
  },
  classes: {
    all: ['classes'] as const,
    lists: () => [...queryKeys.classes.all, 'list'] as const,
    list: () => [...queryKeys.classes.lists()] as const,
    details: () => [...queryKeys.classes.all, 'detail'] as const,
    detail: (classId: string) => [...queryKeys.classes.details(), classId] as const,
  },
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (page?: number, limit?: number) => [
      ...queryKeys.students.lists(),
      page,
      limit,
    ] as const,
  },
  exams: {
    all: ['exams'] as const,
    lists: () => [...queryKeys.exams.all, 'list'] as const,
    list: () => [...queryKeys.exams.lists()] as const,
  },
  logs: {
    all: ['logs'] as const,
    lists: () => [...queryKeys.logs.all, 'list'] as const,
    list: (action?: string, days?: number) => [
      ...queryKeys.logs.lists(),
      action,
      days,
    ] as const,
  },
};

/**
 * Hooks for Marks
 */
export function useMarks(examId: string, classId?: string) {
  const query = new URLSearchParams({ examId });

  if (classId) {
    query.set('classId', classId);
  }

  return useQuery({
    queryKey: queryKeys.marks.list(examId, classId),
    queryFn: () => apiClient.get<any>(`/api/marks?${query.toString()}`),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: Boolean(examId),
  });
}

export function useMarksHistory(marksId: string) {
  return useQuery({
    queryKey: queryKeys.marks.history(marksId),
    queryFn: () => apiClient.get<any>(`/api/marks/${marksId}/history`),
    staleTime: 60 * 1000,
    enabled: Boolean(marksId),
  });
}

export function useSaveDraftMark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      examId: string;
      classId: string;
      studentId: string;
      value: string;
    }) => apiClient.post<any>('/api/marks', data),
    onSuccess: (_data: any, variables: { examId: string; classId: string; studentId: string; value: string }) => {
      // Invalidate marks list to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.marks.list(variables.examId, variables.classId),
      });
    },
    onError: (error: any) => {
      console.error('Failed to save mark:', error);
      toast.error(error.message || 'Failed to save mark');
    },
  });
}

export function useSubmitMarks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { examId: string; classId: string }) =>
      apiClient.post<any>('/api/marks/submit', data),
    onSuccess: () => {
      toast.success('Marks submitted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.all });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit marks');
    },
  });
}

export function useApproveMarks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { marksIds: string[] }) => apiClient.post<any>('/api/marks/approve', data),
    onSuccess: () => {
      toast.success('Marks approved successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve marks');
    },
  });
}

export function useLockMarks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { marksIds: string[] }) => apiClient.post<any>('/api/marks/lock', data),
    onSuccess: () => {
      toast.success('Marks locked successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to lock marks');
    },
  });
}

/**
 * Hooks for Requests
 */
export function useRequests(status?: string, type?: string, page = 0, limit = 20) {
  const query = new URLSearchParams();

  if (status) {
    query.set('status', status);
  }

  if (type) {
    query.set('type', type);
  }

  query.set('page', String(page));
  query.set('limit', String(limit));

  return useQuery({
    queryKey: [...queryKeys.requests.list(status, type), page, limit],
    queryFn: () => apiClient.get<any>(`/api/requests?${query.toString()}`),
    staleTime: 30 * 1000,
    retry: 2,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type: string;
      marksId?: string;
      reason: string;
    }) => apiClient.post<any>('/api/requests', data),
    onSuccess: () => {
      toast.success('Request submitted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create request');
    },
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requestId: string; response?: string }) =>
      apiClient.post<any>(`/api/requests/${data.requestId}/approve`, { response: data.response }),
    onSuccess: () => {
      toast.success('Request approved');
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve request');
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requestId: string; response: string }) =>
      apiClient.post<any>(`/api/requests/${data.requestId}/reject`, { response: data.response }),
    onSuccess: () => {
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject request');
    },
  });
}

/**
 * Hooks for Classes
 */
export function useClasses(options?: { classId?: string; includeStudents?: boolean; page?: number; limit?: number }) {
  const page = options?.page ?? 0;
  const limit = options?.limit ?? 20;
  const query = new URLSearchParams();

  if (options?.classId) {
    query.set('classId', options.classId);
  }

  if (options?.includeStudents) {
    query.set('includeStudents', 'true');
  }

  query.set('page', String(page));
  query.set('limit', String(limit));

  return useQuery({
    queryKey: [...queryKeys.classes.list(), options?.classId, options?.includeStudents, page, limit],
    queryFn: () => apiClient.get<any>(`/api/classes${query.size ? `?${query.toString()}` : ''}`),
    staleTime: 60 * 1000,
  });
}

export function useClassDetails(classId: string) {
  return useQuery({
    queryKey: queryKeys.classes.detail(classId),
    queryFn: () => apiClient.get<any>(`/api/classes/${classId}`),
    staleTime: 60 * 1000,
    enabled: Boolean(classId),
  });
}

export function useStudents(classId?: string, page = 0, limit = 100) {
  const query = new URLSearchParams();

  if (classId) {
    query.set('classId', classId);
  }

  query.set('page', String(page));
  query.set('limit', String(limit));

  return useQuery({
    queryKey: [...queryKeys.students.list(page, limit), classId],
    queryFn: () => apiClient.get<any>(`/api/students${query.size ? `?${query.toString()}` : ''}`),
    staleTime: 60 * 1000,
  });
}

export function useExams(classId?: string, page = 0, limit = 20) {
  const query = new URLSearchParams();

  if (classId) {
    query.set('classId', classId);
  }

  query.set('page', String(page));
  query.set('limit', String(limit));

  return useQuery({
    queryKey: [...queryKeys.exams.list(), classId, page, limit],
    queryFn: () => apiClient.get<any>(`/api/exams${query.size ? `?${query.toString()}` : ''}`),
    staleTime: 60 * 1000,
  });
}

/**
 * Hooks for Audit Logs
 */
export function useLogs(action?: string, days: number = 30, page: number = 0) {
  const query = new URLSearchParams();

  if (action) {
    query.set('action', action);
  }

  query.set('days', String(days));
  query.set('page', String(page));

  return useQuery({
    queryKey: queryKeys.logs.list(action, days),
    queryFn: () => apiClient.get<any>(`/api/logs?${query.toString()}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
