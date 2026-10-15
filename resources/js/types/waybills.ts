export type WaybillStatus = 'draft' | 'issued' | 'closed' | 'cancelled';

export type WaybillListItem = {
    id: number;
    number: string | null;
    status: WaybillStatus;
    overdue: boolean;
    route: string;
    vehicle: { id: number; plate_number: string };
    trailer: { id: number; plate_number: string } | null;
    driver: { id: number; name: string };
    branch: string | null;
    planned_departure_at: string | null;
    planned_return_at: string | null;
    departure_at: string | null;
    return_at: string | null;
    distance_km: number | null;
};

export type WaybillVehicleOption = {
    id: number;
    plate_number: string;
    name: string;
    category: string;
    branch: string | null;
    status: string;
    can_tow: boolean;
    has_odometer: boolean;
    busy: boolean;
};

export type WaybillDriverOption = {
    id: number;
    name: string;
    categories: string[];
    busy: boolean;
};

export type WaybillFormOptions = {
    vehicles: WaybillVehicleOption[];
    trailers: WaybillVehicleOption[];
    drivers: WaybillDriverOption[];
};

export type WaybillWarning = { level: 'danger' | 'warning'; message: string };
