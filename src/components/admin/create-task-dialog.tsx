"use client";

import { useState, useEffect } from "react";
import { Plus, Lightbulb, FileText, Users, Eye, Trash2 } from "lucide-react";
// Removed problematic imports that were breaking Turbopack
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Switch component removed - not currently used
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createTask,
  type TipContent,
  type PeerReviewCriteria,
  type ResourceItem,
} from "@/lib/database";
import { getTemplate } from "@/lib/task-templates";
import { generateNextTemplateCode } from "@/lib/template-codes";

interface CreateTaskDialogProps {
  defaultTaskType?: "team" | "individual";
}

export function CreateTaskDialog({
  defaultTaskType = "team",
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  // Basic form state
  const [taskContext, setTaskContext] = useState<"individual" | "team">(
    defaultTaskType
  );
  const [templateCode, setTemplateCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("product-foundation");
  const [priority, setPriority] = useState("medium");
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [baseXpReward, setBaseXpReward] = useState(100);
  const [basePointsReward, setBasePointsReward] = useState(10);
  const [requiresReview, setRequiresReview] = useState(false);

  // Rich content state
  const [detailedInstructions, setDetailedInstructions] = useState("");
  const [tipsContent, setTipsContent] = useState<TipContent[]>([]);
  const [peerReviewCriteria, setPeerReviewCriteria] = useState<
    PeerReviewCriteria[]
  >([]);
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [reviewInstructions, setReviewInstructions] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Recurring task fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [cooldownDays, setCooldownDays] = useState(7);
  const [isConfidential, setIsConfidential] = useState(false);

  // Auto-set category to repeatable-tasks when isRecurring is checked
  useEffect(() => {
    if (isRecurring) {
      setCategory("repeatable-tasks");
    }
  }, [isRecurring]);

  // Auto-generate template code and set peer review when context or category changes
  useEffect(() => {
    let isCancelled = false;

    const generateCode = async () => {
      if (!isCancelled) {
        try {
          const result = await generateNextTemplateCode(category, taskContext);
          setTemplateCode(result.code);
        } catch (error) {
          console.error("Error generating template code:", error);
          // Fallback to simple generation
          const categoryMap: Record<
            string,
            { individual: string; team: string }
          > = {
            "customer-acquisition": {
              individual: "CUST-ACQ",
              team: "TEAM-CUST",
            },
            "product-foundation": {
              individual: "PROD-FOUND",
              team: "TEAM-PROD",
            },
            "idea-validation": { individual: "IDEA-VAL", team: "TEAM-IDEA" },
            "repeatable-tasks": { individual: "REPEAT", team: "REPEAT" },
            "team-growth": { individual: "GROWTH", team: "TEAM-GROW" },
            "legal-finance": { individual: "LEGAL-FIN", team: "TEAM-LEGAL" },
            pitch: { individual: "PITCH", team: "TEAM-PITCH" },
          };

          const prefix =
            categoryMap[category]?.[taskContext] ||
            (taskContext === "individual" ? "SKILL-FUND" : "TEAM-TASK");

          const randomNum = Math.floor(Math.random() * 99) + 1;
          const newCode = `${prefix}-${randomNum.toString().padStart(2, "0")}`;
          setTemplateCode(newCode);
        }
      }
    };

    // Enforce business rules: team tasks always require review, individual tasks never do
    const shouldRequireReview = taskContext === "team";
    setRequiresReview(shouldRequireReview);

    generateCode();

    return () => {
      isCancelled = true;
    };
  }, [taskContext, category]);

  // Load template content when category or context changes
  const loadTemplate = () => {
    const template = getTemplate(category, taskContext);
    if (template) {
      setDetailedInstructions(template.detailedInstructions);
      setTipsContent(template.tips);
      setPeerReviewCriteria(template.peerReviewCriteria);
      setLearningObjectives(template.learningObjectives);
      setDeliverables(template.deliverables);
      setResources(template.resources);
      setTags(template.tags);
    }
  };

  // Helper functions for managing dynamic lists
  const addTip = () => {
    setTipsContent([...tipsContent, { title: "", content: "" }]);
  };

  const updateTip = (
    index: number,
    field: "title" | "content",
    value: string
  ) => {
    const updated = [...tipsContent];
    updated[index][field] = value;
    setTipsContent(updated);
  };

  const removeTip = (index: number) => {
    setTipsContent(tipsContent.filter((_, i) => i !== index));
  };

  const addPeerReviewCategory = () => {
    setPeerReviewCriteria([
      ...peerReviewCriteria,
      { category: "", points: [""] },
    ]);
  };

  const updatePeerReviewCategory = (index: number, category: string) => {
    const updated = [...peerReviewCriteria];
    updated[index].category = category;
    setPeerReviewCriteria(updated);
  };

  const addPeerReviewPoint = (categoryIndex: number) => {
    const updated = [...peerReviewCriteria];
    updated[categoryIndex].points.push("");
    setPeerReviewCriteria(updated);
  };

  const updatePeerReviewPoint = (
    categoryIndex: number,
    pointIndex: number,
    value: string
  ) => {
    const updated = [...peerReviewCriteria];
    updated[categoryIndex].points[pointIndex] = value;
    setPeerReviewCriteria(updated);
  };

  const removePeerReviewPoint = (categoryIndex: number, pointIndex: number) => {
    const updated = [...peerReviewCriteria];
    updated[categoryIndex].points = updated[categoryIndex].points.filter(
      (_, i) => i !== pointIndex
    );
    setPeerReviewCriteria(updated);
  };

  const removePeerReviewCategory = (index: number) => {
    setPeerReviewCriteria(peerReviewCriteria.filter((_, i) => i !== index));
  };

  const addLearningObjective = () => {
    setLearningObjectives([...learningObjectives, ""]);
  };

  const updateLearningObjective = (index: number, value: string) => {
    const updated = [...learningObjectives];
    updated[index] = value;
    setLearningObjectives(updated);
  };

  const removeLearningObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const addDeliverable = () => {
    setDeliverables([...deliverables, ""]);
  };

  const updateDeliverable = (index: number, value: string) => {
    const updated = [...deliverables];
    updated[index] = value;
    setDeliverables(updated);
  };

  const removeDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const addResource = () => {
    setResources([
      ...resources,
      { title: "", description: "", type: "documentation" },
    ]);
  };

  const updateResource = (
    index: number,
    field: keyof ResourceItem,
    value: string
  ) => {
    const updated = [...resources];
    updated[index] = { ...updated[index], [field]: value };
    setResources(updated);
  };

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!templateCode.trim() || !title.trim()) {
      setError("Template code and title are required");
      return;
    }

    if (difficultyLevel < 1 || difficultyLevel > 5) {
      setError("Difficulty level must be between 1 and 5");
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData = {
        templateCode: templateCode.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        detailedInstructions: detailedInstructions.trim() || undefined,
        category: category as
          | "customer-acquisition"
          | "product-foundation"
          | "idea-validation"
          | "repeatable-tasks"
          | "team-growth"
          | "legal-finance"
          | "pitch",
        priority: priority as "low" | "medium" | "high" | "critical",
        difficultyLevel,
        estimatedHours,
        baseXpReward,
        basePointsReward,
        requiresReview: taskContext === "team" ? true : requiresReview, // Force true for team tasks
        taskContext,
        tipsContent: tipsContent.length > 0 ? tipsContent : undefined,
        peerReviewCriteria:
          peerReviewCriteria.length > 0 ? peerReviewCriteria : undefined,
        learningObjectives:
          learningObjectives.filter((obj) => obj.trim()).length > 0
            ? learningObjectives.filter((obj) => obj.trim())
            : undefined,
        deliverables:
          deliverables.filter((del) => del.trim()).length > 0
            ? deliverables.filter((del) => del.trim())
            : undefined,
        resources: resources.length > 0 ? resources : undefined,
        reviewInstructions: reviewInstructions.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        isRecurring,
        cooldownDays: isRecurring ? cooldownDays : undefined,
        isConfidential,
      };

      await createTask(taskData);

      setSuccess("Task created successfully!");

      // Reset form
      setTaskContext(defaultTaskType);
      setTemplateCode("");
      setTitle("");
      setDescription("");
      setDetailedInstructions("");
      setTipsContent([]);
      setPeerReviewCriteria([]);
      setLearningObjectives([]);
      setDeliverables([]);
      setResources([]);
      setReviewInstructions("");
      setTags([]);
      setCategory("development");
      setPriority("medium");
      setDifficultyLevel(1);
      setEstimatedHours(0);
      setBaseXpReward(100);
      setBasePointsReward(10);
      setRequiresReview(false);
      setIsRecurring(false);
      setCooldownDays(7);
      setIsConfidential(false);
      setActiveTab("basic");

      // Close dialog after 2 seconds
      setTimeout(() => {
        setOpen(false);
        setSuccess("");
      }, 2000);
    } catch (error) {
      console.error("Error creating task:", error);

      // Extract more specific error messages
      let errorMessage = "Failed to create task. Please try again.";
      if (error && typeof error === "object" && "message" in error) {
        const message = (error as { message: string }).message;
        if (message.includes("difficulty_level_check")) {
          errorMessage = "Difficulty level must be between 1 and 5.";
        } else if (message.includes("template_code")) {
          errorMessage =
            "Template code already exists. Please use a different code.";
        } else {
          errorMessage = message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90">
          <Plus className="mr-2 h-4 w-4" />
          Add New {defaultTaskType === "team" ? "Team" : "Individual"} Task
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[80vh] max-w-2xl flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Create New {taskContext === "team" ? "Team" : "Individual"} Task
            Template
          </DialogTitle>
          <DialogDescription>
            {taskContext === "team"
              ? "Create a new team task template for collaborative project work. Team tasks always require peer review."
              : "Create a new individual task template for personal learning and skill building. Individual tasks are completed solo without peer review."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-primary/10 border-primary/20 text-primary rounded-lg border p-3 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList
              className={`grid w-full ${
                taskContext === "individual" ? "grid-cols-4" : "grid-cols-5"
              } flex-shrink-0`}
            >
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="tips">Tips</TabsTrigger>
              {taskContext === "team" && (
                <TabsTrigger value="review">Review</TabsTrigger>
              )}
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent
              value="basic"
              className="min-h-0 flex-1 space-y-4 overflow-y-auto"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-black dark:text-white" />
                    Basic Task Information
                  </CardTitle>
                  <CardDescription>
                    Set up the core properties and metadata for your task
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Task Type Display */}
                  <div className="space-y-2">
                    <Label>Task Type</Label>
                    <div className="bg-muted flex items-center gap-2 rounded-lg p-3">
                      <Badge
                        variant="secondary"
                        className={
                          taskContext === "team"
                            ? "bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                            : ""
                        }
                      >
                        {taskContext === "team"
                          ? "Team Task"
                          : "Individual Task"}
                      </Badge>
                      <span className="text-muted-foreground text-sm">
                        {taskContext === "team"
                          ? "Collaborative project work assigned to teams"
                          : "Personal learning/skill building assigned to individuals"}
                      </span>
                    </div>
                  </div>

                  {/* Template Code and Title */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="templateCode">Template Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="templateCode"
                          value={templateCode}
                          readOnly
                          className="bg-muted/50"
                          placeholder="Auto-generated"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const result = await generateNextTemplateCode(
                                category,
                                taskContext
                              );
                              setTemplateCode(result.code);
                            } catch (error) {
                              console.error(
                                "Error regenerating template code:",
                                error
                              );
                              // Fallback to simple generation
                              const categoryMap: Record<
                                string,
                                { individual: string; team: string }
                              > = {
                                onboarding: {
                                  individual: "ONB-FUND",
                                  team: "TEAM-ONB",
                                },
                                development: {
                                  individual: "DEV-SKILL",
                                  team: "TEAM-PROD",
                                },
                                design: {
                                  individual: "DES-SKILL",
                                  team: "TEAM-PROD",
                                },
                                marketing: {
                                  individual: "MKT-SKILL",
                                  team: "TEAM-CUST",
                                },
                                business: {
                                  individual: "BIZ-FUND",
                                  team: "TEAM-GROW",
                                },
                                testing: {
                                  individual: "TEST-SKILL",
                                  team: "TEAM-PROD",
                                },
                                deployment: {
                                  individual: "DEP-SKILL",
                                  team: "TEAM-PROD",
                                },
                                milestone: {
                                  individual: "MILE-FUND",
                                  team: "TEAM-GROW",
                                },
                                "customer-acquisition": {
                                  individual: "CUST-ACQ",
                                  team: "TEAM-CUST",
                                },
                                "product-foundation": {
                                  individual: "PROD-FOUND",
                                  team: "TEAM-PROD",
                                },
                                "idea-validation": {
                                  individual: "IDEA-VAL",
                                  team: "TEAM-IDEA",
                                },
                                "repeatable-tasks": {
                                  individual: "REPEAT",
                                  team: "REPEAT",
                                },
                                "team-growth": {
                                  individual: "GROWTH",
                                  team: "TEAM-GROW",
                                },
                                "legal-finance": {
                                  individual: "LEGAL-FIN",
                                  team: "TEAM-LEGAL",
                                },
                                pitch: {
                                  individual: "PITCH",
                                  team: "TEAM-PITCH",
                                },
                              };

                              const prefix =
                                categoryMap[category]?.[taskContext] ||
                                (taskContext === "individual"
                                  ? "SKILL-FUND"
                                  : "TEAM-TASK");

                              const randomNum =
                                Math.floor(Math.random() * 99) + 1;
                              const newCode = `${prefix}-${randomNum
                                .toString()
                                .padStart(2, "0")}`;
                              setTemplateCode(newCode);
                            }
                          }}
                          disabled={isSubmitting}
                          title="Generate new template code"
                        >
                          🔄
                        </Button>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Sequential numbering based on existing tasks
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Task Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Create Landing Page"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this task involves..."
                      className="min-h-[80px]"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Category and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={category}
                        onValueChange={setCategory}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer-acquisition">
                            Customer Acquisition
                          </SelectItem>
                          <SelectItem value="product-foundation">
                            Product Foundation
                          </SelectItem>
                          <SelectItem value="idea-validation">
                            Idea Validation
                          </SelectItem>
                          <SelectItem value="repeatable-tasks">
                            Repeatable Tasks
                          </SelectItem>
                          <SelectItem value="team-growth">
                            Team Growth
                          </SelectItem>
                          <SelectItem value="legal-finance">
                            Legal & Finance
                          </SelectItem>
                          <SelectItem value="pitch">Pitch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={priority}
                        onValueChange={setPriority}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Numeric Fields */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficultyLevel">Difficulty (1-5)</Label>
                      <Input
                        id="difficultyLevel"
                        type="number"
                        min="1"
                        max="5"
                        value={difficultyLevel}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setDifficultyLevel(Math.min(Math.max(value, 1), 5));
                        }}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="baseXpReward">XP Reward</Label>
                      <Input
                        id="baseXpReward"
                        type="number"
                        min="0"
                        value={baseXpReward}
                        onChange={(e) =>
                          setBaseXpReward(parseInt(e.target.value) || 0)
                        }
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basePointsReward">Points Reward</Label>
                      <Input
                        id="basePointsReward"
                        type="number"
                        min="0"
                        value={basePointsReward}
                        onChange={(e) =>
                          setBasePointsReward(parseInt(e.target.value) || 0)
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Estimated Hours */}
                  <div className="space-y-2">
                    <Label htmlFor="estimatedHours">
                      Estimated Hours (Optional)
                    </Label>
                    <Input
                      id="estimatedHours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={estimatedHours}
                      onChange={(e) =>
                        setEstimatedHours(parseFloat(e.target.value) || 0)
                      }
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                    <p className="text-muted-foreground text-xs">
                      Leave as 0 if you don&apos;t want to track time estimates
                    </p>
                  </div>

                  {/* Recurring Task Options */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isRecurring">Recurring Task</Label>
                        <p className="text-muted-foreground text-xs">
                          Task can be completed multiple times with cooldown
                          period
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        id="isRecurring"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        disabled={isSubmitting}
                        className="h-4 w-4"
                      />
                    </div>

                    {isRecurring && (
                      <div className="space-y-2">
                        <Label htmlFor="cooldownDays">
                          Cooldown Days (1-365)
                        </Label>
                        <Input
                          id="cooldownDays"
                          type="number"
                          min="1"
                          max="365"
                          value={cooldownDays}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 7;
                            setCooldownDays(Math.min(Math.max(value, 1), 365));
                          }}
                          disabled={isSubmitting}
                        />
                        <p className="text-muted-foreground text-xs">
                          Days before task can be completed again
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isConfidential">
                          Confidential Task
                        </Label>
                        <p className="text-muted-foreground text-xs">
                          Hide task details from public view
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        id="isConfidential"
                        checked={isConfidential}
                        onChange={(e) => setIsConfidential(e.target.checked)}
                        disabled={isSubmitting}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>

                  {/* Template Loading */}
                  <div className="border-t pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={loadTemplate}
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Load Content Template
                    </Button>
                    <p className="text-muted-foreground mt-2 text-center text-xs">
                      Populate rich content fields with example content based on
                      category
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="content"
              className="min-h-0 flex-1 space-y-4 overflow-y-auto"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-black dark:text-white" />
                    Detailed Instructions
                  </CardTitle>
                  <CardDescription>
                    Provide comprehensive instructions and context for this task
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="detailedInstructions">
                      Detailed Instructions
                    </Label>
                    <Textarea
                      id="detailedInstructions"
                      value={detailedInstructions}
                      onChange={(e) => setDetailedInstructions(e.target.value)}
                      placeholder="Provide detailed step-by-step instructions, requirements, acceptance criteria, and any additional context..."
                      className="min-h-[200px] font-mono text-sm"
                      disabled={isSubmitting}
                    />
                    <p className="text-muted-foreground text-xs">
                      Supports Markdown formatting. This content will be
                      displayed prominently in the task details.
                    </p>
                  </div>

                  {/* Learning Objectives */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Learning Objectives</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addLearningObjective}
                        disabled={isSubmitting}
                      >
                        Add Objective
                      </Button>
                    </div>
                    {learningObjectives.map((objective, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={objective}
                          onChange={(e) =>
                            updateLearningObjective(index, e.target.value)
                          }
                          placeholder="What will users learn from this task?"
                          disabled={isSubmitting}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLearningObjective(index)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {learningObjectives.length === 0 && (
                      <p className="text-muted-foreground text-sm italic">
                        No learning objectives added yet
                      </p>
                    )}
                  </div>

                  {/* Deliverables */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Expected Deliverables</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addDeliverable}
                        disabled={isSubmitting}
                      >
                        Add Deliverable
                      </Button>
                    </div>
                    {deliverables.map((deliverable, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={deliverable}
                          onChange={(e) =>
                            updateDeliverable(index, e.target.value)
                          }
                          placeholder="What should be submitted for this task?"
                          disabled={isSubmitting}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDeliverable(index)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {deliverables.length === 0 && (
                      <p className="text-muted-foreground text-sm italic">
                        No deliverables specified yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="tips"
              className="min-h-0 flex-1 space-y-4 overflow-y-auto"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-black dark:text-white" />
                    Tips & Resources
                  </CardTitle>
                  <CardDescription>
                    Add helpful tips, best practices, and useful resources
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tips Content */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tips & Best Practices</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addTip}
                        disabled={isSubmitting}
                      >
                        Add Tip
                      </Button>
                    </div>
                    {tipsContent.map((tip, index) => (
                      <div
                        key={index}
                        className="space-y-2 rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={tip.title}
                            onChange={(e) =>
                              updateTip(index, "title", e.target.value)
                            }
                            placeholder="Tip title (e.g., 'Best Practices', 'Common Pitfalls')"
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTip(index)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={tip.content}
                          onChange={(e) =>
                            updateTip(index, "content", e.target.value)
                          }
                          placeholder="Tip content - provide helpful advice, common mistakes to avoid, or best practices..."
                          className="min-h-[80px]"
                          disabled={isSubmitting}
                        />
                      </div>
                    ))}
                    {tipsContent.length === 0 && (
                      <p className="text-muted-foreground text-sm italic">
                        No tips added yet
                      </p>
                    )}
                  </div>

                  {/* Resources */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>External Resources</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addResource}
                        disabled={isSubmitting}
                      >
                        Add Resource
                      </Button>
                    </div>
                    {resources.map((resource, index) => (
                      <div
                        key={index}
                        className="space-y-2 rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={resource.title}
                            onChange={(e) =>
                              updateResource(index, "title", e.target.value)
                            }
                            placeholder="Resource title"
                            disabled={isSubmitting}
                            className="flex-1"
                          />
                          <Select
                            value={resource.type}
                            onValueChange={(value) =>
                              updateResource(index, "type", value)
                            }
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="documentation">
                                Docs
                              </SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="article">Article</SelectItem>
                              <SelectItem value="tool">Tool</SelectItem>
                              <SelectItem value="example">Example</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeResource(index)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          value={resource.url || ""}
                          onChange={(e) =>
                            updateResource(index, "url", e.target.value)
                          }
                          placeholder="Resource URL (optional)"
                          disabled={isSubmitting}
                        />
                        <Textarea
                          value={resource.description}
                          onChange={(e) =>
                            updateResource(index, "description", e.target.value)
                          }
                          placeholder="Brief description of this resource and how it helps..."
                          className="min-h-[60px]"
                          disabled={isSubmitting}
                        />
                      </div>
                    ))}
                    {resources.length === 0 && (
                      <p className="text-muted-foreground text-sm italic">
                        No resources added yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="review"
              className="min-h-0 flex-1 space-y-4 overflow-y-auto"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-black dark:text-white" />
                    Peer Review Criteria
                  </CardTitle>
                  <CardDescription>
                    Define what reviewers should evaluate when assessing task
                    submissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {requiresReview ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>Review Categories</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addPeerReviewCategory}
                          disabled={isSubmitting}
                        >
                          Add Category
                        </Button>
                      </div>
                      {peerReviewCriteria.map((criteria, categoryIndex) => (
                        <div
                          key={categoryIndex}
                          className="space-y-2 rounded-lg border p-4"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={criteria.category}
                              onChange={(e) =>
                                updatePeerReviewCategory(
                                  categoryIndex,
                                  e.target.value
                                )
                              }
                              placeholder="Category name (e.g., 'Code Quality', 'Design', 'Functionality')"
                              disabled={isSubmitting}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                removePeerReviewCategory(categoryIndex)
                              }
                              disabled={isSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="border-muted space-y-2 border-l-2 pl-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Review Points</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  addPeerReviewPoint(categoryIndex)
                                }
                                disabled={isSubmitting}
                              >
                                Add Point
                              </Button>
                            </div>
                            {criteria.points.map((point, pointIndex) => (
                              <div
                                key={pointIndex}
                                className="flex items-center gap-2"
                              >
                                <Input
                                  value={point}
                                  onChange={(e) =>
                                    updatePeerReviewPoint(
                                      categoryIndex,
                                      pointIndex,
                                      e.target.value
                                    )
                                  }
                                  placeholder="What should reviewers check for this category?"
                                  disabled={isSubmitting}
                                  className="text-sm"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    removePeerReviewPoint(
                                      categoryIndex,
                                      pointIndex
                                    )
                                  }
                                  disabled={isSubmitting}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {peerReviewCriteria.length === 0 && (
                        <p className="text-muted-foreground text-sm italic">
                          No review criteria defined yet
                        </p>
                      )}

                      {/* Review Instructions */}
                      <div className="space-y-2">
                        <Label htmlFor="reviewInstructions">
                          Additional Review Instructions
                        </Label>
                        <Textarea
                          id="reviewInstructions"
                          value={reviewInstructions}
                          onChange={(e) =>
                            setReviewInstructions(e.target.value)
                          }
                          placeholder="Provide additional context or instructions for reviewers..."
                          className="min-h-[100px]"
                          disabled={isSubmitting}
                        />
                        <p className="text-muted-foreground text-xs">
                          Optional: Any special instructions for how peer
                          reviews should be conducted
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                      <h3 className="mb-2 text-lg font-medium">
                        No Peer Review Required
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        This task does not require peer review. Enable
                        &quot;Requires Review&quot; in the Basic tab to
                        configure review criteria.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setRequiresReview(true);
                          setActiveTab("basic");
                        }}
                        disabled={isSubmitting}
                      >
                        Enable Peer Review
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="preview"
              className="min-h-0 flex-1 space-y-4 overflow-y-auto"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-black dark:text-white" />
                    Task Preview
                  </CardTitle>
                  <CardDescription>
                    See how your task will appear to users
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/20 rounded-lg border p-6">
                    <div className="space-y-4">
                      {/* Task Header */}
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="secondary">{templateCode}</Badge>
                          <Badge
                            variant={
                              priority === "high" || priority === "critical"
                                ? "destructive"
                                : "default"
                            }
                          >
                            {priority}
                          </Badge>
                          <Badge variant="outline">{category}</Badge>
                        </div>
                        <h1 className="text-2xl font-bold">
                          {title || "Task Title"}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                          {description || "Task description"}
                        </p>
                      </div>

                      {/* Task Details */}
                      <div className="grid grid-cols-3 gap-4 border-y py-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {difficultyLevel}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Difficulty
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {baseXpReward}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            XP Reward
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {basePointsReward}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Points
                          </div>
                        </div>
                      </div>

                      {/* Detailed Instructions */}
                      {detailedInstructions && (
                        <div>
                          <h3 className="mb-2 font-semibold">
                            Detailed Instructions
                          </h3>
                          <div className="prose prose-sm max-w-none space-y-2">
                            {detailedInstructions
                              .split("\n")
                              .map((line, index) => {
                                const trimmedLine = line.trim();

                                if (!trimmedLine)
                                  return <div key={index} className="h-2" />;

                                // Headers
                                if (trimmedLine.startsWith("### ")) {
                                  return (
                                    <h3
                                      key={index}
                                      className="my-2 text-sm font-medium"
                                    >
                                      {trimmedLine.slice(4)}
                                    </h3>
                                  );
                                }
                                if (trimmedLine.startsWith("## ")) {
                                  return (
                                    <h2
                                      key={index}
                                      className="my-2 text-base font-semibold"
                                    >
                                      {trimmedLine.slice(3)}
                                    </h2>
                                  );
                                }
                                if (trimmedLine.startsWith("# ")) {
                                  return (
                                    <h1
                                      key={index}
                                      className="my-2 text-lg font-bold"
                                    >
                                      {trimmedLine.slice(2)}
                                    </h1>
                                  );
                                }

                                // Lists
                                if (trimmedLine.startsWith("* ")) {
                                  return (
                                    <div
                                      key={index}
                                      className="my-1 flex items-start gap-2"
                                    >
                                      <span className="mt-1 text-gray-400">
                                        •
                                      </span>
                                      <span>{trimmedLine.slice(2)}</span>
                                    </div>
                                  );
                                }

                                if (/^\d+\.\s/.test(trimmedLine)) {
                                  const match =
                                    trimmedLine.match(/^(\d+)\.\s(.*)$/);
                                  if (match) {
                                    return (
                                      <div
                                        key={index}
                                        className="my-1 flex items-start gap-2"
                                      >
                                        <span className="mt-1 text-gray-400">
                                          {match[1]}.
                                        </span>
                                        <span>{match[2]}</span>
                                      </div>
                                    );
                                  }
                                }

                                // Regular paragraph
                                return (
                                  <p key={index} className="my-2">
                                    {trimmedLine}
                                  </p>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Learning Objectives */}
                      {learningObjectives.filter((obj) => obj.trim()).length >
                        0 && (
                        <div>
                          <h3 className="mb-2 font-semibold">
                            Learning Objectives
                          </h3>
                          <ul className="list-inside list-disc space-y-1">
                            {learningObjectives
                              .filter((obj) => obj.trim())
                              .map((objective, index) => (
                                <li key={index} className="text-sm">
                                  {objective}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {/* Deliverables */}
                      {deliverables.filter((del) => del.trim()).length > 0 && (
                        <div>
                          <h3 className="mb-2 font-semibold">
                            Expected Deliverables
                          </h3>
                          <ul className="list-inside list-disc space-y-1">
                            {deliverables
                              .filter((del) => del.trim())
                              .map((deliverable, index) => (
                                <li key={index} className="text-sm">
                                  {deliverable}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {/* Tips */}
                      {tipsContent.length > 0 && (
                        <div>
                          <h3 className="mb-2 font-semibold">
                            Tips & Best Practices
                          </h3>
                          <div className="space-y-2">
                            {tipsContent.map((tip, index) => (
                              <div
                                key={index}
                                className="rounded-lg border border-blue-200 bg-blue-50 p-3"
                              >
                                <h4 className="font-medium text-blue-900">
                                  {tip.title}
                                </h4>
                                <p className="mt-1 text-sm text-blue-700">
                                  {tip.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resources */}
                      {resources.length > 0 && (
                        <div>
                          <h3 className="mb-2 font-semibold">
                            Helpful Resources
                          </h3>
                          <div className="grid gap-2">
                            {resources.map((resource, index) => (
                              <div
                                key={index}
                                className="rounded-lg border p-3"
                              >
                                <div className="mb-1 flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {resource.type}
                                  </Badge>
                                  <h4 className="font-medium">
                                    {resource.title}
                                  </h4>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                  {resource.description}
                                </p>
                                {resource.url && (
                                  <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    View Resource →
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Criteria */}
                      {requiresReview && peerReviewCriteria.length > 0 && (
                        <div>
                          <h3 className="mb-2 font-semibold">
                            Peer Review Criteria
                          </h3>
                          <div className="space-y-2">
                            {peerReviewCriteria.map((criteria, index) => (
                              <div
                                key={index}
                                className="rounded-lg border p-3"
                              >
                                <h4 className="mb-2 font-medium">
                                  {criteria.category}
                                </h4>
                                <ul className="list-inside list-disc space-y-1 pl-2">
                                  {criteria.points.map((point, pointIndex) => (
                                    <li key={pointIndex} className="text-sm">
                                      {point}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
