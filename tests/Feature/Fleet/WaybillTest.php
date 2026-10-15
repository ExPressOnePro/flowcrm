<?php

namespace Tests\Feature\Fleet;

use App\Enums\OdometerSource;
use App\Enums\VehicleCategory;
use App\Enums\VehicleStatus;
use App\Enums\WaybillStatus;
use App\Models\Branch;
use App\Models\Driver;
use App\Models\OdometerReading;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleType;
use App\Models\Waybill;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class WaybillTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();

        Date::setTestNow(CarbonImmutable::parse('2026-10-16 10:00', 'Europe/Chisinau'));

        $this->owner = createUserWithOrganization();
        $this->organization = $this->owner->organizations()->firstOrFail();
    }

    private function vehicle(VehicleCategory $category = VehicleCategory::Tractor, array $attributes = []): Vehicle
    {
        return Vehicle::factory()
            ->ofType(VehicleType::query()->where('category', $category)->firstOrFail())
            ->create($attributes);
    }

    private function driver(array $attributes = []): Driver
    {
        return Driver::factory()->create($attributes);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(Vehicle $vehicle, Driver $driver, array $overrides = []): array
    {
        return [
            'vehicle_id' => $vehicle->id,
            'driver_id' => $driver->id,
            'route' => 'Кишинёв — Бельцы — Кишинёв',
            'planned_departure_at' => '2026-10-16T08:00',
            'planned_return_at' => '2026-10-16T20:00',
            ...$overrides,
        ];
    }

    private function draft(Vehicle $vehicle, Driver $driver, array $overrides = []): Waybill
    {
        $this->actingAs($this->owner)
            ->post(route('waybills.store'), $this->payload($vehicle, $driver, $overrides))
            ->assertSessionHasNoErrors();

        return Waybill::query()->latest('id')->firstOrFail();
    }

    private function issue(Waybill $waybill, ?int $km, string $at = '2026-10-16T08:00'): TestResponse
    {
        return $this->actingAs($this->owner)->post(route('waybills.issue', $waybill), [
            'departure_at' => $at,
            'departure_odometer_km' => $km,
        ]);
    }

    private function close(Waybill $waybill, ?int $km, string $at = '2026-10-16T09:30'): TestResponse
    {
        return $this->actingAs($this->owner)->post(route('waybills.close', $waybill), [
            'return_at' => $at,
            'return_odometer_km' => $km,
        ]);
    }

    public function test_draft_has_no_number_and_repeated_submit_creates_one_waybill(): void
    {
        $vehicle = $this->vehicle();
        $driver = $this->driver();
        $payload = $this->payload($vehicle, $driver, ['idempotency_key' => 'key-1']);

        $this->actingAs($this->owner)->post(route('waybills.store'), $payload)->assertRedirect();
        $this->actingAs($this->owner)->post(route('waybills.store'), $payload)->assertRedirect();

        $this->assertSame(1, Waybill::query()->count());
        $waybill = Waybill::query()->firstOrFail();
        $this->assertSame(WaybillStatus::Draft, $waybill->status);
        $this->assertNull($waybill->number);
    }

    public function test_numbers_are_assigned_on_issue_sequentially_and_cancelled_drafts_do_not_take_one(): void
    {
        $first = $this->draft($this->vehicle(), $this->driver());
        $cancelled = $this->draft($this->vehicle(), $this->driver());
        $second = $this->draft($this->vehicle(), $this->driver());

        $this->actingAs($this->owner)->post(route('waybills.cancel', $cancelled), ['reason' => 'Рейс отменён клиентом'])->assertSessionHasNoErrors();
        $this->issue($second, 1000)->assertSessionHasNoErrors();
        $this->issue($first, 2000)->assertSessionHasNoErrors();

        $this->assertSame('2026-00001', $second->fresh()->number);
        $this->assertSame('2026-00002', $first->fresh()->number);
        $this->assertNull($cancelled->fresh()->number);
        $this->assertSame(WaybillStatus::Cancelled, $cancelled->fresh()->status);
    }

    public function test_departure_and_return_readings_go_to_mileage_history_and_give_the_distance(): void
    {
        $vehicle = $this->vehicle();
        $waybill = $this->draft($vehicle, $this->driver());

        $this->issue($waybill, 120_000)->assertSessionHasNoErrors();
        $this->close($waybill, 120_350)->assertSessionHasNoErrors();

        $waybill->refresh();
        $this->assertSame(WaybillStatus::Closed, $waybill->status);
        $this->assertSame(350, $waybill->distance_km);
        $this->assertSame(120_350, $vehicle->fresh()->current_odometer_km);

        $readings = OdometerReading::query()->where('vehicle_id', $vehicle->id)->orderBy('id')->get();
        $this->assertSame([OdometerSource::WaybillDeparture, OdometerSource::WaybillReturn], $readings->pluck('source')->all());
        $this->assertTrue($readings->every(fn (OdometerReading $reading) => $reading->sourceable_id === $waybill->id && $reading->sourceable_type === 'waybill'));
        $this->assertSame($readings[0]->id, $waybill->departure_reading_id);
        $this->assertSame($readings[1]->id, $waybill->return_reading_id);
    }

    public function test_odometer_values_go_through_the_usual_checks(): void
    {
        $vehicle = $this->vehicle();
        $waybill = $this->draft($vehicle, $this->driver());

        $this->issue($waybill, null)->assertSessionHasErrors('departure_odometer_km');

        $this->issue($waybill, 50_000)->assertSessionHasNoErrors();
        $this->close($waybill, 49_900)->assertSessionHasErrors('return_odometer_km');
        $this->close($waybill, 50_100, '2026-10-16T07:00')->assertSessionHasErrors('return_at');
        $this->close($waybill, 50_100, '2026-10-16T18:00')->assertSessionHasErrors('return_at');
        $this->assertSame(WaybillStatus::Issued, $waybill->fresh()->status);

        $this->close($waybill, 50_100)->assertSessionHasNoErrors();

        $next = $this->draft($vehicle, $this->driver());
        $this->issue($next, 50_000, '2026-10-16T09:45')->assertSessionHasErrors('departure_odometer_km');
        $this->assertNull($next->fresh()->number);
    }

    public function test_departure_cannot_be_in_the_future(): void
    {
        $waybill = $this->draft($this->vehicle(), $this->driver());

        $this->issue($waybill, 1000, '2026-10-16T12:00')->assertSessionHasErrors('departure_at');
        $this->assertSame(WaybillStatus::Draft, $waybill->fresh()->status);
    }

    public function test_vehicle_trailer_and_driver_can_be_on_one_open_waybill_only(): void
    {
        $tractor = $this->vehicle();
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);
        $driver = $this->driver();
        $open = $this->draft($tractor, $driver, ['trailer_id' => $trailer->id]);
        $this->issue($open, 1000)->assertSessionHasNoErrors();

        $sameVehicle = $this->draft($tractor, $this->driver());
        $sameTrailer = $this->draft($this->vehicle(), $this->driver(), ['trailer_id' => $trailer->id]);
        $sameDriver = $this->draft($this->vehicle(), $driver);

        $this->issue($sameVehicle, 1000)->assertSessionHasErrors('vehicle_id');
        $this->issue($sameTrailer, 1000)->assertSessionHasErrors('trailer_id');
        $this->issue($sameDriver, 1000)->assertSessionHasErrors('driver_id');

        $this->close($open, 1100)->assertSessionHasNoErrors();
        $this->issue($sameVehicle, 1100, '2026-10-16T09:45')->assertSessionHasNoErrors();
    }

    public function test_trailer_rules_are_validated(): void
    {
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);
        $car = $this->vehicle(VehicleCategory::Car);
        $driver = $this->driver();

        $this->actingAs($this->owner)
            ->post(route('waybills.store'), $this->payload($trailer, $driver))
            ->assertSessionHasErrors('vehicle_id');

        $this->actingAs($this->owner)
            ->post(route('waybills.store'), $this->payload($car, $driver, ['trailer_id' => $trailer->id]))
            ->assertSessionHasErrors('trailer_id');
    }

    public function test_inactive_driver_cannot_be_chosen_and_blocks_issue(): void
    {
        $vehicle = $this->vehicle();
        $inactive = $this->driver(['status' => 'inactive']);

        $this->actingAs($this->owner)
            ->post(route('waybills.store'), $this->payload($vehicle, $inactive))
            ->assertSessionHasErrors('driver_id');

        $driver = $this->driver();
        $waybill = $this->draft($vehicle, $driver);
        $driver->update(['status' => 'inactive']);

        $this->issue($waybill, 1000)->assertSessionHasErrors('driver_id');
    }

    public function test_repair_status_and_documents_are_warnings_while_decommissioning_blocks(): void
    {
        $repair = $this->vehicle(attributes: ['status' => VehicleStatus::UnderRepair]);
        $waybill = $this->draft($repair, $this->driver(['license_categories' => ['B']]));

        $this->actingAs($this->owner)->get(route('waybills.show', $waybill))
            ->assertInertia(fn ($page) => $page
                ->component('waybills/show')
                ->where('blocking', [])
                ->where('warnings', fn ($warnings) => collect($warnings)->pluck('message')->contains(__('The vehicle is marked as under repair.'))
                    && collect($warnings)->contains(fn ($warning) => str_contains($warning['message'], 'CE'))));

        $this->issue($waybill, 1000)->assertSessionHasNoErrors();

        $decommissioned = $this->vehicle();
        $blocked = $this->draft($decommissioned, $this->driver());
        $decommissioned->forceFill(['status' => VehicleStatus::Decommissioned])->save();

        $this->actingAs($this->owner)->get(route('waybills.show', $blocked))
            ->assertInertia(fn ($page) => $page->has('blocking', 1));
        $this->issue($blocked, 1000)->assertSessionHasErrors('vehicle_id');
    }

    public function test_distance_is_not_guessed_without_odometer_readings(): void
    {
        $type = VehicleType::factory()->create([
            'organization_id' => $this->organization->id,
            'category' => VehicleCategory::Other,
            'can_tow' => false,
            'is_towable' => false,
            'has_odometer' => false,
        ]);
        $vehicle = Vehicle::factory()->ofType($type)->create();
        $waybill = $this->draft($vehicle, $this->driver());

        $this->issue($waybill, null)->assertSessionHasNoErrors();
        $this->close($waybill, null)->assertSessionHasNoErrors();

        $waybill->refresh();
        $this->assertSame(WaybillStatus::Closed, $waybill->status);
        $this->assertNull($waybill->distance_km);
        $this->assertSame(0, OdometerReading::query()->where('vehicle_id', $vehicle->id)->count());
    }

    public function test_only_drafts_are_editable_and_closed_waybills_cannot_be_cancelled(): void
    {
        $vehicle = $this->vehicle();
        $driver = $this->driver();
        $waybill = $this->draft($vehicle, $driver);

        $this->actingAs($this->owner)
            ->put(route('waybills.update', $waybill), $this->payload($vehicle, $driver, ['route' => 'Новый маршрут']))
            ->assertSessionHasNoErrors();
        $this->assertSame('Новый маршрут', $waybill->fresh()->route);

        $this->issue($waybill, 1000)->assertSessionHasNoErrors();
        $this->actingAs($this->owner)->get(route('waybills.edit', $waybill))->assertForbidden();
        $this->actingAs($this->owner)
            ->put(route('waybills.update', $waybill), $this->payload($vehicle, $driver))
            ->assertForbidden();

        $this->close($waybill, 1200)->assertSessionHasNoErrors();
        $this->actingAs($this->owner)->post(route('waybills.cancel', $waybill), ['reason' => 'x'])->assertForbidden();
    }

    public function test_cancelling_an_issued_waybill_frees_the_vehicle_and_keeps_readings(): void
    {
        $vehicle = $this->vehicle();
        $waybill = $this->draft($vehicle, $this->driver());
        $this->issue($waybill, 1000)->assertSessionHasNoErrors();

        $this->actingAs($this->owner)->post(route('waybills.cancel', $waybill), ['reason' => ''])->assertSessionHasErrors('reason');
        $this->actingAs($this->owner)->post(route('waybills.cancel', $waybill), ['reason' => 'Поломка'])->assertSessionHasNoErrors();

        $waybill->refresh();
        $this->assertSame(WaybillStatus::Cancelled, $waybill->status);
        $this->assertSame('2026-00001', $waybill->number);
        $this->assertSame(1, OdometerReading::query()->where('sourceable_id', $waybill->id)->count());

        $next = $this->draft($vehicle, $this->driver());
        $this->issue($next, 1000, '2026-10-16T09:00')->assertSessionHasNoErrors();
    }

    public function test_branch_staff_see_and_create_waybills_of_their_branch_only(): void
    {
        $north = Branch::factory()->forOrganization($this->organization)->create(['name' => 'North']);
        $south = Branch::factory()->forOrganization($this->organization)->create(['name' => 'South']);
        $northWaybill = $this->draft($this->vehicle(attributes: ['branch_id' => $north->id]), $this->driver(['branch_id' => $north->id]));
        $southVehicle = $this->vehicle(attributes: ['branch_id' => $south->id]);
        $southWaybill = $this->draft($southVehicle, $this->driver(['branch_id' => $south->id]));

        $employee = addOrganizationMember($this->organization, 'Branch Employee', $north->id);

        $this->actingAs($employee)->get(route('waybills.index'))
            ->assertInertia(fn ($page) => $page
                ->has('waybills.data', 1)
                ->where('waybills.data.0.id', $northWaybill->id));
        $this->actingAs($employee)->get(route('waybills.show', $southWaybill))->assertForbidden();
        $this->actingAs($employee)
            ->post(route('waybills.store'), $this->payload($southVehicle, $this->driver(['branch_id' => $north->id])))
            ->assertSessionHasErrors('vehicle_id');

        $viewer = addOrganizationMember($this->organization, 'Viewer');
        $this->actingAs($viewer)->get(route('waybills.show', $northWaybill))->assertOk();
        $this->actingAs($viewer)->get(route('waybills.create'))->assertForbidden();
        $this->actingAs($viewer)->post(route('waybills.issue', $northWaybill), ['departure_odometer_km' => 1])->assertForbidden();
    }

    public function test_dashboard_and_registry_count_open_and_overdue_trips(): void
    {
        $overdue = $this->draft($this->vehicle(), $this->driver(), ['planned_return_at' => '2026-10-16T09:00']);
        $onTime = $this->draft($this->vehicle(), $this->driver());
        $done = $this->draft($this->vehicle(), $this->driver());
        $this->issue($overdue, 1000, '2026-10-16T07:00')->assertSessionHasNoErrors();
        $this->issue($onTime, 1000)->assertSessionHasNoErrors();
        $this->issue($done, 1000)->assertSessionHasNoErrors();
        $this->close($done, 1010)->assertSessionHasNoErrors();

        $this->actingAs($this->owner)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('waybills.open', 2)
                ->where('waybills.overdue', 1)
                ->where('waybills.closed_today', 1)
                ->where('can.create_waybill', true));

        $this->actingAs($this->owner)->get(route('waybills.index', ['status' => 'overdue']))
            ->assertInertia(fn ($page) => $page
                ->has('waybills.data', 1)
                ->where('waybills.data.0.id', $overdue->id)
                ->where('waybills.data.0.overdue', true)
                ->where('counts.issued', 2)
                ->where('counts.overdue', 1));
    }

    public function test_vehicle_card_lists_trips_as_vehicle_and_as_trailer(): void
    {
        $tractor = $this->vehicle();
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);
        $waybill = $this->draft($tractor, $this->driver(), ['trailer_id' => $trailer->id]);
        $this->issue($waybill, 1000)->assertSessionHasNoErrors();

        $this->actingAs($this->owner)->getJson(route('vehicles.waybills.index', $trailer))
            ->assertOk()
            ->assertJsonPath('items.0.id', $waybill->id)
            ->assertJsonPath('items.0.trailer.id', $trailer->id);

        $this->actingAs($this->owner)->get(route('vehicles.show', $tractor))
            ->assertInertia(fn ($page) => $page
                ->where('openWaybill.id', $waybill->id)
                ->where('can.create_waybill', true));

        $this->actingAs($this->owner)->get(route('vehicles.show', $trailer))
            ->assertInertia(fn ($page) => $page
                ->where('openWaybill.id', $waybill->id)
                ->where('can.create_waybill', false));
    }

    public function test_create_form_prefills_the_coupled_trailer_and_marks_busy_options(): void
    {
        $tractor = $this->vehicle();
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);
        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.store', $tractor), ['trailer_id' => $trailer->id])
            ->assertSessionHasNoErrors();
        $busyDriver = $this->driver();
        $this->issue($this->draft($this->vehicle(), $busyDriver), 1000)->assertSessionHasNoErrors();

        $this->actingAs($this->owner)->get(route('waybills.create', ['vehicle_id' => $tractor->id]))
            ->assertInertia(fn ($page) => $page
                ->component('waybills/create')
                ->where('defaults.vehicle_id', $tractor->id)
                ->where('defaults.trailer_id', $trailer->id)
                ->where('drivers', fn ($drivers) => collect($drivers)->firstWhere('id', $busyDriver->id)['busy'] === true)
                ->where('trailers', fn ($trailers) => collect($trailers)->pluck('id')->contains($trailer->id)));
    }

    public function test_basis_and_fuel_are_saved_and_shown(): void
    {
        $waybill = $this->draft($this->vehicle(), $this->driver(), ['basis' => 'Заказ № 4471']);

        $this->actingAs($this->owner)->post(route('waybills.issue', $waybill), [
            'departure_at' => '2026-10-16T08:00',
            'departure_odometer_km' => 5000,
            'departure_fuel_l' => '310.5',
        ])->assertSessionHasNoErrors();
        $this->actingAs($this->owner)->post(route('waybills.close', $waybill), [
            'return_at' => '2026-10-16T09:30',
            'return_odometer_km' => 5120,
            'return_fuel_l' => 250,
            'fuel_added_l' => 20,
        ])->assertSessionHasNoErrors();

        $waybill->refresh();
        $this->assertSame('Заказ № 4471', $waybill->basis);
        $this->assertSame(310.5, $waybill->departure_fuel_l);
        $this->assertSame(250.0, $waybill->return_fuel_l);
        $this->assertSame(20.0, $waybill->fuel_added_l);

        $this->actingAs($this->owner)->get(route('waybills.show', $waybill))
            ->assertInertia(fn ($page) => $page
                ->where('waybill.basis', 'Заказ № 4471')
                ->where('waybill.departure_fuel_l', 310.5)
                ->where('waybill.fuel_added_l', 20));

        $this->actingAs($this->owner)->post(route('waybills.issue', $this->draft($this->vehicle(), $this->driver())), [
            'departure_at' => '2026-10-16T08:00',
            'departure_odometer_km' => 9000,
            'departure_fuel_l' => -1,
        ])->assertSessionHasErrors('departure_fuel_l');
    }

    public function test_overlapping_trips_of_the_same_driver_give_a_warning_but_do_not_block(): void
    {
        $driver = $this->driver();
        $morning = $this->draft($this->vehicle(), $driver, [
            'planned_departure_at' => '2026-10-17T08:00',
            'planned_return_at' => '2026-10-17T14:00',
        ]);
        $evening = $this->draft($this->vehicle(), $driver, [
            'planned_departure_at' => '2026-10-17T18:00',
            'planned_return_at' => '2026-10-17T22:00',
        ]);
        $overlapping = $this->draft($this->vehicle(), $driver, [
            'planned_departure_at' => '2026-10-17T12:00',
            'planned_return_at' => '2026-10-17T16:00',
        ]);

        $overlapWarning = fn (Waybill $waybill) => collect(
            $this->actingAs($this->owner)->get(route('waybills.show', $waybill))->inertiaProps('warnings'),
        )->first(fn (array $warning) => str_contains($warning['message'], 'Overlaps in time'));

        $this->assertNotNull($overlapWarning($overlapping));
        $this->assertSame('warning', $overlapWarning($overlapping)['level']);
        $this->assertNull($overlapWarning($evening));

        $this->actingAs($this->owner)->get(route('waybills.show', $overlapping))
            ->assertInertia(fn ($page) => $page->where('blocking', []));
        $this->assertNotNull($morning->fresh());
    }

    public function test_mileage_timeline_links_readings_to_their_waybill(): void
    {
        $vehicle = $this->vehicle();
        $waybill = $this->draft($vehicle, $this->driver());
        $this->issue($waybill, 7000)->assertSessionHasNoErrors();

        $items = collect($this->actingAs($this->owner)
            ->getJson(route('vehicles.timeline', ['vehicle' => $vehicle, 'type' => 'odometer']))
            ->assertOk()
            ->json('items'));

        $this->assertSame(
            ['id' => $waybill->id, 'number' => $waybill->fresh()->number],
            $items->firstWhere('type', 'odometer')['waybill'],
        );
    }

    public function test_dashboard_lists_recent_waybills_open_first_and_hides_them_without_permission(): void
    {
        $closed = $this->draft($this->vehicle(), $this->driver());
        $this->issue($closed, 1000)->assertSessionHasNoErrors();
        $this->close($closed, 1050)->assertSessionHasNoErrors();
        $open = $this->draft($this->vehicle(), $this->driver(), ['planned_departure_at' => '2026-10-15T08:00', 'planned_return_at' => '2026-10-17T08:00']);
        $this->issue($open, 2000, '2026-10-16T07:00')->assertSessionHasNoErrors();
        $cancelled = $this->draft($this->vehicle(), $this->driver());
        $this->actingAs($this->owner)->post(route('waybills.cancel', $cancelled), ['reason' => 'Не нужен'])->assertSessionHasNoErrors();

        $this->actingAs($this->owner)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->has('recentWaybills', 2)
                ->where('recentWaybills.0.id', $open->id)
                ->where('recentWaybills.1.id', $closed->id));

        $employee = addOrganizationMember($this->organization, 'Employee');
        $this->actingAs($employee)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('recentWaybills', []));
    }
}
