import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Loader2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  subscribeToAccountants,
  updateAccountant,
  deleteAccountant,
} from "@/services/firebase/accountants.service";
import { createAccountantAccount } from "@/services/admin";
import type { Accountant } from "@/types";
import { format } from "date-fns";

interface AccountantFormState {
  name: string;
  nationalId: string;
  qualification: string;
  startDate: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const defaultFormState: AccountantFormState = {
  name: "",
  nationalId: "",
  qualification: "",
  startDate: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const AdminAccountants = () => {
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAccountant, setSelectedAccountant] = useState<Accountant | null>(null);
  const [formState, setFormState] = useState<AccountantFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAccountants(
      (data) => {
        setAccountants(data);
        setLoading(false);
      },
      (error: any) => {
        console.error("❌ Error in accountants listener:", error);
        setLoading(false);

        let errorMessage = "Failed to load accountants. Please try again.";
        if (error.code === "permission-denied") {
          errorMessage = "Permission denied. Please check Firestore Security Rules.";
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [toast]);

  const filteredAccountants = useMemo(() => {
    if (!searchQuery) return accountants;
    const query = searchQuery.toLowerCase();
    return accountants.filter(
      (accountant) =>
        accountant.name.toLowerCase().includes(query) ||
        accountant.email.toLowerCase().includes(query) ||
        accountant.nationalId.toLowerCase().includes(query)
    );
  }, [accountants, searchQuery]);

  const handleOpenDialogForNew = () => {
    setSelectedAccountant(null);
    setFormState({
      name: "",
      nationalId: "",
      qualification: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      email: "",
      password: "",
      confirmPassword: "",
    });
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleOpenDialogForEdit = (accountant: Accountant) => {
    setSelectedAccountant(accountant);
    setFormState({
      name: accountant.name,
      nationalId: accountant.nationalId,
      qualification: accountant.qualification,
      startDate: accountant.startDate ? format(accountant.startDate, "yyyy-MM-dd") : "",
      email: accountant.email,
      password: "",
      confirmPassword: "",
    });
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAccountant(null);
    setFormState(defaultFormState);
    setFormError(null);
    setSaving(false);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setFormError(null);

      if (!formState.name.trim()) {
        setFormError("الرجاء إدخال اسم المحاسب.");
        setSaving(false);
        return;
      }

      if (!formState.nationalId.trim()) {
        setFormError("الرجاء إدخال رقم الهوية.");
        setSaving(false);
        return;
      }

      if (!formState.qualification.trim()) {
        setFormError("الرجاء إدخال المؤهل العلمي.");
        setSaving(false);
        return;
      }

      if (!formState.startDate) {
        setFormError("الرجاء تحديد تاريخ المباشرة.");
        setSaving(false);
        return;
      }

      if (selectedAccountant) {
        await updateAccountant(selectedAccountant.id, {
          name: formState.name.trim(),
          nationalId: formState.nationalId.trim(),
          qualification: formState.qualification.trim(),
          startDate: new Date(formState.startDate),
        });

        toast({
          title: "تم التحديث",
          description: "تم تحديث بيانات المحاسب بنجاح.",
        });
      } else {
        if (!formState.email.trim()) {
          setFormError("الرجاء إدخال البريد الإلكتروني.");
          setSaving(false);
          return;
        }

        if (!formState.password.trim()) {
          setFormError("الرجاء إدخال كلمة المرور.");
          setSaving(false);
          return;
        }

        if (formState.password !== formState.confirmPassword) {
          setFormError("كلمتا المرور غير متطابقتين.");
          setSaving(false);
          return;
        }

        if (formState.password.length < 6) {
          setFormError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
          setSaving(false);
          return;
        }

        await createAccountantAccount({
          name: formState.name.trim(),
          email: formState.email.trim().toLowerCase(),
          password: formState.password,
          nationalId: formState.nationalId.trim(),
          qualification: formState.qualification.trim(),
          startDate: new Date(formState.startDate),
        });

        toast({
          title: "تم الإنشاء",
          description: "تم إنشاء حساب المحاسب الجديد بنجاح.",
        });
      }

      handleCloseDialog();
    } catch (error: any) {
      console.error("❌ Error saving accountant:", error);
      const message =
        error?.message || "فشل حفظ بيانات المحاسب. الرجاء المحاولة مرة أخرى أو مراجعة السجلات.";
      setFormError(message);
      toast({
        title: "خطأ",
        description: message,
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  const handleConfirmDelete = (accountant: Accountant) => {
    setSelectedAccountant(accountant);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedAccountant) return;
    try {
      setDeleteLoading(true);
      await deleteAccountant(selectedAccountant.id);
      toast({
        title: "تم الحذف",
        description: "تم حذف حساب المحاسب.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedAccountant(null);
    } catch (error: any) {
      console.error("❌ Error deleting accountant:", error);
      toast({
        title: "خطأ",
        description: error?.message || "فشل حذف المحاسب.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">إدارة المحاسبين</h2>
          <p className="text-muted-foreground text-sm">
            قم بإدارة حسابات المحاسبين ومتابعة بياناتهم الأساسية.
          </p>
        </div>
        <Button onClick={handleOpenDialogForNew} className="flex items-center gap-2 flex-row-reverse">
          <Plus className="h-4 w-4" />
          إضافة محاسب جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>قائمة المحاسبين</span>
            <Badge variant="secondary" className="flex items-center gap-2 flex-row-reverse">
              <Wallet className="h-4 w-4" />
              <span>{accountants.length}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md ms-auto">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث بالاسم، البريد أو رقم الهوية..."
              className="pe-10 text-right"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>جاري تحميل بيانات المحاسبين...</span>
            </div>
          ) : filteredAccountants.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              لا يوجد محاسبون مطابقون لخيارات البحث الحالية.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-right">
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">رقم الهوية</TableHead>
                    <TableHead className="text-right">المؤهل</TableHead>
                    <TableHead className="text-right">تاريخ المباشرة</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccountants.map((accountant) => (
                    <TableRow key={accountant.id} className="text-right align-top">
                      <TableCell>
                        <div className="font-semibold">{accountant.name}</div>
                      </TableCell>
                      <TableCell>{accountant.nationalId}</TableCell>
                      <TableCell>{accountant.qualification}</TableCell>
                      <TableCell>
                        {accountant.startDate ? format(accountant.startDate, "dd MMMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>{accountant.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 flex-row-reverse"
                            onClick={() => handleOpenDialogForEdit(accountant)}
                          >
                            <Edit className="h-4 w-4" />
                            تعديل
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex items-center gap-2 flex-row-reverse"
                            onClick={() => handleConfirmDelete(accountant)}
                          >
                            <Trash2 className="h-4 w-4" />
                            حذف
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : handleCloseDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAccountant ? "تعديل بيانات المحاسب" : "إضافة محاسب جديد"}</DialogTitle>
            <DialogDescription>
              {selectedAccountant
                ? "قم بتحديث بيانات المحاسب المختار."
                : "أدخل بيانات المحاسب الجديد لإنشاء حساب وتفعيل الوصول."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountant-name">الاسم الكامل</Label>
                <Input
                  id="accountant-name"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountant-nationalId">رقم الهوية</Label>
                <Input
                  id="accountant-nationalId"
                  value={formState.nationalId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, nationalId: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountant-qualification">المؤهل</Label>
                <Input
                  id="accountant-qualification"
                  value={formState.qualification}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, qualification: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountant-startDate">تاريخ المباشرة</Label>
                <Input
                  id="accountant-startDate"
                  type="date"
                  value={formState.startDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </div>
            </div>

            {!selectedAccountant && (
              <div className="space-y-2">
                <Label htmlFor="accountant-email">البريد الإلكتروني</Label>
                <Input
                  id="accountant-email"
                  type="email"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
            )}

            {!selectedAccountant && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountant-password">كلمة المرور</Label>
                  <Input
                    id="accountant-password"
                    type="password"
                    value={formState.password}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountant-confirmPassword">تأكيد كلمة المرور</Label>
                  <Input
                    id="accountant-confirmPassword"
                    type="password"
                    value={formState.confirmPassword}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            {formError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{formError}</div>
            )}
          </div>

          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ"
              )}
            </Button>
            <Button variant="outline" onClick={handleCloseDialog} className="flex-1" disabled={saving}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المحاسب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف حساب المحاسب {selectedAccountant?.name}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
            <AlertDialogCancel disabled={deleteLoading} className="flex-1">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAccountants;


