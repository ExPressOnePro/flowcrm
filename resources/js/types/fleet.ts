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
