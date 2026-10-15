<?php

namespace Database\Seeders;

use App\Actions\Fleet\ChangeVehicleStatus;
use App\Actions\Fleet\CoupleTrailer;
use App\Actions\Fleet\RecordOdometerReading;
use App\Actions\Fleet\RegisterVehicle;
use App\Actions\Fleet\UncoupleTrailer;
use App\Actions\Organizations\EnsureOrganizationRoles;
use App\Enums\OdometerSource;
use App\Enums\OrganizationUserStatus;
use App\Enums\UserStatus;
use App\Enums\VehicleCategory;
use App\Enums\VehicleStatus;
use App\Models\Branch;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleType;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Adds a demo fleet to the demo organization. Safe to run repeatedly:
 * it does nothing if the organization already has vehicles.
 */
class FleetDemoSeeder extends Seeder
{
    private const USERS = [
        ['email' => 'fleet@flowcrm.test', 'first_name' => 'Игорь', 'last_name' => 'Руснак', 'role' => 'Fleet Manager', 'job_title' => 'Начальник автоколонны', 'branch' => null],
        ['email' => 'dispatcher@flowcrm.test', 'first_name' => 'Марина', 'last_name' => 'Чобану', 'role' => 'Dispatcher', 'job_title' => 'Диспетчер', 'branch' => null],
        ['email' => 'docs@flowcrm.test', 'first_name' => 'Елена', 'last_name' => 'Попа', 'role' => 'Document Controller', 'job_title' => 'Специалист по документам', 'branch' => null],
        ['email' => 'branch@flowcrm.test', 'first_name' => 'Сергей', 'last_name' => 'Лупу', 'role' => 'Branch Employee', 'job_title' => 'Механик', 'branch' => 'Бельцы'],
        ['email' => 'viewer@flowcrm.test', 'first_name' => 'Андрей', 'last_name' => 'Гуцу', 'role' => 'Viewer', 'job_title' => 'Аудитор', 'branch' => null],
    ];

    private const BRANCHES = [
        ['name' => 'Кишинёв', 'code' => 'CHI', 'city' => 'Кишинёв'],
        ['name' => 'Бельцы', 'code' => 'BLT', 'city' => 'Бельцы'],
        ['name' => 'Унгены', 'code' => 'UNG', 'city' => 'Унгены'],
    ];

    public function run(): void
    {
        $organization = Organization::query()->where('slug', 'flow-digital-agency')->first()
            ?? Organization::query()->orderBy('id')->first();

        if ($organization === null) {
            $this->command?->warn('No organization found, skipping fleet demo.');

            return;
        }

        app(CurrentOrganization::class)->set($organization);
        app(PermissionRegistrar::class)->setPermissionsTeamId($organization->id);
        app(EnsureOrganizationRoles::class)->execute($organization);

        if (Vehicle::query()->withTrashed()->exists()) {
            $this->command?->info('Fleet demo already present, skipping.');

            return;
        }

        $owner = $organization->users()->orderBy('users.id')->firstOrFail();

        $branches = collect(self::BRANCHES)->mapWithKeys(fn (array $branch) => [
            $branch['name'] => Branch::query()->firstOrCreate(['name' => $branch['name']], [...$branch, 'is_active' => true]),
        ]);

        $this->seedUsers($organization, $branches->map->id->all());

        $types = VehicleType::query()->get()->keyBy(fn (VehicleType $type) => $type->category->value);
        $now = CarbonImmutable::now();

        $register = app(RegisterVehicle::class);
        $odometer = app(RecordOdometerReading::class);

        $tractors = collect([
            ['CHA 101', 'Volvo', 'FH 500', 2021, 'Кишинёв', 412000],
            ['CHA 102', 'Volvo', 'FH 460', 2019, 'Кишинёв', 688000],
            ['CHA 103', 'Scania', 'R 450', 2022, 'Кишинёв', 254000],
            ['CHA 104', 'DAF', 'XF 480', 2020, 'Кишинёв', 530000],
            ['BLT 201', 'MAN', 'TGX 18.470', 2018, 'Бельцы', 801000],
            ['BLT 202', 'Mercedes-Benz', 'Actros 1845', 2023, 'Бельцы', 98000],
            ['UNG 301', 'Renault', 'T 480', 2017, 'Унгены', 905000],
            ['UNG 302', 'Iveco', 'S-Way 490', 2022, 'Унгены', 276000],
        ])->map(fn (array $row, int $index) => $register->execute($owner, [
            'vehicle_type_id' => $types[VehicleCategory::Tractor->value]->id,
            'branch_id' => $branches[$row[4]]->id,
            'plate_number' => $row[0],
            'vin' => sprintf('XLRTE47MS0G%06d', 100000 + $index),
            'make' => $row[1],
            'model' => $row[2],
            'year' => $row[3],
            'ownership_type' => $index % 4 === 3 ? 'leased' : 'owned',
            'commissioned_on' => $now->subMonths(14 + $index)->toDateString(),
            'initial_odometer_km' => $row[5],
        ]));

        $trailers = collect(range(1, 10))->map(fn (int $number) => $register->execute($owner, [
            'vehicle_type_id' => $types[VehicleCategory::Semitrailer->value]->id,
            'branch_id' => $branches[['Кишинёв', 'Бельцы', 'Унгены'][$number % 3]]->id,
            'plate_number' => sprintf('PR %03d', 400 + $number),
            'vin' => sprintf('WSM00000003%06d', 200000 + $number),
            'make' => ['Schmitz Cargobull', 'Krone', 'Kögel'][$number % 3],
            'model' => ['S.KO Cool', 'Profi Liner', 'Cargo'][$number % 3],
            'year' => 2015 + $number % 8,
            'ownership_type' => 'owned',
            'commissioned_on' => $now->subMonths(20 + $number)->toDateString(),
        ]));

        $others = collect([
            [VehicleCategory::Truck, 'CHA 501', 'MAN', 'TGL 12.220', 'Кишинёв', 188000],
            [VehicleCategory::Truck, 'BLT 502', 'Isuzu', 'NPR 75', 'Бельцы', 143000],
            [VehicleCategory::Van, 'CHA 601', 'Mercedes-Benz', 'Sprinter 316', 'Кишинёв', 221000],
            [VehicleCategory::Van, 'UNG 602', 'Ford', 'Transit', 'Унгены', 312000],
        ])->map(fn (array $row, int $index) => $register->execute($owner, [
            'vehicle_type_id' => $types[$row[0]->value]->id,
            'branch_id' => $branches[$row[4]]->id,
            'plate_number' => $row[1],
            'make' => $row[2],
            'model' => $row[3],
            'year' => 2016 + $index,
            'ownership_type' => 'owned',
            'commissioned_on' => $now->subMonths(30)->toDateString(),
            'initial_odometer_km' => $row[5],
        ]));

        foreach ([...$tractors, ...$others] as $vehicle) {
            $value = $vehicle->current_odometer_km;

            foreach ([90, 60, 30, 7] as $daysAgo) {
                $value += random_int(4000, 11000);
                $odometer->execute($vehicle, $value, $now->subDays($daysAgo)->setTime(18, 0), OdometerSource::Manual, $owner);
            }
        }

        $this->seedCouplings($tractors->all(), $trailers->all(), $owner, $now);

        $status = app(ChangeVehicleStatus::class);
        $status->execute($tractors[6], VehicleStatus::UnderRepair, $owner, 'Замена сцепления', $now->subDays(3));
        $status->execute($trailers[9], VehicleStatus::Idle, $owner, 'Нет заказов', $now->subDays(10));
        $status->execute($others[3], VehicleStatus::Decommissioned, $owner, 'Продан', $now->subDays(1));
    }

    /**
     * @param  list<Vehicle>  $tractors
     * @param  list<Vehicle>  $trailers
     */
    private function seedCouplings(array $tractors, array $trailers, User $owner, CarbonImmutable $now): void
    {
        $couple = app(CoupleTrailer::class);
        $uncouple = app(UncoupleTrailer::class);

        // Previous periods: tractor i towed trailer (i + 1), then switched.
        foreach (range(0, 4) as $i) {
            $coupling = $couple->execute($tractors[$i], $trailers[$i + 1], $owner, 1, $now->subDays(120 - $i));
            $uncouple->execute($coupling, $owner, $now->subDays(70 - $i));
        }

        // Current road trains.
        foreach (range(0, 5) as $i) {
            $couple->execute($tractors[$i], $trailers[$i], $owner, 1, $now->subDays(60 - $i * 5), 'Текущий рейс');
        }
    }

    /**
     * @param  array<string, int>  $branchIds
     */
    private function seedUsers(Organization $organization, array $branchIds): void
    {
        foreach (self::USERS as $member) {
            $user = User::query()->firstOrCreate(['email' => $member['email']], [
                'first_name' => $member['first_name'],
                'last_name' => $member['last_name'],
                'password' => 'password',
                'email_verified_at' => now(),
                'status' => UserStatus::Active,
            ]);

            if (! $organization->users()->whereKey($user->id)->exists()) {
                $organization->users()->attach($user->id, [
                    'job_title' => $member['job_title'],
                    'branch_id' => $member['branch'] ? $branchIds[$member['branch']] : null,
                    'status' => OrganizationUserStatus::Active->value,
                    'joined_at' => now(),
                ]);
            }

            $user->syncRoles([
                Role::query()->where('name', $member['role'])->where('organization_id', $organization->id)->firstOrFail(),
            ]);
        }
    }
}
