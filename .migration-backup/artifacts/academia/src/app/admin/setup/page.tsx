'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSchool, useSchoolConfig, useUpdateSchool, useUpdateSchoolConfig } from '@/lib/client/hooks';

const BOARDS = ['CBSE', 'ICSE', 'STATE_BOARD', 'OTHER'] as const;
const GRADING_SYSTEMS = ['TEN_POINT', 'PERCENTAGE', 'LETTER'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SchoolSetupPage() {
  const { data: schoolData } = useSchool();
  const { data: configData } = useSchoolConfig();

  const school = schoolData?.data?.school;
  const config = configData?.data?.config;

  const [schoolForm, setSchoolForm] = useState({ name: '', board: 'CBSE' });
  const [configForm, setConfigForm] = useState({
    gradingSystem: 'TEN_POINT',
    workingDays: '6',
    timezone: 'Asia/Kolkata',
    academicYearStartMonth: '4',
  });

  const updateSchoolMutation = useUpdateSchool();
  const updateSchoolConfigMutation = useUpdateSchoolConfig();

  useEffect(() => {
    if (school) {
      setSchoolForm({ name: school.name ?? '', board: school.board ?? 'CBSE' });
    }
  }, [school]);

  useEffect(() => {
    if (config) {
      setConfigForm({
        gradingSystem: config.gradingSystem ?? 'TEN_POINT',
        workingDays: String(config.workingDays ?? 6),
        timezone: config.timezone ?? 'Asia/Kolkata',
        academicYearStartMonth: String(config.academicYearStartMonth ?? 4),
      });
    }
  }, [config]);

  const handleSaveSchool = () => {
    updateSchoolMutation.mutate({
      name: schoolForm.name,
      board: schoolForm.board as 'CBSE' | 'ICSE' | 'STATE_BOARD' | 'OTHER',
    }, {
      onSuccess: () => toast.success('School details saved'),
    });
  };

  const handleSaveConfig = () => {
    updateSchoolConfigMutation.mutate({
      gradingSystem: configForm.gradingSystem as 'TEN_POINT' | 'PERCENTAGE' | 'LETTER',
      workingDays: Number(configForm.workingDays),
      timezone: configForm.timezone,
      academicYearStartMonth: Number(configForm.academicYearStartMonth),
    }, {
      onSuccess: () => toast.success('Configuration saved'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">School Setup</h1>
          <p className="text-sm text-slate-500">Configure school identity and academic preferences.</p>
        </div>
      </div>

      <Card className="border-slate-100">
        <CardHeader>
          <CardTitle className="text-base">School information</CardTitle>
          <CardDescription>Basic identity details for your school.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>School name</Label>
              <Input
                value={schoolForm.name}
                onChange={(e) => setSchoolForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Delhi Public School"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Board affiliation</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={schoolForm.board}
                onChange={(e) => setSchoolForm((f) => ({ ...f, board: e.target.value }))}
              >
                {BOARDS.map((b) => <option key={b} value={b}>{b.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={handleSaveSchool} disabled={updateSchoolMutation.isPending}>
            {updateSchoolMutation.isPending ? 'Saving…' : 'Save school details'}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-slate-100">
        <CardHeader>
          <CardTitle className="text-base">Academic configuration</CardTitle>
          <CardDescription>Grading system, working days, and calendar settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Grading system</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={configForm.gradingSystem}
                onChange={(e) => setConfigForm((f) => ({ ...f, gradingSystem: e.target.value }))}
              >
                {GRADING_SYSTEMS.map((g) => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Working days/week</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={configForm.workingDays}
                onChange={(e) => setConfigForm((f) => ({ ...f, workingDays: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input
                value={configForm.timezone}
                onChange={(e) => setConfigForm((f) => ({ ...f, timezone: e.target.value }))}
                placeholder="Asia/Kolkata"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Academic year starts</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={configForm.academicYearStartMonth}
                onChange={(e) => setConfigForm((f) => ({ ...f, academicYearStartMonth: e.target.value }))}
              >
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={handleSaveConfig} disabled={updateSchoolConfigMutation.isPending}>
            {updateSchoolConfigMutation.isPending ? 'Saving…' : 'Save configuration'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
