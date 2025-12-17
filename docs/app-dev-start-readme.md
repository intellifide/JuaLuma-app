# App Development Start Package

This directory contains all essential files needed to begin development of the JuaLuma application. This package is self-contained for the development workspace and includes all technical specifications, legal text, and implementation requirements.

## Contents

### Core Development Guides
- **Master App Dev Guide.md** - Complete technical specification and architecture guide for the JuaLuma platform (includes Customer Support Portal and Google Workspace integration)
- **Local App Dev Guide.md** - Local development setup and environment configuration

### Framework Documentation
- **AI Agent Framework.md** - AI agent architecture and implementation specifications
- **Model Context Protocol Framework.md** - MCP framework documentation for AI integration

### Technical Documentation
- **Data-Flow-Diagrams.md** - Data flow architecture and system diagrams
- **Security-Architecture.md** - Security architecture, encryption standards, and compliance requirements
- **getting started gcp.md** - Google Cloud Platform setup, cost optimization, and deployment guide

### Legal Documents (For Implementation Reference)
- **legal/AI-Assistant-Disclaimer.md** - AI Assistant disclaimer text and implementation requirements
- **legal/Terms-of-Service.md** - Terms of Service text and implementation requirements
- **legal/Privacy-Policy.md** - Privacy Policy text and implementation requirements

**⚠️ Important:** These legal documents **must be reviewed and approved by qualified legal counsel before implementation**. The AI agent should reference these documents to copy exact text and implementation requirements rather than creating content character by character. All legal text must be implemented exactly as approved by legal counsel.

### Project Context
- **.cursorrules** - Project context and AI assistant configuration for Cursor IDE

## Getting Started

1. Review the **Master App Dev Guide.md** for complete architecture overview (includes Customer Support Portal and Google Workspace integration details)
2. Follow **Local App Dev Guide.md** to set up your local development environment
3. Reference **Security-Architecture.md** for all security and compliance requirements
4. Consult **getting started gcp.md** for cloud infrastructure setup and cost planning
6. When implementing legal components (disclaimers, TOS, Privacy Policy), reference the documents in **legal/** to copy exact text and follow implementation requirements

## Legal Compliance During Development

The **Master App Dev Guide.md** contains the core legal compliance requirements:
- **Legal-First Product Lifecycle** - Legal is a mandatory stakeholder
- **Regulatory Compliance Alignment** - GLBA, FinCEN (read-only mandate), SEC considerations
- **Feature Restrictions** - No "sending/swapping/rebalancing" features without legal approval
- **Privacy by Design** - Data minimization, Right to be Forgotten implementation

The legal documents in **legal/** provide:
- Exact text to display in the application
- Implementation specifications (click-wrap requirements, UI requirements, etc.)
- Technical implementation details (acceptance tracking, version control, etc.)

**AI Agent Usage:** When implementing legal components, the AI agent should:
1. Reference the legal documents to copy exact text (not create new text)
2. Follow the implementation requirements specified in each document
3. Ensure all click-wrap mechanisms, acceptance tracking, and UI requirements are implemented as specified
4. Note that all legal documents require attorney approval before publication

## Note on Planning Documents

Business planning, legal compliance frameworks (WISP, IRP, Compliance Checklists), and operational procedures are maintained in a separate planning workspace. The development guides and legal documents in this package contain all technical specifications and legal text needed for application development.

---

**Last Updated:** December 07, 2025 at 08:39 PM
