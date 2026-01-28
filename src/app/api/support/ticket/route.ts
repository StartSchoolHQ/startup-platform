import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupportTicketSchema } from "@/lib/validation-schemas";

interface TicketData {
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  description: string;
  userInfo: {
    id: string;
    name: string;
    email: string;
  };
  attachments?: File[];
}

const PRIORITY_COLORS = {
  low: 0x808080, // Gray
  medium: 0xffd700, // Gold
  high: 0xff8c00, // Orange
  critical: 0xff0000, // Red
};

const PRIORITY_EMOJIS = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
};

// File upload constraints
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB (Discord limit)
const ALLOWED_FILE_TYPES = [
  // Images
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Text files
  "text/plain",
  "text/csv",
  // Office documents
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  // Logs (sometimes sent as application/octet-stream)
  "application/x-log",
  "application/octet-stream",
];

// Helper function to escape Discord mentions
function sanitizeDiscordContent(input: string): string {
  return input
    .replace(/@everyone/g, "@\u200beveryone") // Zero-width space
    .replace(/@here/g, "@\u200bhere");
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
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

    // Parse form data
    const formData = await request.formData();

    const priority = formData.get("priority") as string;
    const category = formData.get("category") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const userInfoStr = formData.get("userInfo") as string;

    // Parse userInfo
    let userInfo: TicketData["userInfo"];
    try {
      userInfo = JSON.parse(userInfoStr);
    } catch {
      return NextResponse.json(
        { error: "Invalid user information format" },
        { status: 400 }
      );
    }

    // Validate all inputs with Zod
    const validationResult = SupportTicketSchema.safeParse({
      priority,
      category,
      title,
      description,
      userInfo,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Process and validate attachments
    const attachments: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("attachment_") && value instanceof File) {
        // Validate file size
        if (value.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            {
              error: `File "${value.name}" exceeds maximum size of 8MB`,
            },
            { status: 400 }
          );
        }

        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(value.type)) {
          return NextResponse.json(
            {
              error: `File "${value.name}" has unsupported type (${value.type}). Allowed: Images, PDF, Word/Excel documents, Text files`,
            },
            { status: 400 }
          );
        }

        attachments.push(value);
      }
    }

    // Check database rate limiting (15 minutes cooldown)
    try {
      const { data: rateLimit } = await supabase
        .from("support_rate_limits")
        .select("last_submission_at")
        .eq("user_id", user.id)
        .single();

      if (rateLimit) {
        const lastSubmission = new Date(rateLimit.last_submission_at).getTime();
        const now = Date.now();
        const cooldownMs = 15 * 60 * 1000; // 15 minutes

        if (now - lastSubmission < cooldownMs) {
          const remainingMinutes = Math.ceil(
            (cooldownMs - (now - lastSubmission)) / 60000
          );
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

      // Update rate limit timestamp (uses RLS policy: users can upsert own rate limits)
      await supabase.from("support_rate_limits").upsert(
        {
          user_id: user.id,
          last_submission_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (rateLimitError) {
      // If rate limiting fails, log and continue (fail open for support tickets)
      console.error("Rate limit check failed:", rateLimitError);
    }

    // Get webhook URL from environment
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: "Discord webhook not configured",
        },
        { status: 500 }
      );
    }

    // Generate ticket ID
    const ticketId = `ST-${new Date().getFullYear()}-${String(Date.now()).slice(
      -6
    )}`;

    // Get current timestamp for Discord
    const timestamp = new Date().toISOString();

    // Sanitize content to prevent Discord mention abuse
    const sanitizedTitle = sanitizeDiscordContent(validatedData.title);
    const sanitizedDescription = sanitizeDiscordContent(
      validatedData.description
    );
    const sanitizedName = sanitizeDiscordContent(validatedData.userInfo.name);
    const sanitizedEmail = sanitizeDiscordContent(validatedData.userInfo.email);

    // Create Discord embed
    const embed = {
      title: `🎫 Support Ticket ${ticketId}`,
      description: `## ${sanitizedTitle}\n\n${sanitizedDescription}`,
      color: PRIORITY_COLORS[validatedData.priority],
      timestamp: timestamp,
      author: {
        name: `${sanitizedName} (${sanitizedEmail})`,
        icon_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          validatedData.userInfo.name
        )}&background=4f46e5&color=fff&size=128&bold=true`,
      },
      thumbnail: {
        url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          validatedData.userInfo.name
        )}&background=4f46e5&color=fff&size=256&bold=true`,
      },
      fields: [
        {
          name: "📧 Contact Information",
          value: `**User:** ${sanitizedName}\n**Email:** ${sanitizedEmail}\n**User ID:** \`${validatedData.userInfo.id}\``,
          inline: false,
        },
        {
          name: "🏷️ Category",
          value: `\`${sanitizeDiscordContent(validatedData.category)}\``,
          inline: true,
        },
        {
          name: "⚡ Priority Level",
          value: `${
            PRIORITY_EMOJIS[validatedData.priority]
          } **${validatedData.priority.toUpperCase()}**`,
          inline: true,
        },
        {
          name: "📅 Submitted At",
          value: `<t:${Math.floor(Date.now() / 1000)}:F>\n*(<t:${Math.floor(
            Date.now() / 1000
          )}:R>)*`,
          inline: true,
        },
      ],
      footer: {
        text: "StartSchool Support System • Create thread to discuss this ticket",
        icon_url:
          "https://ui-avatars.com/api/?name=SS&background=10b981&color=fff&size=64&bold=true",
      },
    };

    // Add attachments info if any (files will be actually attached to Discord message)
    if (attachments.length > 0) {
      const attachmentList = attachments
        .map((file) => {
          const sizeInMB = (file.size / 1024 / 1024).toFixed(1);
          let icon = "📎";
          if (file.type.startsWith("image/")) icon = "🖼️";
          else if (file.type.startsWith("video/")) icon = "🎥";
          else if (file.type === "application/pdf") icon = "📄";
          else if (file.type === "text/plain") icon = "📝";

          return `${icon} ${file.name} (${sizeInMB}MB)`;
        })
        .join("\n");

      embed.fields.push({
        name: `📎 Attached Files (${attachments.length})`,
        value: attachmentList + "\n\n*Files are attached to this message ⬆️*",
        inline: false,
      });
    }

    // Prepare Discord payload
    const discordPayload = {
      username: "StartSchool Support Bot",
      avatar_url:
        "https://ui-avatars.com/api/?name=SS&background=4f46e5&color=fff&size=128&bold=true",
      embeds: [embed],
      content: `${
        validatedData.priority === "critical" ? "@here " : ""
      }**New ${validatedData.priority.toUpperCase()} priority ticket** received from **${sanitizedName}**`,
    };

    // Send to Discord webhook with retry logic and file attachments
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        let response: Response;

        // If no attachments, use simple JSON (more reliable)
        if (attachments.length === 0) {
          response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(discordPayload),
          });
        } else {
          // Use FormData for attachments (with better error handling)
          const discordFormData = new FormData();

          // Add the main payload
          discordFormData.append(
            "payload_json",
            JSON.stringify(discordPayload)
          );

          // Add file attachments (limit to 3 to avoid Discord issues)
          for (let i = 0; i < Math.min(attachments.length, 3); i++) {
            const file = attachments[i];
            try {
              // Convert File to Buffer for Discord
              const fileBuffer = Buffer.from(await file.arrayBuffer());
              const blob = new Blob([fileBuffer], { type: file.type });
              discordFormData.append(`files[${i}]`, blob, file.name);
            } catch (fileError) {
              console.warn(
                `Failed to process attachment ${file.name}:`,
                fileError
              );
              // Continue without this file rather than failing entirely
            }
          }

          response = await fetch(webhookUrl, {
            method: "POST",
            body: discordFormData,
          });
        }

        // Handle different response statuses
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const waitTime = retryAfter ? parseFloat(retryAfter) * 1000 : 2000;

          console.log(`Discord rate limited, waiting ${waitTime}ms...`);

          if (attempts < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            attempts++;
            continue;
          } else {
            return NextResponse.json(
              {
                error:
                  "Support system is temporarily busy. Please try again in a few minutes.",
              },
              { status: 429 }
            );
          }
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Discord webhook error:", response.status, errorText);

          // Provide more specific error messages
          let errorMessage = "Failed to send ticket to support team";
          if (response.status === 400) {
            errorMessage = "Invalid ticket data. Please check your input.";
          } else if (response.status >= 500) {
            errorMessage =
              "Support system is temporarily unavailable. Please try again later.";
          }

          return NextResponse.json(
            { error: errorMessage },
            { status: response.status >= 500 ? 503 : 500 }
          );
        }

        // Success!
        break;
      } catch (error) {
        console.error("Discord webhook request failed:", error);

        if (attempts === maxAttempts - 1) {
          return NextResponse.json(
            { error: "Failed to connect to support system" },
            { status: 500 }
          );
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      ticketId: ticketId,
      message: "Support ticket submitted successfully",
    });
  } catch (error) {
    console.error("Support ticket submission error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
