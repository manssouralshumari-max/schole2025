import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import {
  subscribeToParents,
  updateParent,
  deleteParent,
  subscribeToStudents,
  updateStudent,
  getAllStudents,
  createFinancialAccount,
  updateFinancialAccount,
  getFinancialAccountById,
} from "@/services/firebase";
import { createParentAccount } from "@/services/admin";
import type { Parent, Student } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";

const AdminParents = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteParentId, setDeleteParentId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedChildrenIds, setSelectedChildrenIds] = useState<string[]>([]);
  const [tuitionTotal, setTuitionTotal] = useState("");
  const [monthlyInstallment, setMonthlyInstallment] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToParents(
      (data) => {
        setParents(data);
        setLoading(false);
      },
      (error: any) => {
        console.error("❌ Error loading parents:", error);
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to load parents. Please try again.",
          variant: "destructive",
        });
      }
    );

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    setStudentsLoading(true);
    const unsubscribe = subscribeToStudents(
      (studentsData) => {
        setStudents(studentsData);
        setStudentsLoading(false);
      },
      (error: any) => {
        console.error("❌ Error loading students for parents module:", error);
        setStudentsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load students list.",
          variant: "destructive",
        });
      }
    );

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (editingParent && !studentsLoading) {
      const linkedStudents = students
        .filter((student) => student.parentId === editingParent.id)
        .map((student) => student.id);
      setSelectedChildrenIds(linkedStudents);
    }
  }, [editingParent, students, studentsLoading]);

  const handleParentDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingParent(null);
      setPassword("");
      setConfirmPassword("");
      setFormError(null);
      setSelectedChildrenIds([]);
      setTuitionTotal("");
      setMonthlyInstallment("");
    }
    setIsEditDialogOpen(open);
  };

  const filteredParents = parents.filter((parent) =>
    parent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (parent.phone || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (parent: Parent) => {
    setEditingParent({ ...parent });
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
    const linkedStudents = students.filter((student) => student.parentId === parent.id).map((student) => student.id);
    setSelectedChildrenIds(linkedStudents);
    setTuitionTotal("");
    setMonthlyInstallment("");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingParent) return;

    try {
      setSaving(true);
      setFormError(null);
      const isEditing = editingParent.id && parents.find((p) => p.id === editingParent.id);

      const trimmedPhone = (editingParent.phone || "").trim();

      if (!trimmedPhone) {
        setFormError("Phone number is required.");
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

      let financialDetails: { total: number; monthly: number; installmentCount: number } | null = null;

      if (hasTuition && hasMonthly) {
        const totalNumber = Number(tuitionTotal);
        const monthlyNumber = Number(monthlyInstallment);

        if (!Number.isFinite(totalNumber) || totalNumber <= 0) {
          setFormError("Total tuition must be a positive number.");
          setSaving(false);
          return;
        }

        if (!Number.isFinite(monthlyNumber) || monthlyNumber <= 0) {
          setFormError("Monthly installment must be a positive number.");
          setSaving(false);
          return;
        }

        financialDetails = {
          total: totalNumber,
          monthly: monthlyNumber,
          installmentCount: Math.max(1, Math.ceil(totalNumber / monthlyNumber)),
        };
      }

      if (isEditing && editingParent.id) {
        await updateParent(editingParent.id, {
          name: editingParent.name,
          email: editingParent.email,
          phone: trimmedPhone,
          childrenIds: selectedChildrenIds,
        });
        await syncParentChildren(editingParent.id, selectedChildrenIds);
        if (financialDetails && selectedChildrenIds.length > 0) {
          await applyFinancialDetailsToChildren(selectedChildrenIds, editingParent.name, financialDetails);
        }
        toast({
          title: "Success",
          description: "Parent updated successfully",
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

        const newParentUid = await createParentAccount({
          name: editingParent.name,
          email: editingParent.email,
          phone: trimmedPhone,
          password,
        });
        await updateParent(newParentUid, {
          phone: trimmedPhone,
          childrenIds: selectedChildrenIds,
        });
        await syncParentChildren(newParentUid, selectedChildrenIds);
        if (financialDetails && selectedChildrenIds.length > 0) {
          await applyFinancialDetailsToChildren(selectedChildrenIds, editingParent.name, financialDetails);
        }
        toast({
          title: "Success",
          description: "Parent account created successfully",
        });
      }

      setIsEditDialogOpen(false);
      setEditingParent(null);
      setPassword("");
      setConfirmPassword("");
      setSelectedChildrenIds([]);
      setTuitionTotal("");
      setMonthlyInstallment("");
    } catch (error) {
      console.error("❌ Error saving parent:", error);
      const rawMessage = error instanceof Error ? error.message : "Failed to save parent.";
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
    setDeleteParentId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteParentId) return;

    try {
      await deleteParent(deleteParentId);
      toast({
        title: "Success",
        description: "Parent deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeleteParentId(null);
    } catch (error) {
      console.error("Error deleting parent:", error);
      toast({
        title: "Error",
        description: "Failed to delete parent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddParent = () => {
    const newParent: Parent = {
      id: "",
      name: "",
      email: "",
      phone: "",
      childrenIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEditingParent(newParent);
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
    setSelectedChildrenIds([]);
    setTuitionTotal("");
    setMonthlyInstallment("");
    setIsEditDialogOpen(true);
  };

  const syncParentChildren = async (parentId: string, childIds: string[]) => {
    const affectedParentIds = new Set<string>();
    affectedParentIds.add(parentId);

    const updatePromises: Promise<unknown>[] = [];

    students.forEach((student) => {
      const shouldLink = childIds.includes(student.id);
      const currentlyLinkedToParent = student.parentId === parentId;

      if (shouldLink && !currentlyLinkedToParent) {
        updatePromises.push(updateStudent(student.id, { parentId }));
        if (student.parentId) {
          affectedParentIds.add(student.parentId);
        }
      } else if (!shouldLink && currentlyLinkedToParent) {
        updatePromises.push(updateStudent(student.id, { parentId: null }));
      }
    });

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    const latestStudents = await getAllStudents();
    const childrenMap = new Map<string, string[]>();

    latestStudents.forEach((student) => {
      if (student.parentId) {
        const arr = childrenMap.get(student.parentId) || [];
        arr.push(student.id);
        childrenMap.set(student.parentId, arr);
      }
    });

    const parentUpdates: Promise<unknown>[] = [];
    affectedParentIds.forEach((id) => {
      parentUpdates.push(
        updateParent(id, {
          childrenIds: childrenMap.get(id) || [],
        })
      );
    });

    if (parentUpdates.length > 0) {
      await Promise.all(parentUpdates);
    }
  };

  const applyFinancialDetailsToChildren = async (
    childrenIds: string[],
    parentName: string,
    details: { total: number; monthly: number; installmentCount: number }
  ) => {
    if (childrenIds.length === 0) return;

    const planStartDate = new Date();
    const nextDueDate = new Date(planStartDate);

    await Promise.all(
      childrenIds.map(async (childId) => {
        const student = students.find((s) => s.id === childId);
        if (!student) {
          return;
        }

        const existing = await getFinancialAccountById(childId);

        if (existing) {
          await updateFinancialAccount(childId, {
            totalTuition: details.total,
            monthlyInstallment: details.monthly,
            installmentCount: details.installmentCount,
            nextDueDate,
            currency: existing.currency || "SAR",
            notes: `Updated via parent ${parentName}`,
          });
        } else {
          await createFinancialAccount({
            id: childId,
            studentId: childId,
            studentName: student.name,
            grade: student.grade,
            currency: "SAR",
            totalTuition: details.total,
            monthlyInstallment: details.monthly,
            installmentCount: details.installmentCount,
            planStartDate,
            nextDueDate,
            notes: `Created via parent ${parentName}`,
            totalPaid: 0,
          });
        }
      })
    );
  };

  const handleToggleChild = (studentId: string, checked: boolean | "indeterminate") => {
    setSelectedChildrenIds((prev) => {
      if (checked) {
        if (prev.includes(studentId)) return prev;
        return [...prev, studentId];
      }
      return prev.filter((id) => id !== studentId);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Manage Parents</h2>
          <p className="text-muted-foreground">Control parent accounts and their linked students</p>
        </div>
        <Button variant="hero" onClick={handleAddParent}>
          <Plus className="h-4 w-4 ms-2" />
          Add Parent
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parent List</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parents..."
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
              <span className="ms-2 text-muted-foreground">Loading parents...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Children Linked</TableHead>
                  <TableHead className="text-start">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No parents found matching your search." : "No parents found. Add your first parent!"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParents.map((parent) => (
                    <TableRow key={parent.id}>
                      <TableCell className="font-medium">{parent.name}</TableCell>
                      <TableCell>{parent.email}</TableCell>
                      <TableCell>{parent.phone || "—"}</TableCell>
                      <TableCell>{parent.childrenIds?.length || 0}</TableCell>
                      <TableCell className="text-start space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(parent)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(parent.id)}>
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

      <Dialog open={isEditDialogOpen} onOpenChange={handleParentDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingParent?.id ? "Edit Parent" : "Add Parent"}</DialogTitle>
            <DialogDescription>
              {editingParent?.id
                ? "Update the parent information below."
                : "Enter the parent information below to create an account."}
            </DialogDescription>
          </DialogHeader>
          {editingParent && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="parent-name">Name</Label>
                <Input
                  id="parent-name"
                  value={editingParent.name}
                  onChange={(e) => setEditingParent({ ...editingParent, name: e.target.value })}
                  placeholder="Parent name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent-email">Email</Label>
                <Input
                  id="parent-email"
                  type="email"
                  value={editingParent.email}
                  onChange={(e) => setEditingParent({ ...editingParent, email: e.target.value })}
                  placeholder="parent@school.edu"
                  disabled={Boolean(editingParent.id)}
                />
                {editingParent.id && (
                  <p className="text-xs text-muted-foreground">
                    Email changes must be updated directly in Firebase Authentication.
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent-phone">Phone</Label>
                <Input
                  id="parent-phone"
                  type="tel"
                  value={editingParent.phone || ""}
                  onChange={(e) => setEditingParent({ ...editingParent, phone: e.target.value })}
                  placeholder="Parent phone number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent-tuition">Total Tuition for Selected Students (optional)</Label>
                <Input
                  id="parent-tuition"
                  type="number"
                  min={0}
                  value={tuitionTotal}
                  onChange={(e) => setTuitionTotal(e.target.value)}
                  placeholder="Example: 18000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent-monthly">Monthly Installment (optional)</Label>
                <Input
                  id="parent-monthly"
                  type="number"
                  min={0}
                  value={monthlyInstallment}
                  onChange={(e) => setMonthlyInstallment(e.target.value)}
                  placeholder="Example: 1500"
                />
                <p className="text-xs text-muted-foreground">
                  Provide both fields to create or update financial accounts for the selected students.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Linked Students</Label>
                {studentsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading students...</span>
                  </div>
                ) : students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No students available. Add students first, then link them to this parent.
                  </p>
                ) : (
                  <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
                    {students.map((student) => {
                      const checked = selectedChildrenIds.includes(student.id);
                      const linkedParent = student.parentId
                        ? parents.find((parent) => parent.id === student.parentId)
                        : undefined;
                      const assignedToOther = Boolean(
                        linkedParent && editingParent?.id && linkedParent.id !== editingParent.id
                      );

                      return (
                        <div key={student.id} className="flex items-start gap-2 p-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => handleToggleChild(student.id, value)}
                          />
                          <div className="flex-1">
                            <p className="font-medium leading-none">{student.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Grade {student.grade} • {student.status}
                              {assignedToOther && linkedParent
                                ? ` • Currently linked to ${linkedParent.name}`
                                : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Selecting a student will link them to this parent. They will be unlinked from any previous parent.
                </p>
              </div>
              {!editingParent.id && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="parent-password">Temporary Password</Label>
                    <Input
                      id="parent-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parent-confirm-password">Confirm Password</Label>
                    <Input
                      id="parent-confirm-password"
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
              ) : editingParent?.id ? (
                "Save"
              ) : (
                "Create Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the parent record.
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

export default AdminParents;


