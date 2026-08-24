/**
 * AI model entity type
 */
export interface AIModel {
    /** Model ID */
    id: string;

    /** Model owner */
    owner_by: string;

    /** Model creation time (Unix timestamp, seconds) */
    created: number;
}
