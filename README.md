# Sanity Search and Delete

A flexible search and delete utility for Sanity Studio that enables bulk content management with comprehensive safety features. Works with any document type and provides powerful search capabilities.

## Features

- 🔍 **Flexible Search**: Search across any document type with multiple criteria
- 🎯 **Custom GROQ Queries**: Advanced users can write custom queries
- 🛡️ **Safety First**: Confirmation dialogs, dry-run mode, and batch processing
- 📊 **Progress Tracking**: Real-time feedback during operations
- ✅ **Selective Deletion**: Choose exactly which documents to delete
- 🔄 **Batch Processing**: Handles large datasets efficiently
- 📱 **Responsive UI**: Works seamlessly in Sanity Studio

## Installation

```bash
npm install sanity-search-and-delete
```

## Quick Start

### Basic Usage

```tsx
import React from 'react'
import { SearchAndDelete } from 'sanity-search-and-delete'
import { useClient } from 'sanity'

const MyUtilityPage = () => {
  const client = useClient({ apiVersion: '2023-01-01' })

  return (
    <SearchAndDelete
      client={client}
      onComplete={(results) => {
        console.log(`Deleted ${results.deleted} items`)
      }}
    />
  )
}
```

### As a Sanity Studio Tool

```tsx
// sanity.config.ts
import { defineConfig } from 'sanity'
import { SearchAndDeleteTool } from 'sanity-search-and-delete'

export default defineConfig({
  // ... other config
  tools: [
    SearchAndDeleteTool()
  ]
})
```

### With Specific Document Types

```tsx
<SearchAndDelete
  client={client}
  documentTypes={['post', 'page', 'author']}
  maxResults={50}
  batchSize={5}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `client` | `SanityClient` | **required** | Sanity client instance |
| `documentTypes` | `string[]` | `[]` | Specific document types to search (empty = all types) |
| `onComplete` | `function` | `undefined` | Callback when deletion completes |
| `onError` | `function` | `undefined` | Error handling callback |
| `batchSize` | `number` | `10` | Number of items to delete per batch |
| `dryRun` | `boolean` | `false` | Preview mode without actual deletion |
| `maxResults` | `number` | `100` | Maximum search results to display |

## Usage Examples

### 1. Basic Content Cleanup

```tsx
import { SearchAndDelete } from 'sanity-search-and-delete'

const ContentCleanup = () => {
  const client = useClient({ apiVersion: '2023-01-01' })

  return (
    <SearchAndDelete
      client={client}
      documentTypes={['post', 'page']}
      onComplete={(results) => {
        if (results.errors.length > 0) {
          console.error('Some deletions failed:', results.errors)
        } else {
          console.log(`Successfully deleted ${results.deleted} items`)
        }
      }}
    />
  )
}
```

### 2. Safe Mode with Dry Run

```tsx
<SearchAndDelete
  client={client}
  dryRun={true}
  onComplete={(results) => {
    console.log(`Would delete ${results.deleted} items`)
  }}
/>
```

### 3. Custom Error Handling

```tsx
<SearchAndDelete
  client={client}
  onError={(error) => {
    // Custom error handling
    toast.error(`Operation failed: ${error}`)
  }}
  onComplete={(results) => {
    if (results.deleted > 0) {
      toast.success(`Deleted ${results.deleted} items`)
    }
  }}
/>
```

## Search Capabilities

### Built-in Search Fields

The component automatically searches across common fields:
- `title`
- `name` 
- `slug.current`
- Document ID

### Custom GROQ Queries

For advanced users, enable custom GROQ queries:

```groq
*[_type == "post" && dateTime(_createdAt) < dateTime("2023-01-01")]
```

```groq
*[_type == "author" && !defined(bio)]
```

## Safety Features

### Confirmation Dialogs
- All delete operations require explicit confirmation
- Clear warning messages for destructive actions
- Separate confirmation for dry-run vs actual deletion

### Dry Run Mode
```tsx
<SearchAndDelete client={client} dryRun={true} />
```
- Preview what would be deleted without making changes
- Test queries and filters safely
- Validate batch sizes and operations

### Batch Processing
- Large deletions are processed in configurable batches
- Prevents timeout issues with large datasets
- Progress feedback during long operations

## Requirements

- Sanity Studio v3+
- React 18+
- @sanity/ui v1+
- TypeScript 4.5+ (optional)

## License

MIT License - see [LICENSE](LICENSE) file for details.