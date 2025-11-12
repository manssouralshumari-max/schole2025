import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface UploadCurriculumResult {
  downloadUrl: string;
  storagePath: string;
}

export const uploadCurriculumFile = async (
  file: File,
  classId: string
): Promise<UploadCurriculumResult> => {
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const timestamp = Date.now();
  const storagePath = `curriculums/${classId}/${timestamp}-${sanitizedFileName}`;
  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, file, {
    contentType: file.type || "application/pdf",
  });

  const downloadUrl = await getDownloadURL(fileRef);

  return {
    downloadUrl,
    storagePath,
  };
};

export const deleteFileByPath = async (path: string): Promise<void> => {
  if (!path) return;
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  } catch (error: any) {
    // Ignore "object-not-found" errors since the file might already be deleted
    if (error.code !== "storage/object-not-found") {
      console.warn("Failed to delete file:", error);
      throw error;
    }
  }
};





