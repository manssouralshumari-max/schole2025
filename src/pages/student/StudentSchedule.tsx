import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getSchedulesByStudent } from "@/services/firebase/schedules.service";
import { getStudentById } from "@/services/firebase/students.service";
import type { Schedule, Student } from "@/types";

type DaySchedule = {
  day: Schedule["day"];
  entries: Schedule[];
};

const dayOrder: Schedule["day"][] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const StudentSchedule = () => {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [studentRecord, setStudentRecord] = useState<Student | null>(null);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const studentDocument = await getStudentById(currentUser.uid);

        if (!studentDocument) {
          setSchedules([]);
          setStudentRecord(null);
          setLoading(false);
          return;
        }

        setStudentRecord(studentDocument);
        const studentSchedules = await getSchedulesByStudent(studentDocument.id);
        studentSchedules.sort((a, b) => {
          const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          return a.time.localeCompare(b.time);
        });
        setSchedules(studentSchedules);
      } catch (error) {
        console.error("❌ Error loading student schedule:", error);
        toast({
          title: "Error",
          description: "Failed to load weekly schedule. Please try again.",
          variant: "destructive",
        });
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [currentUser, userData, toast]);

  const groupedSchedule = useMemo(() => {
    const map = new Map<Schedule["day"], Schedule[]>();
    schedules.forEach((schedule) => {
      const dayEntries = map.get(schedule.day) || [];
      dayEntries.push(schedule);
      map.set(schedule.day, dayEntries);
    });
    return Array.from(map.entries())
      .sort((a, b) => dayOrder.indexOf(a[0]) - dayOrder.indexOf(b[0]))
      .map(([day, entries]) => ({ day, entries } as DaySchedule));
  }, [schedules]);

  const header = (
    <div>
      <h2 className="text-3xl font-bold">My Weekly Schedule</h2>
      <p className="text-muted-foreground">View your class timetable for the week</p>
      {studentRecord && (
        <p className="text-sm text-muted-foreground mt-1">
          {studentRecord.name} • Grade {studentRecord.grade}
        </p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading schedule...</span>
        </div>
      </div>
    );
  }

  if (groupedSchedule.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No schedule found for this account. Please contact the school administration if this seems incorrect.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="space-y-6">
        {groupedSchedule.map((daySchedule) => (
          <Card key={daySchedule.day}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="default">{daySchedule.day}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {daySchedule.entries.map((classItem) => (
                  <div
                    key={classItem.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{classItem.time}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{classItem.subject}</h4>
                      {classItem.teacher && (
                        <p className="text-sm text-muted-foreground">{classItem.teacher}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{classItem.room || "TBD"}</span>
                      </div>
                    </div>
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

export default StudentSchedule;
