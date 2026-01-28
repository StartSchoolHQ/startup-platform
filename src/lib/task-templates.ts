// Content templates for task creation
export interface TaskTemplate {
  category: string;
  taskContext: "individual" | "team";
  detailedInstructions: string;
  tips: Array<{ title: string; content: string }>;
  peerReviewCriteria: Array<{ category: string; points: string[] }>;
  learningObjectives: string[];
  deliverables: string[];
  resources: Array<{
    title: string;
    description: string;
    type: "documentation" | "video" | "article" | "tool" | "example";
    url?: string;
  }>;
  tags: string[];
}

export const TASK_TEMPLATES: Record<string, TaskTemplate> = {
  "development-team": {
    category: "development",
    taskContext: "team",
    detailedInstructions: `## Development Task Instructions

### Overview
Create a [feature/component] that meets the following technical requirements.

### Technical Requirements
- Use [technology/framework]
- Follow coding standards and best practices
- Include proper error handling
- Write unit tests for core functionality

### Acceptance Criteria
- [ ] Feature works as specified
- [ ] Code passes review
- [ ] Tests have adequate coverage
- [ ] Documentation is updated

### Implementation Notes
Begin by understanding the requirements, then plan your approach before coding.`,

    tips: [
      {
        title: "Getting Started",
        content:
          "Begin by reading the requirements carefully and understanding the expected outcome. Break down the task into smaller, manageable pieces.",
      },
      {
        title: "Code Quality",
        content:
          "Follow established coding conventions, use meaningful variable names, and write clean, readable code. Don't forget to handle edge cases.",
      },
      {
        title: "Testing Strategy",
        content:
          "Write tests as you develop. Start with unit tests for individual functions, then integration tests for the complete feature.",
      },
    ],

    peerReviewCriteria: [
      {
        category: "Code Quality",
        points: [
          "Code follows established conventions and style guide",
          "Variables and functions have clear, descriptive names",
          "Code is well-structured and easy to understand",
          "No unnecessary complexity or over-engineering",
        ],
      },
      {
        category: "Functionality",
        points: [
          "All requirements have been implemented correctly",
          "Edge cases are handled appropriately",
          "Error handling is robust and user-friendly",
          "Performance is acceptable for the use case",
        ],
      },
      {
        category: "Testing & Documentation",
        points: [
          "Unit tests cover the main functionality",
          "Tests are meaningful and actually verify behavior",
          "Code is documented where necessary",
          "README or documentation is updated if needed",
        ],
      },
    ],

    learningObjectives: [
      "Apply software development best practices",
      "Implement clean, maintainable code",
      "Write effective unit tests",
      "Collaborate effectively in code review",
    ],

    deliverables: [
      "Working code implementation",
      "Unit tests with good coverage",
      "Updated documentation",
      "Code review feedback addressed",
    ],

    resources: [
      {
        title: "Coding Best Practices Guide",
        description: "Comprehensive guide to writing clean, maintainable code",
        type: "documentation",
      },
      {
        title: "Testing Framework Documentation",
        description: "Official documentation for the testing framework",
        type: "documentation",
      },
    ],

    tags: ["development", "coding", "testing", "collaboration"],
  },

  "development-individual": {
    category: "development",
    taskContext: "individual",
    detailedInstructions: `## Learning Task: Development Skills

### Learning Objective
Master [specific technology/concept] through hands-on practice and experimentation.

### What You'll Learn
- Core concepts and principles
- Practical implementation techniques
- Common patterns and best practices
- Troubleshooting and debugging skills

### Learning Path
1. **Study**: Review the provided resources
2. **Practice**: Complete the coding exercises
3. **Experiment**: Try variations and extensions
4. **Reflect**: Document what you learned

### Success Criteria
- [ ] Understand core concepts
- [ ] Complete practical exercises
- [ ] Can explain the concepts to others
- [ ] Apply knowledge to solve problems`,

    tips: [
      {
        title: "Active Learning",
        content:
          "Don't just read—code along with examples and try variations. The best way to learn programming is by doing.",
      },
      {
        title: "Take Notes",
        content:
          "Keep a learning journal. Write down key concepts, code snippets, and insights as you go.",
      },
      {
        title: "Practice Regularly",
        content:
          "Consistent daily practice is more effective than long, infrequent sessions. Set aside time each day.",
      },
    ],

    peerReviewCriteria: [],

    learningObjectives: [
      "Understand fundamental concepts",
      "Develop practical coding skills",
      "Build problem-solving abilities",
      "Gain confidence with the technology",
    ],

    deliverables: [
      "Completed exercises",
      "Personal notes and insights",
      "Working code examples",
      "Self-reflection summary",
    ],

    resources: [
      {
        title: "Official Documentation",
        description: "Primary reference for the technology",
        type: "documentation",
      },
      {
        title: "Interactive Tutorial",
        description: "Hands-on learning exercises",
        type: "example",
      },
    ],

    tags: ["learning", "individual", "skill-building", "practice"],
  },

  "business-team": {
    category: "business",
    taskContext: "team",
    detailedInstructions: `## Business Strategy Task

### Objective
Develop a comprehensive [business strategy/analysis] that addresses key market challenges and opportunities.

### Scope
- Market research and competitive analysis
- Strategic recommendations
- Implementation roadmap
- Success metrics and KPIs

### Deliverable Format
Present findings in a professional format suitable for stakeholder review.

### Timeline & Milestones
1. **Research Phase**: Gather data and insights
2. **Analysis Phase**: Synthesize findings
3. **Strategy Phase**: Develop recommendations
4. **Presentation Phase**: Prepare final deliverable`,

    tips: [
      {
        title: "Market Research",
        content:
          "Use multiple sources for market data. Look at industry reports, competitor analysis, and customer feedback.",
      },
      {
        title: "Data-Driven Decisions",
        content:
          "Support all recommendations with solid data. Avoid assumptions and clearly state your reasoning.",
      },
      {
        title: "Stakeholder Perspective",
        content:
          "Consider how different stakeholders will view your recommendations. Address potential concerns proactively.",
      },
    ],

    peerReviewCriteria: [
      {
        category: "Research Quality",
        points: [
          "Used credible and recent sources",
          "Research is comprehensive and relevant",
          "Data analysis is accurate and insightful",
          "Competitive analysis is thorough",
        ],
      },
      {
        category: "Strategic Thinking",
        points: [
          "Recommendations are logical and well-reasoned",
          "Strategy aligns with business objectives",
          "Implementation plan is realistic",
          "Risks and mitigation strategies are considered",
        ],
      },
    ],

    learningObjectives: [
      "Develop strategic thinking skills",
      "Learn market research techniques",
      "Practice business analysis",
      "Improve presentation skills",
    ],

    deliverables: [
      "Market research report",
      "Strategic recommendations",
      "Implementation roadmap",
      "Presentation materials",
    ],

    resources: [
      {
        title: "Business Strategy Framework",
        description: "Guide to strategic planning methodologies",
        type: "documentation",
      },
      {
        title: "Market Research Tools",
        description: "Resources for gathering market intelligence",
        type: "tool",
      },
    ],

    tags: ["business", "strategy", "research", "analysis"],
  },
};

export function getTemplate(
  category: string,
  taskContext: "individual" | "team"
): TaskTemplate | null {
  const key = `${category}-${taskContext}`;
  return TASK_TEMPLATES[key] || null;
}

export function getAvailableTemplates(): Array<{
  key: string;
  label: string;
  category: string;
  context: string;
}> {
  return Object.entries(TASK_TEMPLATES).map(([key, template]) => ({
    key,
    label: `${template.category} (${template.taskContext})`,
    category: template.category,
    context: template.taskContext,
  }));
}
