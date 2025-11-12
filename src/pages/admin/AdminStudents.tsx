import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { subscribeToStudents, updateStudent, deleteStudent, subscribeToParents } from "@/services/firebase";
import { createStudentAccount } from "@/services/admin";
import type { Student, Parent } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminStudents = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [parents, setParents] = useState<Parent[]>([]);
  const [parentsLoading, setParentsLoading] = useState(true);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [tuitionTotal, setTuitionTotal] = useState("");
  const [monthlyInstallment, setMonthlyInstallment] = useState("");
  const { toast } = useToast();

  const parentsById = useMemo(() => {
    const map = new Map<string, Parent>();
    parents.forEach((parent) => {
      map.set(parent.id, parent);
    });
    return map;
  }, [parents]);

  // Real-time listener for students
  useEffect(() => {
    console.log("🔄 Setting up real-time listener for students...");
    setLoading(true);

    const unsubscribe = subscribeToStudents(
      (studentsData) => {
        setStudents(studentsData);
        setLoading(false);
        console.log(`✅ Real-time update: ${studentsData.length} students loaded`);
      },
      (error: any) => {
        console.error("❌ Error in real-time listener:", error);
        setLoading(false);
        
        let errorMessage = "Failed to load students. Please try again.";
        
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
      console.log("🛑 Cleaning up real-time listener for students...");
      unsubscribe();
    };
  }, [toast]);

  useEffect(() => {
    setParentsLoading(true);
    const unsubscribe = subscribeToParents(
      (parentsData) => {
        setParents(parentsData);
        setParentsLoading(false);
      },
      (error: any) => {
        console.error("❌ Error loading parents:", error);
        setParentsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load parents list. Please try again.",
          variant: "destructive",
        });
      }
    );

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!isEditDialogOpen) {
      setTuitionTotal("");
      setMonthlyInstallment("");
    }
  }, [isEditDialogOpen]);

  // Filter students based on search query
  const filteredStudents = students.filter((student) => {
    const parent = student.parentId ? parentsById.get(student.parentId) : undefined;
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.grade.toLowerCase().includes(query) ||
      (parent?.name?.toLowerCase().includes(query) ?? false) ||
      (parent?.phone?.toLowerCase().includes(query) ?? false)
    );
  });

  const handleEdit = (student: Student) => {
    setEditingStudent({ ...student });
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
    setSelectedParentId(student.parentId || "");
    setTuitionTotal("");
    setMonthlyInstallment("");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;

    try {
      setSaving(true);
      setFormError(null);

      const isEditing = editingStudent.id && students.find((s) => s.id === editingStudent.id);

      if (isEditing && editingStudent.id) {
        await updateStudent(editingStudent.id, {
          name: editingStudent.name,
          email: editingStudent.email,
          grade: editingStudent.grade,
          status: editingStudent.status as "Active" | "Inactive" | "Graduated",
          parentId: selectedParentId || null,
        });
        toast({
          title: "Success",
          description: "Student updated successfully",
        });
      } else {
        if (!password || !confirmPassword) {
          setFormError("Please provide a password and confirm it.");
          setSaving(false);
          return;
        }

        if (password !== confirmPassword) {
          setFormError("Passwords do not match.");
          setSaving(false);
          return;
        }

        if (password.length < 6) {
          setFormError("Password must be at least 6 characters.");
          setSaving(false);
          return;
        }

        const hasTuition = tuitionTotal.trim() !== "";
        const hasMonthly = monthlyInstallment.trim() !== "";

        if (hasTuition !== hasMonthly) {
          setFormError("Please provide both total tuition and monthly installment, or leave both blank.");
          setSaving(false);
          return;
        }

        let tuitionNumber: number | undefined;
        let monthlyNumber: number | undefined;

        if (hasTuition && hasMonthly) {
          tuitionNumber = Number(tuitionTotal);
          monthlyNumber = Number(monthlyInstallment);

          if (!Number.isFinite(tuitionNumber) || tuitionNumber <= 0) {
            setFormError("Total tuition must be a positive number.");
            setSaving(false);
            return;
          }

          if (!Number.isFinite(monthlyNumber) || monthlyNumber <= 0) {
            setFormError("Monthly installment must be a positive number.");
            setSaving(false);
            return;
          }
        }

        const newStudentUid = await createStudentAccount({
          name: editingStudent.name,
          email: editingStudent.email,
          grade: editingStudent.grade,
          status: editingStudent.status as "Active" | "Inactive" | "Graduated",
          password,
          parentId: selectedParentId || undefined,
          tuitionTotal: tuitionNumber,
          monthlyInstallment: monthlyNumber,
        });

        if (selectedParentId) {
          try {
            await updateStudent(newStudentUid, {
              parentId: selectedParentId,
            });
          } catch (linkError) {
            console.warn("Failed to link parent after creating student:", linkError);
          }
        }
        toast({
          title: "Success",
          description: "Student account created successfully",
        });
      }

      setIsEditDialogOpen(false);
      setEditingStudent(null);
      setPassword("");
      setConfirmPassword("");
      setSelectedParentId("");
      setTuitionTotal("");
      setMonthlyInstallment("");
    } catch (error: any) {
      console.error("❌ Error saving student:", error);

      const rawMessage =
        error?.message ||
        (error.code === "permission-denied"
          ? "Permission denied. Please check Firestore Security Rules."
          : "Failed to save student. Please try again.");

      const friendlyMessage = rawMessage === "EMAIL_EXISTS" ? "Email is already in use." : rawMessage;

      toast({
        title: "Error",
        description: friendlyMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteStudentId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteStudentId) return;

    try {
      await deleteStudent(deleteStudentId);
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeleteStudentId(null);
      // Real-time listener will automatically update the list
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        title: "Error",
        description: "Failed to delete student. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddStudent = () => {
    const newStudent: Student = {
      id: "",
      name: "",
      email: "",
      grade: "",
      status: "Active",
      parentId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEditingStudent(newStudent);
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
    setSelectedParentId("");
    setTuitionTotal("");
    setMonthlyInstallment("");
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Manage Students</h2>
          <p className="text-muted-foreground">View and manage all student records</p>
        </div>
        <Button variant="hero" onClick={handleAddStudent}>
          <Plus className="h-4 w-4 ms-2" />
          Add Student
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ms-2 text-muted-foreground">Loading students...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="text-start">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No students found matching your search." : "No students found. Add your first student!"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.grade}</TableCell>
                      <TableCell>
                        <Badge variant={student.status === "Active" ? "default" : "secondary"}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const parent = student.parentId ? parentsById.get(student.parentId) : undefined;
                          if (!parent) {
                            return <span className="text-xs text-muted-foreground">—</span>;
                          }
                          return (
                            <div>
                              <p className="font-medium leading-tight">{parent.name}</p>
                              {parent.phone && (
                                <p className="text-xs text-muted-foreground">{parent.phone}</p>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-start space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(student)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(student.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent?.id && students.find((s) => s.id === editingStudent.id) ? "Edit Student" : "Add Student"}</DialogTitle>
            <DialogDescription>
              {editingStudent?.id && students.find((s) => s.id === editingStudent.id)
                ? "Update the student information below."
                : "Enter the new student information below."}
            </DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  placeholder="Student name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  placeholder="student@school.edu"
                  disabled={Boolean(editingStudent.id)}
                />
                {editingStudent.id && (
                  <p className="text-xs text-muted-foreground">
                    Email changes must be updated directly in Firebase Authentication.
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={editingStudent.grade}
                  onChange={(e) => setEditingStudent({ ...editingStudent, grade: e.target.value })}
                  placeholder="Grade 9"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={editingStudent.status}
                  onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as "Active" | "Inactive" | "Graduated" })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Graduated">Graduated</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent">Parent</Label>
                {parentsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading parents...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedParentId || "none"}
                    onValueChange={(value) => setSelectedParentId(value === "none" ? "" : value)}
                  >
                    <SelectTrigger id="parent">
                      <SelectValue placeholder="Select a parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent</SelectItem>
                      {parents.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.name}
                          {parent.phone ? ` • ${parent.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!parentsLoading && parents.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No parents available. Add a parent first to enable linking.
                  </p>
                )}
              </div>
                {!editingStudent.id && (
                  <>
                  <div className="grid gap-2">
                    <Label htmlFor="tuition-total">Total Tuition (optional)</Label>
                    <Input
                      id="tuition-total"
                      type="number"
                      min={0}
                      value={tuitionTotal}
                      onChange={(e) => setTuitionTotal(e.target.value)}
                      placeholder="Example: 18000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="monthly-installment">Monthly Installment (optional)</Label>
                    <Input
                      id="monthly-installment"
                      type="number"
                      min={0}
                      value={monthlyInstallment}
                      onChange={(e) => setMonthlyInstallment(e.target.value)}
                      placeholder="Example: 1500"
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide both fields to create a financial account automatically, or leave both blank.
                    </p>
                  </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Temporary Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                      />
                    </div>
                  </>
                )}
                {formError && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {formError}
                  </div>
                )}
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
              This action cannot be undone. This will permanently delete the student record.
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
    </div>
  );
};

export default AdminStudents;
