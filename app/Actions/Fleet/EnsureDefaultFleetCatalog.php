<?php

namespace App\Actions\Fleet;

use App\Enums\VehicleCategory;
use App\Models\Branch;
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

    public const DEFAULT_BRANCH = 'Головной офис';

    public function execute(Organization $organization): void
    {
        DB::transaction(function () use ($organization): void {
            if (! Branch::withoutGlobalScopes()->where('organization_id', $organization->id)->exists()) {
                $branch = new Branch(['name' => self::DEFAULT_BRANCH, 'is_active' => true]);
                $branch->organization_id = $organization->id;
                $branch->save();
            }

            if (VehicleType::withoutGlobalScopes()->where('organization_id', $organization->id)->exists()) {
                return;
            }

            foreach (self::DEFAULT_TYPES as $type) {
                $vehicleType = new VehicleType([...$type, 'is_active' => true]);
                $vehicleType->organization_id = $organization->id;
                $vehicleType->save();
            }
        });
    }
}
