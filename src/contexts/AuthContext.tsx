// Auth Context for managing authentication state
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { addStudent } from "@/services/firebase/students.service";
import { addTeacher } from "@/services/firebase/teachers.service";
import type { User as UserType } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: UserType | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string, role: UserType["role"]) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserRole: (uid: string, role: UserType["role"]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string): Promise<UserType | null> => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const userData = {
          uid: userDoc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        console.log("✅ User data loaded:", userData);
        return userData;
      }
      console.warn("⚠️ User document not found in Firestore for UID:", uid);
      console.warn("⚠️ Please create a user document in Firestore with the following structure:");
      console.warn("   Collection: users");
      console.warn("   Document ID: " + uid);
      console.warn("   Fields: email, displayName, role (admin/teacher/student/parent/accountant), createdAt, updatedAt");
      return null;
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      console.error("Error details:", error);
      return null;
    }
  };

  // Create user document in Firestore
  const createUserDocument = async (user: FirebaseUser, role: UserType["role"]) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const now = Timestamp.now();
      
      console.log("📝 Creating user document in Firestore...");
      console.log("   User UID:", user.uid);
      console.log("   Email:", user.email);
      console.log("   Role:", role);
      
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || "",
        role: role,
        createdAt: now,
        updatedAt: now,
      });
      
      console.log("✅ User document created successfully!");
    } catch (error: any) {
      console.error("❌ Error creating user document:", error);
      console.error("   Error code:", error.code);
      console.error("   Error message:", error.message);
      
      if (error.code === "permission-denied") {
        console.error("⚠️ Permission denied! Please check Firestore Security Rules.");
        console.error("   Make sure users can create their own document in 'users' collection.");
        console.error("   The rule should be: allow create: if request.auth != null && request.auth.uid == userId;");
      }
      
      throw error;
    }
  };

  // Sign up
  const signup = async (
    email: string,
    password: string,
    displayName: string,
    role: UserType["role"]
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Create user document in Firestore
      await createUserDocument(user, role);

      // Create document in students or teachers collection based on role
      try {
        if (role === "student") {
          console.log("📝 Creating student document...");
          console.log("   Name:", displayName);
          console.log("   Email:", email);
          console.log("   Role:", role);
          
          await addStudent({
            name: displayName,
            email: email,
            grade: "", // Will be updated later by admin
            dateOfBirth: undefined,
            status: "Active",
          });
          
          console.log("✅ Student document created successfully!");
        } else if (role === "teacher") {
          console.log("📝 Creating teacher document...");
          console.log("   Name:", displayName);
          console.log("   Email:", email);
          console.log("   Role:", role);
          
          await addTeacher(
            {
              name: displayName,
              email: email,
              subject: "", // Will be updated later by admin
              status: "Active",
            },
            {
              id: userCredential.user.uid,
              authId: userCredential.user.uid,
            }
          );
          
          console.log("✅ Teacher document created successfully!");
        }
      } catch (studentTeacherError: any) {
        console.error("❌ Error creating student/teacher document:", studentTeacherError);
        console.error("   Error code:", studentTeacherError.code);
        console.error("   Error message:", studentTeacherError.message);
        
        // Don't throw error - user document is already created
        // Just log the error so user can still sign up
        console.warn("⚠️ Warning: User account created but student/teacher document failed.");
        console.warn("   The user can still login, but admin needs to add them manually.");
      }

      toast({
        title: "Success",
        description: "Account created successfully!",
      });
      
      console.log("✅ Signup completed successfully!");
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = "Failed to create account. Please try again.";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email is already in use.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Login
  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      let errorMessage = "Failed to sign in. Please try again.";
      
      // Handle different Firebase Auth error codes
      if (error.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please sign up first.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please check your email and try again.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled. Please contact support.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }

      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Create a new error with a user-friendly message
      const friendlyError = new Error(errorMessage);
      (friendlyError as any).code = error.code;
      throw friendlyError;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Success",
        description: "Password reset email sent! Check your inbox.",
      });
    } catch (error: any) {
      console.error("Reset password error:", error);
      let errorMessage = "Failed to send reset email. Please try again.";
      
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update user role
  const updateUserRole = async (uid: string, role: UserType["role"]) => {
    try {
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, { role, updatedAt: Timestamp.now() }, { merge: true });
      
      // Reload user data
      if (currentUser?.uid === uid) {
        const updatedData = await fetchUserData(uid);
        setUserData(updatedData);
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
  };

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔐 Auth state changed:", user ? "User logged in" : "User logged out");
      setCurrentUser(user);
      
      if (user) {
        console.log("📥 Fetching user data for UID:", user.uid);
        // Fetch user data from Firestore
        const data = await fetchUserData(user.uid);
        setUserData(data);
        if (data) {
          console.log("✅ User data set:", data);
        } else {
          console.error("❌ User data is null. Please check Firestore collection 'users'.");
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    updateUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

