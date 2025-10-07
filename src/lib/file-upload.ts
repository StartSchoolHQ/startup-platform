import { createClient } from "@/lib/supabase/client";

export interface FileUploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
}

export async function uploadTaskFiles(
  files: File[],
  taskId: string,
  userId: string
): Promise<FileUploadResult[]> {
  const supabase = createClient();
  const results: FileUploadResult[] = [];

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Authentication error:", authError);
    throw new Error("User not authenticated");
  }

  console.log("Uploading files for user:", user.id, "taskId:", taskId);

  for (const file of files) {
    try {
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      )}`;
      const filePath = `task-submissions/${taskId}/${userId}/${filename}`;

      console.log("Uploading file to path:", filePath);

      // Upload file to Supabase Storage
      const { error } = await supabase.storage
        .from("task-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Error uploading file:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("task-files").getPublicUrl(filePath);

      results.push({
        url: publicUrl,
        path: filePath,
        name: file.name,
        size: file.size,
      });
    } catch (error) {
      console.error(`Failed to upload file ${file.name}:`, error);
      // Continue with other files, but you might want to handle this differently
    }
  }

  return results;
}

export async function deleteTaskFile(filePath: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("task-files")
      .remove([filePath]);

    if (error) {
      console.error("Error deleting file:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to delete file:", error);
    return false;
  }
}
