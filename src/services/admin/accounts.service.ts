import { adminCreateAuthUser } from "@/services/firebase/auth-admin.service";
import { createUserProfile } from "@/services/firebase/users.service";
import { addTeacher, addStudent, addAccountant, createFinancialAccount } from "@/services/firebase";
import { addParent } from "@/services/firebase/parents.service";
import type { Teacher, Student } from "@/types";

interface CreateAccountBase {
  name: string;
  email: string;
  password: string;
}

interface CreateTeacherAccountInput extends CreateAccountBase {
  subject: string;
  status: Teacher["status"];
}

interface CreateStudentAccountInput extends CreateAccountBase {
  grade: string;
  status: Student["status"];
  parentId?: string;
  tuitionTotal?: number;
  monthlyInstallment?: number;
  installmentCount?: number;
  currency?: string;
  notes?: string;
}

interface CreateParentAccountInput extends CreateAccountBase {
  phone?: string;
}

interface CreateAccountantAccountInput extends CreateAccountBase {
  nationalId: string;
  qualification: string;
  startDate: Date;
}

export const createTeacherAccount = async (input: CreateTeacherAccountInput) => {
  const { uid } = await adminCreateAuthUser({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });

  await createUserProfile({
    uid,
    email: input.email,
    displayName: input.name,
    role: "teacher",
  });

  await addTeacher(
    {
      name: input.name,
      email: input.email,
      subject: input.subject,
      status: input.status,
    },
    {
      id: uid,
      authId: uid,
    }
  );

  return uid;
};

export const createStudentAccount = async (input: CreateStudentAccountInput) => {
  const { uid } = await adminCreateAuthUser({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });

  await createUserProfile({
    uid,
    email: input.email,
    displayName: input.name,
    role: "student",
  });

  await addStudent(
    {
      name: input.name,
      email: input.email,
      grade: input.grade,
      status: input.status,
      parentId: input.parentId,
    },
    {
      id: uid,
      authId: uid,
    }
  );

  if (input.tuitionTotal && input.monthlyInstallment) {
    const totalTuition = Number(input.tuitionTotal);
    const monthlyInstallment = Number(input.monthlyInstallment);
    if (totalTuition > 0 && monthlyInstallment > 0) {
      const installmentCount =
        input.installmentCount && input.installmentCount > 0
          ? input.installmentCount
          : Math.max(1, Math.ceil(totalTuition / monthlyInstallment));
      const planStartDate = new Date();
      const nextDueDate = new Date(planStartDate);

      await createFinancialAccount({
        id: uid,
        studentId: uid,
        studentName: input.name,
        grade: input.grade,
        currency: input.currency || "SAR",
        totalTuition,
        monthlyInstallment,
        installmentCount,
        planStartDate,
        nextDueDate,
        notes: input.notes || "",
        totalPaid: 0,
      });
    }
  }

  return uid;
};

export const createParentAccount = async (input: CreateParentAccountInput) => {
  const { uid } = await adminCreateAuthUser({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });

  await createUserProfile({
    uid,
    email: input.email,
    displayName: input.name,
    role: "parent",
  });

  await addParent(
    {
      name: input.name,
      email: input.email,
      phone: input.phone,
      childrenIds: [],
    },
    {
      id: uid,
      authId: uid,
    }
  );

  return uid;
};

export const createAccountantAccount = async (input: CreateAccountantAccountInput) => {
  const { uid } = await adminCreateAuthUser({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });

  await createUserProfile({
    uid,
    email: input.email,
    displayName: input.name,
    role: "accountant",
  });

  await addAccountant(
    {
      name: input.name,
      email: input.email,
      nationalId: input.nationalId,
      qualification: input.qualification,
      startDate: input.startDate,
      authId: uid,
    },
    {
      id: uid,
      authId: uid,
    }
  );

  return uid;
};


