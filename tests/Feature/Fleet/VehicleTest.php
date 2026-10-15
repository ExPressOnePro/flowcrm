<?php

namespace Tests\Feature\Fleet;

use App\Enums\OdometerSource;
use App\Enums\VehicleCategory;
use App\Enums\VehicleStatus;
use App\Models\Branch;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleCoupling;
use App\Models\VehicleType;
use App\Support\CurrentOrganization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

class VehicleTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = createUserWithOrganization();
        $this->organization = $this->owner->organizations()->firstOrFail();
    }

    private function type(VehicleCategory $category): VehicleType
    {
        return VehicleType::query()->where('category', $category)->firstOrFail();
    }

    private function vehicle(VehicleCategory $category = VehicleCategory::Tractor, array $attributes = []): Vehicle
    {
        return Vehicle::factory()->ofType($this->type($category))->create($attributes);
    }

    public function test_owner_can_view_the_fleet_registry(): void
    {
        $this->vehicle(VehicleCategory::Tractor, ['plate_number' => 'ABC 123']);

        $this->actingAs($this->owner)
            ->get(route('vehicles.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('fleet/vehicles/index')
                ->has('vehicles.data', 1)
                ->where('vehicles.data.0.plate_number', 'ABC 123'));
    }

    public function test_registry_search_ignores_spaces_and_case_in_plate(): void
    {
        $this->vehicle(VehicleCategory::Tractor, ['plate_number' => 'CHA 777']);
        $this->vehicle(VehicleCategory::Tractor, ['plate_number' => 'BLT 100']);

        $this->actingAs($this->owner)
            ->get(route('vehicles.index', ['search' => 'cha-777']))
            ->assertInertia(fn ($page) => $page
                ->has('vehicles.data', 1)
                ->where('vehicles.data.0.plate_number', 'CHA 777'));
    }

    public function test_owner_can_register_a_vehicle_with_initial_odometer(): void
    {
        $response = $this->actingAs($this->owner)->post(route('vehicles.store'), [
            'vehicle_type_id' => $this->type(VehicleCategory::Tractor)->id,
            'branch_id' => Branch::query()->value('id'),
            'plate_number' => '  cha   001 ',
            'vin' => 'yv2-rt40a5ka123456',
            'make' => 'Volvo',
            'model' => 'FH 500',
            'year' => 2021,
            'ownership_type' => 'owned',
            'commissioned_on' => now()->subYear()->toDateString(),
            'initial_odometer_km' => 350000,
        ]);

        $vehicle = Vehicle::query()->firstOrFail();

        $response->assertRedirect(route('vehicles.show', $vehicle));

        $this->assertSame('CHA 001', $vehicle->plate_number);
        $this->assertSame('YV2RT40A5KA123456', $vehicle->vin);
        $this->assertSame(VehicleStatus::InService, $vehicle->status);
        $this->assertSame(350000, $vehicle->current_odometer_km);
        $this->assertSame($this->owner->id, $vehicle->created_by);

        $this->assertDatabaseHas('vehicle_status_changes', [
            'vehicle_id' => $vehicle->id,
            'from_status' => null,
            'to_status' => 'in_service',
        ]);
        $this->assertDatabaseHas('odometer_readings', [
            'vehicle_id' => $vehicle->id,
            'value_km' => 350000,
            'source' => OdometerSource::Initial->value,
        ]);
    }

    public function test_plate_must_be_unique_among_active_vehicles(): void
    {
        $this->vehicle(VehicleCategory::Tractor, ['plate_number' => 'CHA 001']);

        $this->actingAs($this->owner)
            ->post(route('vehicles.store'), [
                'vehicle_type_id' => $this->type(VehicleCategory::Tractor)->id,
                'plate_number' => 'cha-001',
                'make' => 'DAF',
                'ownership_type' => 'owned',
            ])
            ->assertSessionHasErrors('plate_number');
    }

    public function test_plate_of_a_decommissioned_vehicle_can_be_reused(): void
    {
        $this->vehicle(VehicleCategory::Tractor, [
            'plate_number' => 'CHA 001',
            'status' => VehicleStatus::Decommissioned,
        ]);

        $this->actingAs($this->owner)
            ->post(route('vehicles.store'), [
                'vehicle_type_id' => $this->type(VehicleCategory::Tractor)->id,
                'plate_number' => 'CHA 001',
                'make' => 'DAF',
                'ownership_type' => 'owned',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(2, Vehicle::query()->where('plate_number', 'CHA 001')->count());
    }

    public function test_vin_is_validated_and_unique_per_organization(): void
    {
        $this->vehicle(VehicleCategory::Tractor, ['vin' => 'YV2RT40A5KA123456']);

        $payload = [
            'vehicle_type_id' => $this->type(VehicleCategory::Tractor)->id,
            'plate_number' => 'NEW 001',
            'make' => 'Volvo',
            'ownership_type' => 'owned',
        ];

        $this->actingAs($this->owner)
            ->post(route('vehicles.store'), [...$payload, 'vin' => 'YV2RT40A5KA12345O'])
            ->assertSessionHasErrors('vin');

        $this->actingAs($this->owner)
            ->post(route('vehicles.store'), [...$payload, 'vin' => 'yv2rt40a5ka123456'])
            ->assertSessionHasErrors('vin');
    }

    public function test_status_change_is_recorded_in_history(): void
    {
        $vehicle = $this->vehicle();

        $this->actingAs($this->owner)
            ->post(route('vehicles.status', $vehicle), [
                'status' => 'under_repair',
                'reason' => 'Gearbox',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(VehicleStatus::UnderRepair, $vehicle->fresh()->status);
        $this->assertDatabaseHas('vehicle_status_changes', [
            'vehicle_id' => $vehicle->id,
            'from_status' => 'in_service',
            'to_status' => 'under_repair',
            'reason' => 'Gearbox',
            'changed_by' => $this->owner->id,
        ]);
    }

    public function test_decommissioning_requires_reason_and_closes_couplings(): void
    {
        $tractor = $this->vehicle();
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);

        $coupling = VehicleCoupling::query()->create([
            'tractor_id' => $tractor->id,
            'trailer_id' => $trailer->id,
            'position' => 1,
            'coupled_at' => now()->subDays(3),
        ]);

        $this->actingAs($this->owner)
            ->post(route('vehicles.status', $tractor), ['status' => 'decommissioned'])
            ->assertSessionHasErrors('reason');

        $this->actingAs($this->owner)
            ->post(route('vehicles.status', $tractor), ['status' => 'decommissioned', 'reason' => 'Sold'])
            ->assertSessionHasNoErrors();

        $this->assertNotNull($coupling->fresh()->uncoupled_at);
    }

    public function test_archiving_keeps_history_and_is_blocked_while_coupled(): void
    {
        $tractor = $this->vehicle();
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);

        $coupling = VehicleCoupling::query()->create([
            'tractor_id' => $tractor->id,
            'trailer_id' => $trailer->id,
            'position' => 1,
            'coupled_at' => now()->subDay(),
        ]);

        $this->actingAs($this->owner)->delete(route('vehicles.destroy', $tractor));
        $this->assertNotSoftDeleted($tractor);

        $coupling->update(['uncoupled_at' => now()]);

        $this->actingAs($this->owner)
            ->delete(route('vehicles.destroy', $tractor))
            ->assertRedirect(route('vehicles.index'));

        $this->assertSoftDeleted($tractor);

        $this->actingAs($this->owner)
            ->get(route('vehicles.show', $tractor))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('vehicle.archived', true)
                ->has('activeCouplings', 0));

        $this->actingAs($this->owner)
            ->getJson(route('vehicles.timeline', ['vehicle' => $tractor, 'type' => 'coupling']))
            ->assertOk()
            ->assertJsonCount(2, 'items')
            ->assertJsonPath('items.0.type', 'uncoupled')
            ->assertJsonPath('items.1.type', 'coupled')
            ->assertJsonPath('items.1.partner.id', $trailer->id);
    }

    public function test_show_page_contains_history_and_audit_log(): void
    {
        $vehicle = $this->vehicle();
        $vehicle->update(['make' => 'Tatra']);

        $this->actingAs($this->owner)
            ->get(route('vehicles.show', $vehicle))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('fleet/vehicles/show')
                ->where('can.update', true)
                ->where('can.view_audit', true)
                ->missing('activity'));

        $this->actingAs($this->owner)
            ->getJson(route('vehicles.activity', $vehicle))
            ->assertOk()
            ->assertJsonPath('items.0.event', 'updated')
            ->assertJsonPath('items.0.changes.attributes.make', 'Tatra')
            ->assertJsonPath('has_more', false);

        $activity = Activity::query()->where('subject_id', $vehicle->id)->latest('id')->firstOrFail();
        $this->assertSame('vehicle', $activity->subject_type);
        $this->assertSame('fleet', $activity->log_name);
    }

    public function test_employee_without_fleet_permissions_cannot_access_registry(): void
    {
        $employee = addOrganizationMember($this->organization, 'Employee');

        $this->actingAs($employee)->get(route('vehicles.index'))->assertForbidden();
    }

    public function test_viewer_can_see_but_not_modify(): void
    {
        $vehicle = $this->vehicle();
        $viewer = addOrganizationMember($this->organization, 'Viewer');

        $this->actingAs($viewer)->get(route('vehicles.show', $vehicle))->assertOk();
        $this->actingAs($viewer)->get(route('vehicles.edit', $vehicle))->assertForbidden();
        $this->actingAs($viewer)
            ->post(route('vehicles.status', $vehicle), ['status' => 'idle'])
            ->assertForbidden();
    }

    public function test_branch_employee_sees_only_own_branch(): void
    {
        $chisinau = Branch::factory()->forOrganization($this->organization)->create(['name' => 'Chisinau']);
        $balti = Branch::factory()->forOrganization($this->organization)->create(['name' => 'Balti']);

        $own = $this->vehicle(VehicleCategory::Tractor, ['branch_id' => $balti->id, 'plate_number' => 'BLT 001']);
        $foreign = $this->vehicle(VehicleCategory::Tractor, ['branch_id' => $chisinau->id, 'plate_number' => 'CHI 001']);
        $this->vehicle(VehicleCategory::Tractor, ['branch_id' => null, 'plate_number' => 'NUL 001']);

        $employee = addOrganizationMember($this->organization, 'Branch Employee', $balti->id);

        $this->actingAs($employee)
            ->get(route('vehicles.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('vehicles.data', 1)
                ->where('vehicles.data.0.plate_number', 'BLT 001'));

        $this->actingAs($employee)->get(route('vehicles.show', $own))->assertOk();
        $this->actingAs($employee)->get(route('vehicles.show', $foreign))->assertForbidden();
    }

    public function test_branch_employee_without_branch_sees_nothing(): void
    {
        $this->vehicle();
        $employee = addOrganizationMember($this->organization, 'Branch Employee');

        $this->actingAs($employee)
            ->get(route('vehicles.index'))
            ->assertInertia(fn ($page) => $page->has('vehicles.data', 0));
    }

    public function test_vehicles_of_another_organization_are_not_accessible(): void
    {
        $other = createUserWithOrganization([], ['name' => 'Other Logistics']);
        $foreignVehicle = Vehicle::factory()
            ->ofType(VehicleType::query()->where('category', VehicleCategory::Tractor)->firstOrFail())
            ->create();

        app(CurrentOrganization::class)->set($this->organization);
        session(['current_organization_id' => $this->organization->id]);

        $this->actingAs($this->owner)->get(route('vehicles.show', $foreignVehicle->id))->assertNotFound();
        $this->actingAs($this->owner)
            ->get(route('vehicles.index'))
            ->assertInertia(fn ($page) => $page->has('vehicles.data', 0));

        $this->assertNotSame($other->id, $this->owner->id);
    }
}
