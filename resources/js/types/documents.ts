export type DocumentState =
    'valid' | 'expiring' | 'expired' | 'no_expiry' | 'archived';

export type DocumentFileItem = {
    id: number;
    name: string;
    mime_type: string;
    size: number;
    is_image: boolean;
    url: string;
};

export type DocumentItem = {
    id: number;
    type: { id: number; name: string; has_expiry: boolean };
    number: string | null;
    issuer: string | null;
    issued_on: string | null;
    expires_on: string | null;
    days_left: number | null;
    state: DocumentState;
    notes: string | null;
    created_by: string | null;
    created_at: string | null;
    archived_at: string | null;
    archive_reason: string | null;
    archived_by: string | null;
    replaced_by_id: number | null;
    files: DocumentFileItem[];
};

export type DocumentListItem = DocumentItem & {
    files_count: number;
    vehicle: {
        id: number;
        plate_number: string;
        name: string;
        branch: string | null;
    } | null;
    driver: { id: number; name: string; branch: string | null } | null;
};

export type DocumentTypeOption = {
    id: number;
    name: string;
    has_expiry: boolean;
    is_mandatory: boolean;
};

export type DocumentSummary = {
    expired: { id: number; name: string; expires_on: string | null }[];
    expiring: {
        id: number;
        name: string;
        expires_on: string | null;
        days_left: number | null;
    }[];
    missing: string[];
};

export type SubjectDocumentsPayload = {
    items: DocumentItem[];
    missing: { id: number; name: string }[];
    archived_count: number;
    types: DocumentTypeOption[];
};
