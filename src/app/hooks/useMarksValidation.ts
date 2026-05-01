import { useMemo } from "react";

export type MarksRecord = Record<string, string>;
export type Student = { id: string; name: string; rollNo: string; class: string };

export function useMarksValidation(
  marks: MarksRecord,
  students: Student[],
  maxMarks: number
) {
  const validateMark = useMemo(() => {
    return (val: string) => {
      if (!val) return true;
      if (val === "AB" || val === "NA") return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= maxMarks;
    };
  }, [maxMarks]);

  const allFilled = useMemo(
    () => students.every((s) => (marks[s.id] ?? "").length > 0),
    [students, marks]
  );

  const allValid = useMemo(
    () => Object.values(marks).every(validateMark),
    [marks, validateMark]
  );

  const missingCount = useMemo(
    () => students.filter((s) => !(marks[s.id] ?? "").length).length,
    [students, marks]
  );

  const invalidCount = useMemo(
    () => students.filter((s) => (marks[s.id] ?? "").length > 0 && !validateMark(marks[s.id])).length,
    [students, marks, validateMark]
  );

  return {
    validateMark,
    allFilled,
    allValid,
    missingCount,
    invalidCount,
  };
}
