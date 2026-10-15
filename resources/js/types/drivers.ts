export type DriverStatus = 'active' | 'inactive';

export type DriverItem = {
    id: number;
    full_name: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    phone: string | null;
    personnel_number: string | null;
    license_number: string | null;
    license_categories: string[];
    status: DriverStatus;
    branch_id: number | null;
    branch: string | null;
    user_id: number | null;
    user: string | null;
};

export type DriverListItem = DriverItem & {
    expired_documents: number | null;
    on_trip: boolean;
};

export type DriverFormOptions = {
    branches: { id: number; name: string }[];
    users: { id: number; name: string; email: string }[];
    categories: string[];
};
