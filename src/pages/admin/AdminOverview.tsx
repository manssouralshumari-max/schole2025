import { useState, useEffect } from "react";
import StatCard from "@/components/StatCard";
import { Users, GraduationCap, BookOpen, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllStudents } from "@/services/firebase/students.service";
import { getAllTeachers } from "@/services/firebase/teachers.service";
import { getAllClasses } from "@/services/firebase/classes.service";
import type { Student } from "@/types";
import { formatDistanceToNow } from "date-fns";

const AdminOverview = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    attendanceRate: 0,
  });
  const [recentEnrollments, setRecentEnrollments] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        // Load all data in parallel
        const [students, teachers, classes] = await Promise.all([
          getAllStudents(),
          getAllTeachers(),
          getAllClasses(),
        ]);

        // Calculate statistics
        const totalStudents = students.length;
        const totalTeachers = teachers.length;
        const totalClasses = classes.length;
        
        // Calculate attendance rate (placeholder - you can implement actual attendance logic later)
        // For now, we'll use a simple calculation based on active students
        const activeStudents = students.filter(s => s.status === "Active").length;
        const attendanceRate = totalStudents > 0 
          ? Math.round((activeStudents / totalStudents) * 100 * 10) / 10 
          : 0;

        // Get recent enrollments (last 5 students, sorted by createdAt)
        const recent = students
          .sort((a, b) => {
            const dateA = a.createdAt?.getTime() || 0;
            const dateB = b.createdAt?.getTime() || 0;
            return dateB - dateA;
          })
          .slice(0, 5);

        setStats({
          totalStudents,
          totalTeachers,
          totalClasses,
          attendanceRate,
        });
        setRecentEnrollments(recent);
      } catch (error) {
        console.error("Error loading statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return "Unknown";
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard Overview</h2>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 w-24 bg-muted rounded"></div>
                <div className="h-5 w-5 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded mb-2"></div>
                <div className="h-3 w-32 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Students"
            value={formatNumber(stats.totalStudents)}
            icon={<Users className="h-5 w-5" />}
            description={`${stats.totalStudents > 0 ? stats.totalStudents : "No"} student${stats.totalStudents !== 1 ? "s" : ""} enrolled`}
          />
          <StatCard
            title="Total Teachers"
            value={formatNumber(stats.totalTeachers)}
            icon={<GraduationCap className="h-5 w-5" />}
            description={`${stats.totalTeachers > 0 ? stats.totalTeachers : "No"} active teacher${stats.totalTeachers !== 1 ? "s" : ""}`}
          />
          <StatCard
            title="Classes"
            value={formatNumber(stats.totalClasses)}
            icon={<BookOpen className="h-5 w-5" />}
            description={`${stats.totalClasses > 0 ? stats.totalClasses : "No"} class${stats.totalClasses !== 1 ? "es" : ""} active`}
          />
          <StatCard
            title="Attendance Rate"
            value={`${stats.attendanceRate}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            description="Active students percentage"
          />
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentEnrollments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent enrollments
              </div>
            ) : (
              <div className="space-y-4">
                {recentEnrollments.map((student) => (
                  <div key={student.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.grade}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(student.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button className="w-full text-right p-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
              <p className="font-medium">Create Announcement</p>
              <p className="text-sm text-muted-foreground">Send message to all users</p>
            </button>
            <button className="w-full text-right p-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
              <p className="font-medium">Generate Reports</p>
              <p className="text-sm text-muted-foreground">View analytics and statistics</p>
            </button>
            <button className="w-full text-right p-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
              <p className="font-medium">Manage Schedule</p>
              <p className="text-sm text-muted-foreground">Update class timetables</p>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
