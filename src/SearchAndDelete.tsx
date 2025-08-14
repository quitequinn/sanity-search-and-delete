/**
 * Flexible Search and Delete utility for Sanity Studio
 * Bulk content management with safety features for any document type
 */

import React, { useState, useCallback } from 'react'
import {
  Card,
  Stack,
  Text,
  TextInput,
  Button,
  Box,
  Flex,
  Badge,
  Dialog,
  Grid,
  Select,
  Checkbox,
  Spinner,
  Toast
} from '@sanity/ui'
import { SearchIcon, TrashIcon, WarningOutlineIcon } from '@sanity/icons'
import { SanityClient } from 'sanity'

// Types
interface SearchResult {
  _id: string
  _type: string
  title?: string
  name?: string
  [key: string]: any
}

interface SearchAndDeleteProps {
  client: SanityClient
  documentTypes?: string[]
  onComplete?: (results: { deleted: number; errors: string[] }) => void
  onError?: (error: string) => void
  batchSize?: number
  dryRun?: boolean
  maxResults?: number
}

/**
 * Search and Delete component for bulk content management
 */
export const SearchAndDelete: React.FC<SearchAndDeleteProps> = ({
  client,
  documentTypes = [],
  onComplete,
  onError,
  batchSize = 10,
  dryRun = false,
  maxResults = 100
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [availableTypes, setAvailableTypes] = useState<string[]>([])
  const [customGroqQuery, setCustomGroqQuery] = useState('')
  const [useCustomQuery, setUseCustomQuery] = useState(false)
  const [message, setMessage] = useState('')

  // Load available document types on mount
  React.useEffect(() => {
    loadAvailableTypes()
  }, [])

  /**
   * Load available document types from the dataset
   */
  const loadAvailableTypes = useCallback(async () => {
    try {
      const types = documentTypes.length > 0 
        ? documentTypes 
        : await client.fetch(`array::unique(*[]._type)`)
      
      setAvailableTypes(types.filter(Boolean))
    } catch (error) {
      console.error('Error loading document types:', error)
      onError?.('Failed to load document types')
    }
  }, [client, documentTypes, onError])

  /**
   * Build GROQ query based on search parameters
   */
  const buildQuery = useCallback(() => {
    if (useCustomQuery && customGroqQuery.trim()) {
      return customGroqQuery
    }

    let query = '*['
    const conditions = []

    // Document type filter
    if (selectedType !== 'all') {
      conditions.push(`_type == "${selectedType}"`)
    } else if (availableTypes.length > 0) {
      conditions.push(`_type in [${availableTypes.map(t => `"${t}"`).join(', ')}]`)
    }

    // Search query filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.trim().toLowerCase()
      conditions.push(`(
        lower(title) match "*${searchTerm}*" ||
        lower(name) match "*${searchTerm}*" ||
        lower(slug.current) match "*${searchTerm}*" ||
        lower(string::split(string(_id), ".")[1]) match "*${searchTerm}*"
      )`)
    }

    if (conditions.length > 0) {
      query += conditions.join(' && ')
    }

    query += `][0...${maxResults}] {
      _id,
      _type,
      title,
      name,
      slug,
      _createdAt,
      _updatedAt
    }`

    return query
  }, [searchQuery, selectedType, availableTypes, useCustomQuery, customGroqQuery, maxResults])

  /**
   * Execute search query
   */
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() && !useCustomQuery) {
      setMessage('Please enter a search term or use custom query')
      return
    }

    setIsSearching(true)
    setMessage('')
    
    try {
      const query = buildQuery()
      console.log('Executing query:', query)
      
      const results = await client.fetch(query)
      setSearchResults(Array.isArray(results) ? results : [])
      setSelectedItems(new Set())
      
      setMessage(`Found ${results.length} documents`)
    } catch (error) {
      console.error('Search error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      setMessage(`Search error: ${errorMessage}`)
      onError?.(errorMessage)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, useCustomQuery, buildQuery, client, onError])

  /**
   * Toggle item selection
   */
  const toggleItemSelection = useCallback((id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }, [selectedItems])

  /**
   * Select all items
   */
  const selectAll = useCallback(() => {
    const allIds = new Set(searchResults.map(item => item._id))
    setSelectedItems(allIds)
  }, [searchResults])

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  /**
   * Execute deletion
   */
  const handleDelete = useCallback(async () => {
    if (selectedItems.size === 0) return

    setIsDeleting(true)
    setMessage('')
    
    const itemsToDelete = Array.from(selectedItems)
    const errors: string[] = []
    let deletedCount = 0

    try {
      // Process in batches
      for (let i = 0; i < itemsToDelete.length; i += batchSize) {
        const batch = itemsToDelete.slice(i, i + batchSize)
        
        if (dryRun) {
          console.log('DRY RUN: Would delete:', batch)
          deletedCount += batch.length
        } else {
          // Delete batch
          const transaction = client.transaction()
          batch.forEach(id => transaction.delete(id))
          
          try {
            await transaction.commit()
            deletedCount += batch.length
            setMessage(`Deleted ${deletedCount}/${itemsToDelete.length} items...`)
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            errors.push(`Batch ${i / batchSize + 1}: ${errorMsg}`)
          }
        }
      }

      // Update results
      const remainingResults = searchResults.filter(item => !selectedItems.has(item._id))
      setSearchResults(remainingResults)
      setSelectedItems(new Set())
      
      const finalMessage = dryRun 
        ? `DRY RUN: Would delete ${deletedCount} items`
        : `Successfully deleted ${deletedCount} items${errors.length > 0 ? ` (${errors.length} errors)` : ''}`
      
      setMessage(finalMessage)
      onComplete?.({ deleted: deletedCount, errors })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete operation failed'
      setMessage(`Delete error: ${errorMessage}`)
      onError?.(errorMessage)
    } finally {
      setIsDeleting(false)
      setShowConfirmDialog(false)
    }
  }, [selectedItems, searchResults, batchSize, dryRun, client, onComplete, onError])

  /**
   * Get display title for a document
   */
  const getDisplayTitle = useCallback((item: SearchResult) => {
    return item.title || item.name || item.slug?.current || item._id
  }, [])

  return (
    <Card padding={4} radius={2} shadow={1}>
      <Stack space={4}>
        {/* Header */}
        <Flex align="center" gap={3}>
          <SearchIcon />
          <Text size={2} weight="semibold">
            Search and Delete {dryRun && '(DRY RUN)'}
          </Text>
        </Flex>

        {/* Search Controls */}
        <Stack space={3}>
          <Grid columns={[1, 2]} gap={3}>
            <Stack space={2}>
              <Text size={1} weight="medium">Document Type</Text>
              <Select
                value={selectedType}
                onChange={(event) => setSelectedType(event.currentTarget.value)}
              >
                <option value="all">All Types</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </Stack>
            
            <Stack space={2}>
              <Text size={1} weight="medium">Search Term</Text>
              <TextInput
                placeholder="Search by title, name, slug, or ID..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                onKeyPress={(event) => event.key === 'Enter' && handleSearch()}
                disabled={useCustomQuery}
              />
            </Stack>
          </Grid>

          {/* Custom Query Option */}
          <Stack space={2}>
            <Checkbox
              checked={useCustomQuery}
              onChange={(event) => setUseCustomQuery(event.currentTarget.checked)}
            >
              Use custom GROQ query
            </Checkbox>
            
            {useCustomQuery && (
              <TextInput
                placeholder="Enter custom GROQ query..."
                value={customGroqQuery}
                onChange={(event) => setCustomGroqQuery(event.currentTarget.value)}
              />
            )}
          </Stack>

          {/* Search Button */}
          <Button
            text="Search"
            icon={SearchIcon}
            onClick={handleSearch}
            loading={isSearching}
            tone="primary"
          />
        </Stack>

        {/* Status Message */}
        {message && (
          <Card padding={3} tone={message.includes('error') ? 'critical' : 'positive'}>
            <Text size={1}>{message}</Text>
          </Card>
        )}

        {/* Results */}
        {searchResults.length > 0 && (
          <Stack space={3}>
            {/* Selection Controls */}
            <Flex justify="space-between" align="center">
              <Text size={1} weight="medium">
                {searchResults.length} results • {selectedItems.size} selected
              </Text>
              <Flex gap={2}>
                <Button text="Select All" onClick={selectAll} mode="ghost" />
                <Button text="Clear" onClick={clearSelection} mode="ghost" />
                <Button
                  text={dryRun ? 'Preview Delete' : 'Delete Selected'}
                  icon={TrashIcon}
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={selectedItems.size === 0}
                  tone="critical"
                />
              </Flex>
            </Flex>

            {/* Results List */}
            <Stack space={2}>
              {searchResults.map((item) => (
                <Card key={item._id} padding={3} border>
                  <Flex align="center" gap={3}>
                    <Checkbox
                      checked={selectedItems.has(item._id)}
                      onChange={() => toggleItemSelection(item._id)}
                    />
                    <Box flex={1}>
                      <Flex align="center" gap={2}>
                        <Text weight="medium">{getDisplayTitle(item)}</Text>
                        <Badge tone="primary">{item._type}</Badge>
                      </Flex>
                      <Text size={1} muted>ID: {item._id}</Text>
                      {item._updatedAt && (
                        <Text size={1} muted>
                          Updated: {new Date(item._updatedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                </Card>
              ))}
            </Stack>
          </Stack>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <Dialog
            header="Confirm Deletion"
            id="delete-confirm"
            onClose={() => setShowConfirmDialog(false)}
            footer={
              <Box padding={3}>
                <Grid columns={2} gap={3}>
                  <Button
                    text="Cancel"
                    onClick={() => setShowConfirmDialog(false)}
                    mode="ghost"
                  />
                  <Button
                    text={dryRun ? 'Preview' : 'Delete'}
                    onClick={handleDelete}
                    tone="critical"
                    loading={isDeleting}
                  />
                </Grid>
              </Box>
            }
          >
            <Box padding={4}>
              <Stack space={3}>
                <Flex align="center" gap={2}>
                  <WarningOutlineIcon style={{ color: 'red' }} />
                  <Text weight="semibold">
                    {dryRun ? 'Preview Deletion' : 'Confirm Deletion'}
                  </Text>
                </Flex>
                <Text>
                  {dryRun 
                    ? `This will preview the deletion of ${selectedItems.size} selected items.`
                    : `This will permanently delete ${selectedItems.size} selected items. This action cannot be undone.`
                  }
                </Text>
                {!dryRun && (
                  <Text size={1} style={{ color: 'red' }}>
                    ⚠️ This is a destructive operation. Make sure you have backups.
                  </Text>
                )}
              </Stack>
            </Box>
          </Dialog>
        )}
      </Stack>
    </Card>
  )
}

export default SearchAndDelete