# 23-AI-Document-Processing.md

# AI Document Processing

## Overview

The AI Document Processing feature enables robots to autonomously process, analyze, and extract information from various document types. As true "employees," robots can upload documents, parse content, classify and categorize them, extract structured data, generate summaries, and route documents to appropriate workflows.

## Core Features

### Document Upload & Storage
- Support for multiple file formats: PDF, DOCX, TXT, Images (PNG, JPG, JPEG)
- Automatic document storage with metadata
- Document versioning support
- Hierarchical organization by tenant/team

### Document Parsing & Extraction
- Text extraction from PDFs and images (OCR)
- Table data extraction
- Key-value pair extraction
- Structured data output (JSON)

### AI-Powered Analysis
- Document classification (INVOICE, CONTRACT, RESUME, REPORT, FORM, OTHER)
- Sentiment analysis for customer communications
- Language detection
- Content summarization
- Entity extraction (dates, amounts, names, organizations)

### Document Workflow
- Auto-routing based on classification
- Approval workflows for sensitive documents
- Integration with expense management (invoices)
- Integration with HR (resumes)
- Integration with knowledge base (reports)

### Search & Retrieval
- Full-text search across document content
- Metadata-based filtering
- Date range filters
- Category filters

## Data Models (Prisma)

### Document Model
```
Document {
  id: UUID (PK)
  tenantId: UUID (FK)
  robotId: UUID (FK, optional - uploaded by robot)
  uploaderId: UUID (FK)
  uploaderType: Enum (USER, ROBOT)
  
  name: String
  fileUrl: String
  fileType: String (PDF, DOCX, TXT, PNG, JPG, JPEG)
  fileSize: Int
  mimeType: String
  
  status: Enum (PROCESSING, PROCESSED, FAILED)
  classification: Enum (INVOICE, CONTRACT, RESUME, REPORT, FORM, OTHER)
  confidence: Float (AI classification confidence)
  
  extractedText: Text (nullable)
  extractedData: Json (nullable)
  summary: Text (nullable)
  
  metadata: Json (additional metadata)
  
  createdAt: DateTime
  updatedAt: DateTime
}
```

### DocumentVersion Model
```
DocumentVersion {
  id: UUID (PK)
  documentId: UUID (FK)
  version: Int
  fileUrl: String
  changeNote: String (optional)
  
  createdAt: DateTime
}
```

### DocumentCategory Model
```
DocumentCategory {
  id: UUID (PK)
  tenantId: UUID (FK)
  name: String
  description: String (optional)
  classificationRule: Json (rules for auto-categorization)
  
  createdAt: DateTime
  updatedAt: DateTime
}
```

### DocumentWorkflow Model
```
DocumentWorkflow {
  id: UUID (PK)
  tenantId: UUID (FK)
  
  name: String
  description: String
  triggerClassification: Enum (INVOICE, CONTRACT, RESUME, REPORT, FORM, OTHER)
  
  steps: Json (workflow steps with conditions)
  
  isActive: Boolean (default: true)
  
  createdAt: DateTime
  updatedAt: DateTime
}
```

## API Routes

### Documents
- `GET /api/v1/documents` - List documents with filters
- `POST /api/v1/documents` - Upload document
- `GET /api/v1/documents/{id}` - Get document details
- `PUT /api/v1/documents/{id}` - Update document metadata
- `DELETE /api/v1/documents/{id}` - Delete document
- `GET /api/v1/documents/{id}/download` - Download original file
- `POST /api/v1/documents/{id}/process` - Reprocess document

### Document Analysis
- `GET /api/v1/documents/{id}/extracted-data` - Get extracted data
- `GET /api/v1/documents/{id}/summary` - Get AI summary
- `POST /api/v1/documents/{id}/classify` - Re-classify document

### Document Versions
- `GET /api/v1/documents/{id}/versions` - List versions
- `GET /api/v1/documents/{id}/versions/{version}` - Get specific version
- `POST /api/v1/documents/{id}/versions` - Upload new version

### Document Categories
- `GET /api/v1/tenants/{id}/document-categories` - List categories
- `POST /api/v1/tenants/{id}/document-categories` - Create category
- `GET /api/v1/document-categories/{id}` - Get category
- `PUT /api/v1/document-categories/{id}` - Update category
- `DELETE /api/v1/document-categories/{id}` - Delete category

### Document Workflows
- `GET /api/v1/tenants/{id}/document-workflows` - List workflows
- `POST /api/v1/tenants/{id}/document-workflows` - Create workflow
- `GET /api/v1/document-workflows/{id}` - Get workflow
- `PUT /api/v1/document-workflows/{id}` - Update workflow
- `DELETE /api/v1/document-workflows/{id}` - Delete workflow
- `POST /api/v1/document-workflows/{id}/trigger` - Manually trigger workflow

### Robot Document Operations
- `GET /api/v1/robots/{id}/documents` - List robot's uploaded documents
- `GET /api/v1/robots/{id}/document-stats` - Get document processing stats

## User Interactions

### Upload Document Flow
1. User navigates to Documents section
2. Clicks "Upload Document" button
3. Selects file from local system
4. Optionally adds tags/description
5. Document uploads and processes automatically
6. AI classifies and extracts data
7. Results displayed to user

### View Document Details
1. User clicks on document in list
2. Document detail view shows:
   - Preview/thumbnail
   - Extracted text
   - Extracted data (key-value pairs)
   - AI summary
   - Classification
   - Version history
3. User can download, edit, or delete

### Manage Workflows
1. Admin navigates to Workflows section
2. Creates new workflow with:
   - Name and description
   - Trigger classification
   - Steps (notify, route, approve, etc.)
3. Workflow activates automatically for matching documents

## Integration Points

- **Expense Management**: Invoices auto-route to expense reports
- **HR System**: Resumes route to hiring pipeline
- **Knowledge Base**: Reports can be converted to articles
- **Calendar**: Document deadlines can create calendar events
- **Notifications**: Alerts for document processing failures

## Security Considerations

- File type validation (allowlist)
- File size limits (50MB max)
- Virus scanning (future enhancement)
- Access control (tenant/team isolation)
- Audit logging for document access

## Implementation Notes

- Use tenant's LLM config for AI analysis
- Store extracted text and data for search
- Async processing for large documents
- Webhook notifications for workflow triggers
- Document encryption at rest (future)
