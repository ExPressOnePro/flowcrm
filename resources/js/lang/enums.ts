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
    task_status: {
        open: 'Открыта',
        in_progress: 'В работе',
        completed: 'Выполнена',
        cancelled: 'Отменена',
    },
    task_priority: {
        low: 'Низкий',
        medium: 'Средний',
        high: 'Высокий',
        urgent: 'Срочный',
    },
    customer_status: {
        active: 'Активный',
        inactive: 'Неактивный',
        prospect: 'Потенциальный',
    },
    customer_type: {
        individual: 'Физлицо',
        company: 'Компания',
    },
    document_state: {
        valid: 'Действует',
        expiring: 'Истекает',
        expired: 'Просрочен',
        no_expiry: 'Бессрочный',
        archived: 'В архиве',
    },
    document_filter: {
        valid: 'Действующие',
        expiring: 'Истекающие',
        expired: 'Просроченные',
        no_expiry: 'Бессрочные',
        archived: 'Архив',
    },
    document_subject: {
        vehicle: 'Транспорт',
        driver: 'Водители',
    },
    document_sort: {
        expires: 'Сначала истекающие',
        '-expires': 'Сначала поздние сроки',
        plate: 'По госномеру',
        type: 'По типу документа',
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
    task_status: {
        open: 'Open',
        in_progress: 'In progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
    },
    task_priority: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        urgent: 'Urgent',
    },
    customer_status: {
        active: 'Active',
        inactive: 'Inactive',
        prospect: 'Prospect',
    },
    customer_type: {
        individual: 'Individual',
        company: 'Company',
    },
    document_state: {
        valid: 'Valid',
        expiring: 'Expiring',
        expired: 'Expired',
        no_expiry: 'No expiry',
        archived: 'Archived',
    },
    document_filter: {
        valid: 'Valid',
        expiring: 'Expiring',
        expired: 'Expired',
        no_expiry: 'No expiry',
        archived: 'Archive',
    },
    document_subject: {
        vehicle: 'Vehicles',
        driver: 'Drivers',
    },
    document_sort: {
        expires: 'Expiring first',
        '-expires': 'Latest expiry first',
        plate: 'By plate number',
        type: 'By document type',
    },
};

export const enumLabels: Record<string, EnumLabels> = { ru, en };
