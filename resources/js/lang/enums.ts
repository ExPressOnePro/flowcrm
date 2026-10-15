type EnumLabels = Record<string, Record<string, string>>;

const ru: EnumLabels = {
    vehicle_status: {
        in_service: 'В эксплуатации',
        under_repair: 'В ремонте',
        idle: 'Простой',
        decommissioned: 'Списано',
    },
    vehicle_category: {
        tractor: 'Седельный тягач',
        truck: 'Грузовик',
        semitrailer: 'Полуприцеп',
        trailer: 'Прицеп',
        van: 'Фургон',
        car: 'Легковой',
        bus: 'Автобус',
        other: 'Другое',
    },
    ownership_type: {
        owned: 'Собственное',
        leased: 'Лизинг',
        rented: 'Аренда',
    },
    odometer_source: {
        initial: 'Начальное',
        manual: 'Вручную',
        waybill_departure: 'Путевой лист (выезд)',
        waybill_return: 'Путевой лист (возврат)',
        maintenance: 'ТО',
        telematics: 'Телематика',
    },
};

const en: EnumLabels = {
    vehicle_status: {
        in_service: 'In service',
        under_repair: 'Under repair',
        idle: 'Idle',
        decommissioned: 'Decommissioned',
    },
    vehicle_category: {
        tractor: 'Tractor unit',
        truck: 'Truck',
        semitrailer: 'Semitrailer',
        trailer: 'Trailer',
        van: 'Van',
        car: 'Car',
        bus: 'Bus',
        other: 'Other',
    },
    ownership_type: {
        owned: 'Owned',
        leased: 'Leased',
        rented: 'Rented',
    },
    odometer_source: {
        initial: 'Initial',
        manual: 'Manual',
        waybill_departure: 'Waybill (departure)',
        waybill_return: 'Waybill (return)',
        maintenance: 'Maintenance',
        telematics: 'Telematics',
    },
};

export const enumLabels: Record<string, EnumLabels> = { ru, en };
