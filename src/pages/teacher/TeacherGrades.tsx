import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getClassesByTeacher } from "@/services/firebase/classes.service";
import { getAllStudents } from "@/services/firebase/students.service";
import { getGradesByClass, addGrade, updateGrade } from "@/services/firebase/grades.service";
import { getEnrollmentsByClass } from "@/services/firebase/enrollments.service";
import { ensureTeacherDocument } from "@/services/firebase/teachers.service";
import type { Class, Student, Grade } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface StudentGradeData {
  studentId: string;
  studentName: string;
  midterm?: Grade;
  final?: Grade;
  average: number;
  status: string;
}

const TeacherGrades = () => {
  const { currentUser, userData } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentGrades, setStudentGrades] = useState<Map<string, StudentGradeData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gradeInputs, setGradeInputs] = useState<Map<string, { midterm: string; final: string }>>(new Map());
  const [teacherDocId, setTeacherDocId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const resolveTeacherDocument = async () => {
      if (!currentUser || !userData) {
        setLoading(false);
        return;
      }

      if (!currentUser.email) {
        console.warn("⚠️ Current user email is missing. Cannot resolve teacher document.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const teacherRecord = await ensureTeacherDocument({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: userData?.displayName || currentUser.displayName,
        });

        if (!isMounted) return;

        if (!teacherRecord) {
          setClasses([]);
          setTeacherDocId(null);
          setLoading(false);
          return;
        }

        setTeacherDocId(teacherRecord.id);
        setLoading(false);
      } catch (error) {
        console.error("❌ Error resolving teacher document:", error);
        setTeacherDocId(null);
        toast({
          title: "Error",
          description: "Failed to load teacher profile. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    resolveTeacherDocument();

    return () => {
      isMounted = false;
    };
  }, [currentUser, userData, toast]);

  // Load classes for the teacher once the teacher document is resolved
  useEffect(() => {
    const loadClasses = async () => {
      if (!currentUser || !teacherDocId) {
        return;
      }

      try {
        setLoading(true);
        console.log("📥 Loading classes for teacher document:", teacherDocId);
        const teacherClasses = await getClassesByTeacher(teacherDocId);
        setClasses(teacherClasses);
        console.log(`✅ Loaded ${teacherClasses.length} classes for teacher`);
        
        if (teacherClasses.length > 0) {
          setSelectedClassId((prev) => prev || teacherClasses[0].id);
        } else {
          setSelectedClassId("");
        }
      } catch (error: any) {
        console.error("❌ Error loading classes:", error);
        toast({
          title: "Error",
          description: "Failed to load classes. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, [currentUser, teacherDocId, toast]);

  // Load students and grades when class is selected
  useEffect(() => {
    const loadStudentsAndGrades = async () => {
      if (!selectedClassId) return;

      try {
        setLoading(true);
        console.log("📥 Loading students and grades for class:", selectedClassId);
        
        // Load enrollments for this class to get enrolled students
        const enrollments = await getEnrollmentsByClass(selectedClassId);
        console.log(`✅ Loaded ${enrollments.length} enrollments for class`);
        
        // Get student IDs from enrollments
        const enrolledStudentIds = enrollments.map((e) => e.studentId);
        
        // Load all students and filter by enrolled students
        const allStudents = await getAllStudents();
        const enrolledStudents = allStudents.filter((s) => enrolledStudentIds.includes(s.id));
        setStudents(enrolledStudents);
        console.log(`✅ Filtered ${enrolledStudents.length} enrolled students`);
        
        // Load grades for this class
        const grades = await getGradesByClass(selectedClassId);
        console.log(`✅ Loaded ${grades.length} grades for class`);
        
        // Organize grades by student (only for enrolled students)
        const gradesMap = new Map<string, StudentGradeData>();
        const inputsMap = new Map<string, { midterm: string; final: string }>();
        
        enrolledStudents.forEach((student) => {
          const studentGradesForClass = grades.filter((g) => g.studentId === student.id);
          
          const midterm = studentGradesForClass.find((g) => g.type === "Midterm");
          const final = studentGradesForClass.find((g) => g.type === "Final");
          
          // Calculate average
          let average = 0;
          const gradeCount = [midterm, final].filter(Boolean).length;
          if (gradeCount > 0) {
            const total = (midterm?.percentage || 0) + (final?.percentage || 0);
            average = total / Math.max(gradeCount, 2); // If only one grade exists, divide by 2
          }
          
          // Determine status
          let status = "Needs Improvement";
          if (average >= 90) status = "Excellent";
          else if (average >= 80) status = "Good";
          else if (average >= 70) status = "Average";
          
          gradesMap.set(student.id, {
            studentId: student.id,
            studentName: student.name,
            midterm,
            final,
            average,
            status,
          });

          inputsMap.set(student.id, {
            midterm: midterm?.score?.toString() || "",
            final: final?.score?.toString() || "",
          });
        });
        
        setStudentGrades(gradesMap);
        setGradeInputs(inputsMap);
        console.log(`✅ Organized grades for ${gradesMap.size} students`);
      } catch (error: any) {
        console.error("❌ Error loading students and grades:", error);
        toast({
          title: "Error",
          description: "Failed to load students and grades. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadStudentsAndGrades();
  }, [selectedClassId, toast]);

  const handleGradeChange = (studentId: string, type: "midterm" | "final", value: string) => {
    setGradeInputs((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(studentId) || { midterm: "", final: "" };
      newMap.set(studentId, { ...current, [type]: value });
      return newMap;
    });
  };

  const handleSaveGrade = async (studentId: string, type: "Midterm" | "Final") => {
    if (!selectedClassId || !currentUser) return;

    const student = students.find((s) => s.id === studentId);
    const selectedClass = classes.find((c) => c.id === selectedClassId);
    if (!student || !selectedClass) return;

    const inputs = gradeInputs.get(studentId);
    if (!inputs) return;

    const scoreValue = type === "Midterm" ? parseFloat(inputs.midterm) : parseFloat(inputs.final);
    if (isNaN(scoreValue) || scoreValue < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid grade.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const maxScore = 100; // Default max score
      const percentage = (scoreValue / maxScore) * 100;

      const studentGradeData = studentGrades.get(studentId);
      const existingGrade = type === "Midterm" ? studentGradeData?.midterm : studentGradeData?.final;

      if (existingGrade) {
        // Update existing grade
        await updateGrade(existingGrade.id, {
          score: scoreValue,
          maxScore,
          percentage,
          date: new Date(),
        });
        toast({
          title: "Success",
          description: `${type} grade updated successfully.`,
        });
      } else {
        // Add new grade
        await addGrade({
          studentId: student.id,
          classId: selectedClass.id,
          subject: selectedClass.name,
          teacherId: currentUser.uid,
          score: scoreValue,
          maxScore,
          percentage,
          type,
          date: new Date(),
        });
        toast({
          title: "Success",
          description: `${type} grade added successfully.`,
        });
      }

      // Reload grades
      const grades = await getGradesByClass(selectedClassId);
      const gradesMap = new Map<string, StudentGradeData>();
      
      students.forEach((s) => {
        const studentGradesForClass = grades.filter((g) => g.studentId === s.id);
        const midterm = studentGradesForClass.find((g) => g.type === "Midterm");
        const final = studentGradesForClass.find((g) => g.type === "Final");
        
        let average = 0;
        const gradeCount = [midterm, final].filter(Boolean).length;
        if (gradeCount > 0) {
          const total = (midterm?.percentage || 0) + (final?.percentage || 0);
          average = total / Math.max(gradeCount, 2);
        }
        
        let status = "Needs Improvement";
        if (average >= 90) status = "Excellent";
        else if (average >= 80) status = "Good";
        else if (average >= 70) status = "Average";
        
        gradesMap.set(s.id, {
          studentId: s.id,
          studentName: s.name,
          midterm,
          final,
          average,
          status,
        });
      });
      
      setStudentGrades(gradesMap);
    } catch (error: any) {
      console.error("❌ Error saving grade:", error);
      toast({
        title: "Error",
        description: "Failed to save grade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Excellent":
        return "default";
      case "Good":
        return "secondary";
      case "Average":
        return "outline";
      default:
        return "destructive";
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  if (loading && classes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Student Grades</h2>
          <p className="text-muted-foreground">Manage and update student grades</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ms-2 text-muted-foreground">Loading classes...</span>
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Student Grades</h2>
          <p className="text-muted-foreground">Manage and update student grades</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No classes assigned. Please contact an administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Student Grades</h2>
        <p className="text-muted-foreground">Manage and update student grades</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {selectedClass ? `${selectedClass.name} - Grade ${selectedClass.grade}` : "Select a Class"}
            </CardTitle>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.name} - Grade {classItem.grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ms-2 text-muted-foreground">Loading students and grades...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No students found for this class.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Midterm</TableHead>
                  <TableHead>Final</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(studentGrades.values()).map((studentGrade) => {
                  const inputs = gradeInputs.get(studentGrade.studentId) || { midterm: "", final: "" };
                  return (
                    <TableRow key={studentGrade.studentId}>
                      <TableCell className="font-medium">{studentGrade.studentName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={inputs.midterm}
                          onChange={(e) => handleGradeChange(studentGrade.studentId, "midterm", e.target.value)}
                          className="w-20"
                          min="0"
                          max="100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={inputs.final}
                          onChange={(e) => handleGradeChange(studentGrade.studentId, "final", e.target.value)}
                          className="w-20"
                          min="0"
                          max="100"
                        />
                      </TableCell>
                      <TableCell className="font-semibold">{studentGrade.average.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(studentGrade.status)}>
                          {studentGrade.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="hero"
                            size="sm"
                            onClick={() => handleSaveGrade(studentGrade.studentId, "Midterm")}
                            disabled={saving || !inputs.midterm}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="h-4 w-4 ms-2" />
                                Save Midterm
                              </>
                            )}
                          </Button>
                          <Button
                            variant="hero"
                            size="sm"
                            onClick={() => handleSaveGrade(studentGrade.studentId, "Final")}
                            disabled={saving || !inputs.final}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="h-4 w-4 ms-2" />
                                Save Final
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherGrades;
