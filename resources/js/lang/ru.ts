/**
 * Russian UI strings keyed by the English source text.
 * Missing keys fall back to the English key itself.
 */
const ru: Record<string, string> = {
    // Navigation
    Dashboard: 'Главная',
    Fleet: 'Автопарк',
    Vehicles: 'Транспорт',
    Branches: 'Филиалы',
    'Vehicle types': 'Типы ТС',
    Commerce: 'Коммерция',
    Customers: 'Клиенты',
    Work: 'Работа',
    Tasks: 'Задачи',
    Company: 'Компания',
    Employees: 'Сотрудники',
    Settings: 'Настройки',
    New: 'Новое',
    Edit: 'Изменить',

    // Common
    Search: 'Найти',
    Save: 'Сохранить',
    'Save changes': 'Сохранить изменения',
    Cancel: 'Отмена',
    Create: 'Создать',
    Close: 'Закрыть',
    Yes: 'Да',
    No: 'Нет',
    Active: 'Активен',
    Inactive: 'Неактивен',
    All: 'Все',
    Notes: 'Примечания',
    Note: 'Примечание',
    Name: 'Название',
    Code: 'Код',
    City: 'Город',
    Address: 'Адрес',
    Status: 'Статус',
    Reason: 'Причина',
    Date: 'Дата',
    User: 'Пользователь',
    Actions: 'Действия',
    'Not set': 'Не указано',
    'Not assigned': 'Не назначен',
    'No branch': 'Без филиала',
    Total: 'Всего',
    Coming: 'Скоро',
    'Available in stage :stage.': 'Будет доступно на этапе :stage.',

    // Vehicles
    'Fleet registry': 'Реестр транспорта',
    'Tractors, trailers, trucks and their history.':
        'Тягачи, прицепы, грузовики и их история.',
    'New vehicle': 'Новое ТС',
    'Register vehicle': 'Зарегистрировать ТС',
    'Register a tractor, trailer or other vehicle.':
        'Добавьте тягач, прицеп или другое транспортное средство.',
    'Edit vehicle': 'Редактирование ТС',
    'Search by plate, VIN, make…': 'Поиск по госномеру, VIN, марке…',
    'All statuses': 'Все статусы',
    'All types': 'Все типы',
    'All branches': 'Все филиалы',
    'All categories': 'Все категории',
    'Show archive': 'Показать архив',
    'No vehicles yet': 'Транспорта пока нет',
    'No vehicles found': 'Ничего не найдено',
    'Register your first tractor or trailer.':
        'Зарегистрируйте первый тягач или прицеп.',
    'Try changing the filters.': 'Попробуйте изменить фильтры.',
    'vehicles total': 'ТС всего',
    'Plate number': 'Госномер',
    VIN: 'VIN',
    Make: 'Марка',
    Model: 'Модель',
    Year: 'Год выпуска',
    Type: 'Тип',
    Category: 'Категория',
    Branch: 'Филиал',
    Ownership: 'Форма владения',
    'Responsible person': 'Ответственный',
    'Commissioned on': 'Ввод в эксплуатацию',
    'Initial odometer, km': 'Начальный пробег, км',
    'Initial status': 'Начальный статус',
    Odometer: 'Одометр',
    'Coupled with': 'В сцепке с',
    Archived: 'В архиве',
    'Archive vehicle': 'В архив',
    'Restore from archive': 'Восстановить из архива',
    'Archive this vehicle? It will be hidden from the registry, history is preserved.':
        'Переместить ТС в архив? Оно скроется из реестра, история сохранится.',
    'Registered by': 'Зарегистрировал',
    'Inactive types and branches are shown only if already selected.':
        'Неактивные типы и филиалы доступны только если уже выбраны.',
    'Leave empty if the vehicle has no odometer (trailers).':
        'Оставьте пустым, если у ТС нет одометра (прицепы).',
    'Trailers and semitrailers have no odometer; their mileage is derived from couplings.':
        'У прицепов и полуприцепов нет одометра; их пробег рассчитывается по сцепкам.',

    // Tabs
    Overview: 'Общее',
    Couplings: 'Сцепки',
    Mileage: 'Пробег',
    Statuses: 'Статусы',
    Documents: 'Документы',
    Waybills: 'Путевые листы',
    Maintenance: 'ТО',
    'Change log': 'Журнал изменений',

    // Status change
    'Change status': 'Изменить статус',
    'New status': 'Новый статус',
    'Effective at': 'Дата и время',
    'Leave empty to use the current time.':
        'Оставьте пустым, чтобы использовать текущее время.',
    'Decommissioning closes all active couplings.':
        'Списание закрывает все активные сцепки.',
    'Status history': 'История статусов',
    'No status changes yet.': 'Изменений статуса пока нет.',
    From: 'Было',
    To: 'Стало',

    // Couplings
    'Couple trailer': 'Сцепить прицеп',
    Trailer: 'Прицеп',
    Tractor: 'Тягач',
    'Select trailer': 'Выберите прицеп',
    Position: 'Позиция',
    'Coupled at': 'Сцеплен',
    'Uncoupled at': 'Расцеплен',
    Uncouple: 'Расцепить',
    'Uncouple trailer': 'Расцепить прицеп',
    'Current coupling': 'Текущая сцепка',
    'Coupling history': 'История сцепок',
    'No couplings yet.': 'Сцепок пока не было.',
    'No free trailers available.': 'Нет свободных прицепов.',
    'in progress': 'действует',
    'This vehicle is towed by': 'Это ТС сейчас буксирует',
    'Not coupled': 'Не в сцепке',

    // Odometer
    'Record reading': 'Внести показание',
    'Odometer, km': 'Показание, км',
    'Recorded at': 'Дата показания',
    Source: 'Источник',
    'Current odometer': 'Текущий пробег',
    'No readings yet.': 'Показаний пока нет.',
    'Device data': 'Данные устройства',
    'Manual entry': 'Ручной ввод',
    'Recorded by': 'Внёс',
    'Mileage is not tracked for this vehicle type.':
        'Для этого типа ТС пробег не учитывается.',
    'Readings cannot decrease over time. Values from telematics devices are marked separately.':
        'Показания не могут уменьшаться со временем. Данные телематики помечаются отдельно.',

    // Audit
    'No changes recorded yet.': 'Изменений пока не зафиксировано.',
    'You do not have access to the change log.':
        'У вас нет доступа к журналу изменений.',
    created: 'создано',
    updated: 'изменено',
    deleted: 'удалено',
    restored: 'восстановлено',
    System: 'Система',
    vehicle: 'ТС',
    vehicle_coupling: 'сцепка',

    // Branches / types
    'Branches and depots of the company.': 'Филиалы и площадки компании.',
    'New branch': 'Новый филиал',
    'Edit branch': 'Редактирование филиала',
    'Vehicle types and their behaviour.': 'Типы ТС и их поведение.',
    'New vehicle type': 'Новый тип ТС',
    'Edit vehicle type': 'Редактирование типа ТС',
    'Can tow trailers': 'Может буксировать прицепы',
    'Is a trailer': 'Является прицепом',
    'Has odometer': 'Есть одометр',
    'Can tow': 'Буксирует',
    Towable: 'Прицеп',
    'Vehicles count': 'ТС',
    'Deactivate instead of deleting to keep history.':
        'Вместо удаления деактивируйте запись — история сохранится.',
};

export default ru;
