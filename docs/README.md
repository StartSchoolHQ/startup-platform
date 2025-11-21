# Team Journey Documentation

This directory contains comprehensive documentation for the team-journey module of the StartSchool Platform.

## 📚 Documentation Files

### 1. Team Journey Analysis (`../TEAM_JOURNEY_ANALYSIS.md`)
**Primary documentation** - Complete analysis of the team-journey functionality.

**Contents**:
- Executive Summary
- Architecture Overview
- Core Concepts
- File Structure
- Data Models
- Pages & Routes
- Components
- Database Schema
- API Functions
- Business Logic
- User Workflows
- Features & Capabilities
- Integration Points
- Security & Permissions
- Future Enhancements

**Size**: 42,258 characters  
**Audience**: Developers, architects, product managers  
**Use When**: Need comprehensive understanding of the module

---

### 2. Architecture Diagrams (`team-journey-architecture.md`)
**Visual reference** - Diagrams and flowcharts for the team-journey system.

**Contents**:
- High-Level Architecture
- Data Flow Diagrams
- Database Schema Diagram
- Component Hierarchy
- Task Workflow State Machine
- Permission Matrix
- API Call Flow

**Size**: 19,675 characters  
**Audience**: Developers, architects  
**Use When**: Need visual representation of system structure

---

### 3. Quick Reference Guide (`team-journey-quick-reference.md`)
**Developer cheat sheet** - Quick lookup for common information.

**Contents**:
- File Locations
- Key Types
- Essential Functions
- Database Tables
- Pages Overview
- User Roles & Permissions
- Common Workflows
- Gamification System
- Security Notes
- Debugging Tips
- Testing Checklist
- Common Issues

**Size**: 11,072 characters  
**Audience**: Developers  
**Use When**: Need quick answers while coding

---

### 4. API Documentation (`team-journey-api.md`)
**Function reference** - Complete API documentation with examples.

**Contents**:
- Database Functions
- Task Functions
- Weekly Report Functions
- RPC Functions
- Data Transformation
- Error Handling
- Best Practices

**Size**: 24,041 characters  
**Audience**: Developers, integrators  
**Use When**: Need to use or extend API functions

---

## 🚀 Quick Start

### For New Developers
1. Start with **Team Journey Analysis** for overview
2. Review **Architecture Diagrams** to understand structure
3. Bookmark **Quick Reference Guide** for daily use
4. Consult **API Documentation** when writing code

### For Specific Tasks

#### Understanding Architecture
→ Read: Team Journey Analysis (Sections 1-2)  
→ View: Architecture Diagrams (All diagrams)

#### Adding New Features
→ Read: Team Journey Analysis (Sections 4-7, 10)  
→ Reference: Quick Reference Guide (File locations, Types)  
→ Use: API Documentation (Relevant functions)

#### Debugging Issues
→ Check: Quick Reference Guide (Common Issues, Debugging Tips)  
→ Review: API Documentation (Error Handling)  
→ Understand: Architecture Diagrams (Data Flow)

#### Writing Tests
→ Reference: Quick Reference Guide (Testing Checklist)  
→ Review: Team Journey Analysis (User Workflows)  
→ Use: API Documentation (Function signatures)

---

## 📖 Key Concepts

### Teams (Products)
Startup projects with members, achievements, and progress tracking.

### Tasks
Work items that can be assigned to team members, tracked through a workflow, and earn rewards.

### Achievements
Collections of related tasks that unlock rewards when completed.

### Weekly Reports
Required weekly submissions tracking work, blockers, and metrics.

### Strikes
Automated penalties for missed weekly reports.

### Gamification
XP and points system with difficulty-based rewards.

---

## 🗺️ Module Structure

```
team-journey/
├── Pages (3)
│   ├── Team Listing
│   ├── Team Detail
│   └── Task Detail
├── Components (9)
│   ├── ProductCard
│   ├── TasksTable
│   ├── WeeklyReportsTable
│   └── ... (6 more)
├── Library Functions (15+)
│   ├── Team Queries
│   ├── Task Operations
│   └── Report Functions
└── Types (7+)
    ├── Product
    ├── TeamTask
    └── TaskTableItem
```

---

## 🔗 Related Documentation

### In This Repository
- `hierarchy.md` - Points & XP calculation rules
- `README.md` - Project setup and overview
- `optimize.md` - Performance optimization notes

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

---

## 🛠️ Common Tasks

### Find a Function
1. Check **Quick Reference** (Essential Functions)
2. Search **API Documentation** (Function Reference)
3. Review **Team Journey Analysis** (API Functions section)

### Understand Data Flow
1. View **Architecture Diagrams** (Data Flow section)
2. Read **Team Journey Analysis** (Business Logic)
3. Check **API Documentation** (Function usage)

### Fix a Bug
1. Review **Quick Reference** (Common Issues)
2. Check **API Documentation** (Error Handling)
3. Understand **Architecture Diagrams** (Component flow)

### Add a Feature
1. Read **Team Journey Analysis** (Architecture, Components)
2. Reference **Quick Reference** (File locations, Types)
3. Use **API Documentation** (Functions to call)
4. Review **Architecture Diagrams** (Integration points)

---

## 📊 Statistics

- **Total Documentation**: ~97,000 characters
- **Files Covered**: 25+ source files
- **Functions Documented**: 25+ functions
- **Diagrams**: 10+ visual diagrams
- **Workflows**: 6 detailed workflows
- **Components**: 9 components
- **Pages**: 3 main pages
- **Database Tables**: 10+ tables

---

## 🤝 Contributing

When updating the team-journey module:

1. **Update Relevant Docs**: Modify corresponding documentation files
2. **Add Examples**: Include code examples for new features
3. **Update Diagrams**: Refresh diagrams if architecture changes
4. **Test Workflows**: Verify documented workflows still work
5. **Review Cross-refs**: Check cross-references between docs

---

## 📝 Document Maintenance

### Last Updated
- Team Journey Analysis: 2025-11-21
- Architecture Diagrams: 2025-11-21
- Quick Reference Guide: 2025-11-21
- API Documentation: 2025-11-21

### Version
All documents: v1.0

### Status
All documents: Complete

---

## 💡 Tips

- Use **Quick Reference** as a cheat sheet during development
- Review **Architecture Diagrams** when making structural changes
- Consult **API Documentation** before calling functions
- Read **Team Journey Analysis** when planning major features
- Keep documentation open in a second monitor while coding

---

## 🆘 Getting Help

1. Check the **Quick Reference** for common questions
2. Search documentation files for keywords
3. Review **Common Issues** section
4. Check Git history for context on specific implementations
5. Ask team members with links to relevant documentation sections

---

**Documentation Version**: 1.0  
**Last Updated**: 2025-11-21  
**Maintained By**: Development Team  
**Status**: Complete and Current
