"use client";

import { useState, useEffect } from "react";
import { Lightbulb, FileText, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateTask, getTaskForEdit } from "@/lib/database";
import { AdminTaskItem } from "@/types/team-journey";

// Rich content interfaces
interface TipContent {
  title: string;
  content: string;
}

interface PeerReviewCriteria {
  category: string;
  points: string[];
}

interface ResourceItem {
  title: string;
  description: string;
  type: "documentation" | "video" | "article" | "tool" | "example";
  url?: string;
}

interface EditTaskDialogProps {
  task: AdminTaskItem | null;
  onTaskUpdated?: () => void;
}

export function EditTaskDialog({ task, onTaskUpdated }: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  // Basic form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("development");
  const [priority, setPriority] = useState("medium");
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [baseXpReward, setBaseXpReward] = useState(100);
  const [basePointsReward, setBasePointsReward] = useState(10);

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

  // Open modal and load full task data when task is set
  useEffect(() => {
    if (task) {
      setOpen(true);
      loadFullTaskData(task.id);
    }
  }, [task]);

  // Load full task data including rich content
  const loadFullTaskData = async (taskId: string) => {
    try {
      // Reset any previous errors/success messages
      setError("");
      setSuccess("");
      setIsSubmitting(false);

      const fullTask = await getTaskForEdit(taskId);

      // Load basic fields
      setTitle(fullTask.title || "");
      setDescription(fullTask.description || "");
      setCategory(fullTask.category || "development");
      setPriority(fullTask.priority || "medium");
      setDifficultyLevel(fullTask.difficulty_level || 1);
      setBaseXpReward(fullTask.base_xp_reward || 100);
      setBasePointsReward(fullTask.base_points_reward || 10);
      setEstimatedHours(fullTask.estimated_hours || 0);

      // Load rich content fields
      setDetailedInstructions(fullTask.detailed_instructions || "");
      setTipsContent((fullTask.tips_content as unknown as TipContent[]) || []);
      setPeerReviewCriteria(
        (fullTask.peer_review_criteria as unknown as PeerReviewCriteria[]) || []
      );
      setLearningObjectives(fullTask.learning_objectives || []);
      setDeliverables(fullTask.deliverables || []);
      setResources((fullTask.resources as unknown as ResourceItem[]) || []);
      setReviewInstructions(fullTask.review_instructions || "");
      setTags(fullTask.tags || []);
      setActiveTab("basic");
    } catch (error) {
      console.error("Error loading task details:", error);
      setError("Failed to load task details. Please try again.");
    }
  };

  // Clean up when dialog closes
  useEffect(() => {
    if (!open) {
      setError("");
      setSuccess("");
      setIsSubmitting(false);
    }
  }, [open]);

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
    if (!task) return;

    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (difficultyLevel < 1 || difficultyLevel > 5) {
      setError("Difficulty level must be between 1 and 5");
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        title: title.trim(),
        description: description.trim() || undefined,
        detailedInstructions: detailedInstructions.trim() || undefined,
        category: category as
          | "onboarding"
          | "development"
          | "design"
          | "marketing"
          | "business"
          | "testing"
          | "deployment"
          | "milestone",
        priority: priority as "low" | "medium" | "high" | "urgent",
        difficultyLevel,
        estimatedHours,
        baseXpReward,
        basePointsReward,
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
      };

      await updateTask(task.id, updateData);

      setSuccess("Task updated successfully!");

      // Close dialog and refresh parent data
      setOpen(false);
      onTaskUpdated?.();
    } catch (error) {
      console.error("Error updating task:", error);

      let errorMessage = "Failed to update task. Please try again.";
      if (error && typeof error === "object" && "message" in error) {
        const message = (error as { message: string }).message;
        if (message.includes("difficulty_level_check")) {
          errorMessage = "Difficulty level must be between 1 and 5.";
        } else {
          errorMessage = message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) return null;

  const taskContext = task.activity_type || "team";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-2xl h-[80vh] flex flex-col"
        onEscapeKeyDown={() => {
          if (!isSubmitting) {
            setOpen(false);
          }
        }}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Edit {taskContext === "team" ? "Team" : "Individual"} Task
          </DialogTitle>
          <DialogDescription>
            Update the task template properties and content.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1 min-h-0"
          >
            <TabsList className={`grid w-full grid-cols-4 flex-shrink-0`}>
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="tips">Tips</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent
              value="basic"
              className="flex-1 min-h-0 overflow-y-auto space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Basic Task Information
                  </CardTitle>
                  <CardDescription>
                    Update the core properties and metadata for your task
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Task Type Display */}
                  <div className="space-y-2">
                    <Label>Task Type</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Badge
                        variant={
                          taskContext === "team" ? "default" : "secondary"
                        }
                      >
                        {taskContext === "team"
                          ? "Team Task"
                          : "Individual Task"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {taskContext === "team"
                          ? "Collaborative project work assigned to teams"
                          : "Personal learning/skill building assigned to individuals"}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
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
                          <SelectItem value="onboarding">Onboarding</SelectItem>
                          <SelectItem value="development">
                            Development
                          </SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="testing">Testing</SelectItem>
                          <SelectItem value="deployment">Deployment</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
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
                          <SelectItem value="urgent">Urgent</SelectItem>
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="content"
              className="flex-1 min-h-0 overflow-y-auto space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Detailed Instructions
                  </CardTitle>
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
                      placeholder="Provide detailed step-by-step instructions..."
                      className="min-h-[200px] font-mono text-sm"
                      disabled={isSubmitting}
                    />
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
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={objective}
                          onChange={(e) =>
                            updateLearningObjective(index, e.target.value)
                          }
                          placeholder="What will users learn?"
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
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={deliverable}
                          onChange={(e) =>
                            updateDeliverable(index, e.target.value)
                          }
                          placeholder="What should be submitted?"
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="tips"
              className="flex-1 min-h-0 overflow-y-auto space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Tips & Resources
                  </CardTitle>
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
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex gap-2 items-center">
                          <Input
                            value={tip.title}
                            onChange={(e) =>
                              updateTip(index, "title", e.target.value)
                            }
                            placeholder="Tip title"
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
                          placeholder="Tip content..."
                          className="min-h-[80px]"
                          disabled={isSubmitting}
                        />
                      </div>
                    ))}
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
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex gap-2 items-center">
                          <Input
                            value={resource.title}
                            onChange={(e) =>
                              updateResource(index, "title", e.target.value)
                            }
                            placeholder="Resource title"
                            disabled={isSubmitting}
                            className="flex-1"
                          />
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
                          placeholder="Resource URL"
                          disabled={isSubmitting}
                        />
                        <Textarea
                          value={resource.description}
                          onChange={(e) =>
                            updateResource(index, "description", e.target.value)
                          }
                          placeholder="Resource description..."
                          className="min-h-[60px]"
                          disabled={isSubmitting}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="preview"
              className="flex-1 min-h-0 overflow-y-auto space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Task Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-6 bg-muted/20">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{category}</Badge>
                          <Badge
                            variant={
                              priority === "high" || priority === "urgent"
                                ? "destructive"
                                : "default"
                            }
                          >
                            {priority}
                          </Badge>
                        </div>
                        <h1 className="text-2xl font-bold">
                          {title || "Task Title"}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                          {description || "Task description"}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 py-4 border-y">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {difficultyLevel}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Difficulty
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {baseXpReward}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            XP Reward
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {basePointsReward}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Points
                          </div>
                        </div>
                      </div>

                      {detailedInstructions && (
                        <div>
                          <h3 className="font-semibold mb-2">
                            Detailed Instructions
                          </h3>
                          <div className="prose prose-sm max-w-none">
                            <p>{detailedInstructions}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
