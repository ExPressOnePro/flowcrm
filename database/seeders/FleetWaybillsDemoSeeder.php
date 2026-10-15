<?php

namespace Database\Seeders;

use App\Actions\Documents\CreateDocument;
use App\Actions\Fleet\EnsureDefaultFleetCatalog;
use App\Actions\Waybills\CloseWaybill;
use App\Actions\Waybills\IssueWaybill;
use App\Actions\Waybills\SaveWaybillDraft;
use App\Enums\DocumentSubject;
use App\Enums\DriverStatus;
use App\Enums\VehicleStatus;
use App\Models\Branch;
use App\Models\DocumentType;
use App\Models\Driver;
use App\Models\OdometerReading;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Waybill;
use App\Support\CurrentOrganization;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Date;

/**
 * Demo drivers with documents and a few waybills (closed, open, draft).
 * Does nothing if drivers exist. Odometer readings go through the regular
 * actions, after each vehicle's latest reading, so history stays consistent.
 */
class FleetWaybillsDemoSeeder extends Seeder
{
    private const DRIVERS = [
        ['Руснак', 'Андрей', 'Иванович', ['B', 'C', 'CE'], 'Кишинёв'],
        ['Чебан', 'Виктор', 'Петрович', ['B', 'C', 'CE'], 'Кишинёв'],
        ['Морарь', 'Сергей', null, ['B', 'C'], 'Бельцы'],
        ['Гуцу', 'Ион', 'Михайлович', ['B', 'C', 'CE'], 'Бельцы'],
        ['Попа', 'Дмитрий', null, ['B', 'D'], 'Унгены'],
        ['Лупу', 'Николай', 'Васильевич', ['B', 'C', 'CE'], 'Унгены'],
        ['Бодюл', 'Александр', null, ['B'], 'Кишинёв'],
        ['Сырбу', 'Григорий', 'Ильич', ['B', 'C', 'CE'], 'Кишинёв'],
    ];

    public function run(): void
    {
        $organization = Organization::query()->where('slug', 'flow-digital-agency')->first()
            ?? Organization::query()->orderBy('id')->first();

        if ($organization === null) {
            return;
        }

        app(CurrentOrganization::class)->set($organization);
        app(EnsureDefaultFleetCatalog::class)->execute($organization);

        if (Driver::query()->exists()) {
            $this->command?->info('Demo drivers already present, skipping.');

            return;
        }

        $owner = $organization->users()->orderBy('users.id')->firstOrFail();
        $branches = Branch::query()->pluck('id', 'name');
        $drivers = collect(self::DRIVERS)->map(function (array $row, int $index) use ($branches, $owner): Driver {
            [$last, $first, $middle, $categories, $branch] = $row;

            $driver = new Driver([
                'last_name' => $last,
                'first_name' => $first,
                'middle_name' => $middle,
                'phone' => sprintf('+373 69 %03d %03d', 100 + $index * 7, 200 + $index * 11),
                'personnel_number' => sprintf('T-%04d', 101 + $index),
                'license_number' => sprintf('MDA%06d', 410000 + $index * 37),
                'license_categories' => $categories,
                'branch_id' => $branches[$branch] ?? null,
                'status' => $index === 6 ? DriverStatus::Inactive : DriverStatus::Active,
            ]);
            $driver->created_by = $owner->id;
            $driver->save();

            return $driver;
        });

        $this->seedDocuments($drivers, $owner);
        $this->seedWaybills($drivers->where('status', DriverStatus::Active)->values(), $owner);
    }

    /**
     * @param  Collection<int, Driver>  $drivers
     */
    private function seedDocuments($drivers, User $owner): void
    {
        $types = DocumentType::query()->where('subject', DocumentSubject::Driver->value)->get()->keyBy('name');
        $today = OrganizationTime::today();
        $create = app(CreateDocument::class);
        $license = [900, 20, 400, -6, 1200, 700, 300, 5];
        $medical = [200, 90, 10, 150, -15, 60, 30, 365];

        foreach ($drivers as $index => $driver) {
            foreach ([['Водительское удостоверение', $license[$index], $driver->license_number], ['Медицинская справка', $medical[$index], sprintf('MED-%04d', 300 + $index)]] as [$name, $days, $number]) {
                $type = $types->get($name);

                if ($type === null || ($name === 'Водительское удостоверение' && $index === 2)) {
                    continue;
                }

                $create->execute($owner, $driver, [
                    'document_type_id' => $type->id,
                    'number' => $number,
                    'issued_on' => $today->subYears(2)->toDateString(),
                    'expires_on' => $today->addDays($days)->toDateString(),
                ]);
            }
        }
    }

    /**
     * @param  Collection<int, Driver>  $drivers
     */
    private function seedWaybills($drivers, User $owner): void
    {
        $vehicles = Vehicle::query()
            ->with('type')
            ->where('status', VehicleStatus::InService->value)
            ->whereHas('type', fn ($query) => $query->where('is_towable', false)->where('has_odometer', true))
            ->orderBy('id')
            ->limit(6)
            ->get();

        $save = app(SaveWaybillDraft::class);
        $issue = app(IssueWaybill::class);
        $close = app(CloseWaybill::class);
        $routes = ['Кишинёв — Бельцы — Кишинёв', 'Кишинёв — Яссы (RO)', 'Унгены — Кишинёв', 'Бельцы — Сороки — Бельцы', 'Кишинёв — Одесса (UA)', 'Кишинёв — Кагул'];

        foreach ($vehicles as $index => $vehicle) {
            $driver = $drivers[$index % $drivers->count()];
            $trailer = $vehicle->activeTowingCouplings()->value('trailer_id');
            $lastReadingAt = OdometerReading::query()->where('vehicle_id', $vehicle->id)->max('recorded_at');
            $start = CarbonImmutable::parse($lastReadingAt ?? now()->subDays(10))->addHour()->max(now()->subDays(6));
            $odometer = (int) ($vehicle->current_odometer_km ?? 100000);

            // Two finished trips, then (for most vehicles) one open trip.
            for ($trip = 0; $trip < 2; $trip++) {
                $departure = $start->addDays($trip * 2 + 1)->setTime(7, 30);
                $return = $departure->addHours(9 + $index);

                if ($return->isFuture()) {
                    break;
                }

                $odometer += 5;
                $distance = 120 + ($index * 37 + $trip * 53) % 380;
                $waybill = $this->draft($save, $owner, $vehicle, $trailer, $driver, $routes[($index + $trip) % count($routes)], $departure, $return);

                // Past trips: move the clock so issue/close timestamps match the trip itself.
                Date::setTestNow($departure);
                $issue->execute($waybill, $owner, $departure, $odometer);
                Date::setTestNow($return);
                $odometer += $distance;
                $close->execute($waybill, $owner, $return, $odometer);
                Date::setTestNow();
            }

            if ($index < 4) {
                $departure = CarbonImmutable::now()->subHours(3 + $index * 5);
                $waybill = $this->draft($save, $owner, $vehicle, $trailer, $driver, $routes[($index + 3) % count($routes)], $departure, $departure->addHours($index === 3 ? 4 : 30));
                $issue->execute($waybill, $owner, $departure, $odometer + 4);
            } else {
                $this->draft($save, $owner, $vehicle, $trailer, $driver, $routes[$index % count($routes)], CarbonImmutable::now()->addDay()->setTime(6, 0), null);
            }
        }
    }

    private function draft(SaveWaybillDraft $save, User $owner, Vehicle $vehicle, ?int $trailerId, Driver $driver, string $route, CarbonImmutable $departure, ?CarbonImmutable $return): Waybill
    {
        return $save->create($owner, [
            'vehicle_id' => $vehicle->id,
            'trailer_id' => $vehicle->type->can_tow ? $trailerId : null,
            'driver_id' => $driver->id,
            'route' => $route,
            'notes' => null,
            'planned_departure_at' => $departure,
            'planned_return_at' => $return,
        ]);
    }
}
