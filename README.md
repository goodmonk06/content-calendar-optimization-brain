# Content Calendar Optimization Brain

A sophisticated content calendar optimization system for orchestrating multi-channel content strategies. Schedule and optimize content across social media, blogs, and email newsletters with intelligent scheduling algorithms.

## Overview

This system helps content teams manage and optimize their publishing schedule across multiple channels. It provides:

- **Multi-channel support**: Manage content for X/Twitter, Instagram, blogs, email newsletters, and more
- **Intelligent scheduling**: Automated scheduling with configurable heuristics
- **Content pipeline**: Track content from idea to published
- **Calendar visualization**: See your entire content calendar at a glance
- **AI-powered suggestions**: Optional OpenAI integration for content improvements

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: OpenAI GPT-4 (optional)
- **Styling**: CSS-in-JS with scoped styles
- **Date handling**: date-fns

## Domain Model

### Channel
Represents a publishing channel (e.g., X, Instagram, Blog, Email)
- `id`: Unique identifier
- `name`: Channel name
- `type`: SNS | BLOG | EMAIL
- `metaJson`: Channel-specific metadata

### ContentItem
Stores content at various stages of creation
- `id`: Unique identifier
- `title`: Content title
- `bodyDraft`: Content body
- `targetChannelId`: Target channel
- `tagsJson`: Array of tags for topic tracking
- `status`: IDEA | DRAFT | READY | SCHEDULED | PUBLISHED

### PublishingSlot
Scheduled time slots for content publishing
- `id`: Unique identifier
- `channelId`: Associated channel
- `scheduledAt`: Publication date/time
- `contentItemId`: Linked content item (nullable)
- `metaJson`: Slot metadata

### OptimizationConfig
Scheduling rules and constraints
- `id`: Unique identifier
- `name`: Configuration name
- `rulesJson`: Scheduling rules (max posts/day, tag conflicts, etc.)
- `isActive`: Whether config is currently active

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for PostgreSQL)

### 1. Clone and Install

```bash
git clone <repository-url>
cd content-calendar-optimization-brain
npm install
```

### 2. Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` and set your variables:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/content_calendar?schema=public"

# Optional: For AI suggestions
OPENAI_API_KEY="sk-your-openai-api-key-here"
```

### 3. Start PostgreSQL

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432. Verify it's running:

```bash
docker ps
```

### 4. Initialize Database

Generate Prisma client and push schema:

```bash
npm run db:generate
npm run db:push
```

### 5. Seed Sample Data

Populate the database with sample channels and content:

```bash
npm run db:seed
```

This creates:
- 4 channels (X/Twitter, Instagram, Blog, Newsletter)
- 15 content items at various stages
- 1 default optimization configuration

### 6. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Features & Usage

### 1. Channel Management

**View all channels:**
```bash
GET /api/channels
```

**Create a channel:**
```bash
POST /api/channels
{
  "name": "LinkedIn",
  "type": "SNS",
  "metaJson": { "handle": "@company" }
}
```

**Update/Delete channels:**
```bash
PUT /api/channels/{id}
DELETE /api/channels/{id}
```

### 2. Content Management

**List content items:**
```bash
GET /api/content-items
GET /api/content-items?status=READY
GET /api/content-items?channelId={channelId}
```

**Create content:**
```bash
POST /api/content-items
{
  "title": "My awesome post",
  "bodyDraft": "Content goes here...",
  "targetChannelId": "channel-id",
  "tagsJson": ["tech", "startup"],
  "status": "READY"
}
```

**Update content:**
```bash
PUT /api/content-items/{id}
{
  "status": "READY"
}
```

### 3. Auto-Scheduling

The core feature: automatically schedule READY content across channels.

**Generate schedule:**
```bash
POST /api/schedule/auto
{
  "daysToSchedule": 30,
  "maxPostsPerDayPerChannel": 2,
  "avoidConsecutiveSameTag": true
}
```

**Scheduling Algorithm:**

1. Groups READY content by channel
2. Spreads content across specified time range (default: 30 days)
3. Respects max posts per day per channel (default: 2)
4. Avoids scheduling content with same tags on consecutive days
5. Uses preferred time slots (9 AM, 2 PM, 6 PM)

**View scheduled slots:**
```bash
GET /api/schedule/slots
GET /api/schedule/slots?channelId={id}
GET /api/schedule/slots?startDate=2024-01-01&endDate=2024-01-31
```

### 4. AI Suggestions (Optional)

If you've configured `OPENAI_API_KEY`, get AI-powered suggestions:

**Title suggestions:**
```bash
POST /api/ai/suggest
{
  "bodyDraft": "Your content...",
  "channelType": "SNS",
  "suggestionType": "title"
}
```

**Tag suggestions:**
```bash
POST /api/ai/suggest
{
  "title": "Your title",
  "bodyDraft": "Your content...",
  "suggestionType": "tags"
}
```

**Content improvements:**
```bash
POST /api/ai/suggest
{
  "title": "Your title",
  "bodyDraft": "Your content...",
  "channelType": "BLOG",
  "suggestionType": "improvements"
}
```

## Scheduling Heuristics

The scheduler uses several intelligent strategies:

### 1. Even Distribution
Spreads content evenly across the time range to avoid clustering.

### 2. Channel Capacity
Respects `maxPostsPerDayPerChannel` to prevent overwhelming any single channel.

### 3. Topic Diversity
When `avoidConsecutiveSameTag` is enabled, avoids scheduling content with overlapping tags on the same day.

### 4. Preferred Time Slots
Uses optimal posting times:
- 9:00 AM - Morning engagement
- 2:00 PM - Afternoon engagement
- 6:00 PM - Evening engagement

### 5. Schedule Scoring
Calculates a quality score based on distribution variance - lower variance = better distribution.

## Extending the System

### Custom Channels

Add new channel types by extending the `ChannelType` enum in `prisma/schema.prisma`:

```prisma
enum ChannelType {
  SNS
  BLOG
  EMAIL
  PODCAST  // Add new type
  VIDEO    // Add new type
}
```

Then run `npm run db:push` to update the database.

### Custom Scheduling Rules

Modify scheduling behavior in `lib/scheduler.ts`:

```typescript
const scheduler = new ContentScheduler({
  maxPostsPerDayPerChannel: 3,  // Increase capacity
  avoidConsecutiveSameTag: true,
  preferredTimeSlots: [
    { hour: 8, minute: 0 },   // Custom times
    { hour: 12, minute: 0 },
    { hour: 16, minute: 0 },
    { hour: 20, minute: 0 },
  ],
  daysToSchedule: 60,  // Longer range
})
```

### Integration with Other Projects

This system is designed to orchestrate content for external projects:

1. **API Integration**: Other services can query `/api/schedule/slots` to get upcoming publications
2. **Webhooks**: Add webhook triggers when content is scheduled/published
3. **Export**: Create endpoints to export schedules in various formats (iCal, CSV, JSON)

Example integration:

```typescript
// In your publishing service
const response = await fetch(
  'http://calendar-brain/api/schedule/slots?channelId=twitter&startDate=2024-01-01'
)
const { slots } = await response.json()

// Process upcoming publications
for (const slot of slots) {
  if (slot.contentItem) {
    schedulePublication(slot.scheduledAt, slot.contentItem)
  }
}
```

## Database Management

**View data in Prisma Studio:**
```bash
npm run db:studio
```

**Create migrations (for production):**
```bash
npm run db:migrate
```

**Reset database:**
```bash
npx prisma migrate reset
npm run db:seed
```

## Development Workflow

1. **Add content**: Create content items via API or directly in database
2. **Set status to READY**: Mark content ready for scheduling
3. **Run auto-schedule**: Click "Auto-Schedule" in UI or call API
4. **Review calendar**: Check the calendar view to verify schedule
5. **Adjust as needed**: Manually update slots or re-run scheduling

## Production Deployment

### Environment Variables

Ensure these are set in production:

```env
DATABASE_URL="your-production-database-url"
OPENAI_API_KEY="your-openai-key"  # Optional
NODE_ENV="production"
```

### Database

1. Use a managed PostgreSQL service (AWS RDS, Supabase, Railway, etc.)
2. Run migrations: `npm run db:migrate`
3. Seed initial data if needed: `npm run db:seed`

### Build and Deploy

```bash
npm run build
npm run start
```

Deploy to Vercel, Railway, or any Node.js hosting platform.

## Project Structure

```
content-calendar-optimization-brain/
├── app/
│   ├── api/
│   │   ├── channels/          # Channel CRUD
│   │   ├── content-items/     # Content CRUD
│   │   ├── schedule/          # Scheduling endpoints
│   │   └── ai/                # AI suggestions
│   ├── layout.tsx
│   └── page.tsx               # Main dashboard
├── components/
│   └── Calendar.tsx           # Calendar UI component
├── lib/
│   ├── prisma.ts              # Prisma client
│   └── scheduler.ts           # Scheduling algorithm
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script
├── docker-compose.yml         # PostgreSQL setup
├── package.json
└── README.md
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/channels` | GET | List all channels |
| `/api/channels` | POST | Create channel |
| `/api/channels/{id}` | GET | Get channel |
| `/api/channels/{id}` | PUT | Update channel |
| `/api/channels/{id}` | DELETE | Delete channel |
| `/api/content-items` | GET | List content items |
| `/api/content-items` | POST | Create content item |
| `/api/content-items/{id}` | GET | Get content item |
| `/api/content-items/{id}` | PUT | Update content item |
| `/api/content-items/{id}` | DELETE | Delete content item |
| `/api/schedule/auto` | POST | Generate schedule |
| `/api/schedule/slots` | GET | Get publishing slots |
| `/api/ai/suggest` | POST | Get AI suggestions |

## Troubleshooting

**Database connection error:**
- Ensure PostgreSQL is running: `docker ps`
- Check DATABASE_URL in `.env`
- Verify port 5432 is not in use

**Prisma errors:**
- Regenerate client: `npm run db:generate`
- Reset database: `npx prisma migrate reset`

**No content to schedule:**
- Check content items have status "READY"
- Run seed script: `npm run db:seed`

**AI suggestions not working:**
- Verify OPENAI_API_KEY is set in `.env`
- Check OpenAI API quota/billing

## Future Enhancements

- Drag-and-drop calendar interface
- Bulk content import (CSV, API)
- Analytics and performance tracking
- A/B testing for post timing
- Collaborative editing and approval workflows
- Integration with publishing APIs (Twitter, LinkedIn, etc.)
- Mobile app
- Advanced AI features (content generation, trend analysis)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ using Next.js, TypeScript, and Prisma
