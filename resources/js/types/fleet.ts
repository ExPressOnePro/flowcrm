export type Option = { id: number; name: string };

export type VehicleTypeOption = Option & {
    category: string;
    has_odometer: boolean;
    is_active: boolean;
};

export type BranchOption = Option & { is_active: boolean };

export type VehicleSummary = {
    id: number;
    plate_number: string;
    vin: string | null;
    make: string;
    model: string | null;
    year: number | null;
    status: string;
    ownership_type: string;
    commissioned_on: string | null;
    current_odometer_km: number | null;
    type: {
        id: number;
        name: string;
        category: string;
        can_tow: boolean;
        is_towable: boolean;
    };
    branch: Option | null;
    archived: boolean;
};

export type VehiclePartner = {
    id: number;
    plate_number: string;
    name: string;
    archived: boolean;
} | null;

export type VehicleDetail = VehicleSummary & {
    vehicle_type_id: number;
    branch_id: number | null;
    has_odometer: boolean;
    responsible: { id: number; name: string; email: string } | null;
    created_by: string | null;
    notes: string | null;
    created_at: string | null;
    deleted_at: string | null;
    status_since: string | null;
    odometer_stale: boolean;
};

export type ActiveCoupling = {
    id: number;
    role: 'tractor' | 'trailer';
    partner: VehiclePartner;
    position: number;
    coupled_at: string;
    coupled_by: string | null;
    notes: string | null;
};

export type LastReading = {
    value_km: number;
    recorded_at: string;
    source: string;
    is_device: boolean;
    recorded_by: string | null;
};

export type CouplingCandidate = {
    id: number;
    plate_number: string;
    name: string;
    type: string;
};

export type VehicleCan = {
    update: boolean;
    change_status: boolean;
    record_odometer: boolean;
    archive: boolean;
    view_documents: boolean;
    create_document: boolean;
    update_document: boolean;
    archive_document: boolean;
};

export type VehicleOptions = {
    types: VehicleTypeOption[];
    branches: BranchOption[];
    users: Option[];
    statuses: string[];
    categories: string[];
    ownershipTypes: string[];
};

export type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};
