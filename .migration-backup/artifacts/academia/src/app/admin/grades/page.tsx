'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { GraduationCap, LayoutGrid, BookOpen, Plus, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function GradesPage() {
  const grades = useSWR('/api/v1/grades', fetcher);
  const sections = useSWR('/api/v1/sections', fetcher);
  const subjects = useSWR('/api/v1/subjects', fetcher);

  const [gradeForm, setGradeForm] = useState({ name: '', level: '' });
  const [sectionForm, setSectionForm] = useState({ name: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', subjectType: 'MAIN' });
  const [creatingGrade, setCreatingGrade] = useState(false);
  const [creatingSection, setCreatingSection] = useState(false);
  const [creatingSubject, setCreatingSubject] = useState(false);

  const gradeList = grades.data?.data?.grades ?? [];
  const sectionList = sections.data?.data?.sections ?? [];
  const subjectList = subjects.data?.data?.subjects ?? [];

  const handleCreateGrade = async () => {
    if (!gradeForm.name || gradeForm.level === '') { toast.error('Name and level are required'); return; }
    setCreatingGrade(true);
    try {
      const res = await fetch('/api/v1/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: gradeForm.name, level: Number(gradeForm.level) }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success('Grade created');
      setGradeForm({ name: '', level: '' });
      grades.mutate();
    } catch (e: any) { toast.error(e.message); }
    finally { setCreatingGrade(false); }
  };

  const handleDeleteGrade = async (id: string) => {
    const res = await fetch(`/api/v1/grades/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); grades.mutate(); }
    else toast.error('Failed to delete');
  };

  const handleCreateSection = async () => {
    if (!sectionForm.name) { toast.error('Name is required'); return; }
    setCreatingSection(true);
    try {
      const res = await fetch('/api/v1/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionForm),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success('Section created');
      setSectionForm({ name: '' });
      sections.mutate();
    } catch (e: any) { toast.error(e.message); }
    finally { setCreatingSection(false); }
  };

  const handleDeleteSection = async (id: string) => {
    const res = await fetch(`/api/v1/sections/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); sections.mutate(); }
    else toast.error('Failed to delete');
  };

  const handleCreateSubject = async () => {
    if (!subjectForm.name || !subjectForm.code) { toast.error('Name and code are required'); return; }
    setCreatingSubject(true);
    try {
      const res = await fetch('/api/v1/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectForm),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success('Subject created');
      setSubjectForm({ name: '', code: '', subjectType: 'MAIN' });
      subjects.mutate();
    } catch (e: any) { toast.error(e.message); }
    finally { setCreatingSubject(false); }
  };

  const handleDeleteSubject = async (id: string) => {
    const res = await fetch(`/api/v1/subjects/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); subjects.mutate(); }
    else toast.error('Failed to delete');
  };

  const subjectTypeBadge: Record<string, string> = {
    MAIN: 'bg-sky-100 text-sky-700',
    OPTIONAL: 'bg-amber-100 text-amber-700',
    CO_CURRICULAR: 'bg-green-100 text-green-700',
    LANGUAGE: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Grades, Sections & Subjects</h1>
        <p className="mt-1 text-sm text-slate-500">Configure school-wide academic structure.</p>
      </div>

      <Tabs defaultValue="grades">
        <TabsList className="rounded-xl">
          <TabsTrigger value="grades"><GraduationCap className="mr-1.5 h-4 w-4" />Grades ({gradeList.length})</TabsTrigger>
          <TabsTrigger value="sections"><LayoutGrid className="mr-1.5 h-4 w-4" />Sections ({sectionList.length})</TabsTrigger>
          <TabsTrigger value="subjects"><BookOpen className="mr-1.5 h-4 w-4" />Subjects ({subjectList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4 space-y-4">
          <Card className="border-sky-100">
            <CardHeader><CardTitle className="text-sm">Add grade</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Class 1" value={gradeForm.name} onChange={(e) => setGradeForm((f) => ({ ...f, name: e.target.value }))} className="w-36" />
              </div>
              <div className="space-y-1.5">
                <Label>Level (0–12)</Label>
                <Input type="number" min={0} max={12} placeholder="1" value={gradeForm.level} onChange={(e) => setGradeForm((f) => ({ ...f, level: e.target.value }))} className="w-24" />
              </div>
              <Button onClick={handleCreateGrade} disabled={creatingGrade}>
                <Plus className="mr-1.5 h-4 w-4" />{creatingGrade ? 'Adding…' : 'Add'}
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {gradeList.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium text-slate-800">{g.name}</div>
                  <div className="text-xs text-slate-400">Level {g.level}</div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteGrade(g.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sections" className="mt-4 space-y-4">
          <Card className="border-sky-100">
            <CardHeader><CardTitle className="text-sm">Add section</CardTitle></CardHeader>
            <CardContent className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="A" value={sectionForm.name} onChange={(e) => setSectionForm({ name: e.target.value })} className="w-36" />
              </div>
              <Button onClick={handleCreateSection} disabled={creatingSection}>
                <Plus className="mr-1.5 h-4 w-4" />{creatingSection ? 'Adding…' : 'Add'}
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {sectionList.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
                <span className="text-sm font-medium text-slate-800">{s.name}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteSection(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="mt-4 space-y-4">
          <Card className="border-sky-100">
            <CardHeader><CardTitle className="text-sm">Add subject</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Mathematics" value={subjectForm.name} onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))} className="w-40" />
              </div>
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input placeholder="MATH" value={subjectForm.code} onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-24" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={subjectForm.subjectType}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, subjectType: e.target.value }))}
                >
                  <option value="MAIN">Main</option>
                  <option value="OPTIONAL">Optional</option>
                  <option value="CO_CURRICULAR">Co-curricular</option>
                  <option value="LANGUAGE">Language</option>
                </select>
              </div>
              <Button onClick={handleCreateSubject} disabled={creatingSubject}>
                <Plus className="mr-1.5 h-4 w-4" />{creatingSubject ? 'Adding…' : 'Add'}
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {subjectList.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{s.name}</span>
                    <span className="text-xs text-slate-400">{s.code}</span>
                  </div>
                  <Badge className={`mt-0.5 h-4 px-1.5 text-[10px] ${subjectTypeBadge[s.subjectType] ?? 'bg-slate-100 text-slate-600'} hover:${subjectTypeBadge[s.subjectType] ?? 'bg-slate-100'}`}>
                    {s.subjectType.replace('_', ' ')}
                  </Badge>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteSubject(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
