import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminParents from "./pages/admin/AdminParents";
import AdminAccountants from "./pages/admin/AdminAccountants";

// Teacher Pages
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherGrades from "./pages/teacher/TeacherGrades";

// Student Pages
import StudentSchedule from "./pages/student/StudentSchedule";
import StudentGrades from "./pages/student/StudentGrades";

// Parent Pages
import ParentChildren from "./pages/parent/ParentChildren";
import ParentReports from "./pages/parent/ParentReports";

// Accountant Pages
import AccountantDashboard from "./pages/accountant/AccountantDashboard";

// Layouts
import DashboardLayout from "./components/DashboardLayout";
import { LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, Award, User, FileText, Wallet } from "lucide-react";

const queryClient = new QueryClient();

const adminMenuItems = [
  { label: "Dashboard", path: "/dashboard/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Students", path: "/dashboard/admin/students", icon: <Users className="h-4 w-4" /> },
  { label: "Teachers", path: "/dashboard/admin/teachers", icon: <GraduationCap className="h-4 w-4" /> },
  { label: "Classes", path: "/dashboard/admin/classes", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Parents", path: "/dashboard/admin/parents", icon: <User className="h-4 w-4" /> },
  { label: "Accountants", path: "/dashboard/admin/accountants", icon: <Wallet className="h-4 w-4" /> },
];

const teacherMenuItems = [
  { label: "My Classes", path: "/dashboard/teacher", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Student Grades", path: "/dashboard/teacher/grades", icon: <Award className="h-4 w-4" /> },
];

const studentMenuItems = [
  { label: "My Schedule", path: "/dashboard/student", icon: <Calendar className="h-4 w-4" /> },
  { label: "My Grades", path: "/dashboard/student/grades", icon: <Award className="h-4 w-4" /> },
];

const parentMenuItems = [
  { label: "My Children", path: "/dashboard/parent", icon: <User className="h-4 w-4" /> },
  { label: "Grades & Reports", path: "/dashboard/parent/reports", icon: <FileText className="h-4 w-4" /> },
];

const accountantMenuItems = [
  { label: "Finance Overview", path: "/dashboard/accountant", icon: <Wallet className="h-4 w-4" /> },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route 
              path="/dashboard/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <DashboardLayout role="admin" menuItems={adminMenuItems}>
                    <AdminOverview />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/Admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <DashboardLayout role="admin" menuItems={adminMenuItems}>
                    <AdminOverview />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/admin/students" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <DashboardLayout role="admin" menuItems={adminMenuItems}>
                    <AdminStudents />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/admin/teachers" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <DashboardLayout role="admin" menuItems={adminMenuItems}>
                    <AdminTeachers />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/admin/classes" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <DashboardLayout role="admin" menuItems={adminMenuItems}>
                    <AdminClasses />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/admin/parents" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <DashboardLayout role="admin" menuItems={adminMenuItems}>
                    <AdminParents />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/admin/accountants" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <DashboardLayout role="admin" menuItems={adminMenuItems}>
                    <AdminAccountants />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Teacher Routes */}
            <Route 
              path="/dashboard/teacher" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <DashboardLayout role="teacher" menuItems={teacherMenuItems}>
                    <TeacherClasses />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/teacher/grades" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <DashboardLayout role="teacher" menuItems={teacherMenuItems}>
                    <TeacherGrades />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Student Routes */}
            <Route 
              path="/dashboard/student" 
              element={
                <ProtectedRoute requiredRole="student">
                  <DashboardLayout role="student" menuItems={studentMenuItems}>
                    <StudentSchedule />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/student/grades" 
              element={
                <ProtectedRoute requiredRole="student">
                  <DashboardLayout role="student" menuItems={studentMenuItems}>
                    <StudentGrades />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Parent Routes */}
            <Route 
              path="/dashboard/parent" 
              element={
                <ProtectedRoute requiredRole="parent">
                  <DashboardLayout role="parent" menuItems={parentMenuItems}>
                    <ParentChildren />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/parent/reports" 
              element={
                <ProtectedRoute requiredRole="parent">
                  <DashboardLayout role="parent" menuItems={parentMenuItems}>
                    <ParentReports />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />

            {/* Accountant Routes */}
            <Route
              path="/dashboard/accountant"
              element={
                <ProtectedRoute requiredRole="accountant">
                  <DashboardLayout role="accountant" menuItems={accountantMenuItems}>
                    <AccountantDashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
