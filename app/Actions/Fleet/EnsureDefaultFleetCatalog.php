<?php

namespace App\Actions\Fleet;

use App\Enums\DocumentSubject;
use App\Enums\VehicleCategory;
use App\Models\Branch;
use App\Models\DocumentType;
use App\Models\Organization;
use App\Models\VehicleType;
use Illuminate\Support\Facades\DB;

class EnsureDefaultFleetCatalog
{
    /**
     * @var list<array{name: string, category: VehicleCategory, can_tow: bool, is_towable: bool, has_odometer: bool}>
     */
    public const DEFAULT_TYPES = [
        ['name' => 'Седельный тягач', 'category' => VehicleCategory::Tractor, 'can_tow' => true, 'is_towable' => false, 'has_odometer' => true],
        ['name' => 'Грузовой автомобиль', 'category' => VehicleCategory::Truck, 'can_tow' => true, 'is_towable' => false, 'has_odometer' => true],
        ['name' => 'Полуприцеп', 'category' => VehicleCategory::Semitrailer, 'can_tow' => false, 'is_towable' => true, 'has_odometer' => false],
        ['name' => 'Прицеп', 'category' => VehicleCategory::Trailer, 'can_tow' => false, 'is_towable' => true, 'has_odometer' => false],
        ['name' => 'Фургон', 'category' => VehicleCategory::Van, 'can_tow' => false, 'is_towable' => false, 'has_odometer' => true],
        ['name' => 'Легковой автомобиль', 'category' => VehicleCategory::Car, 'can_tow' => false, 'is_towable' => false, 'has_odometer' => true],
    ];

    /**
     * A starting point only: which documents are mandatory is the organization's
     * own setting and can be changed in the catalog.
     *
     * @var list<array{subject: DocumentSubject, name: string, has_expiry: bool, is_mandatory: bool, vehicle_categories: list<string>|null}>
     */
    public const DEFAULT_DOCUMENT_TYPES = [
        ['subject' => DocumentSubject::Vehicle, 'name' => 'Свидетельство о регистрации', 'has_expiry' => false, 'is_mandatory' => true, 'vehicle_categories' => null],
        ['subject' => DocumentSubject::Vehicle, 'name' => 'Обязательное страхование', 'has_expiry' => true, 'is_mandatory' => true, 'vehicle_categories' => null],
        ['subject' => DocumentSubject::Vehicle, 'name' => 'Технический осмотр', 'has_expiry' => true, 'is_mandatory' => true, 'vehicle_categories' => null],
        ['subject' => DocumentSubject::Vehicle, 'name' => 'Зелёная карта', 'has_expiry' => true, 'is_mandatory' => false, 'vehicle_categories' => null],
        ['subject' => DocumentSubject::Vehicle, 'name' => 'Поверка тахографа', 'has_expiry' => true, 'is_mandatory' => false, 'vehicle_categories' => ['tractor', 'truck']],
        ['subject' => DocumentSubject::Vehicle, 'name' => 'КАСКО', 'has_expiry' => true, 'is_mandatory' => false, 'vehicle_categories' => null],
        ['subject' => DocumentSubject::Vehicle, 'name' => 'Договор лизинга / аренды', 'has_expiry' => true, 'is_mandatory' => false, 'vehicle_categories' => null],
        ['subject' => DocumentSubject::Driver, 'name' => 'Водительское удостоверение', 'has_expiry' => true, 'is_mandatory' => true, 'vehicle_categories' => null],
        ['subject' => DocumentSubject::Driver, 'name' => 'Медицинская справка', 'has_expiry' => true, 'is_mandatory' => false, 'vehicle_categories' => null],
        ['subject' => DocumentSubject::Driver, 'name' => 'Карта водителя (тахограф)', 'has_expiry' => true, 'is_mandatory' => false, 'vehicle_categories' => null],
    ];

    public const DEFAULT_BRANCH = 'Головной офис';

    public function execute(Organization $organization): void
    {
        DB::transaction(function () use ($organization): void {
            if (! Branch::withoutGlobalScopes()->where('organization_id', $organization->id)->exists()) {
                $branch = new Branch(['name' => self::DEFAULT_BRANCH, 'is_active' => true]);
                $branch->organization_id = $organization->id;
                $branch->save();
            }

            if (! VehicleType::withoutGlobalScopes()->where('organization_id', $organization->id)->exists()) {
                foreach (self::DEFAULT_TYPES as $type) {
                    $vehicleType = new VehicleType([...$type, 'is_active' => true]);
                    $vehicleType->organization_id = $organization->id;
                    $vehicleType->save();
                }
            }

            if (! DocumentType::withoutGlobalScopes()->where('organization_id', $organization->id)->exists()) {
                foreach (self::DEFAULT_DOCUMENT_TYPES as $type) {
                    $documentType = new DocumentType([...$type, 'is_active' => true]);
                    $documentType->organization_id = $organization->id;
                    $documentType->save();
                }
            }
        });
    }
}
