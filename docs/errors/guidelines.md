# Error Handling Guidelines

**Last Updated:** January 8, 2026  
**Status:** Active - Follow these rules for all new code

---

## Core Principles

1. **Never use `alert()` or `confirm()`** - They're blocking, unprofessional, and break UX flow
2. **Never fail silently** - Users must know something went wrong
3. **Be specific** - "Email already exists" beats "Validation failed"
4. **Make errors actionable** - Tell users what to do next
5. **Use the right tool** - Toast vs inline vs field-level (see decision tree below)

---

## Decision Tree: Which Error Display to Use?

```
Is it a form validation error?
├─ YES → Use inline field-level errors (red border + message below field)
└─ NO → Is it critical/blocking?
    ├─ YES → Use inline error box at top of form
    └─ NO → Is user performing an action (submit, delete, create)?
        ├─ YES → Use toast notification
        └─ NO → Use global React Query handler (background errors)
```

---

## Pattern 1: Field-Level Errors (Form Validation)

**When to use:**

- Single field validation errors
- Real-time validation feedback
- User typing/input errors

**Example (from PasswordInput):**

```tsx
const [passwordError, setPasswordError] = useState("");

// Validate on blur or change
const validatePassword = (value: string) => {
  if (value.length < 8) {
    setPasswordError("Password must be at least 8 characters");
  } else {
    setPasswordError("");
  }
};

return (
  <div>
    <Input
      type="password"
      value={password}
      onChange={(e) => {
        setPassword(e.target.value);
        validatePassword(e.target.value);
      }}
      className={passwordError ? "border-red-500" : ""}
    />
    {passwordError && (
      <p className="text-sm text-red-500 mt-1">{passwordError}</p>
    )}
  </div>
);
```

**Key features:**

- Red border on invalid field
- Error message directly below field
- Clears automatically when user types
- Immediate visual feedback

---

## Pattern 2: Inline Error Box (Critical Form Errors)

**When to use:**

- Multiple validation errors
- Server-side validation failures
- Authentication errors
- Blocking errors that prevent form submission

**Example (from task submission modal):**

```tsx
const [validationErrors, setValidationErrors] = useState<string[]>([]);

// On submission failure
if (errors.length > 0) {
  setValidationErrors(errors);
  return;
}

return (
  <form>
    {/* Show errors at top */}
    {validationErrors.length > 0 && (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm font-medium text-red-800 mb-2">
          Please fix the following errors:
        </p>
        <ul className="list-disc list-inside text-sm text-red-700">
          {validationErrors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Form fields below */}
  </form>
);
```

**Key features:**

- Visible at top of form (user sees immediately)
- Lists all errors together
- Stays visible until fixed
- Use red background for high visibility

---

## Pattern 3: Toast Notifications (Action Feedback)

**When to use:**

- Success confirmations
- Background operation failures
- Non-blocking errors
- Actions with delayed results

**Example (using Sonner):**

```tsx
import { toast } from "sonner";

// Success
toast.success("Team created successfully");

// Error - Simple
toast.error("Failed to delete task");

// Error - With description
toast.error("Failed to submit task", {
  description: "Please check your file size is under 5MB",
});

// Error - With action button
toast.error("Not enough credits", {
  description: "You need 55 more credits to create a team",
  action: {
    label: "Get Credits",
    onClick: () => router.push("/pricing"),
  },
});
```

**Best practices:**

- Keep toast message short (< 50 chars)
- Use description for details
- Add action button for next steps
- Auto-dismiss after 5 seconds (default)

---

## Pattern 4: Global React Query Handler (Safety Net)

**Already implemented in `src/components/providers.tsx`**

**When it triggers:**

- Any mutation without custom `onError` handler
- Catches errors you forgot to handle
- Background operations

**Example:**

```tsx
// This will use global handler
const mutation = useMutation({
  mutationFn: updateProfile,
  // No onError → global handler shows toast
});

// This overrides global handler
const mutation = useMutation({
  mutationFn: deleteTeam,
  onError: (error) => {
    // Custom handling - global handler does NOT run
    toast.error("Failed to delete team", {
      description: error.message,
    });
  },
});
```

**Don't rely on it:**

- Always add custom `onError` for important actions
- Global handler is a safety net, not primary error handling

---

## API Error Responses: Current vs Future

### Current Pattern (What We Have Now)

```typescript
// API Route
export async function POST(request: Request) {
  try {
    const result = await doSomething();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Frontend
const response = await fetch("/api/something", { method: "POST" });
if (!response.ok) {
  throw new Error("Internal server error"); // Generic
}
```

### Future Pattern (When We Add Error Codes - See BIG_PLAN.md)

```typescript
// API Route (V2)
export async function POST(request: Request) {
  try {
    const result = await doSomethingV2();
    return NextResponse.json(result);
  } catch (error) {
    const apiError = mapError(error);
    return NextResponse.json(
      {
        error: {
          code: apiError.code,
          message: apiError.message,
          details: apiError.details,
        },
      },
      { status: apiError.httpStatus }
    );
  }
}

// Frontend (V2)
const response = await fetch("/api/something", { method: "POST" });
if (!response.ok) {
  const data = await response.json();

  switch (data.error.code) {
    case "INSUFFICIENT_CREDITS":
      toast.error("Not enough credits", {
        description: `You need ${data.error.details.required} credits`,
      });
      break;
    case "FILE_TOO_LARGE":
      setFileError("File must be under 5MB");
      break;
    default:
      toast.error(data.error.message);
  }
}
```

**For now:** Use current pattern. Don't implement error codes until we're ready for V2 migration.

---

## Function Return Patterns

### ❌ BAD: Silent Boolean Returns

```typescript
// DON'T DO THIS
export async function createTeam(data: TeamData): Promise<boolean> {
  try {
    await supabase.from("teams").insert(data);
    return true;
  } catch {
    return false; // Error lost! Was it permissions? Network? Validation?
  }
}
```

### ✅ GOOD: Throw Errors with Context

```typescript
// DO THIS
export async function createTeam(data: TeamData): Promise<Team> {
  const { data: team, error } = await supabase
    .from("teams")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create team: ${error.message}`);
  }

  return team;
}

// Frontend handles with try/catch
try {
  const team = await createTeam(data);
  toast.success("Team created!");
} catch (error) {
  toast.error("Failed to create team", {
    description: error.message,
  });
}
```

### 🔵 ACCEPTABLE: Result Pattern (For Complex Cases)

```typescript
// Use when you need detailed error info
interface Result<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    field?: string;
    code?: string;
  };
}

export async function createTeam(data: TeamData): Promise<Result<Team>> {
  try {
    const { data: team, error } = await supabase
      .from("teams")
      .insert(data)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: {
          message: "Failed to create team",
          code: error.code,
        },
      };
    }

    return { success: true, data: team };
  } catch (error) {
    return {
      success: false,
      error: { message: "Unexpected error occurred" },
    };
  }
}
```

**When to use Result pattern:**

- Multiple error types need different handling
- Validation errors with field names
- During V2 migration from boolean returns

---

## React Query Mutations: Best Practices

### ✅ Complete Example

```tsx
const createTeamMutation = useMutation({
  mutationFn: async (data: TeamFormData) => {
    const response = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create team");
    }

    return response.json();
  },

  onSuccess: (team) => {
    toast.success("Team created successfully!");
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    router.push(`/dashboard/team/${team.id}`);
  },

  onError: (error: Error) => {
    toast.error("Failed to create team", {
      description: error.message,
    });
  },
});

// In component
<Button
  onClick={() => createTeamMutation.mutate(formData)}
  disabled={createTeamMutation.isPending}
>
  {createTeamMutation.isPending ? "Creating..." : "Create Team"}
</Button>;
```

**Key points:**

- Always add `onError` handler (don't rely on global)
- Show loading state with `isPending`
- Invalidate queries on success
- Navigate after successful creation
- Disable button during mutation

---

## Validation: Zod Schemas

### Backend Validation (API Routes)

```typescript
import { z } from "zod";

const TeamSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters"),
  credits: z.number().min(50, "Minimum 50 credits required"),
  members: z.array(z.string().email()).max(5, "Maximum 5 members allowed"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validatedData = TeamSchema.parse(body);

    // ... create team with validatedData
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return structured validation errors
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Frontend: Display Zod Errors

```tsx
// After API call fails
try {
  const response = await fetch("/api/teams", { method: "POST", ... });
  if (!response.ok) {
    const error = await response.json();

    if (error.details) {
      // Show field-specific errors
      error.details.forEach((detail) => {
        if (detail.field === "name") {
          setNameError(detail.message);
        }
        if (detail.field === "credits") {
          setCreditsError(detail.message);
        }
      });
    } else {
      // Show generic error
      toast.error(error.error);
    }
  }
} catch (error) {
  toast.error("Failed to create team");
}
```

---

## Error Messages: Writing Guide

### ❌ Bad Messages

- "Error" (what error?)
- "Something went wrong" (no context)
- "Invalid input" (which field?)
- "Internal server error" (user can't fix)
- "Failed" (what failed?)

### ✅ Good Messages

- "Email already exists" (specific + fixable)
- "File size must be under 5MB" (actionable)
- "You need 45 more credits to create a team" (specific numbers)
- "Password must contain at least one number" (clear requirement)
- "Team name already taken. Try 'Awesome Team 2'" (suggestion)

### Formula for Good Error Messages

```
[WHAT FAILED] + [WHY IT FAILED] + [HOW TO FIX]

Examples:
"Failed to upload file (8MB) - maximum size is 5MB. Please compress or choose a smaller file."
"Cannot create team - you need 50 credits but only have 5. Get more credits or reduce team size."
"Password too weak - must include uppercase, number, and special character."
```

---

## High-Risk Changes: V2 Pattern

**When existing functions need breaking changes (see BIG_PLAN.md for full details)**

### Rule: Never Break Working Code

If a function is currently used in production:

1. Create V2 version alongside old one
2. Migrate callers one at a time
3. Test thoroughly on `develop` branch
4. Remove old function only after all callers migrated

### Example

```typescript
// lib/tasks.ts

// OLD - Keep working during migration
export async function completeTask(id: string): Promise<boolean> {
  // Don't modify this - callers depend on boolean return
  const result = await completeTaskV2(id);
  return result.success;
}

// NEW - With better error handling
export async function completeTaskV2(id: string): Promise<TaskResult> {
  try {
    const { data, error } = await supabase.rpc("complete_task", { id });

    if (error) {
      return {
        success: false,
        error: {
          code: mapError(error),
          message: getUserMessage(error),
        },
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected error occurred",
      },
    };
  }
}
```

**Migration steps:**

1. Create V2 function
2. Update ONE component to use V2
3. Test on `develop`
4. Merge to `master` (both functions exist)
5. Migrate remaining components
6. Remove old function

---

## Checklist for New Features

When adding error handling to new features:

- [ ] No `alert()` or `confirm()` calls
- [ ] Form validation uses inline field errors
- [ ] Critical errors use inline error box
- [ ] Actions use toast notifications
- [ ] React Query mutations have `onError` handler
- [ ] Loading states shown during mutations
- [ ] Error messages are specific and actionable
- [ ] Zod validation errors are surfaced to user
- [ ] Function returns errors (not silent boolean)
- [ ] Tested error states (not just happy path)

---

## Common Mistakes to Avoid

### 1. Catching errors but not showing them

```typescript
// ❌ BAD
try {
  await createTeam(data);
} catch {
  // Silent failure - user has no idea
}

// ✅ GOOD
try {
  await createTeam(data);
} catch (error) {
  toast.error("Failed to create team", {
    description: error.message,
  });
}
```

### 2. Generic error messages when you have specifics

```typescript
// ❌ BAD
if (credits < 50) {
  throw new Error("Validation failed");
}

// ✅ GOOD
if (credits < 50) {
  throw new Error(`Insufficient credits: You have ${credits} but need 50`);
}
```

### 3. Not showing loading states

```typescript
// ❌ BAD
<Button onClick={handleSubmit}>Submit</Button>

// ✅ GOOD
<Button onClick={handleSubmit} disabled={isLoading}>
  {isLoading ? "Submitting..." : "Submit"}
</Button>
```

### 4. Forgetting to clear errors

```typescript
// ❌ BAD - Error persists forever
const [error, setError] = useState("");

// ✅ GOOD - Clear when user types
<Input
  onChange={(e) => {
    setValue(e.target.value);
    setError(""); // Clear error on change
  }}
/>;
```

### 5. Using boolean returns

```typescript
// ❌ BAD - Error context lost
async function saveData(): Promise<boolean> {
  try {
    await supabase.from("data").insert(data);
    return true;
  } catch {
    return false; // What went wrong?
  }
}

// ✅ GOOD - Throw with context
async function saveData(): Promise<Data> {
  const { data, error } = await supabase
    .from("data")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`Failed to save: ${error.message}`);
  return data;
}
```

---

## Testing Error States

### Manual Testing Checklist

When testing a feature, intentionally cause errors:

- [ ] Submit form with empty required fields
- [ ] Submit form with invalid email format
- [ ] Try to create duplicate (name already exists)
- [ ] Test with insufficient credits/permissions
- [ ] Upload file that's too large
- [ ] Upload wrong file type
- [ ] Disconnect internet and submit
- [ ] Clear session and try protected action
- [ ] Submit form twice rapidly (race condition)

### Verify Error UX

For each error above:

- [ ] User sees clear error message
- [ ] User knows what to do next
- [ ] Error doesn't break UI
- [ ] Error clears when user fixes issue
- [ ] Loading states work correctly

---

## Future Improvements (Documented in BIG_PLAN.md)

**Planned but not yet implemented:**

1. Error codes in API responses
2. Enhanced error boundaries with report button
3. Network detection for offline errors
4. Error analytics tracking
5. i18n for error messages

**Don't implement these yet** - they're documented for future work.

---

## Questions? Check These Files

- **Current analysis:** `docs/errors/error_feedback.md`
- **Future roadmap:** `docs/BIG_PLAN.md`
- **Error boundaries:** `src/components/error-boundary.tsx`
- **Global handler:** `src/components/providers.tsx`
- **Good examples:**
  - Field errors: `src/app/login/page.tsx`
  - Inline errors: `src/components/ui/task-details-modal.tsx`
  - Toast: `src/app/dashboard/my-journey/page.tsx`

---

**Last reminder:** When in doubt, prefer showing too much error info over too little. Users can always ignore extra details, but they can't fix problems they don't understand.
