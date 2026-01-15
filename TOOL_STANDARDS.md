# Tool Development Standards

This document defines the patterns and standards for building tools in the TDS Portal. All tools must follow these conventions to ensure consistency and quality.

## Data Patterns

### Upsert Logic (No Duplicates)

When saving data that may already exist, always use upsert pattern:

```typescript
// Check if record exists
const existing = await Model.findOne({ clientId, url });

if (existing) {
  // Update existing record, add to history
  await Model.findByIdAndUpdate(existing._id, {
    $set: { /* new data */ },
    $push: {
      history: {
        $each: [historyEntry],
        $slice: -50  // Keep last 50 entries
      }
    },
    $inc: { scanCount: 1 },
  });
} else {
  // Create new record
  await Model.create({ /* data */ });
}
```

### Scan/Activity History

All tools that perform scans or analyses must track history:

```typescript
interface IHistoryEntry {
  performedAt: Date;
  performedBy: mongoose.Types.ObjectId;  // Reference to User
  previousValue?: string;                 // What it was before
  changesDetected: boolean;
}

// In schema
history: [{
  performedAt: { type: Date, required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // ... additional fields
}],
scanCount: { type: Number, default: 1 },
lastScannedAt: { type: Date, default: Date.now },
lastScannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
```

### Nested Object Schemas

Always use explicit subdocument schemas for nested objects:

```typescript
// Correct - explicit schema
const nestedSchema = new Schema(
  {
    field1: String,
    field2: String,
  },
  { _id: false }
);

const mainSchema = new Schema({
  nested: {
    type: nestedSchema,
    default: () => ({}),
  },
});

// Incorrect - inline object (causes Mongoose issues)
const mainSchema = new Schema({
  nested: {
    field1: String,
    field2: String,
  },
});
```

### Model Cache Clearing (Development)

All models must handle hot reload in development:

```typescript
// Delete cached model in development to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.ModelName) {
  delete mongoose.models.ModelName;
}

export const ModelName: Model<IModelName> =
  mongoose.models.ModelName || mongoose.model<IModelName>('ModelName', modelSchema);
```

## UI Patterns

### Truncated Content with Tooltips

Any truncated text must have a tooltip showing full content:

```tsx
<TableCell className="max-w-xs truncate" title={fullValue}>
  {truncatedValue}
</TableCell>

// For links
<a href={url} title={url} className="truncate">
  {url.slice(0, 40)}...
</a>
```

### Score/Status Badges

Use consistent color coding for scores:

```typescript
function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

// Usage
<span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getScoreColor(score)}`}>
  {score}%
</span>
```

### Expandable Table Rows

For detailed data, use expandable rows:

```tsx
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

const toggleExpand = (id: string) => {
  setExpandedRows(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
};

// In table
<TableRow onClick={() => toggleExpand(item.id)} className="cursor-pointer hover:bg-neutral-50">
  <TableCell>
    {expandedRows.has(item.id) ? <ChevronUp /> : <ChevronDown />}
  </TableCell>
  {/* ... */}
</TableRow>
{expandedRows.has(item.id) && (
  <TableRow>
    <TableCell colSpan={columns}>{/* Expanded content */}</TableCell>
  </TableRow>
)}
```

### Save Feedback Messages

Show informative messages about what happened:

```tsx
const [saveMessage, setSaveMessage] = useState<string | null>(null);

// After save
const data = await res.json();
setSaveMessage(data.message);  // e.g., "3 new URLs saved, 2 existing URLs updated"
setTimeout(() => setSaveMessage(null), 5000);

// Display
<Card className={saveMessage ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
  {saveMessage ? (
    <>
      <CheckCircle className="h-5 w-5 text-green-600" />
      <span className="text-green-700">{saveMessage}</span>
    </>
  ) : (
    <span className="text-blue-700">Ready to save</span>
  )}
</Card>
```

### Tab Structure

Tools with multiple modes should use tabs:

```tsx
const [activeTab, setActiveTab] = useState('single');

// Standard tabs for scan tools
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="single">Single Scan</TabsTrigger>
    <TabsTrigger value="bulk">Bulk Scan</TabsTrigger>
    <TabsTrigger value="saved">Saved Results</TabsTrigger>
    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
  </TabsList>
</Tabs>
```

## API Patterns

### Authentication

All API routes must check authentication:

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use session.user.id for user references
  const userId = session.user.id;
}
```

### Response Messages

Include informative messages in responses:

```typescript
// Success with details
return NextResponse.json({
  saved: count,
  created: newCount,
  updated: existingCount,
  message: `${newCount} new items saved, ${existingCount} existing items updated`
}, { status: 201 });

// Errors
return NextResponse.json(
  { error: 'Descriptive error message' },
  { status: 400 }
);
```

### Bulk Operations

Bulk operations should process items individually for proper upsert:

```typescript
let created = 0;
let updated = 0;

for (const item of items) {
  const { isUpdate } = await upsertItem(clientId, item, userId);
  isUpdate ? updated++ : created++;
}

return NextResponse.json({
  saved: items.length,
  created,
  updated,
  message: updated > 0
    ? `${created} new items saved, ${updated} existing items updated`
    : `${created} items saved`
});
```

### Populating References

Always populate user references for display:

```typescript
const results = await Model.find({ clientId })
  .sort({ lastScannedAt: -1 })
  .populate('analyzedBy', 'name email')
  .populate('lastScannedBy', 'name email')
  .lean();
```

## Dashboard Patterns

### Global Stats

Dashboards should show aggregate statistics:

```typescript
const globalStats = {
  totalItems: await Model.countDocuments(),
  totalClients: (await Model.distinct('clientId')).length,
  averageScore: result[0]?.avgScore || 0,
  recentActivity: await Model.countDocuments({
    lastScannedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  }),
};
```

### Per-Client Grouping

Group data by client with recent items:

```typescript
const clientData = await Model.aggregate([
  { $group: {
    _id: '$clientId',
    count: { $sum: 1 },
    avgScore: { $avg: '$score' },
    lastScan: { $max: '$lastScannedAt' },
  }},
  { $lookup: {
    from: 'clients',
    localField: '_id',
    foreignField: '_id',
    as: 'client'
  }},
  { $unwind: '$client' },
  { $sort: { lastScan: -1 } },
]);
```

## File Structure

Tools should follow this structure:

```
apps/portal/
├── app/
│   ├── api/tools/[tool-name]/
│   │   ├── route.ts           # Main scan/analyze endpoint
│   │   ├── saved/
│   │   │   ├── route.ts       # GET saved, POST save (with upsert)
│   │   │   └── [id]/
│   │   │       └── rescan/
│   │   │           └── route.ts  # Rescan specific item
│   │   └── dashboard/
│   │       └── route.ts       # Dashboard stats
│   └── tools/[tool-name]/
│       └── page.tsx           # UI component

packages/database/src/models/
└── [model-name].ts            # Mongoose model with history tracking
```

## Checklist for New Tools

- [ ] Model has scan history tracking
- [ ] Model uses explicit subdocument schemas
- [ ] Model has development cache clearing
- [ ] API uses upsert pattern (no duplicates)
- [ ] API returns informative messages
- [ ] API populates user references
- [ ] UI has tooltips on truncated content
- [ ] UI shows score with color coding
- [ ] UI has expandable rows for details
- [ ] UI shows save feedback messages
- [ ] Dashboard shows global and per-client stats
- [ ] Registered in `lib/tools.ts`
