import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Users, Clock, Edit, Trash2, Loader2, CalendarIcon, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { subscribeToClasses, addClass, updateClass, deleteClass, getAllTeachers, createSchedulesFromAllClasses, getAllStudents, getEnrollmentsByClass, addEnrollment, deleteEnrollment } from "@/services/firebase";
import type { Class, Teacher, Student, Enrollment } from "@/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const AdminClasses = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingSchedules, setCreatingSchedules] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [enrollmentsDialogClassId, setEnrollmentsDialogClassId] = useState<string | null>(null);
  const [isEnrollmentsDialogOpen, setIsEnrollmentsDialogOpen] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [addingEnrollment, setAddingEnrollment] = useState(false);
  const { toast } = useToast();
  
  // Schedule state
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState<string>("");

  // Load teachers
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        setLoadingTeachers(true);
        const teachersData = await getAllTeachers();
        setTeachers(teachersData);
      } catch (error) {
        console.error("Error loading teachers:", error);
        toast({
          title: "Error",
          description: "Failed to load teachers. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingTeachers(false);
      }
    };

    loadTeachers();
  }, [toast]);

  // Load students
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoadingStudents(true);
        const studentsData = await getAllStudents();
        setStudents(studentsData);
      } catch (error) {
        console.error("Error loading students:", error);
        toast({
          title: "Error",
          description: "Failed to load students. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [toast]);

  // Load enrollments when dialog opens
  useEffect(() => {
    const loadEnrollments = async () => {
      if (!enrollmentsDialogClassId) return;

      try {
        setLoadingEnrollments(true);
        const enrollmentsData = await getEnrollmentsByClass(enrollmentsDialogClassId);
        setEnrollments(enrollmentsData);
      } catch (error) {
        console.error("Error loading enrollments:", error);
        toast({
          title: "Error",
          description: "Failed to load enrollments. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingEnrollments(false);
      }
    };

    if (isEnrollmentsDialogOpen) {
      loadEnrollments();
    }
  }, [enrollmentsDialogClassId, isEnrollmentsDialogOpen, toast]);

  // Get unique subjects from teachers
  const getUniqueSubjects = (): string[] => {
    const subjects = teachers
      .map((teacher) => teacher.subject)
      .filter((subject): subject is string => !!subject && subject.trim() !== "");
    return Array.from(new Set(subjects)).sort();
  };

  // Get teachers by subject
  const getTeachersBySubject = (subject: string): Teacher[] => {
    return teachers.filter((teacher) => teacher.subject === subject && teacher.status === "Active");
  };

  // Real-time listener for classes
  useEffect(() => {
    console.log("🔄 Setting up real-time listener for classes...");
    setLoading(true);

    const unsubscribe = subscribeToClasses(
      (classesData) => {
        setClasses(classesData);
        setLoading(false);
        console.log(`✅ Real-time update: ${classesData.length} classes loaded`);
      },
      (error: any) => {
        console.error("❌ Error in real-time listener:", error);
        setLoading(false);
        
        let errorMessage = "Failed to load classes. Please try again.";
        
        if (error.code === "permission-denied") {
          errorMessage = "Permission denied. Please check Firestore Security Rules.";
        } else if (error.code === "failed-precondition") {
          errorMessage = "Index required. Please create a single-field index in Firestore Console.";
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log("🛑 Cleaning up real-time listener for classes...");
      unsubscribe();
    };
  }, [toast]);

  // Note: loadClasses function removed - Real-time listener handles all updates

  const handleEdit = (classItem: Class) => {
    setEditingClass({ ...classItem });
    // Parse existing schedule to extract days and times
    const scheduleParts = classItem.schedule.split(" - ");
    if (scheduleParts.length >= 2) {
      const daysPart = scheduleParts[0];
      const timePart = scheduleParts[1];
      
      // Parse days (e.g., "Mon, Wed, Fri")
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const days = daysPart.split(", ").map(day => dayNames.indexOf(day.trim()));
      const today = new Date();
      const selectedDates = days
        .filter(dayIndex => dayIndex !== -1)
        .map(dayIndex => {
          const date = new Date(today);
          const currentDay = today.getDay();
          const diff = dayIndex - currentDay;
          date.setDate(today.getDate() + diff);
          return date;
        });
      setSelectedDays(selectedDates);
      
      // Parse time (e.g., "9:00 AM")
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (timeMatch && timeMatch.length >= 1) {
        const startTimeStr = timeMatch[0];
        
        // Convert to 24-hour format for input[type="time"]
        const convertTo24Hour = (time12h: string): string => {
          const [time, period] = time12h.split(/\s*(AM|PM)/i);
          const [hours, minutes] = time.split(":");
          let hour24 = parseInt(hours);
          if (period?.toUpperCase() === "PM" && hour24 !== 12) hour24 += 12;
          if (period?.toUpperCase() === "AM" && hour24 === 12) hour24 = 0;
          return `${hour24.toString().padStart(2, "0")}:${minutes}`;
        };
        
        setStartTime(convertTo24Hour(startTimeStr));
      }
    }
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingClass) return;

    // Validate required fields
    if (!editingClass.name || !editingClass.grade || !editingClass.teacherId || !editingClass.teacherName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Subject, Grade, and Teacher).",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const isEditing = editingClass.id && classes.find((c) => c.id === editingClass.id);

      if (isEditing && editingClass.id) {
        // Update existing class
        const updateData: any = {
          name: editingClass.name,
          grade: editingClass.grade,
          teacherId: editingClass.teacherId,
          teacherName: editingClass.teacherName,
          students: editingClass.students,
          schedule: editingClass.schedule,
        };
        
        // Only add optional fields if they exist
        if (editingClass.room !== undefined) {
          updateData.room = editingClass.room || null;
        }
        if (editingClass.capacity !== undefined) {
          updateData.capacity = editingClass.capacity || null;
        }
        
        await updateClass(editingClass.id, updateData);
        toast({
          title: "Success",
          description: "Class updated successfully",
        });
      } else {
        // Add new class
        const classData: any = {
          name: editingClass.name,
          grade: editingClass.grade,
          teacherId: editingClass.teacherId,
          teacherName: editingClass.teacherName,
          students: editingClass.students,
          schedule: editingClass.schedule,
        };
        
        // Only add optional fields if they exist
        if (editingClass.room !== undefined && editingClass.room !== null && editingClass.room !== "") {
          classData.room = editingClass.room;
        }
        if (editingClass.capacity !== undefined && editingClass.capacity !== null) {
          classData.capacity = editingClass.capacity;
        }
        
        await addClass(classData);
        toast({
          title: "Success",
          description: "Class added successfully",
        });
      }

      setIsEditDialogOpen(false);
      setEditingClass(null);
      // Real-time listener will automatically update the list
    } catch (error) {
      console.error("Error saving class:", error);
      toast({
        title: "Error",
        description: "Failed to save class. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteClassId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateSchedules = async () => {
    try {
      setCreatingSchedules(true);
      await createSchedulesFromAllClasses();
      toast({
        title: "Success",
        description: "Schedules created successfully from all classes.",
      });
    } catch (error: any) {
      console.error("Error creating schedules:", error);
      toast({
        title: "Error",
        description: "Failed to create schedules. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingSchedules(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteClassId) return;

    try {
      await deleteClass(deleteClassId);
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeleteClassId(null);
      // Real-time listener will automatically update the list
    } catch (error) {
      console.error("Error deleting class:", error);
      toast({
        title: "Error",
        description: "Failed to delete class. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManageEnrollments = (classId: string) => {
    setEnrollmentsDialogClassId(classId);
    setIsEnrollmentsDialogOpen(true);
    setSelectedStudentId("");
  };

  const handleAddEnrollment = async () => {
    if (!enrollmentsDialogClassId || !selectedStudentId) {
      toast({
        title: "Error",
        description: "Please select a student.",
        variant: "destructive",
      });
      return;
    }

    // Check if student is already enrolled
    const existingEnrollment = enrollments.find(
      (e) => e.studentId === selectedStudentId && e.status === "Active"
    );
    if (existingEnrollment) {
      toast({
        title: "Error",
        description: "Student is already enrolled in this class.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingEnrollment(true);
      await addEnrollment({
        studentId: selectedStudentId,
        classId: enrollmentsDialogClassId,
        enrolledAt: new Date(),
        status: "Active",
      });
      
      toast({
        title: "Success",
        description: "Student enrolled successfully.",
      });
      
      // Reload enrollments
      const enrollmentsData = await getEnrollmentsByClass(enrollmentsDialogClassId);
      setEnrollments(enrollmentsData);
      
      // Update class student count
      const classItem = classes.find((c) => c.id === enrollmentsDialogClassId);
      if (classItem) {
        await updateClass(enrollmentsDialogClassId, {
          students: enrollmentsData.length,
        });
      }
      
      // Recreate schedules to include new student
      if (classItem) {
        try {
          const { createSchedulesFromClass } = await import("@/services/firebase/schedules.service");
          await createSchedulesFromClass(classItem);
        } catch (scheduleError: any) {
          console.warn("⚠️ Failed to recreate schedules:", scheduleError);
        }
      }
      
      setSelectedStudentId("");
    } catch (error: any) {
      console.error("Error adding enrollment:", error);
      toast({
        title: "Error",
        description: "Failed to enroll student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingEnrollment(false);
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string, studentId: string) => {
    try {
      setAddingEnrollment(true);
      await deleteEnrollment(enrollmentId);
      
      toast({
        title: "Success",
        description: "Student removed from class successfully.",
      });
      
      // Reload enrollments
      const enrollmentsData = await getEnrollmentsByClass(enrollmentsDialogClassId!);
      setEnrollments(enrollmentsData);
      
      // Update class student count
      const classItem = classes.find((c) => c.id === enrollmentsDialogClassId);
      if (classItem) {
        await updateClass(enrollmentsDialogClassId!, {
          students: enrollmentsData.length,
        });
      }
      
      // Recreate schedules to remove student
      if (classItem) {
        try {
          const { createSchedulesFromClass } = await import("@/services/firebase/schedules.service");
          await createSchedulesFromClass(classItem);
        } catch (scheduleError: any) {
          console.warn("⚠️ Failed to recreate schedules:", scheduleError);
        }
      }
    } catch (error: any) {
      console.error("Error removing enrollment:", error);
      toast({
        title: "Error",
        description: "Failed to remove student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingEnrollment(false);
    }
  };

  // Get enrolled student IDs
  const enrolledStudentIds = enrollments.map((e) => e.studentId);
  
  // Get available students (not enrolled)
  const availableStudents = students.filter((s) => !enrolledStudentIds.includes(s.id));
  
  // Get enrolled students with details
  const enrolledStudentsWithDetails = enrollments.map((enrollment) => {
    const student = students.find((s) => s.id === enrollment.studentId);
    return {
      enrollment,
      student,
    };
  }).filter((item) => item.student);

  const handleAddClass = () => {
    const newClass: Class = {
      id: "",
      name: "",
      grade: "",
      teacherId: "",
      teacherName: "",
      students: 0,
      schedule: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEditingClass(newClass);
    setSelectedDays([]);
    setStartTime("");
    setIsEditDialogOpen(true);
  };

  const handleSubjectChange = (subject: string) => {
    if (!editingClass) return;
    // Clear teacher selection when subject changes
    setEditingClass({ ...editingClass, name: subject, teacherId: "", teacherName: "" });
  };

  const handleTeacherChange = (teacherId: string) => {
    if (!editingClass) return;
    const selectedTeacher = teachers.find((t) => t.id === teacherId);
    if (selectedTeacher) {
      setEditingClass({
        ...editingClass,
        teacherId: selectedTeacher.id,
        teacherName: selectedTeacher.name,
      });
    }
  };

  // Format schedule from selected days and times
  const formatSchedule = (): string => {
    if (selectedDays.length === 0) return "";
    
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = selectedDays
      .map(date => dayNames[date.getDay()])
      .sort((a, b) => dayNames.indexOf(a) - dayNames.indexOf(b))
      .join(", ");
    
    if (!startTime) return days;
    
    // Convert 24-hour to 12-hour format
    const convertTo12Hour = (time24: string): string => {
      const [hours, minutes] = time24.split(":");
      const hour24 = parseInt(hours);
      const hour12 = hour24 % 12 || 12;
      const period = hour24 >= 12 ? "PM" : "AM";
      return `${hour12}:${minutes} ${period}`;
    };
    
    const startTime12 = convertTo12Hour(startTime);
    
    return `${days} - ${startTime12}`;
  };

  // Update schedule when days or times change
  useEffect(() => {
    if (editingClass) {
      const schedule = formatSchedule();
      setEditingClass({ ...editingClass, schedule });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays, startTime]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Manage Classes</h2>
          <p className="text-muted-foreground">View and manage all classes and subjects</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCreateSchedules}
            disabled={creatingSchedules || classes.length === 0}
          >
            {creatingSchedules ? (
              <>
                <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CalendarIcon className="h-4 w-4 ms-2" />
                Create Schedules
              </>
            )}
          </Button>
          <Button variant="hero" onClick={handleAddClass}>
            <Plus className="h-4 w-4 ms-2" />
          Add Class
        </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ms-2 text-muted-foreground">Loading classes...</span>
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No classes found. Add your first class!</p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem) => (
          <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{classItem.name}</CardTitle>
                  <Badge variant="secondary" className="mt-2">{classItem.grade}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Teacher</p>
                  <p className="font-medium">{classItem.teacherName}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{classItem.students} students</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{classItem.schedule}</span>
              </div>
              <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => handleManageEnrollments(classItem.id)}
                  >
                    <UserPlus className="h-4 w-4 ms-1" />
                    Students
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(classItem)}>
                    <Edit className="h-4 w-4 ms-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDelete(classItem.id)}>
                    <Trash2 className="h-4 w-4 ms-1" />
                    Delete
                  </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Edit/Add Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass?.id && classes.find((c) => c.id === editingClass.id) ? "Edit Class" : "Add Class"}</DialogTitle>
            <DialogDescription>
              {editingClass?.id && classes.find((c) => c.id === editingClass.id)
                ? "Update the class information below."
                : "Enter the new class information below."}
            </DialogDescription>
          </DialogHeader>
          {editingClass && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject (المادة)</Label>
                <Select
                  value={editingClass.name}
                  onValueChange={handleSubjectChange}
                  disabled={loadingTeachers}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {getUniqueSubjects().map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingTeachers && (
                  <p className="text-xs text-muted-foreground">Loading subjects...</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={editingClass.grade}
                  onChange={(e) => setEditingClass({ ...editingClass, grade: e.target.value })}
                  placeholder="Grade 9"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teacherName">Teacher Name</Label>
                <Select
                  value={editingClass.teacherId}
                  onValueChange={handleTeacherChange}
                  disabled={loadingTeachers || !editingClass.name}
                >
                  <SelectTrigger id="teacherName">
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {editingClass.name
                      ? getTeachersBySubject(editingClass.name).map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name} ({teacher.subject})
                          </SelectItem>
                        ))
                      : teachers
                          .filter((t) => t.status === "Active")
                          .map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.name} ({teacher.subject})
                            </SelectItem>
                          ))}
                  </SelectContent>
                </Select>
                {!editingClass.name && (
                  <p className="text-xs text-muted-foreground">Please select a subject first</p>
                )}
                {editingClass.name && getTeachersBySubject(editingClass.name).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No active teachers found for this subject
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="students">Number of Students</Label>
                <Input
                  id="students"
                  type="number"
                  value={editingClass.students}
                  onChange={(e) => setEditingClass({ ...editingClass, students: parseInt(e.target.value) || 0 })}
                  placeholder="28"
                />
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Days of Week (أيام الأسبوع)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-end text-right font-normal",
                          !selectedDays.length && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="ms-2 h-4 w-4" />
                        {selectedDays.length > 0 ? (
                          `${selectedDays.length} day${selectedDays.length > 1 ? "s" : ""} selected`
                        ) : (
                          <span>Select days</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={selectedDays}
                        onSelect={setSelectedDays}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {selectedDays.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedDays.map((date, index) => {
                        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                        return (
                          <Badge key={index} variant="secondary">
                            {dayNames[date.getDay()]}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="startTime">Time (الوقت)</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                {editingClass.schedule && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Schedule Preview:</p>
                    <p className="text-sm text-muted-foreground">{editingClass.schedule}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="hero" onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the class record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enrollments Management Dialog */}
      <Dialog open={isEnrollmentsDialogOpen} onOpenChange={setIsEnrollmentsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Enrollments</DialogTitle>
            <DialogDescription>
              {enrollmentsDialogClassId && (
                <>
                  {(() => {
                    const classItem = classes.find((c) => c.id === enrollmentsDialogClassId);
                    return classItem ? `${classItem.name} - Grade ${classItem.grade}` : "";
                  })()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add Student Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Add Student to Class</h3>
              <div className="flex gap-2">
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingStudents ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : availableStudents.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        No available students
                      </div>
                    ) : (
                      availableStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} - Grade {student.grade}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddEnrollment}
                  disabled={!selectedStudentId || addingEnrollment || availableStudents.length === 0}
                >
                  {addingEnrollment ? (
                    <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 ms-2" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Enrolled Students List */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Enrolled Students ({enrollments.length})</h3>
              {loadingEnrollments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ms-2 text-muted-foreground">Loading students...</span>
                </div>
              ) : enrolledStudentsWithDetails.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No students enrolled in this class yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {enrolledStudentsWithDetails.map(({ enrollment, student }) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{student?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Grade {student?.grade} • Enrolled {enrollment.enrolledAt.toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveEnrollment(enrollment.id, enrollment.studentId)}
                        disabled={addingEnrollment}
                      >
                        {addingEnrollment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserMinus className="h-4 w-4 ms-2" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEnrollmentsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClasses;
