# Notion Integration Guide

This guide explains how to integrate Notion with your Library Resources section to dynamically fetch and display content from Notion databases.

## Overview

The Notion integration allows you to:
- Manage resources (books, tools, learning resources) in Notion
- Automatically sync content to your website
- Display resources in the Library Resources tab
- Keep content updated without code changes

## Setup

### 1. Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill in the details:
   - **Name**: Your Site Resources (or any name)
   - **Type**: Internal
   - **Associated workspace**: Select your workspace
4. Click **Submit**
5. Copy the **Internal Integration Token** (starts with `secret_`)

### 2. Create a Notion Database

1. Create a new page in Notion
2. Type `/database` and select **Table - Inline**
3. Add the following properties (columns):

#### Required Properties:
- **Title** (Title) - Name of the resource
- **Description** (Text) - Brief description
- **Link** (URL) - Link to the resource
- **Type** (Select) - Options: `Book`, `Tool`, `Learning Resource`
- **Published** (Checkbox) - Toggle to show/hide on website

#### Recommended Properties:
- **Image** or **Cover** (Files) - Cover image for the resource. Upload an image file or paste an image URL. The first image will be displayed as a thumbnail.
- **Category** (Select) - e.g., "Web Development", "Design", "Productivity"
- **Author** (Text) - For books
- **Icon** (Text) - Icon name (e.g., "mdi:book-open-variant") - Used as fallback if no image is provided
- **Created** (Created time) - Auto-generated
- **Updated** (Last edited time) - Auto-generated

### Adding Images to Resources

To add images to your resources:

1. **Create an Image Property**:
   - In your Notion database, add a new property
   - Name it `Image` or `Cover`
   - Set the type to **Files & media**
   - Choose "Files" (not "Media")

2. **Add Images**:
   - **Option 1 - Upload**: Click on the property cell and upload an image file directly
   - **Option 2 - URL**: Paste an image URL (must be publicly accessible)
   - **Option 3 - Notion Image Block**: You can also drag and drop images into the property

3. **Image Display**:
   - The first image in the Files property will be displayed as a thumbnail
   - Images are automatically optimized and lazy-loaded
   - If no image is provided, the resource will show an icon instead

4. **Image Requirements**:
   - Supported formats: JPG, PNG, GIF, WebP
   - Recommended size: 400x300px or larger (will be automatically resized)
   - Images should be publicly accessible if using URLs

### 3. Share Database with Integration

1. Open your database page
2. Click **"..."** (three dots) in the top right
3. Select **"Connections"**
4. Search for and select your integration
5. Click **"Invite"**

### 4. Get Database ID

1. Open your database in Notion
2. Look at the URL: `https://www.notion.so/your-workspace/DATABASE_ID?v=...`
3. Copy the **DATABASE_ID** (32-character string, may have hyphens)
4. Remove any hyphens from the ID

### 5. Set Environment Variables

Add to your `.env` file:

```env
# Notion Integration
NOTION_API_KEY=secret_your_integration_token_here
NOTION_DATABASE_ID=your_database_id_here
```

## Usage

### Basic Usage in Resources Tab

Replace the static resources in `pages/library.vue`:

```vue
<template>
  <!-- Resources Tab -->
  <div v-else-if="activeTab === 'resources'">
    <!-- Books Section -->
    <section class="mb-16">
      <div class="flex items-center mb-6">
        <Icon name="mdi:book-open-variant" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
        <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Recommended Books</h2>
      </div>
      <NotionResources type="books" />
    </section>

    <!-- Tools Section -->
    <section class="mb-16">
      <div class="flex items-center mb-6">
        <Icon name="mdi:tools" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
        <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Tools & Software</h2>
      </div>
      <NotionResources type="tools" />
    </section>

    <!-- Learning Resources Section -->
    <section class="mb-16">
      <div class="flex items-center mb-6">
        <Icon name="mdi:school" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
        <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Learning Resources</h2>
      </div>
      <NotionResources type="learning" />
    </section>
  </div>
</template>

<script setup>
import NotionResources from '~/components/notion/NotionResources.vue'
</script>
```

### Advanced Usage with Custom Rendering

```vue
<NotionResources type="books">
  <template #default="{ items, books, tools, learningResources }">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <NotionResourceCard
        v-for="book in books"
        :key="book.id"
        :item="book"
        type="book"
      />
    </div>
  </template>
</NotionResources>
```

### Using the Composable Directly

```vue
<script setup>
import { useNotion } from '~/composables/useNotion'

const { isLoading, error, fetchResources, fetchDatabase } = useNotion()

const loadCustomData = async () => {
  const response = await fetchDatabase({
    databaseId: 'your-database-id',
    filter: {
      property: 'Category',
      select: {
        equals: 'Web Development'
      }
    },
    sorts: [
      {
        property: 'Created',
        direction: 'descending'
      }
    ]
  })
  
  if (response.success) {
    console.log('Items:', response.items)
  }
}
</script>
```

## Database Schema Examples

### Books Database

| Property | Type | Example |
|---------|------|---------|
| Title | Title | "Clean Code" |
| Author | Text | "Robert C. Martin" |
| Description | Text | "A handbook of agile software craftsmanship" |
| Link | URL | "https://amazon.com/..." |
| Type | Select | "Book" |
| Category | Select | "Programming" |
| Published | Checkbox | ✓ |

### Tools Database

| Property | Type | Example |
|---------|------|---------|
| Title | Title | "VS Code" |
| Description | Text | "Code editor redefined" |
| Link | URL | "https://code.visualstudio.com" |
| Type | Select | "Tool" |
| Category | Select | "Development" |
| Icon | Text | "mdi:code-tags" |
| Published | Checkbox | ✓ |

## Property Mapping

The integration automatically maps Notion properties to component props:

- `Title` or `title` → Card title
- `Description` or `description` → Card description
- `Link` or `link` or `URL` or `url` → Card link
- `Category` or `category` → Category badge
- `Author` or `author` → Author display
- `Icon` or `icon` → Icon name
- `Type` or `type` → Resource type filter

## Filtering and Sorting

### Filter by Published Status

```typescript
const response = await fetchDatabase({
  databaseId: 'your-db-id',
  filter: {
    property: 'Published',
    checkbox: {
      equals: true
    }
  }
})
```

### Filter by Category

```typescript
const response = await fetchDatabase({
  databaseId: 'your-db-id',
  filter: {
    and: [
      {
        property: 'Published',
        checkbox: { equals: true }
      },
      {
        property: 'Category',
        select: { equals: 'Web Development' }
      }
    ]
  }
})
```

### Sort by Date

```typescript
const response = await fetchDatabase({
  databaseId: 'your-db-id',
  sorts: [
    {
      property: 'Created',
      direction: 'descending'
    }
  ]
})
```

## Features

The Resources tab includes:
- **Tabbed Navigation**: Switch between Books, Tools, and Learning Resources
- **Search Functionality**: Search across titles, descriptions, categories, and authors
- **Google Authentication**: Resources are protected and require sign-in
- **Real-time Updates**: Changes in Notion are reflected on the website

## Troubleshooting

### Error: "Unauthorized"
- Check that `NOTION_API_KEY` is set correctly
- Verify the integration token starts with `secret_`
- Ensure the integration is shared with your database

### Error: "Database not found"
- Verify `NOTION_DATABASE_ID` is correct
- Remove hyphens from the database ID
- Ensure the integration has access to the database

### No items showing
- Check that items have `Published` checkbox checked
- Verify the `Type` property matches expected values
- Check browser console for errors

### Properties not mapping correctly
- Ensure property names match (case-sensitive)
- Check that property types match (Title, Text, URL, etc.)
- Review the API response in server logs

## API Endpoints

### GET `/api/notion/database`

Query parameters:
- `databaseId` (required) - Notion database ID
- `pageSize` (optional) - Number of items to fetch (default: 100)
- `filter` (optional) - JSON stringified filter object
- `sorts` (optional) - JSON stringified sorts array

Example:
```
/api/notion/database?databaseId=abc123&pageSize=50
```

## Best Practices

1. **Use Published Checkbox**: Always filter by `Published: true` to control visibility
2. **Consistent Property Names**: Use consistent naming (Title vs title) across your database
3. **Cache Responses**: Consider caching Notion responses to reduce API calls
4. **Error Handling**: Always check `response.success` before using data
5. **Type Safety**: Define TypeScript interfaces for your Notion items

## Ideas for Use Cases

1. **Resource Library**: Books, tools, courses, articles
2. **Project Showcase**: Portfolio items with descriptions and links
3. **Blog Posts**: Sync blog post metadata from Notion
4. **Team Members**: Display team bios and links
5. **Events**: Upcoming events and conferences
6. **Documentation**: Link to documentation pages
7. **Templates**: Shareable templates and checklists

## Next Steps

1. Set up your Notion database with the required properties
2. Add your first resources
3. Configure environment variables
4. Test the integration
5. Customize the rendering to match your design

For more information, see the [Notion API documentation](https://developers.notion.com/).

