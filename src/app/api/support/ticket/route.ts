import { NextRequest, NextResponse } from "next/server";

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

// Rate limiting storage (in production, use Redis or database)
const submissionTimes = new Map<string, number>();
const globalRateLimit = new Map<string, number>();

// Discord webhook rate limiting: max 30 requests per minute
const DISCORD_RATE_LIMIT = 30;
const DISCORD_RATE_WINDOW = 60 * 1000; // 1 minute

export async function POST(request: NextRequest) {
  try {
    // Get webhook URL from environment
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Discord webhook not configured" },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await request.formData();

    const priority = formData.get("priority") as TicketData["priority"];
    const category = formData.get("category") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const userInfoStr = formData.get("userInfo") as string;

    // Validate required fields
    if (!priority || !category || !title || !description || !userInfoStr) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let userInfo: TicketData["userInfo"];
    try {
      userInfo = JSON.parse(userInfoStr);
    } catch {
      return NextResponse.json(
        { error: "Invalid user information" },
        { status: 400 }
      );
    }

    // Rate limiting: 1 ticket per user per 15 minutes
    const now = Date.now();
    const userId = userInfo.id;
    const lastSubmission = submissionTimes.get(userId) || 0;

    if (now - lastSubmission < 15 * 60 * 1000) {
      const remaining = Math.ceil(
        (15 * 60 * 1000 - (now - lastSubmission)) / 60000
      );
      return NextResponse.json(
        {
          error: `Please wait ${remaining} minutes before submitting another ticket`,
        },
        { status: 429 }
      );
    }

    // Check Discord webhook rate limiting (global)
    const webhookKey = "discord_webhook";
    const recentRequests = globalRateLimit.get(webhookKey) || 0;

    if (recentRequests >= DISCORD_RATE_LIMIT) {
      return NextResponse.json(
        {
          error:
            "Support system is currently busy. Please try again in a moment.",
        },
        { status: 429 }
      );
    }

    // Update submission time
    submissionTimes.set(userId, now);
    globalRateLimit.set(webhookKey, recentRequests + 1);

    // Reset Discord rate limit counter after window
    setTimeout(() => {
      const current = globalRateLimit.get(webhookKey) || 0;
      globalRateLimit.set(webhookKey, Math.max(0, current - 1));
    }, DISCORD_RATE_WINDOW);

    // Validate input lengths
    if (title.length > 100) {
      return NextResponse.json(
        { error: "Title must be 100 characters or less" },
        { status: 400 }
      );
    }

    if (description.length > 1000) {
      return NextResponse.json(
        { error: "Description must be 1000 characters or less" },
        { status: 400 }
      );
    }

    // Generate ticket ID
    const ticketId = `ST-${new Date().getFullYear()}-${String(Date.now()).slice(
      -6
    )}`;

    // Get current timestamp for Discord
    const timestamp = new Date().toISOString();

    // Process attachments (if any)
    const attachments = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("attachment_") && value instanceof File) {
        attachments.push(value);
      }
    }

    // Create Discord embed
    const embed = {
      title: `🎫 Support Ticket ${ticketId}`,
      description: `## ${title}\n\n${description}`,
      color: PRIORITY_COLORS[priority],
      timestamp: timestamp,
      author: {
        name: `${userInfo.name} (${userInfo.email})`,
        icon_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          userInfo.name
        )}&background=4f46e5&color=fff&size=128&bold=true`,
      },
      thumbnail: {
        url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          userInfo.name
        )}&background=4f46e5&color=fff&size=256&bold=true`,
      },
      fields: [
        {
          name: "📧 Contact Information",
          value: `**User:** ${userInfo.name}\n**Email:** ${userInfo.email}\n**User ID:** \`${userInfo.id}\``,
          inline: false,
        },
        {
          name: "🏷️ Category",
          value: `\`${category}\``,
          inline: true,
        },
        {
          name: "⚡ Priority Level",
          value: `${PRIORITY_EMOJIS[priority]} **${priority.toUpperCase()}**`,
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
        priority === "critical" ? "@here " : ""
      }**New ${priority.toUpperCase()} priority ticket** received from **${
        userInfo.name
      }**`,
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
