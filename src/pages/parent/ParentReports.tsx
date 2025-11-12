import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ensureParentDocument } from "@/services/firebase/parents.service";
import { getStudentsByParentId } from "@/services/firebase/students.service";
import { getGradesByStudent } from "@/services/firebase/grades.service";
import { format } from "date-fns";
import type { Grade, Student } from "@/types";

type ReportItem = {
  id: string;
  child: Student;
  title: string;
  date: Date;
  type: string;
  subject: string;
  teacherId: string;
  status: "Available" | "Archived";
  grade: Grade;
};

const formatReportType = (gradeType: Grade["type"]): string => {
  switch (gradeType) {
    case "Midterm":
      return "Midterm";
    case "Final":
      return "Final";
    case "Assignment":
      return "Assignment";
    case "Quiz":
      return "Quiz";
    case "Project":
      return "Project";
    default:
      return "Assessment";
  }
};

const buildReportTitle = (grade: Grade): string => {
  const typeLabel = formatReportType(grade.type);
  return `${grade.subject} • ${typeLabel}`;
};

const ParentReports = () => {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);

  useEffect(() => {
    const loadReports = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const parentRecord = await ensureParentDocument({
          uid: currentUser.uid,
          email: currentUser.email || "",
          displayName: userData?.displayName || currentUser.displayName,
        });

        if (!parentRecord) {
          setReports([]);
          setLoading(false);
          return;
        }

        const studentList = await getStudentsByParentId(parentRecord.id);

        const reportItems = await Promise.all(
          studentList.map(async (student) => {
            const grades = await getGradesByStudent(student.id);
            return grades.map((grade) => ({
              id: `${student.id}-${grade.id}`,
              child: student,
              title: buildReportTitle(grade),
              date: grade.date,
              type: formatReportType(grade.type),
              subject: grade.subject,
              teacherId: grade.teacherId,
              status: "Available" as const,
              grade,
            }));
          })
        );

        const flatReports = reportItems.flat();
        flatReports.sort((a, b) => b.date.getTime() - a.date.getTime());

        setReports(flatReports);
      } catch (error) {
        console.error("❌ Error loading parent reports:", error);
        toast({
          title: "Error",
          description: "Failed to load reports. Please try again.",
          variant: "destructive",
        });
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [currentUser, userData, toast]);

  const header = useMemo(
    () => (
      <div>
        <h2 className="text-3xl font-bold">Grades & Reports</h2>
        <p className="text-muted-foreground">View and download academic reports</p>
      </div>
    ),
    []
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading reports...</span>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No reports are available yet. Once teachers publish grades, they will appear here automatically.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{report.child.name}</p>
                  </div>
                </div>
                <Badge>{report.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium">{report.subject}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{report.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{format(report.date, "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Score:</span>
                <span className="font-medium">
                  {report.grade.score}/{report.grade.maxScore} ({report.grade.percentage?.toFixed(1) ?? "—"}%)
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1">
                  View Details
                </Button>
                <Button variant="hero" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ParentReports;
