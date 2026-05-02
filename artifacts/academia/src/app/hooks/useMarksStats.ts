import { useMemo } from "react";
import type { MarksRecord, Student } from "./useMarksValidation";

export function useMarksStats(marks: MarksRecord, students: Student[]) {
  const overviewData = useMemo(() => {
    return students.map((s) => {
      const v = marks[s.id];
      const num = v && v !== "AB" && v !== "NA" ? parseInt(v) : 0;
      return { name: s.name.split(" ")[0], score: isNaN(num) ? 0 : num };
    });
  }, [students, marks]);

  const numericScores = useMemo(
    () => overviewData.map((d) => d.score).filter((n) => n > 0),
    [overviewData]
  );

  const avgScore = useMemo(
    () =>
      numericScores.length
        ? Math.round(numericScores.reduce((a, b) => a + b, 0) / numericScores.length)
        : 0,
    [numericScores]
  );

  const highest = useMemo(
    () => (numericScores.length ? Math.max(...numericScores) : 0),
    [numericScores]
  );

  const lowest = useMemo(
    () => (numericScores.length ? Math.min(...numericScores) : 0),
    [numericScores]
  );

  return {
    overviewData,
    numericScores,
    avgScore,
    highest,
    lowest,
  };
}
