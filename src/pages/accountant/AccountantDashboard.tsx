import { useEffect, useMemo, useState } from "react";
import { format, addMonths, startOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  PiggyBank,
  DollarSign,
  AlertTriangle,
  CalendarDays,
  Search,
  Filter,
  ClipboardList,
  FileText,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  subscribeToFinancialAccounts,
  subscribeToAllPayments,
  updateFinancialAccount,
  addPaymentToAccount,
  getPaymentsByAccount,
  createFinancialAccount,
} from "@/services/firebase/finance.service";
import { getAllStudents } from "@/services/firebase/students.service";
import type {
  FinancialAccount,
  FinancialAccountStatus,
  FinancialPayment,
  FinancialPaymentMethod,
} from "@/types";
import type { Student } from "@/types";

const statusConfig: Record<
  FinancialAccountStatus,
  { label: string; description: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  onTrack: {
    label: "منتظم",
    description: "توجد دفعات منتظمة حسب الخطة",
    badgeVariant: "default",
  },
  overdue: {
    label: "غير منتظم",
    description: "هناك دفعات متأخرة عن تاريخ الاستحقاق",
    badgeVariant: "destructive",
  },
  settled: {
    label: "مكتمل",
    description: "تم سداد كامل الرسوم الدراسية",
    badgeVariant: "secondary",
  },
};

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

const AccountantDashboard = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [payments, setPayments] = useState<FinancialPayment[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FinancialAccountStatus | "all">("all");

  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  const [tuitionDialogOpen, setTuitionDialogOpen] = useState(false);
  const [tuitionAmount, setTuitionAmount] = useState<string>("");
  const [tuitionSaving, setTuitionSaving] = useState(false);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<FinancialPaymentMethod>("Cash");
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [statementPayments, setStatementPayments] = useState<FinancialPayment[]>([]);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [newAccountDialogOpen, setNewAccountDialogOpen] = useState(false);
  const [newAccountSaving, setNewAccountSaving] = useState(false);
  const [newAccountError, setNewAccountError] = useState<string | null>(null);
  const [newAccountForm, setNewAccountForm] = useState({
    studentId: "",
    totalTuition: "",
    monthlyInstallment: "",
    installmentCount: "",
    planStartDate: format(new Date(), "yyyy-MM-dd"),
    nextDueDate: format(new Date(), "yyyy-MM-dd"),
    currency: "SAR",
    notes: "",
  });

  // Load accounts in real-time
  useEffect(() => {
    const unsubscribe = subscribeToFinancialAccounts(
      (data) => {
        setAccounts(data);
        setLoadingAccounts(false);
      },
      (error: any) => {
        console.error("❌ Error loading financial accounts:", error);
        toast({
          title: "خطأ في تحميل الحسابات",
          description: error?.message || "تعذر تحميل حسابات الرسوم. الرجاء المحاولة لاحقاً.",
          variant: "destructive",
        });
        setLoadingAccounts(false);
      }
    );
    return () => unsubscribe();
  }, [toast]);

  // Load all payments in real-time
  useEffect(() => {
    const unsubscribe = subscribeToAllPayments(
      (data) => {
        setPayments(data);
        setLoadingPayments(false);
        setPaymentsError(null);
      },
      (error: any) => {
        console.error("❌ Error loading payments:", error);
        if (error?.code === "failed-precondition") {
          const indexMessage =
            "يتطلب عرض سجل الدفعات إنشاء فهرس collection group لحقل paymentDate. يرجى إنشاء الفهرس في Firebase Console ثم إعادة المحاولة.";
          setPaymentsError(indexMessage);
        } else {
          setPaymentsError(error?.message || "تعذر تحميل سجل الدفعات. الرجاء المحاولة لاحقاً.");
          toast({
            title: "خطأ في تحميل الدفعات",
            description: error?.message || "تعذر تحميل سجل الدفعات. الرجاء المحاولة لاحقاً.",
            variant: "destructive",
          });
        }
        setLoadingPayments(false);
      }
    );
    return () => unsubscribe();
  }, [toast]);

  const paymentsByAccount = useMemo(() => {
    return payments.reduce<Record<string, FinancialPayment[]>>((acc, payment) => {
      if (!acc[payment.accountId]) {
        acc[payment.accountId] = [];
      }
      acc[payment.accountId].push(payment);
      return acc;
    }, {});
  }, [payments]);

  // Load students for creating new financial accounts
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoadingStudents(true);
        const data = await getAllStudents();
        setStudents(data);
      } catch (error) {
        console.error("❌ Error loading students:", error);
        toast({
          title: "خطأ في تحميل الطلبة",
          description: "تعذر تحميل قائمة الطلبة. الرجاء المحاولة لاحقاً.",
          variant: "destructive",
        });
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [toast]);

  const summary = useMemo(() => {
    const totals = accounts.reduce(
      (acc, account) => {
        acc.totalTuition += account.totalTuition;
        acc.totalPaid += account.totalPaid;
        acc.totalRemaining += Math.max(account.totalTuition - account.totalPaid, 0);
        if (account.status === "overdue") {
          acc.overdueCount += 1;
        }
        return acc;
      },
      { totalTuition: 0, totalPaid: 0, totalRemaining: 0, overdueCount: 0 }
    );

    const collectionRate = totals.totalTuition > 0 ? (totals.totalPaid / totals.totalTuition) * 100 : 0;

    return {
      ...totals,
      collectionRate,
    };
  }, [accounts]);

  const accountsByStudent = useMemo(() => {
    const map = new Map<string, FinancialAccount>();
    accounts.forEach((account) => {
      map.set(account.studentId, account);
    });
    return map;
  }, [accounts]);

  const availableStudents = useMemo(() => {
    if (!students.length) return [];
    return students.filter((student) => !accountsByStudent.has(student.id));
  }, [students, accountsByStudent]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch =
        account.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.grade.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || account.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [accounts, searchTerm, statusFilter]);

  const paymentsMonths = useMemo(() => payments.map((payment) => format(payment.paymentDate, "yyyy-MM")), [payments]);

  const monthsForReport = useMemo(() => {
    const months = new Set<string>();
    const today = new Date();

    months.add(format(today, "yyyy-MM"));

    accounts.forEach((account) => {
      months.add(format(account.nextDueDate, "yyyy-MM"));
      months.add(format(account.planStartDate, "yyyy-MM"));
    });

    paymentsMonths.forEach((key) => months.add(key));

    return Array.from(months)
      .map((key) => ({
        key,
        date: new Date(Number(key.split("-")[0]), Number(key.split("-")[1]) - 1, 1),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [accounts, paymentsMonths]);

  const monthlyReport = useMemo(() => {
    return monthsForReport.map(({ key, date }) => {
      const totalDue = accounts.reduce((sum, account) => {
        const start = startOfMonth(account.planStartDate);
        const end = addMonths(start, account.installmentCount - 1);
        if (date >= start && date <= end) {
          return sum + account.monthlyInstallment;
        }
        return sum;
      }, 0);

      const totalPaid = payments
        .filter((payment) => format(payment.paymentDate, "yyyy-MM") === key)
        .reduce((acc, payment) => acc + payment.amount, 0);

      const outstanding = Math.max(totalDue - totalPaid, 0);

      return {
        key,
        label: format(date, "MMMM yyyy", { locale: ar }),
        totalDue,
        totalPaid,
        outstanding,
      };
    });
  }, [accounts, monthsForReport, payments]);

  const handleOpenTuitionDialog = (account: FinancialAccount) => {
    setSelectedAccount(account);
    setTuitionAmount(account.totalTuition.toString());
    setTuitionDialogOpen(true);
  };

  const handleSaveTuition = async () => {
    if (!selectedAccount) return;
    const parsedAmount = Number(tuitionAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      setTuitionSaving(true);
      await updateFinancialAccount(selectedAccount.id, {
        totalTuition: parsedAmount,
      });
      toast({
        title: "تم تحديث الرسوم",
        description: "تم حفظ التعديلات على الرسوم الدراسية بنجاح.",
      });
      setTuitionDialogOpen(false);
      setSelectedAccount(null);
      setTuitionAmount("");
    } catch (error: any) {
      console.error("❌ Error updating tuition:", error);
      toast({
        title: "حدث خطأ",
        description: error?.message || "تعذر تحديث الرسوم الدراسية. الرجاء المحاولة لاحقاً.",
        variant: "destructive",
      });
    } finally {
      setTuitionSaving(false);
    }
  };

  const handleOpenPaymentDialog = (account: FinancialAccount) => {
    setSelectedAccount(account);
    setPaymentAmount(account.monthlyInstallment ? account.monthlyInstallment.toString() : "");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentMethod("Cash");
    setPaymentNote("");
    setPaymentDialogOpen(true);
  };

  const handleAddPayment = async () => {
    if (!selectedAccount) return;
    const amountNumber = Number(paymentAmount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) return;

    try {
      setPaymentSaving(true);
      await addPaymentToAccount(selectedAccount.id, {
        amount: amountNumber,
        method: paymentMethod,
        paymentDate: new Date(paymentDate),
        note: paymentNote || undefined,
      });
      toast({
        title: "تم تسجيل الدفعة",
        description: "تم تسجيل الدفعة وتحديث الحساب بنجاح.",
      });
      setPaymentDialogOpen(false);
      setSelectedAccount(null);
      setPaymentAmount("");
      setPaymentNote("");
    } catch (error: any) {
      console.error("❌ Error adding payment:", error);
      toast({
        title: "خطأ أثناء تسجيل الدفعة",
        description: error?.message || "تعذر حفظ الدفعة. الرجاء المحاولة لاحقاً.",
        variant: "destructive",
      });
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleOpenStatement = async (account: FinancialAccount) => {
    setSelectedAccount(account);
    setStatementDialogOpen(true);

    if (paymentsByAccount[account.id]) {
      setStatementPayments(
        paymentsByAccount[account.id]
          .slice()
          .sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime())
      );
      return;
    }

    try {
      const history = await getPaymentsByAccount(account.id);
      setStatementPayments(
        history.slice().sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime())
      );
    } catch (error: any) {
      console.error("❌ Error loading payment history:", error);
      toast({
        title: "خطأ في تحميل كشف الدفعات",
        description: error?.message || "تعذر تحميل كشف الدفعات لهذا الحساب.",
        variant: "destructive",
      });
      setStatementPayments([]);
    }
  };

  const handleCloseDialogs = () => {
    setSelectedAccount(null);
    setTuitionDialogOpen(false);
    setPaymentDialogOpen(false);
    setStatementDialogOpen(false);
    setTuitionAmount("");
    setPaymentAmount("");
    setPaymentNote("");
    setStatementPayments([]);
  };

  const handleOpenNewAccountDialog = () => {
    setNewAccountError(null);
    setNewAccountForm({
      studentId: "",
      totalTuition: "",
      monthlyInstallment: "",
      installmentCount: "",
      planStartDate: format(new Date(), "yyyy-MM-dd"),
      nextDueDate: format(new Date(), "yyyy-MM-dd"),
      currency: "SAR",
      notes: "",
    });
    setNewAccountDialogOpen(true);
  };

  const handleCloseNewAccountDialog = () => {
    if (newAccountSaving) return;
    setNewAccountDialogOpen(false);
    setNewAccountError(null);
  };

  const handleCreateFinancialAccount = async () => {
    if (newAccountSaving) return;
    if (!newAccountForm.studentId) {
      setNewAccountError("الرجاء اختيار الطالب.");
      return;
    }

    const student = students.find((item) => item.id === newAccountForm.studentId);
    if (!student) {
      setNewAccountError("تعذر إيجاد بيانات الطالب المختار.");
      return;
    }

    if (accountsByStudent.has(student.id)) {
      setNewAccountError("يوجد حساب مالي لهذا الطالب بالفعل.");
      return;
    }

    const totalTuition = Number(newAccountForm.totalTuition);
    const monthlyInstallment = Number(newAccountForm.monthlyInstallment);
    const installmentCount = Number(newAccountForm.installmentCount);

    if (!totalTuition || totalTuition <= 0) {
      setNewAccountError("الرجاء إدخال إجمالي الرسوم بشكل صحيح.");
      return;
    }
    if (!monthlyInstallment || monthlyInstallment <= 0) {
      setNewAccountError("الرجاء إدخال قيمة القسط الشهري بشكل صحيح.");
      return;
    }
    if (!installmentCount || installmentCount <= 0) {
      setNewAccountError("الرجاء إدخال عدد الأقساط بشكل صحيح.");
      return;
    }

    const planStartDate = new Date(newAccountForm.planStartDate);
    const nextDueDate = new Date(newAccountForm.nextDueDate || newAccountForm.planStartDate);

    if (Number.isNaN(planStartDate.getTime()) || Number.isNaN(nextDueDate.getTime())) {
      setNewAccountError("الرجاء إدخال تواريخ صحيحة.");
      return;
    }

    try {
      setNewAccountSaving(true);
      await createFinancialAccount({
        studentId: student.id,
        studentName: student.name,
        grade: student.grade,
        currency: newAccountForm.currency || "SAR",
        totalTuition,
        monthlyInstallment,
        installmentCount,
        planStartDate,
        nextDueDate,
        notes: newAccountForm.notes || "",
        totalPaid: 0,
      });
      toast({
        title: "تم إنشاء الحساب المالي",
        description: `تم إنشاء حساب الرسوم للطالب ${student.name} بنجاح.`,
      });
      setNewAccountDialogOpen(false);
      setNewAccountError(null);
    } catch (error: any) {
      console.error("❌ Error creating financial account:", error);
      setNewAccountError(error?.message || "تعذر إنشاء الحساب. الرجاء المحاولة لاحقاً.");
    } finally {
      setNewAccountSaving(false);
    }
  };

  if (loadingAccounts) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>جاري تحميل البيانات المالية...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">لوحة المحاسب</h2>
          <p className="text-muted-foreground">
            متابعة الرسوم الدراسية، الدفعات الشهرية، والتقارير المالية للطلاب
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="secondary" className="justify-between flex-row-reverse">
            <FileText className="ms-2 h-4 w-4" />
            تصدير تقرير شهري
          </Button>
          <Button
            className="justify-between flex-row-reverse"
            onClick={handleOpenNewAccountDialog}
            disabled={loadingStudents || availableStudents.length === 0}
          >
            {loadingStudents ? (
              <>
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                جاري التحميل
              </>
            ) : (
              <>
            <ClipboardList className="ms-2 h-4 w-4" />
            إنشاء مطالبة جديدة
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">إجمالي الرسوم الدراسية</CardTitle>
            <Wallet className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalTuition)}
            </div>
            <p className="text-xs text-muted-foreground">مجمّعة لكل الطلاب</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">إجمالي المدفوعات</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-emerald-700">
              {formatCurrency(summary.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              معدل التحصيل {summary.collectionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">المتبقي على الطلاب</CardTitle>
            <PiggyBank className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-amber-700">
              {formatCurrency(summary.totalRemaining)}
            </div>
            <p className="text-xs text-muted-foreground">يشمل الأقساط المستقبلية</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">حالات غير منتظمة</CardTitle>
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-rose-600">{summary.overdueCount}</div>
            <p className="text-xs text-muted-foreground">تحتاج متابعة عاجلة</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-xl">الحسابات المالية للطلاب</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو الصف..."
                className="pe-10 text-right"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as FinancialAccountStatus | "all")}
            >
              <SelectTrigger className="w-full sm:w-56 justify-between flex-row-reverse">
                <Filter className="ms-2 h-4 w-4" />
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="onTrack">منتظم</SelectItem>
                <SelectItem value="overdue">غير منتظم</SelectItem>
                <SelectItem value="settled">مكتمل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="overflow-x-auto">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              لا توجد حسابات مالية مطابقة لخيارات البحث الحالية.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-right">
                  <TableHead className="text-right">الطالب</TableHead>
                  <TableHead className="text-right">الصف</TableHead>
                  <TableHead className="text-right">إجمالي الرسوم</TableHead>
                  <TableHead className="text-right">المدفوع</TableHead>
                  <TableHead className="text-right">المتبقي</TableHead>
                  <TableHead className="text-right">القسط الشهري</TableHead>
                  <TableHead className="text-right">أقرب استحقاق</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => {
                  const remaining = Math.max(account.totalTuition - account.totalPaid, 0);
                  const status = statusConfig[account.status];
                  return (
                    <TableRow key={account.id} className="text-right align-top">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">{account.studentName}</p>
                          <p className="text-xs text-muted-foreground">#{account.studentId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{account.grade}</TableCell>
                      <TableCell>{formatCurrency(account.totalTuition, account.currency)}</TableCell>
                      <TableCell>{formatCurrency(account.totalPaid, account.currency)}</TableCell>
                      <TableCell className={cn("font-semibold", remaining > 0 && "text-amber-600")}>
                        {formatCurrency(remaining, account.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatCurrency(account.monthlyInstallment, account.currency)}</span>
                          <span className="text-xs text-muted-foreground">
                            {account.installmentCount || 0} دفعات
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(account.nextDueDate, "dd MMM yyyy", { locale: ar })}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(account.nextDueDate, "EEEE", { locale: ar })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={status.badgeVariant}>
                            {status.label}
                          </Badge>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {status.description}
                          </p>
                          {account.notes ? (
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              ملاحظة: {account.notes}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenTuitionDialog(account)}
                            className="flex-1 justify-center"
                          >
                            تحديث الرسوم
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenPaymentDialog(account)}
                            className="flex-1 justify-center"
                          >
                            تسجيل دفعة
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-muted-foreground"
                          onClick={() => handleOpenStatement(account)}
                        >
                          كشف المدفوعات
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Monthly Report */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-xl">التقرير المالي الشهري</CardTitle>
            <p className="text-sm text-muted-foreground">
              يوضح إجمالي المستحقات والمدفوعات والمتبقي لكل شهر دراسي
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>تحديث تلقائي حسب عمليات الدفع</span>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="overflow-x-auto">
          {loadingPayments ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>جاري تحميل بيانات الدفعات...</span>
            </div>
          ) : paymentsError ? (
            <div className="py-10 text-center text-destructive bg-destructive/10 rounded-md px-4">
              {paymentsError}
            </div>
          ) : monthlyReport.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              لا توجد بيانات مالية لعرض التقرير الشهري حتى الآن.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-right">
                  <TableHead className="text-right">الشهر</TableHead>
                  <TableHead className="text-right">إجمالي المستحق</TableHead>
                  <TableHead className="text-right">إجمالي المدفوع</TableHead>
                  <TableHead className="text-right">المتبقي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyReport.map((month) => (
                  <TableRow key={month.key} className="text-right">
                    <TableCell className="font-semibold">{month.label}</TableCell>
                    <TableCell>{formatCurrency(month.totalDue)}</TableCell>
                    <TableCell className="text-emerald-700 font-semibold">
                      {formatCurrency(month.totalPaid)}
                    </TableCell>
                    <TableCell className={cn("font-semibold", month.outstanding > 0 && "text-amber-600")}>
                      {formatCurrency(month.outstanding)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Financial Account Dialog */}
      <Dialog
        open={newAccountDialogOpen}
        onOpenChange={(open) => (open ? setNewAccountDialogOpen(true) : handleCloseNewAccountDialog())}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>إنشاء مطالبة جديدة</DialogTitle>
            <DialogDescription>
              اربط الطالب المختار بحساب مالي لتحديد التكلفة الكلية وجدولة الأقساط.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingStudents ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>جاري تحميل قائمة الطلبة...</span>
              </div>
            ) : availableStudents.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                جميع الطلبة لديهم حسابات مالية حالياً. يمكنك تعديل التفاصيل من جدول الحسابات.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-account-student">الطالب</Label>
                  <Select
                    value={newAccountForm.studentId}
                    onValueChange={(value) => setNewAccountForm((prev) => ({ ...prev, studentId: value }))}
                  >
                    <SelectTrigger id="new-account-student" className="justify-between flex-row-reverse">
                      <SelectValue placeholder="اختر الطالب" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} — {student.grade || "بدون صف"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-account-total">إجمالي الرسوم</Label>
                    <Input
                      id="new-account-total"
                      type="number"
                      min={0}
                      value={newAccountForm.totalTuition}
                      onChange={(event) =>
                        setNewAccountForm((prev) => ({ ...prev, totalTuition: event.target.value }))
                      }
                      placeholder="مثال: 18000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-account-monthly">القسط الشهري</Label>
                    <Input
                      id="new-account-monthly"
                      type="number"
                      min={0}
                      value={newAccountForm.monthlyInstallment}
                      onChange={(event) =>
                        setNewAccountForm((prev) => ({ ...prev, monthlyInstallment: event.target.value }))
                      }
                      placeholder="مثال: 1500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-account-installments">عدد الأقساط</Label>
                    <Input
                      id="new-account-installments"
                      type="number"
                      min={1}
                      value={newAccountForm.installmentCount}
                      onChange={(event) =>
                        setNewAccountForm((prev) => ({ ...prev, installmentCount: event.target.value }))
                      }
                      placeholder="مثال: 12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-account-currency">العملة</Label>
                    <Input
                      id="new-account-currency"
                      value={newAccountForm.currency}
                      onChange={(event) =>
                        setNewAccountForm((prev) => ({ ...prev, currency: event.target.value || "SAR" }))
                      }
                      placeholder="مثال: SAR"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-account-plan-start">تاريخ بداية الخطة</Label>
                    <Input
                      id="new-account-plan-start"
                      type="date"
                      value={newAccountForm.planStartDate}
                      onChange={(event) =>
                        setNewAccountForm((prev) => ({
                          ...prev,
                          planStartDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-account-next-due">تاريخ أول استحقاق</Label>
                    <Input
                      id="new-account-next-due"
                      type="date"
                      value={newAccountForm.nextDueDate}
                      onChange={(event) =>
                        setNewAccountForm((prev) => ({
                          ...prev,
                          nextDueDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-account-notes">ملاحظات إضافية</Label>
                  <Textarea
                    id="new-account-notes"
                    value={newAccountForm.notes}
                    onChange={(event) =>
                      setNewAccountForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="ملاحظات اختيارية حول الخطة أو الطالب"
                  />
                </div>

                {newAccountError && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {newAccountError}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button
              onClick={handleCreateFinancialAccount}
              className="flex-1"
              disabled={
                newAccountSaving ||
                loadingStudents ||
                availableStudents.length === 0 ||
                !newAccountForm.studentId
              }
            >
              {newAccountSaving ? (
                <>
                  <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "إنشاء الحساب"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCloseNewAccountDialog}
              className="flex-1"
              disabled={newAccountSaving}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tuition Dialog */}
      <Dialog open={tuitionDialogOpen} onOpenChange={(open) => (open ? setTuitionDialogOpen(true) : handleCloseDialogs())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تحديث إجمالي الرسوم الدراسية</DialogTitle>
            <DialogDescription>
              تحديث القيمة الإجمالية للرسوم الدراسية للطالب المحدد.
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-semibold">{selectedAccount.studentName}</p>
                <p className="text-muted-foreground">{selectedAccount.grade}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tuition-amount">إجمالي الرسوم (بالـ {selectedAccount.currency})</Label>
                <Input
                  id="tuition-amount"
                  type="number"
                  min={0}
                  value={tuitionAmount}
                  onChange={(event) => setTuitionAmount(event.target.value)}
                  placeholder="مثال: 18000"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button onClick={handleSaveTuition} className="flex-1" disabled={tuitionSaving}>
              {tuitionSaving ? (
                <>
                  <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ التعديلات"
              )}
            </Button>
            <Button variant="outline" onClick={handleCloseDialogs} className="flex-1" disabled={tuitionSaving}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => (open ? setPaymentDialogOpen(true) : handleCloseDialogs())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة جديدة</DialogTitle>
            <DialogDescription>
              إضافة قسط جديد للطالب وتحديث الرصيد المتبقي.
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-semibold">{selectedAccount.studentName}</p>
                  <p className="text-muted-foreground">{selectedAccount.grade}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">المتبقي:</span>{" "}
                    <span className="font-semibold">
                      {formatCurrency(
                        Math.max(selectedAccount.totalTuition - selectedAccount.totalPaid, 0),
                        selectedAccount.currency
                      )}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">القسط المقترح:</span>{" "}
                    <span className="font-semibold">
                      {formatCurrency(selectedAccount.monthlyInstallment, selectedAccount.currency)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">مبلغ الدفعة</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    min={0}
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-date">تاريخ الدفع</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as FinancialPaymentMethod)}>
                  <SelectTrigger className="justify-between flex-row-reverse">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">نقداً</SelectItem>
                    <SelectItem value="Bank Transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="Credit Card">بطاقة ائتمان</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-note">ملاحظات</Label>
                <Input
                  id="payment-note"
                  placeholder="ملاحظات اختيارية حول الدفعة"
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button onClick={handleAddPayment} className="flex-1" disabled={paymentSaving}>
              {paymentSaving ? (
                <>
                  <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ الدفعة"
              )}
            </Button>
            <Button variant="outline" onClick={handleCloseDialogs} className="flex-1" disabled={paymentSaving}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statement Dialog */}
      <Dialog open={statementDialogOpen} onOpenChange={(open) => (open ? setStatementDialogOpen(true) : handleCloseDialogs())}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>كشف المدفوعات</DialogTitle>
            <DialogDescription>
              مراجعة تاريخ الدفعات للطالب المختار مع تفاصيل كل عملية.
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg text-sm">
                <div>
                  <p className="text-muted-foreground">الطالب</p>
                  <p className="font-semibold">{selectedAccount.studentName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">إجمالي الرسوم</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedAccount.totalTuition, selectedAccount.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">المتبقي</p>
                  <p className="font-semibold">
                    {formatCurrency(
                      Math.max(selectedAccount.totalTuition - selectedAccount.totalPaid, 0),
                      selectedAccount.currency
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-right">
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الطريقة</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statementPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          لا توجد دفعات مسجلة لهذا الحساب بعد.
                        </TableCell>
                      </TableRow>
                    ) : (
                      statementPayments.map((payment) => (
                        <TableRow key={payment.id} className="text-right">
                          <TableCell>
                            <div className="flex flex-col space-y-1">
                              <span>{format(payment.paymentDate, "dd MMM yyyy", { locale: ar })}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(payment.paymentDate, "EEEE", { locale: ar })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-700">
                            {formatCurrency(payment.amount, selectedAccount.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 justify-end">
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                              {payment.method === "Cash"
                                ? "نقداً"
                                : payment.method === "Bank Transfer"
                                ? "تحويل بنكي"
                                : "بطاقة ائتمان"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {payment.note || "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button variant="outline" onClick={handleCloseDialogs} className="flex-1">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountantDashboard;
