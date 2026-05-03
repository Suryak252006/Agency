'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Query key factories
 */
export const queryKeys = {
  marks: {
    all: ['marks'] as const,
    lists: () => [...queryKeys.marks.all, 'list'] as const,
    list: (examId: string, classId?: string) => [...queryKeys.marks.lists(), examId, classId] as const,
    details: () => [...queryKeys.marks.all, 'detail'] as const,
    detail: (marksId: string) => [...queryKeys.marks.details(), marksId] as const,
    history: (marksId: string) => [...queryKeys.marks.detail(marksId), 'history'] as const,
  },
  requests: {
    all: ['requests'] as const,
    lists: () => [...queryKeys.requests.all, 'list'] as const,
    list: (status?: string, type?: string) => [...queryKeys.requests.lists(), status, type] as const,
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
    list: (page?: number, limit?: number) => [...queryKeys.students.lists(), page, limit] as const,
  },
  exams: {
    all: ['exams'] as const,
    lists: () => [...queryKeys.exams.all, 'list'] as const,
    list: () => [...queryKeys.exams.lists()] as const,
  },
  logs: {
    all: ['logs'] as const,
    lists: () => [...queryKeys.logs.all, 'list'] as const,
    list: (action?: string, days?: number, page?: number) => [...queryKeys.logs.lists(), action, days, page] as const,
  },
  academicYears: {
    all: ['academicYears'] as const,
    lists: () => [...queryKeys.academicYears.all, 'list'] as const,
    list: () => [...queryKeys.academicYears.lists()] as const,
    details: () => [...queryKeys.academicYears.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.academicYears.details(), id] as const,
    terms: (yearId: string) => [...queryKeys.academicYears.detail(yearId), 'terms'] as const,
  },
  grades: {
    all: ['grades'] as const,
    lists: () => [...queryKeys.grades.all, 'list'] as const,
    list: () => [...queryKeys.grades.lists()] as const,
    details: () => [...queryKeys.grades.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.grades.details(), id] as const,
  },
  sections: {
    all: ['sections'] as const,
    lists: () => [...queryKeys.sections.all, 'list'] as const,
    list: () => [...queryKeys.sections.lists()] as const,
    details: () => [...queryKeys.sections.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sections.details(), id] as const,
  },
  subjects: {
    all: ['subjects'] as const,
    lists: () => [...queryKeys.subjects.all, 'list'] as const,
    list: (subjectType?: string) => [...queryKeys.subjects.lists(), subjectType] as const,
    details: () => [...queryKeys.subjects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.subjects.details(), id] as const,
  },
  school: {
    all: ['school'] as const,
    record: () => [...queryKeys.school.all, 'record'] as const,
    config: () => [...queryKeys.school.all, 'config'] as const,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Marks — Workflow: SUBMITTED → LOCK_PENDING → LOCKED
//
//  Faculty:   saveMark()      — enters/updates a mark (SUBMITTED, editable)
//  Faculty:   requestLock()   — requests lock for exam+class (→ LOCK_PENDING)
//  Admin/HOD: approveLock()   — approves the lock request (→ LOCKED, final)
//  Admin/HOD: rejectLock()    — rejects the lock request  (→ SUBMITTED, editable again)
// ─────────────────────────────────────────────────────────────────────────────

export function useMarks(examId: string, classId?: string) {
  const query = new URLSearchParams({ examId });
  if (classId) query.set('classId', classId);

  return useQuery({
    queryKey: queryKeys.marks.list(examId, classId),
    queryFn: () => apiClient.get<any>(`/api/marks?${query.toString()}`),
    staleTime: 30 * 1000,
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

/** Faculty: save/update a mark (SUBMITTED, editable until lock request) */
export function useSaveMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { examId: string; classId: string; studentId: string; value: string }) =>
      apiClient.post<any>('/api/marks', data),
    onSuccess: (_: any, v: { examId: string; classId: string; studentId: string; value: string }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.list(v.examId, v.classId) });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to save mark'),
  });
}

/** Faculty: request a lock for all SUBMITTED marks in an exam+class (→ LOCK_PENDING) */
export function useRequestLock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { examId: string; classId: string }) =>
      apiClient.post<any>('/api/marks/request-lock', data),
    onSuccess: () => {
      toast.success('Lock request submitted — awaiting Admin/HOD approval');
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.all });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to request lock'),
  });
}

/** Admin/HOD: approve lock request (LOCK_PENDING → LOCKED) */
export function useApproveLock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { marksIds: string[] }) =>
      apiClient.post<any>('/api/marks/approve-lock', data),
    onSuccess: () => {
      toast.success('Lock approved — marks are now locked');
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to approve lock'),
  });
}

/** Admin/HOD: reject lock request (LOCK_PENDING → SUBMITTED, marks editable again) */
export function useRejectLock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { marksIds: string[]; reason: string }) =>
      apiClient.post<any>('/api/marks/reject-lock', data),
    onSuccess: () => {
      toast.success('Lock request rejected — marks returned to faculty for editing');
      queryClient.invalidateQueries({ queryKey: queryKeys.marks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to reject lock'),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Requests
// ─────────────────────────────────────────────────────────────────────────────

export function useRequests(status?: string, type?: string, page = 0, limit = 20) {
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (type) query.set('type', type);
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
    mutationFn: (data: { type: string; marksId?: string; reason: string }) =>
      apiClient.post<any>('/api/requests', data),
    onSuccess: () => {
      toast.success('Request submitted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create request'),
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { requestId: string; response?: string }) =>
      apiClient.post<any>(`/api/requests/${data.requestId}/approve`, { response: data.response }),
    onSuccess: () => {
      toast.success('Request approved');
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to approve request'),
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { requestId: string; response: string }) =>
      apiClient.post<any>(`/api/requests/${data.requestId}/reject`, { response: data.response }),
    onSuccess: () => {
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to reject request'),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Classes
// ─────────────────────────────────────────────────────────────────────────────

export function useClasses(options?: { classId?: string; includeStudents?: boolean; page?: number; limit?: number }) {
  const page = options?.page ?? 0;
  const limit = options?.limit ?? 20;
  const query = new URLSearchParams();
  if (options?.classId) query.set('classId', options.classId);
  if (options?.includeStudents) query.set('includeStudents', 'true');
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
  if (classId) query.set('classId', classId);
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
  if (classId) query.set('classId', classId);
  query.set('page', String(page));
  query.set('limit', String(limit));

  return useQuery({
    queryKey: [...queryKeys.exams.list(), classId, page, limit],
    queryFn: () => apiClient.get<any>(`/api/exams${query.size ? `?${query.toString()}` : ''}`),
    staleTime: 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

export function useLogs(action?: string, days: number = 30, page: number = 0) {
  const query = new URLSearchParams();
  if (action) query.set('action', action);
  query.set('days', String(days));
  query.set('page', String(page));

  return useQuery({
    queryKey: queryKeys.logs.list(action, days, page),
    queryFn: () => apiClient.get<any>(`/api/logs?${query.toString()}`),
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Academic Years (Sprint 2)
// ─────────────────────────────────────────────────────────────────────────────

export function useAcademicYears() {
  return useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => apiClient.get<any>('/api/v1/academic-years'),
    staleTime: 60 * 1000,
  });
}

export function useAcademicYear(id: string) {
  return useQuery({
    queryKey: queryKeys.academicYears.detail(id),
    queryFn: () => apiClient.get<any>(`/api/v1/academic-years/${id}`),
    staleTime: 60 * 1000,
    enabled: Boolean(id),
  });
}

export function useTerms(yearId: string) {
  return useQuery({
    queryKey: queryKeys.academicYears.terms(yearId),
    queryFn: () => apiClient.get<any>(`/api/v1/academic-years/${yearId}/terms`),
    staleTime: 60 * 1000,
    enabled: Boolean(yearId),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Grades (Sprint 2)
// ─────────────────────────────────────────────────────────────────────────────

export function useGrades() {
  return useQuery({
    queryKey: queryKeys.grades.list(),
    queryFn: () => apiClient.get<any>('/api/v1/grades'),
    staleTime: 60 * 1000,
  });
}

export function useGrade(id: string) {
  return useQuery({
    queryKey: queryKeys.grades.detail(id),
    queryFn: () => apiClient.get<any>(`/api/v1/grades/${id}`),
    staleTime: 60 * 1000,
    enabled: Boolean(id),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections (Sprint 2)
// ─────────────────────────────────────────────────────────────────────────────

export function useSections() {
  return useQuery({
    queryKey: queryKeys.sections.list(),
    queryFn: () => apiClient.get<any>('/api/v1/sections'),
    staleTime: 60 * 1000,
  });
}

export function useSection(id: string) {
  return useQuery({
    queryKey: queryKeys.sections.detail(id),
    queryFn: () => apiClient.get<any>(`/api/v1/sections/${id}`),
    staleTime: 60 * 1000,
    enabled: Boolean(id),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Subjects (Sprint 2)
// ─────────────────────────────────────────────────────────────────────────────

export function useSubjects(subjectType?: string) {
  const query = new URLSearchParams();
  if (subjectType) query.set('subjectType', subjectType);

  return useQuery({
    queryKey: queryKeys.subjects.list(subjectType),
    queryFn: () => apiClient.get<any>(`/api/v1/subjects${query.size ? `?${query.toString()}` : ''}`),
    staleTime: 60 * 1000,
  });
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: queryKeys.subjects.detail(id),
    queryFn: () => apiClient.get<any>(`/api/v1/subjects/${id}`),
    staleTime: 60 * 1000,
    enabled: Boolean(id),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// School (Sprint 2)
// ─────────────────────────────────────────────────────────────────────────────

export function useSchool() {
  return useQuery({
    queryKey: queryKeys.school.record(),
    queryFn: () => apiClient.get<any>('/api/v1/school'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSchoolConfig() {
  return useQuery({
    queryKey: queryKeys.school.config(),
    queryFn: () => apiClient.get<any>('/api/v1/school/config'),
    staleTime: 5 * 60 * 1000,
  });
}
