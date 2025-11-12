interface CreateAuthUserParams {
  email: string;
  password: string;
  displayName?: string;
}

interface CreateAuthUserResult {
  uid: string;
}

const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;

if (!API_KEY) {
  console.warn("⚠️ Missing VITE_FIREBASE_API_KEY. Admin user creation will fail without it.");
}

export const adminCreateAuthUser = async ({
  email,
  password,
  displayName,
}: CreateAuthUserParams): Promise<CreateAuthUserResult> => {
  if (!API_KEY) {
    throw new Error("Firebase API key is not configured.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const signUpResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const signUpData = await signUpResponse.json();

  if (!signUpResponse.ok) {
    const errorMessage = signUpData?.error?.message || "Failed to create authentication user.";
    throw new Error(errorMessage);
  }

  const uid = signUpData.localId as string;
  const idToken = signUpData.idToken as string | undefined;

  if (displayName && idToken) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}` , {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken,
        displayName,
        returnSecureToken: false,
      }),
    }).catch((error) => {
      console.warn("Failed to update display name for new user:", error);
    });
  }

  return { uid };
};





