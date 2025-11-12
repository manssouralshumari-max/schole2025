import { useState, useEffect, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Calendar, BookOpen, Loader2, UploadCloud, FileText, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToClassesByTeacher, updateClassCurriculum } from "@/services/firebase/classes.service";
import { uploadCurriculumFile, deleteFileByPath, getAllStudents, getEnrollmentsByClass } from "@/services/firebase";
import { ensureTeacherDocument } from "@/services/firebase/teachers.service";
import type { Class, Student } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TeacherClasses = () => {
  const { currentUser, userData } = useAuth();
  const [myClasses, setMyClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherDocId, setTeacherDocId] = useState<string | null>(null);
  const [isCurriculumDialogOpen, setIsCurriculumDialogOpen] = useState(false);
  const [curriculumDialogClassId, setCurriculumDialogClassId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isStudentsDialogOpen, setIsStudentsDialogOpen] = useState(false);
  const [studentsDialogClass, setStudentsDialogClass] = useState<Class | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Array<{ student: Student; enrolledAt?: Date }>>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsLoadError, setStudentsLoadError] = useState<string | null>(null);
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
          setMyClasses([]);
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

  useEffect(() => {
    if (!teacherDocId) {
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToClassesByTeacher(
      teacherDocId,
      (classes) => {
        setMyClasses(classes);
        setLoading(false);
      },
      (error: any) => {
        console.error("❌ Error in teacher classes subscription:", error);
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to load classes. Please try again.",
          variant: "destructive",
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [teacherDocId, toast]);

  const handleOpenCurriculumDialog = (classId: string) => {
    setCurriculumDialogClassId(classId);
    setSelectedFile(null);
    setUploadError(null);
    setIsCurriculumDialogOpen(true);
  };

  const handleCloseCurriculumDialog = () => {
    setIsCurriculumDialogOpen(false);
    setCurriculumDialogClassId(null);
    setSelectedFile(null);
    setUploadError(null);
    setUploading(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleViewCurriculum = (url?: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleUploadCurriculum = async () => {
    if (!curriculumDialogClassId || !selectedFile) {
      setUploadError("Please select a PDF file to upload.");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setUploadError("Only PDF files are supported.");
      return;
    }

    const classItem = myClasses.find((cls) => cls.id === curriculumDialogClassId);
    if (!classItem) {
      setUploadError("Unable to find the selected class.");
      return;
    }

    try {
      setUploading(true);
      const { downloadUrl, storagePath } = await uploadCurriculumFile(selectedFile, classItem.id);

      await updateClassCurriculum(classItem.id, {
        curriculumUrl: downloadUrl,
        curriculumFileName: selectedFile.name,
        curriculumStoragePath: storagePath,
        curriculumUpdatedAt: new Date(),
      });

      if (classItem.curriculumStoragePath) {
        try {
          await deleteFileByPath(classItem.curriculumStoragePath);
        } catch (deleteError) {
          console.warn("Failed to delete previous curriculum file:", deleteError);
        }
      }

      toast({
        title: "Success",
        description: "Curriculum uploaded successfully.",
      });

      handleCloseCurriculumDialog();
    } catch (error: any) {
      console.error("❌ Error uploading curriculum:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to upload curriculum. Please try again.",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  const handleOpenStudentsDialog = async (classItem: Class) => {
    setStudentsDialogClass(classItem);
    setIsStudentsDialogOpen(true);
    setEnrolledStudents([]);
    setStudentsLoadError(null);
    setStudentsLoading(true);

    try {
      const [enrollments, students] = await Promise.all([
        getEnrollmentsByClass(classItem.id),
        getAllStudents(),
      ]);

      const enrollmentMap = enrollments
        .map((enrollment) => {
          const student = students.find((s) => s.id === enrollment.studentId);
          if (!student) return null;
          return {
            student,
            enrolledAt: enrollment.enrolledAt,
          };
        })
        .filter(Boolean) as Array<{ student: Student; enrolledAt?: Date }>;

      // Sort by enrollment date descending
      enrollmentMap.sort((a, b) => {
        const dateA = a.enrolledAt?.getTime() || 0;
        const dateB = b.enrolledAt?.getTime() || 0;
        return dateB - dateA;
      });

      setEnrolledStudents(enrollmentMap);
    } catch (error: any) {
      console.error("❌ Error loading students for class:", error);
      setStudentsLoadError("Failed to load student list. Please try again.");
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleCloseStudentsDialog = () => {
    setIsStudentsDialogOpen(false);
    setStudentsDialogClass(null);
    setEnrolledStudents([]);
    setStudentsLoadError(null);
    setStudentsLoading(false);
  };

  // Parse schedule to get next class time
  const getNextClass = (schedule: string): string => {
    if (!schedule) return "No schedule";
    
    try {
      // Parse schedule format: "Mon, Wed, Fri - 9:00 AM"
      const parts = schedule.split(" - ");
      if (parts.length >= 2) {
        const days = parts[0].split(", ");
        const time = parts[1];
        
        // Find next occurrence
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = new Date();
        const todayDayIndex = today.getDay();
        
        // Find the next day in the schedule
        for (let i = 0; i < 7; i++) {
          const checkDayIndex = (todayDayIndex + i) % 7;
          const checkDayName = dayNames[checkDayIndex];
          
          if (days.includes(checkDayName)) {
            if (i === 0) {
              return `Today, ${time}`;
            } else if (i === 1) {
              return `Tomorrow, ${time}`;
            } else {
              return `${checkDayName}, ${time}`;
            }
          }
        }
        
        return `${days[0]}, ${time}`;
      }
      
      return schedule;
    } catch (error) {
      return schedule;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">My Classes</h2>
          <p className="text-muted-foreground">Manage your teaching schedule and students</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ms-2 text-muted-foreground">Loading classes...</span>
        </div>
      </div>
    );
  }

  if (myClasses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">My Classes</h2>
          <p className="text-muted-foreground">Manage your teaching schedule and students</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No classes assigned yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact the administrator to assign classes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Classes</h2>
        <p className="text-muted-foreground">Manage your teaching schedule and students</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myClasses.map((classItem) => (
          <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{classItem.name}</CardTitle>
              <Badge variant="secondary">{classItem.grade}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{classItem.students} student{classItem.students !== 1 ? "s" : ""} enrolled</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{getNextClass(classItem.schedule)}</span>
              </div>
              {classItem.room && (
                <div className="text-sm text-muted-foreground">
                  Room: {classItem.room}
                </div>
              )}
              <div className="space-y-2 pt-2">
                {classItem.curriculumFileName ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="truncate" title={classItem.curriculumFileName}>
                      {classItem.curriculumFileName}
                    </span>
                    {classItem.curriculumUpdatedAt && (
                      <span>
                        • {format(classItem.curriculumUpdatedAt, "PP")}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No curriculum uploaded yet.
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  disabled={!classItem.curriculumUrl}
                  onClick={() => handleViewCurriculum(classItem.curriculumUrl)}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    View Curriculum
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleOpenCurriculumDialog(classItem.id)}
                >
                  <span className="flex items-center gap-2">
                    <UploadCloud className="h-4 w-4" />
                    Upload Curriculum
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleOpenStudentsDialog(classItem)}
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Student List
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={isCurriculumDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseCurriculumDialog();
          } else {
            setIsCurriculumDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Curriculum</DialogTitle>
            <DialogDescription>
              Upload a PDF file containing the syllabus or curriculum for this class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="curriculum-file">Select PDF file</Label>
              <Input
                id="curriculum-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Only PDF files are supported. Maximum size depends on your Firebase Storage plan.
              </p>
              {selectedFile && (
                <p className="text-sm">Selected: {selectedFile.name}</p>
              )}
              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCurriculumDialog} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUploadCurriculum} disabled={!selectedFile || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 ms-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isStudentsDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseStudentsDialog();
          } else {
            setIsStudentsDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {studentsDialogClass ? `Students • ${studentsDialogClass.name}` : "Students"}
            </DialogTitle>
            <DialogDescription>
              View the students enrolled in this class.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {studentsLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading students...</span>
              </div>
            ) : studentsLoadError ? (
              <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-md">
                {studentsLoadError}
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                No students are currently enrolled in this class.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {enrolledStudents.map(({ student, enrolledAt }) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Grade {student.grade} • {student.status}
                        {enrolledAt ? ` • Enrolled ${format(enrolledAt, "PP")}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseStudentsDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherClasses;
