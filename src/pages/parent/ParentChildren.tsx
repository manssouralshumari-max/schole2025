import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ensureParentDocument,
} from "@/services/firebase/parents.service";
import { getStudentsByParentId } from "@/services/firebase/students.service";
import { getGradesByStudent } from "@/services/firebase/grades.service";
import { getEnrollmentsByStudent } from "@/services/firebase/enrollments.service";
import { getClassById } from "@/services/firebase/classes.service";
import { getSchedulesByStudent } from "@/services/firebase/schedules.service";
import { getFinancialAccountById } from "@/services/firebase/finance.service";
import type { Student, Grade, Schedule, Class } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Loader2, User, GraduationCap, BookOpen, CalendarDays, TrendingUp, Clock, MapPin, Wallet } from "lucide-react";

const currencyFormatters = new Map<string, Intl.NumberFormat>();

const formatCurrency = (value: number, currency = "SAR") => {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    );
  }

  return currencyFormatters.get(currency)!.format(value);
};

type ChildSummary = {
  student: Student;
  averageGrade: number | null;
  status: string;
  financial?: {
    totalTuition: number;
    totalPaid: number;
    monthlyInstallment: number;
    installmentCount: number;
    remaining: number;
  };
  classes: Array<{ id: string; name: string; grade?: string; teacherName?: string }>;
  nextClassLabel?: string;
  recentGradeLabel?: string;
};

const gradeStatus = (average: number | null): string => {
  if (average === null) return "No Data";
  if (average >= 90) return "Excellent";
  if (average >= 80) return "Good";
  if (average >= 70) return "Average";
  return "Needs Improvement";
};

const dayOrderMap: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const parseTime = (time: string) => {
  const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return { hours: 0, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
};

const computeNextClassLabel = (schedules: Schedule[]): string | undefined => {
  if (!schedules.length) return undefined;
  const now = new Date();
  const nextOccurrences = schedules
    .map((schedule) => {
      const dayIndex = dayOrderMap[schedule.day];
      if (dayIndex === undefined) return null;
      const { hours, minutes } = parseTime(schedule.time);
      const next = new Date(now);
      const diff = (dayIndex - now.getDay() + 7) % 7;
      next.setDate(now.getDate() + diff);
      next.setHours(hours, minutes, 0, 0);
      if (diff === 0 && next <= now) {
        next.setDate(next.getDate() + 7);
      }
      return { schedule, next };
    })
    .filter(Boolean) as Array<{ schedule: Schedule; next: Date }>;

  if (!nextOccurrences.length) return undefined;

  nextOccurrences.sort((a, b) => a.next.getTime() - b.next.getTime());
  const upcoming = nextOccurrences[0];
  return `${format(upcoming.next, "EEE, MMM d • p")} (${upcoming.schedule.subject})`;
};

const formatRecentGrade = (grade: Grade | null): string | undefined => {
  if (!grade) return undefined;
  const percentage = grade.percentage ?? (grade.maxScore ? (grade.score / grade.maxScore) * 100 : undefined);
  if (percentage === undefined) return undefined;
  return `${grade.type} • ${percentage.toFixed(1)}% (${format(grade.date, "MMM d")})`;
};

const ParentChildren = () => {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleDialogStudent, setScheduleDialogStudent] = useState<Student | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<Schedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    const loadChildren = async () => {
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
          setChildren([]);
          setLoading(false);
          return;
        }

        const studentList = await getStudentsByParentId(parentRecord.id);

        const summaries = await Promise.all(
          studentList.map(async (student) => {
            try {
              const [grades, enrollments, schedules, financialAccount] = await Promise.all([
                getGradesByStudent(student.id),
                getEnrollmentsByStudent(student.id),
                getSchedulesByStudent(student.id),
                getFinancialAccountById(student.id),
              ]);

              const classInfos = await Promise.all(
                enrollments.map(async (enrollment) => {
                  try {
                    const classDoc = await getClassById(enrollment.classId);
                    return classDoc;
                  } catch (error) {
                    console.warn("Failed to load class info:", error);
                    return null;
                  }
                })
              );

              const classes = classInfos
                .filter((cls): cls is Class => Boolean(cls))
                .map((cls) => ({
                  id: cls.id,
                  name: cls.name,
                  grade: cls.grade,
                  teacherName: cls.teacherName,
                }));

              const percentages = grades
                .map((grade) => grade.percentage ?? (grade.maxScore ? (grade.score / grade.maxScore) * 100 : undefined))
                .filter((value): value is number => value !== undefined);

              const averageGrade = percentages.length
                ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length
                : null;

              const sortedGrades = [...grades].sort((a, b) => b.date.getTime() - a.date.getTime());
              const recentGradeLabel = formatRecentGrade(sortedGrades[0] ?? null);
              const nextClassLabel = computeNextClassLabel(schedules);

              const financial = financialAccount
                ? {
                    totalTuition: financialAccount.totalTuition,
                    totalPaid: financialAccount.totalPaid,
                    monthlyInstallment: financialAccount.monthlyInstallment,
                    installmentCount: financialAccount.installmentCount,
                    remaining: Math.max(financialAccount.totalTuition - financialAccount.totalPaid, 0),
                  }
                : undefined;

              return {
                student,
                averageGrade,
                status: gradeStatus(averageGrade),
                financial,
                classes,
                nextClassLabel,
                recentGradeLabel,
              } satisfies ChildSummary;
            } catch (error) {
              console.error("❌ Error loading data for student:", student.id, error);
              return {
                student,
                averageGrade: null,
                status: "No Data",
                classes: [],
              } satisfies ChildSummary;
            }
          })
        );

        setChildren(summaries);
      } catch (error) {
        console.error("❌ Error loading parent children:", error);
        toast({
          title: "Error",
          description: "Failed to load children information. Please try again.",
          variant: "destructive",
        });
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, [currentUser, userData, toast]);

  const handleViewGrades = (studentId: string) => {
    navigate(`/dashboard/parent/reports?studentId=${studentId}`);
  };

  const handleViewSchedule = async (student: Student) => {
    setScheduleDialogStudent(student);
    setScheduleEntries([]);
    setScheduleError(null);
    setIsScheduleDialogOpen(true);
    setScheduleLoading(true);

    try {
      const entries = await getSchedulesByStudent(student.id);
      entries.sort((a, b) => {
        const dayDiff = dayOrderMap[a.day] - dayOrderMap[b.day];
        if (dayDiff !== 0) return dayDiff;
        return a.time.localeCompare(b.time);
      });
      setScheduleEntries(entries);
    } catch (error) {
      console.error("❌ Error loading schedule for student:", student.id, error);
      setScheduleError("Failed to load schedule. Please try again.");
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleCloseScheduleDialog = () => {
    setIsScheduleDialogOpen(false);
    setScheduleDialogStudent(null);
    setScheduleEntries([]);
    setScheduleError(null);
    setScheduleLoading(false);
  };

  const scheduleGrouped = useMemo(() => {
    if (!scheduleEntries.length) return [] as Array<{ day: Schedule["day"]; entries: Schedule[] }>;

    const map = new Map<Schedule["day"], Schedule[]>();
    scheduleEntries.forEach((entry) => {
      const list = map.get(entry.day) || [];
      list.push(entry);
      map.set(entry.day, list);
    });

    return Array.from(map.entries())
      .sort((a, b) => dayOrderMap[a[0]] - dayOrderMap[b[0]])
      .map(([day, entries]) => ({
        day,
        entries: entries.sort((a, b) => a.time.localeCompare(b.time)),
      }));
  }, [scheduleEntries]);

  const header = (
    <div>
      <h2 className="text-3xl font-bold">My Children</h2>
      <p className="text-muted-foreground">Monitor your children's academic progress</p>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading children...</span>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No children are linked to this account yet. Please contact the school administration for assistance.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {children.map(({ student, averageGrade, status, financial, classes, nextClassLabel, recentGradeLabel }) => (
          <Card key={student.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl">{student.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{student.grade}</Badge>
                    <Badge variant={status === "Excellent" ? "default" : status === "Needs Improvement" ? "destructive" : "outline"}>
                      {status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-sm">Average Grade</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {averageGrade !== null ? `${averageGrade.toFixed(1)}%` : "No grades yet"}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm">Classes Enrolled</span>
                  </div>
                  <div className="text-2xl font-bold">{classes.length}</div>
                  {classes.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {classes.slice(0, 3).map((cls) => (
                        <li key={cls.id}>
                          {cls.name}
                          {cls.teacherName ? ` • ${cls.teacherName}` : ""}
                        </li>
                      ))}
                      {classes.length > 3 && <li>+{classes.length - 3} more</li>}
                    </ul>
                  )}
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Wallet className="h-4 w-4" />
                    <span className="text-sm">Tuition Overview</span>
                  </div>
                  {financial ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-semibold">{formatCurrency(financial.totalTuition)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(financial.totalPaid)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className="font-semibold text-amber-600">
                          {formatCurrency(financial.remaining)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span>
                          {financial.installmentCount} دفعات • {formatCurrency(financial.monthlyInstallment)} شهريًا
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No billing information available.</p>
                  )}
                </div>
              </div>

              {nextClassLabel && (
                <div className="p-3 rounded-lg bg-secondary/50 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-secondary-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Next Class</p>
                    <p className="text-sm font-medium">{nextClassLabel}</p>
                  </div>
                </div>
              )}

              {recentGradeLabel && (
                <div className="p-3 rounded-lg bg-secondary/50 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-secondary-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Most Recent Grade</p>
                    <p className="text-sm font-medium">{recentGradeLabel}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleViewGrades(student.id)}>
                  View Grades
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleViewSchedule(student)}>
                  View Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={isScheduleDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseScheduleDialog();
          } else {
            setIsScheduleDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {scheduleDialogStudent ? `${scheduleDialogStudent.name} • Weekly Schedule` : "Weekly Schedule"}
            </DialogTitle>
            <DialogDescription>
              View the upcoming classes for this student.
            </DialogDescription>
          </DialogHeader>

          {scheduleLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading schedule...</span>
            </div>
          ) : scheduleError ? (
            <div className="py-10 text-center text-destructive bg-destructive/10 rounded-md">
              {scheduleError}
            </div>
          ) : scheduleGrouped.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No schedule entries found for this student.
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {scheduleGrouped.map(({ day, entries }) => (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Badge variant="default">{day}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-sm">{entry.time}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{entry.subject}</p>
                          {entry.teacher && (
                            <p className="text-xs text-muted-foreground">{entry.teacher}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{entry.room || "TBD"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseScheduleDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentChildren;
