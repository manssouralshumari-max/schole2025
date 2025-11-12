import { useState, useEffect } from "react";
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
import { subscribeToTeachers, updateTeacher, deleteTeacher } from "@/services/firebase";
import { createTeacherAccount } from "@/services/admin";
import type { Teacher } from "@/types";

const AdminTeachers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteTeacherId, setDeleteTeacherId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

  // Real-time listener for teachers
  useEffect(() => {
    console.log("🔄 Setting up real-time listener for teachers...");
    setLoading(true);

    const unsubscribe = subscribeToTeachers(
      (teachersData) => {
        setTeachers(teachersData);
        setLoading(false);
        console.log(`✅ Real-time update: ${teachersData.length} teachers loaded`);
      },
      (error: any) => {
        console.error("❌ Error in real-time listener:", error);
        setLoading(false);
        
        let errorMessage = "Failed to load teachers. Please try again.";
        
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
      console.log("🛑 Cleaning up real-time listener for teachers...");
      unsubscribe();
    };
  }, [toast]);

  // Note: loadTeachers function removed - Real-time listener handles all updates

  // Filter teachers based on search query
  const filteredTeachers = teachers.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher({ ...teacher });
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTeacher) return;

    try {
      setSaving(true);
      setFormError(null);

      const isEditing = editingTeacher.id && teachers.find((t) => t.id === editingTeacher.id);

      if (isEditing && editingTeacher.id) {
        await updateTeacher(editingTeacher.id, {
          name: editingTeacher.name,
          email: editingTeacher.email,
          subject: editingTeacher.subject,
          status: editingTeacher.status as "Active" | "On Leave" | "Inactive",
        });
        toast({
          title: "Success",
          description: "Teacher updated successfully",
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

        await createTeacherAccount({
          name: editingTeacher.name,
          email: editingTeacher.email,
          subject: editingTeacher.subject,
          status: editingTeacher.status as "Active" | "On Leave" | "Inactive",
          password,
        });
        toast({
          title: "Success",
          description: "Teacher account created successfully",
        });
      }

      setIsEditDialogOpen(false);
      setEditingTeacher(null);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error saving teacher:", error);
      const rawMessage = error instanceof Error ? error.message : "Failed to save teacher. Please try again.";
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
    setDeleteTeacherId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTeacherId) return;

    try {
      await deleteTeacher(deleteTeacherId);
      toast({
        title: "Success",
        description: "Teacher deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeleteTeacherId(null);
          // Real-time listener will automatically update the list
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast({
        title: "Error",
        description: "Failed to delete teacher. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddTeacher = () => {
    const newTeacher: Teacher = {
      id: "",
      name: "",
      email: "",
      subject: "",
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEditingTeacher(newTeacher);
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Manage Teachers</h2>
          <p className="text-muted-foreground">View and manage all teacher records</p>
        </div>
        <Button variant="hero" onClick={handleAddTeacher}>
          <Plus className="h-4 w-4 ms-2" />
          Add Teacher
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher List</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teachers..."
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
              <span className="ms-2 text-muted-foreground">Loading teachers...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-start">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No teachers found matching your search." : "No teachers found. Add your first teacher!"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>{teacher.subject}</TableCell>
                      <TableCell>
                        <Badge variant={teacher.status === "Active" ? "default" : "secondary"}>
                          {teacher.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-start space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(teacher)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(teacher.id)}>
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

      {/* Edit/Add Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeacher?.id && teachers.find((t) => t.id === editingTeacher.id) ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
            <DialogDescription>
              {editingTeacher?.id && teachers.find((t) => t.id === editingTeacher.id)
                ? "Update the teacher information below."
                : "Enter the new teacher information below."}
            </DialogDescription>
          </DialogHeader>
          {editingTeacher && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingTeacher.name}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  placeholder="Teacher name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingTeacher.email}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                  placeholder="teacher@school.edu"
                    disabled={Boolean(editingTeacher.id)}
                />
                  {editingTeacher.id && (
                    <p className="text-xs text-muted-foreground">
                      Email changes must be handled from Firebase Authentication.
                    </p>
                  )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={editingTeacher.subject}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, subject: e.target.value })}
                  placeholder="Subject"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={editingTeacher.status}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, status: e.target.value as "Active" | "On Leave" | "Inactive" })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
                {!editingTeacher.id && (
                  <>
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
              This action cannot be undone. This will permanently delete the teacher record.
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

export default AdminTeachers;
