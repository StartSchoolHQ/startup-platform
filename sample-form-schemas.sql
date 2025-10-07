-- Sample submission form schemas for testing the Task Submission Modal

-- Update some tasks with different form schemas for testing

-- Simple form for basic tasks
UPDATE tasks 
SET submission_form_schema = '{
  "fields": [
    {
      "name": "description",
      "type": "textarea",
      "label": "Describe what you accomplished",
      "placeholder": "Explain how you completed this task and what deliverables you created...",
      "required": true
    },
    {
      "name": "external_urls",
      "type": "url_list",
      "label": "Public resources (Google Sheets, GitHub, demos, etc.)",
      "placeholder": "https://docs.google.com/spreadsheets/...",
      "required": false
    },
    {
      "name": "screenshots",
      "type": "file",
      "label": "Upload screenshots or documents",
      "accept": "image/*,.pdf,.docx",
      "required": false,
      "multiple": true
    }
  ]
}'::jsonb
WHERE template_code IN ('ONBOARD_001', 'DEV_001');

-- More complex form for development tasks
UPDATE tasks 
SET submission_form_schema = '{
  "fields": [
    {
      "name": "description",
      "type": "textarea",
      "label": "Implementation Summary",
      "placeholder": "Describe the technical implementation, challenges faced, and solutions applied...",
      "required": true
    },
    {
      "name": "github_repo",
      "type": "text",
      "label": "GitHub Repository URL",
      "placeholder": "https://github.com/username/repository",
      "required": true
    },
    {
      "name": "external_urls",
      "type": "url_list",
      "label": "Demo Links & Documentation",
      "placeholder": "https://your-demo.vercel.app or documentation links",
      "required": false
    },
    {
      "name": "code_files",
      "type": "file",
      "label": "Code Files & Screenshots",
      "accept": ".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,image/*,.pdf",
      "required": false,
      "multiple": true
    }
  ]
}'::jsonb
WHERE category = 'development';

-- Marketing/Business task form
UPDATE tasks 
SET submission_form_schema = '{
  "fields": [
    {
      "name": "summary",
      "type": "textarea",
      "label": "Campaign/Activity Summary",
      "placeholder": "Describe the marketing activities, target audience, and approach used...",
      "required": true
    },
    {
      "name": "metrics_sheet",
      "type": "text",
      "label": "Metrics & Analytics Spreadsheet",
      "placeholder": "https://docs.google.com/spreadsheets/...",
      "required": true
    },
    {
      "name": "external_urls",
      "type": "url_list",
      "label": "Campaign Assets & Social Media Links",
      "placeholder": "Social posts, landing pages, ads, etc.",
      "required": false
    },
    {
      "name": "assets",
      "type": "file",
      "label": "Creative Assets & Reports",
      "accept": "image/*,.pdf,.pptx,.docx",
      "required": false,
      "multiple": true
    }
  ]
}'::jsonb
WHERE category = 'marketing';

-- Design task form
UPDATE tasks 
SET submission_form_schema = '{
  "fields": [
    {
      "name": "design_rationale",
      "type": "textarea",
      "label": "Design Rationale & Process",
      "placeholder": "Explain your design decisions, user research, and design process...",
      "required": true
    },
    {
      "name": "figma_link",
      "type": "text",
      "label": "Figma/Design Tool Link",
      "placeholder": "https://figma.com/file/...",
      "required": true
    },
    {
      "name": "external_urls",
      "type": "url_list",
      "label": "Prototypes & User Testing Results",
      "placeholder": "Interactive prototypes, user feedback forms, etc.",
      "required": false
    },
    {
      "name": "design_files",
      "type": "file",
      "label": "Design Files & Assets",
      "accept": "image/*,.pdf,.sketch,.fig,.xd,.ai,.psd",
      "required": false,
      "multiple": true
    }
  ]
}'::jsonb
WHERE category = 'design';