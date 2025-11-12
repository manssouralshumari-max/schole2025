import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getGradesByStudent } from "@/services/firebase/grades.service";
import { getStudentById } from "@/services/firebase/students.service";
import type { Grade, Student } from "@/types";
import { format } from "date-fns";

type GradeSummary = {
  subject: string;
  teacherId: string;
  teacherName?: string;
  grades: Grade[];
  average: number | null;
  trend: "up" | "down" | null;
};

const getGradeColor = (grade: number | null) => {
  if (grade === null) return "outline";
  if (grade >= 90) return "default";
  if (grade >= 80) return "secondary";
  if (grade >= 70) return "outline";
  return "destructive";
};

const calculateTrend = (grades: Grade[]): "up" | "down" | null => {
  if (grades.length < 2) return null;
  const sorted = [...grades].sort((a, b) => a.date.getTime() - b.date.getTime());
  const recent = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const recentPerc = recent.percentage ?? (recent.maxScore ? (recent.score / recent.maxScore) * 100 : undefined);
  const previousPerc = previous.percentage ?? (previous.maxScore ? (previous.score / previous.maxScore) * 100 : undefined);
  if (recentPerc === undefined || previousPerc === undefined) return null;
  return recentPerc >= previousPerc ? "up" : "down";
};

const StudentGrades = () => {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [studentRecord, setStudentRecord] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    const loadGrades = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const studentDoc = await getStudentById(currentUser.uid);

        if (!studentDoc) {
          setStudentRecord(null);
          setGrades([]);
          setLoading(false);
          return;
        }

        setStudentRecord(studentDoc);
        const studentGrades = await getGradesByStudent(studentDoc.id);
        studentGrades.sort((a, b) => b.date.getTime() - a.date.getTime());
        setGrades(studentGrades);
      } catch (error) {
        console.error("❌ Error loading student grades:", error);
        toast({
          title: "Error",
          description: "Failed to load grades. Please try again.",
          variant: "destructive",
        });
        setGrades([]);
      } finally {
        setLoading(false);
      }
    };

    loadGrades();
  }, [currentUser, userData, toast]);

  const summaries = useMemo(() => {
    const subjectMap = new Map<string, GradeSummary>();
    grades.forEach((grade) => {
      const subjectKey = `${grade.subject}_${grade.teacherId}`;
      const entry = subjectMap.get(subjectKey) || {
        subject: grade.subject,
        teacherId: grade.teacherId,
        grades: [],
        average: null,
        trend: null,
      };
      entry.grades.push(grade);
      subjectMap.set(subjectKey, entry);
    });

    return Array.from(subjectMap.values()).map((entry) => {
      const percentages = entry.grades
        .map((grade) => grade.percentage ?? (grade.maxScore ? (grade.score / grade.maxScore) * 100 : undefined))
        .filter((value): value is number => value !== undefined);

      const average = percentages.length
        ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length
        : null;

      const trend = calculateTrend(entry.grades);

      return {
        ...entry,
        average,
        trend,
      } satisfies GradeSummary;
    });
  }, [grades]);

  const overallAverage = useMemo(() => {
    const percentages = grades
      .map((grade) => grade.percentage ?? (grade.maxScore ? (grade.score / grade.maxScore) * 100 : undefined))
      .filter((value): value is number => value !== undefined);
    if (!percentages.length) return null;
    return percentages.reduce((sum, value) => sum + value, 0) / percentages.length;
  }, [grades]);

  const header = useMemo(
    () => (
      <div>
        <h2 className="text-3xl font-bold">My Grades</h2>
        <p className="text-muted-foreground">Track your academic performance</p>
        {studentRecord && (
          <p className="text-sm text-muted-foreground mt-1">
            {studentRecord.name} • Grade {studentRecord.grade}
          </p>
        )}
      </div>
    ),
    [studentRecord]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading grades...</span>
        </div>
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No grades have been published yet. Please check back later.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <Card className="bg-gradient-hero text-primary-foreground">
        <CardHeader>
          <CardTitle>Overall Average</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {overallAverage !== null ? `${overallAverage.toFixed(1)}%` : "No average yet"}
          </div>
          <p className="text-primary-foreground/80 mt-2">
            {overallAverage !== null ? "Keep up the great work!" : "Your grades will appear here once published."}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {summaries.map((item) => (
          <Card key={`${item.subject}-${item.teacherId}`} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{item.subject}</CardTitle>
                  {item.teacherName && <p className="text-sm text-muted-foreground">{item.teacherName}</p>}
                </div>
                <Badge variant={getGradeColor(item.average)}>
                  {item.average !== null ? `${item.average.toFixed(1)}%` : "No grades"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={item.average ?? 0} className="h-2" />
              <div className="flex items-center gap-2 text-sm">
                {item.trend === "up" ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-success">Improving</span>
                  </>
                ) : item.trend === "down" ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Needs attention</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">More data needed for trend</span>
                )}
              </div>
              <div className="space-y-2">
                {item.grades.map((grade) => (
                  <div key={grade.id} className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {grade.type} • {format(grade.date, "MMM d")}
                    </span>
                    <span>
                      {grade.score}/{grade.maxScore} ({grade.percentage?.toFixed(1) ?? "—"}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StudentGrades;
