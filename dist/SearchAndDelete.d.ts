/**
 * Flexible Search and Delete utility for Sanity Studio
 * Bulk content management with safety features for any document type
 */
import React from 'react';
import { SanityClient } from 'sanity';
interface SearchAndDeleteProps {
    client: SanityClient;
    documentTypes?: string[];
    onComplete?: (results: {
        deleted: number;
        errors: string[];
    }) => void;
    onError?: (error: string) => void;
    batchSize?: number;
    dryRun?: boolean;
    maxResults?: number;
}
/**
 * Search and Delete component for bulk content management
 */
export declare const SearchAndDelete: React.FC<SearchAndDeleteProps>;
export default SearchAndDelete;
