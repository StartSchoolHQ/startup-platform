import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupportTicketSchema } from "@/lib/validation-schemas";
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
  SUPPORT_ATTACHMENTS_BUCKET,
  attachmentPath,
} from "@/lib/support/attachment-rules";
import type { TicketAttachment } from "@/types/support-inbox";
import type { Json } from "@/types/database";

const COOLDOWN_MS = 15 * 60 * 1000;

/** Collects and validates `attachment_*` parts. Returns an error message or the files. */
function readAttachments(
  formData: FormData
): { files: File[] } | { error: string } {
  const files: File[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("attachment_") || !(value instanceof File)) continue;
    if (value.size > MAX_FILE_SIZE) {
      return { error: `File "${value.name}" exceeds maximum size of 8MB` };
    }
    if (!ALLOWED_FILE_TYPES.includes(value.type)) {
      return {
        error: `File "${value.name}" has unsupported type (${value.type}). Allowed: Images, PDF, Word/Excel documents, Text files`,
      };
    }
    files.push(value);
  }
  if (files.length > MAX_FILES) {
    return { error: `You can attach up to ${MAX_FILES} files.` };
  }
  return { files };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const validation = SupportTicketSchema.safeParse({
      priority: formData.get("priority"),
      category: formData.get("category"),
      title: formData.get("title"),
      description: formData.get("description"),
    });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }
    const ticket = validation.data;

    const read = readAttachments(formData);
    if ("error" in read) {
      return NextResponse.json({ error: read.error }, { status: 400 });
    }

    // 15-minute cooldown, unchanged from the Discord era (fails open on DB error).
    try {
      const { data: rateLimit } = await supabase
        .from("support_rate_limits")
        .select("last_submission_at")
        .eq("user_id", user.id)
        .single();
      if (rateLimit) {
        const elapsed =
          Date.now() - new Date(rateLimit.last_submission_at).getTime();
        if (elapsed < COOLDOWN_MS) {
          const remainingMinutes = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
          return NextResponse.json(
            {
              error: `Please wait ${remainingMinutes} minute${
                remainingMinutes > 1 ? "s" : ""
              } before submitting another ticket`,
            },
            { status: 429 }
          );
        }
      }
      await supabase.from("support_rate_limits").upsert(
        {
          user_id: user.id,
          last_submission_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (rateLimitError) {
      console.error("Rate limit check failed:", rateLimitError);
    }

    // Upload first so the row never references a file that is not there.
    const ticketId = crypto.randomUUID();
    const bucket = supabase.storage.from(SUPPORT_ATTACHMENTS_BUCKET);
    const uploaded: TicketAttachment[] = [];
    for (const file of read.files) {
      const path = attachmentPath(user.id, ticketId, file.name);
      const { error: uploadError } = await bucket.upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) {
        console.error("Attachment upload failed:", uploadError);
        if (uploaded.length) await bucket.remove(uploaded.map((a) => a.path));
        return NextResponse.json(
          {
            error: `Couldn't upload "${file.name}". Remove it and try again, or send the ticket without attachments.`,
          },
          { status: 500 }
        );
      }
      uploaded.push({
        path,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    const { error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        id: ticketId,
        user_id: user.id,
        priority: ticket.priority,
        category: ticket.category,
        title: ticket.title,
        description: ticket.description,
        attachments: uploaded as unknown as Json,
      });
    if (insertError) {
      console.error("Ticket insert failed:", insertError);
      if (uploaded.length) await bucket.remove(uploaded.map((a) => a.path));
      return NextResponse.json(
        { error: "Couldn't save the ticket. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ticketId });
  } catch (error) {
    console.error("Support ticket submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
