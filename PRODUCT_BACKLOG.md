# AI Visibility Tracker - Product Backlog & Implementation Plan

## Current Status
✅ **MVP Foundation Complete**
- Dashboard UI with charts and analytics
- Entity management
- Sidebar navigation
- Postgres database with Prisma
- Mock data visualization

---

## EPIC 1 — AI Search Analytics Core
**Goal:** Track how brands appear in AI search (visibility, position, sentiment)

### 1.1 Metrics Engine (MUST) ⭐ Priority 1
- [ ] **Visibility tracking** - Measure how often a brand appears in AI-generated responses
  - Database schema updates for visibility metrics
  - API endpoint for visibility calculation
  - Real-time visibility scoring algorithm
  
- [ ] **Position/ranking tracking** - Determine brand ranking when multiple competitors are mentioned
  - Position extraction from LLM responses
  - Ranking algorithm for multi-brand mentions
  - Historical position tracking
  
- [ ] **Sentiment scoring** - Automatic sentiment analysis of how AI describes the brand
  - Integration with sentiment analysis API/library
  - Sentiment score calculation (-1 to +1)
  - Sentiment trend tracking
  
- [ ] **Trend graphs (time-series)** - Weekly/monthly trend lines
  - Time-series data aggregation
  - Chart components for trends
  - Date range filtering
  
- [ ] **Multi-brand comparison** - Compare visibility and sentiment across brands
  - ✅ Already implemented in dashboard (CompetitorTable)
  - Enhance with real data integration

### 1.2 Model Coverage (MUST) ⭐ Priority 1
- [ ] **Support for major AI models**
  - [ ] ChatGPT (OpenAI API integration)
  - [ ] Perplexity (API integration)
  - [ ] DeepSeek (API integration)
  - [ ] Claude (Anthropic API integration)
  
- [ ] **Model selection per project**
  - UI for selecting models to track
  - Database schema for model preferences
  - Per-model API configuration

### 1.3 Source & Citation Tracking (SHOULD) ⭐ Priority 2
- [ ] **Top citation list** - Identify websites and domains AIs cite
  - Citation extraction from responses
  - Domain parsing and categorization
  - Citation frequency tracking
  
- [ ] **Source categorization** - Social, editorial, review sites, forums, news
  - Auto-categorization algorithm
  - Manual category override
  - Category-based filtering
  
- [ ] **Frequency scoring** - How often each citation appears
  - Citation count aggregation
  - Frequency percentage calculation
  - Top sources ranking
  
- [ ] **Geo influence analysis** - Geographic patterns from citation sources
  - IP/domain geolocation
  - Geographic distribution charts
  - Country-level insights

---

## EPIC 2 — Prompts & Topic Management
**Goal:** Understand which prompts matter and track rankings for them

### 2.1 Prompt Setup & Management (MUST) ⭐ Priority 1
- [ ] **Add custom prompts**
  - Prompt creation UI
  - Prompt library database schema
  - CRUD operations for prompts
  
- [ ] **AI-suggested prompts** - Based on search volumes, opportunities
  - Prompt suggestion algorithm
  - Industry-specific prompt templates
  - Opportunity scoring
  
- [ ] **Tagging & organizing prompts**
  - Tag system for prompts
  - Category/folder organization
  - Search and filter functionality
  
- [ ] **Country-level tracking** - Global + specific markets
  - Country selection per prompt
  - Multi-region tracking
  - Regional comparison views
  
- [ ] **Prompt-level metrics** - Visibility, position, sentiment per prompt
  - Per-prompt analytics
  - Prompt performance dashboard
  - Prompt comparison table

### 2.2 Prompt Insights (SHOULD) ⭐ Priority 2
- [ ] **Opportunity scoring** - Prompts with high potential for ranking
  - Opportunity calculation algorithm
  - Scoring based on competition and volume
  - Opportunity ranking table
  
- [ ] **Prompt ranking table** - Compare brand performance prompt-by-prompt
  - Detailed prompt comparison view
  - Sortable columns
  - Export functionality
  
- [ ] **Competitor prompt overlap** - Identify prompts where competitors outperform
  - Overlap detection algorithm
  - Gap analysis visualization
  - Competitive intelligence dashboard

---

## EPIC 3 — Recommendations Engine
**Goal:** Turn insights into actionable steps

### 3.1 Strategy Recommendations (MUST) ⭐ Priority 1
- [ ] **Automated suggestions based on:**
  - [ ] Declining visibility alerts
  - [ ] Low sentiment warnings
  - [ ] Missing citations detection
  - [ ] Competitor outperforming analysis
  
- [ ] **Recommendation feed** - "You have 5 strategy recommendations"
  - Recommendation generation engine
  - Priority queue system
  - Notification system
  
- [ ] **Prioritization scoring** - Impact & difficulty
  - Impact calculation algorithm
  - Difficulty estimation
  - Priority matrix visualization

### 3.2 Content & PR Suggestions (SHOULD) ⭐ Priority 2
- [ ] **Suggested PR actions** - e.g., "Get reviews on G2"
  - PR opportunity detection
  - Action templates
  - Progress tracking
  
- [ ] **Suggested social actions** - e.g., "Join LinkedIn conversations"
  - Social media opportunity detection
  - Platform-specific recommendations
  - Engagement tracking
  
- [ ] **Editorial opportunities** - NYT, Reddit, niche blogs
  - Editorial opportunity database
  - Outreach tracking
  - Success metrics

---

## EPIC 4 — Dashboard & Visualization
**Goal:** Provide intuitive analytics for marketers

### 4.1 Unified Dashboard (MUST) ⭐ Priority 1
- [x] **Overview widgets** - ✅ Already implemented
  - [x] Visibility trend
  - [x] Position trend
  - [x] Sentiment trend
  
- [x] **Multi-competitor comparison charts** - ✅ Already implemented
  
- [ ] **Leaderboard-style brand ranking** - Gartner-style quadrants
  - Quadrant chart component
  - Leader/challenger/niche positioning
  - Interactive quadrant navigation

### 4.2 Interactive Charts (SHOULD) ⭐ Priority 2
- [ ] **Filter by time window**
  - Date range picker
  - Preset time windows (7d, 30d, 90d, 1y)
  - Custom date range selection
  
- [ ] **Filter by model**
  - Model filter dropdown
  - Multi-model comparison
  - Model-specific insights
  
- [ ] **Filter by prompt category**
  - Category filter
  - Tag-based filtering
  - Combined filters
  
- [ ] **Exportable charts** - PNG, CSV
  - Chart export to PNG
  - Data export to CSV
  - Scheduled exports

---

## EPIC 5 — Integrations & Export
**Goal:** Make data portable into the tools teams already use

### 5.1 Data Export (MUST) ⭐ Priority 1
- [ ] **CSV export of all metrics**
  - Export functionality for all data tables
  - Customizable column selection
  - Bulk export options
  
- [ ] **Prompt export**
  - Export prompt library
  - Import/export format
  - Sharing capabilities
  
- [ ] **Brand comparison export**
  - Competitor comparison data export
  - Multi-brand reports
  - Formatted exports

### 5.2 Reporting Integrations (SHOULD) ⭐ Priority 2
- [ ] **Looker Studio connector**
  - Looker Studio data source
  - Pre-built dashboard templates
  - Real-time data sync
  
- [ ] **API access for automation**
  - REST API endpoints
  - API documentation
  - Rate limiting and authentication
  
- [ ] **Webhook triggers for daily updates**
  - Webhook configuration UI
  - Event-based triggers
  - Webhook payload customization
  
- [ ] **Slack notifications for major changes**
  - Slack integration
  - Configurable alerts
  - Custom notification rules

---

## EPIC 6 — Collaboration & Team Features
**Goal:** Enable marketing teams to work together

### 6.1 Team Management (MUST) ⭐ Priority 1
- [ ] **User accounts**
  - User authentication system
  - Profile management
  - Password reset flow
  
- [ ] **Roles & permissions**
  - Role-based access control (RBAC)
  - Permission levels (Admin, Editor, Viewer)
  - Resource-level permissions
  
- [ ] **Invite team members**
  - Team invitation system
  - Email invitations
  - Onboarding flow for new members

### 6.2 Shared Workflows (COULD) ⭐ Priority 3
- [ ] **Assign recommendations**
  - Task assignment system
  - Assignee notifications
  - Status tracking
  
- [ ] **Export monthly AI visibility reports**
  - Automated report generation
  - Email delivery
  - Custom report templates
  
- [ ] **Shared prompt libraries across departments**
  - Organization-wide prompt library
  - Department-specific collections
  - Sharing and permissions

---

## EPIC 7 — Onboarding & UX
**Goal:** Low-friction onboarding for non-technical marketers

### 7.1 Setup Wizard (MUST) ⭐ Priority 1
- [ ] **Add brand**
  - Brand setup wizard
  - Brand profile creation
  - Logo and branding upload
  
- [ ] **Add competitors**
  - Competitor discovery
  - Bulk competitor import
  - Competitor profiles
  
- [ ] **Add initial prompts**
  - Starter prompt selection
  - AI-suggested prompts
  - Custom prompt creation
  
- [ ] **Select AI models**
  - Model selection interface
  - Model configuration
  - API key setup

### 7.2 Templates & Examples (SHOULD) ⭐ Priority 2
- [ ] **"Starter prompt" library for industries**
  - CRM industry templates
  - Fintech templates
  - SaaS templates
  - B2B templates
  
- [ ] **Example dashboards for new users**
  - Sample data dashboards
  - Interactive tutorials
  - Best practices guide

---

## EPIC 8 — Marketing Site & Growth
**Goal:** Public-facing marketing and lead generation

### 8.1 Public Landing Pages (MUST) ⭐ Priority 1
- [ ] **Features page**
  - Feature showcase
  - Screenshots and demos
  - Use case examples
  
- [ ] **Pricing page**
  - Pricing tiers
  - Feature comparison
  - FAQ section
  
- [ ] **Integrations page**
  - Integration marketplace
  - Setup guides
  - API documentation
  
- [ ] **Testimonials page**
  - Customer testimonials
  - Case studies
  - Success metrics
  
- [ ] **Careers page**
  - Job listings
  - Company culture
  - Application process
  
- [ ] **Case Studies**
  - Detailed customer stories
  - ROI metrics
  - Industry-specific examples

### 8.2 Lead Capture (MUST) ⭐ Priority 1
- [ ] **"Talk to sales" form**
  - Contact form
  - Lead qualification
  - CRM integration
  
- [ ] **Free trial signup funnel**
  - Trial signup flow
  - Email verification
  - Trial onboarding

---

## 🔝 PRIORITY SUMMARY

### Phase 1: Core Analytics (Weeks 1-4)
**MUST-HAVES**
1. ✅ Dashboard foundation (DONE)
2. Real LLM API integrations (ChatGPT, Claude, Perplexity, DeepSeek)
3. Visibility, Position, Sentiment calculation engine
4. Prompt management system
5. Basic recommendation engine
6. CSV export functionality
7. User authentication & team accounts

### Phase 2: Enhanced Features (Weeks 5-8)
**SHOULD-HAVES**
1. Citation/source analysis
2. Prompt insights & opportunity scoring
3. Interactive chart filters
4. Looker Studio integration
5. PR & content recommendations
6. Template libraries
7. Setup wizard

### Phase 3: Growth & Scale (Weeks 9-12)
**COULD-HAVES**
1. Workflow assignments
2. Deep competitor intelligence
3. Community prompt datasets
4. Marketing site
5. Advanced integrations
6. Automated reporting

---

## Database Schema Updates Needed

### New Tables
```prisma
model LLMModel {
  id          String   @id @default(uuid())
  name        String   // "ChatGPT", "Claude", etc.
  provider    String   // "OpenAI", "Anthropic", etc.
  apiKey      String?  @db.Text
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Citation {
  id              String   @id @default(uuid())
  analysisResultId String
  analysisResult  AnalysisResult @relation(fields: [analysisResultId], references: [id])
  domain          String
  url             String?
  category        String?  // "social", "editorial", "review", etc.
  frequency       Int      @default(1)
  createdAt       DateTime @default(now())
}

model Recommendation {
  id          String   @id @default(uuid())
  entityId    String
  entity      Entity   @relation(fields: [entityId], references: [id])
  type        String   // "visibility", "sentiment", "citation", etc.
  priority    Int      // 1-5
  impact      Float    // 0-1
  difficulty  Float    // 0-1
  title       String
  description String   @db.Text
  status      String   @default("pending") // "pending", "in_progress", "completed"
  assignedTo  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Team {
  id        String   @id @default(uuid())
  name      String
  members   TeamMember[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model TeamMember {
  id        String   @id @default(uuid())
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  role      String   // "admin", "editor", "viewer"
  createdAt DateTime @default(now())
}
```

---

## Next Steps
1. Review and prioritize features with stakeholders
2. Set up project management board (GitHub Projects/Jira)
3. Create detailed technical specs for Phase 1 features
4. Begin LLM API integration development
5. Implement real-time metrics calculation
