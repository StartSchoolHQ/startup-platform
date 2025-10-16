# Task Peer Review Workflow

## 1. Task Initiation & Progress

1. **Task Creation (Optional)**: A team member assigns a new task and can optionally choose which other team members can work on it.
2. **Start Task**: A user starts the task.
3. **Set Status**: The task status is updated to `in_progress`.

## 2. User Submits Task for Review

1. The user clicks **"Complete"**.
2. A modal appears with input fields specific to the task's requirements.
3. The user fills out the form.
4. **Set Status**: The task status is updated to `pending_review`.

## 3. External Peer Review Process

1. An **External Peer Reviewer** chooses the task to review.
2. The reviewer clicks **"Accept Testing"**.
3. **Validation**: The system checks if the reviewer belongs to the team associated with the task.
   - **If YES**: An error modal is displayed (`Show Modal that you can't do that - conflict of interest`). The process stops here for this reviewer.
   - **If NO**: The reviewer is assigned to the review, and their ID is saved (external reviewer approved).
4. A modal appears containing the original user's submission data and input fields for the review.
5. The reviewer fills out the form and makes a decision.

## 4. Review Outcome

The process diverges based on the reviewer's decision.

### A. If Accepted

1. **Set Status**: The peer review status is updated to `approved`.
2. **Reward**: Experience Points (XP) and credits are awarded to the task assignee.

### B. If Not Accepted (Declined)

1. **Set Status**: The peer review status is updated to `rejected`.
2. A **"Retry"** button is made available to the original user.
3. The user clicks **"Retry"**.
4. **Set Status**: The task status is reset to `in_progress`.
5. The flow returns to **Step 2**, where the user can work on the task again.

---

**Current Implementation Status**: ✅ The external peer review system is fully implemented and working. Users can only review tasks from teams they are NOT members of, ensuring unbiased external validation.
