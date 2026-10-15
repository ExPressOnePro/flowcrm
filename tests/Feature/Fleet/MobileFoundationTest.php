<?php

namespace Tests\Feature\Fleet;

use App\Actions\Fleet\RecordOdometerReading;
use App\Enums\OdometerSource;
use App\Enums\TaskStatus;
use App\Enums\VehicleCategory;
use App\Enums\VehicleStatus;
use App\Models\Branch;
use App\Models\OdometerReading;
use App\Models\Organization;
use App\Models\Task;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleCoupling;
use App\Models\VehicleStatusChange;
use App\Models\VehicleType;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class MobileFoundationTest extends TestCase
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

    private function vehicle(VehicleCategory $category = VehicleCategory::Tractor, array $attributes = []): Vehicle
    {
        $type = VehicleType::query()->where('category', $category)->firstOrFail();

        return Vehicle::factory()->ofType($type)->create($attributes);
    }

    private function reading(Vehicle $vehicle, int $km, $at): OdometerReading
    {
        return OdometerReading::query()->create([
            'vehicle_id' => $vehicle->id,
            'value_km' => $km,
            'recorded_at' => $at,
            'source' => OdometerSource::Manual,
            'recorded_by' => $this->owner->id,
        ]);
    }

    private function couple(Vehicle $tractor, Vehicle $trailer, $at, $until = null): VehicleCoupling
    {
        return VehicleCoupling::query()->create([
            'tractor_id' => $tractor->id,
            'trailer_id' => $trailer->id,
            'position' => 1,
            'coupled_at' => $at,
            'uncoupled_at' => $until,
        ]);
    }

    public function test_dashboard_shows_fleet_kpis_attention_and_my_tasks(): void
    {
        $fresh = $this->vehicle(VehicleCategory::Tractor, ['plate_number' => 'OK 001']);
        $this->reading($fresh, 1000, now()->subDays(2));

        $repair = $this->vehicle(VehicleCategory::Tractor, ['plate_number' => 'REP 001', 'status' => VehicleStatus::UnderRepair]);
        $this->reading($repair, 5000, now()->subDay());
        VehicleStatusChange::query()->create([
            'vehicle_id' => $repair->id,
            'from_status' => VehicleStatus::InService,
            'to_status' => VehicleStatus::UnderRepair,
            'changed_at' => now()->subDays(4),
        ]);

        $stale = $this->vehicle(VehicleCategory::Tractor, ['plate_number' => 'OLD 001']);
        $this->reading($stale, 9000, now()->subDays(45));

        $trailer = $this->vehicle(VehicleCategory::Semitrailer, ['plate_number' => 'TRL 001']);
        $this->couple($fresh, $trailer, now()->subDay());

        $this->vehicle(VehicleCategory::Tractor, ['status' => VehicleStatus::Decommissioned]);

        Task::factory()->create([
            'organization_id' => $this->organization->id,
            'created_by' => $this->owner->id,
            'assigned_to' => $this->owner->id,
            'title' => 'Overdue check',
            'status' => TaskStatus::Open,
            'due_at' => now()->subDay(),
        ]);
        Task::factory()->create([
            'organization_id' => $this->organization->id,
            'created_by' => $this->owner->id,
            'assigned_to' => $this->owner->id,
            'title' => 'Next week',
            'status' => TaskStatus::Open,
            'due_at' => now()->addWeek(),
        ]);

        $this->actingAs($this->owner)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard')
                ->where('fleet.total', 5)
                ->where('fleet.by_status.in_service', 3)
                ->where('fleet.by_status.under_repair', 1)
                ->where('fleet.by_status.decommissioned', 1)
                ->where('fleet.road_trains', 1)
                ->where('fleet.stale_odometer', 1)
                ->where('attention.0.plate_number', 'REP 001')
                ->where('attention.0.reason', 'under_repair')
                ->where('attention.1.plate_number', 'OLD 001')
                ->where('attention.1.reason', 'stale_odometer')
                ->has('attention', 2)
                ->has('tasks', 1)
                ->where('tasks.0.title', 'Overdue check')
                ->where('tasks.0.overdue', true));
    }

    public function test_dashboard_kpi_matches_the_filtered_registry(): void
    {
        $this->reading($this->vehicle(), 100, now()->subDays(40));
        $this->vehicle();
        $this->reading($this->vehicle(), 100, now()->subDay());
        // Trailers have no odometer and are never "stale".
        $this->vehicle(VehicleCategory::Semitrailer);

        $this->actingAs($this->owner)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('fleet.stale_odometer', 2));

        $this->actingAs($this->owner)
            ->get(route('vehicles.index', ['attention' => 'stale_odometer']))
            ->assertInertia(fn ($page) => $page
                ->where('vehicles.total', 2)
                ->where('filters.attention', 'stale_odometer'));
    }

    public function test_dashboard_is_scoped_to_the_users_branch(): void
    {
        $balti = Branch::factory()->forOrganization($this->organization)->create(['name' => 'Balti']);
        $chisinau = Branch::factory()->forOrganization($this->organization)->create(['name' => 'Chisinau']);
        $this->vehicle(VehicleCategory::Tractor, ['branch_id' => $balti->id]);
        $this->vehicle(VehicleCategory::Tractor, ['branch_id' => $chisinau->id]);
        $this->vehicle(VehicleCategory::Tractor, ['branch_id' => $chisinau->id]);

        $employee = addOrganizationMember($this->organization, 'Branch Employee', $balti->id);

        $this->actingAs($employee)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('fleet.total', 1));
    }

    public function test_dashboard_hides_fleet_for_users_without_fleet_access(): void
    {
        $sales = addOrganizationMember($this->organization, 'Sales');

        $this->actingAs($sales)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('fleet', null)
                ->has('attention', 0)
                ->where('can.view_analytics', true));
    }

    public function test_analytics_requires_its_own_permission(): void
    {
        $dispatcher = addOrganizationMember($this->organization, 'Dispatcher');
        $fleetManager = addOrganizationMember($this->organization, 'Fleet Manager');

        $this->actingAs($dispatcher)->get(route('analytics'))->assertForbidden();
        $this->actingAs($fleetManager)
            ->get(route('analytics'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('analytics/index'));
    }

    public function test_registry_filters_by_coupling_and_sorts_by_odometer(): void
    {
        $tractor = $this->vehicle(VehicleCategory::Tractor, ['plate_number' => 'AAA 001']);
        $trailer = $this->vehicle(VehicleCategory::Semitrailer, ['plate_number' => 'TRL 001']);
        $solo = $this->vehicle(VehicleCategory::Tractor, ['plate_number' => 'BBB 001', 'responsible_user_id' => $this->owner->id]);
        $this->couple($tractor, $trailer, now()->subDay());

        $tractor->forceFill(['current_odometer_km' => 100])->save();
        $solo->forceFill(['current_odometer_km' => 900])->save();

        $this->actingAs($this->owner)
            ->get(route('vehicles.index', ['coupled' => '1']))
            ->assertInertia(fn ($page) => $page
                ->has('vehicles.data', 2)
                ->where('vehicles.data.0.plate_number', 'AAA 001')
                ->where('vehicles.data.1.plate_number', 'TRL 001'));

        $this->actingAs($this->owner)
            ->get(route('vehicles.index', ['coupled' => '0']))
            ->assertInertia(fn ($page) => $page
                ->has('vehicles.data', 1)
                ->where('vehicles.data.0.plate_number', 'BBB 001')
                ->where('vehicles.data.0.responsible', $this->owner->name));

        $this->actingAs($this->owner)
            ->get(route('vehicles.index', ['sort' => '-odometer']))
            ->assertInertia(fn ($page) => $page
                ->where('filters.sort', '-odometer')
                ->where('vehicles.data.0.plate_number', 'BBB 001')
                ->where('vehicles.data.1.plate_number', 'AAA 001')
                // Vehicles without an odometer value go last.
                ->where('vehicles.data.2.plate_number', 'TRL 001'));

        $this->actingAs($this->owner)
            ->get(route('vehicles.index', ['sort' => 'id; drop table vehicles']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('filters.sort', 'plate'));
    }

    public function test_timeline_merges_events_newest_first_with_filters_and_paging(): void
    {
        $tractor = $this->vehicle();
        $trailer = $this->vehicle(VehicleCategory::Semitrailer, ['plate_number' => 'TRL 777']);

        VehicleStatusChange::query()->create([
            'vehicle_id' => $tractor->id,
            'to_status' => VehicleStatus::InService,
            'changed_at' => now()->subDays(100),
        ]);
        $this->reading($tractor, 1000, now()->subDays(10));
        $this->couple($tractor, $trailer, now()->subDays(5), now()->subDays(2));
        $this->reading($tractor, 1500, now()->subDay());

        $this->actingAs($this->owner)
            ->getJson(route('vehicles.timeline', $tractor))
            ->assertOk()
            ->assertJsonPath('has_more', false)
            ->assertJsonPath('items.0.type', 'odometer')
            ->assertJsonPath('items.0.value_km', 1500)
            ->assertJsonPath('items.1.type', 'uncoupled')
            ->assertJsonPath('items.1.partner.plate_number', 'TRL 777')
            ->assertJsonPath('items.2.type', 'coupled')
            ->assertJsonPath('items.3.type', 'odometer')
            ->assertJsonPath('items.4.type', 'status')
            ->assertJsonCount(5, 'items');

        $this->actingAs($this->owner)
            ->getJson(route('vehicles.timeline', ['vehicle' => $tractor, 'period' => '30d']))
            ->assertJsonCount(4, 'items');

        $this->actingAs($this->owner)
            ->getJson(route('vehicles.timeline', ['vehicle' => $tractor, 'type' => 'odometer']))
            ->assertJsonCount(2, 'items');

        $this->actingAs($this->owner)
            ->getJson(route('vehicles.timeline', ['vehicle' => $tractor, 'type' => 'bogus']))
            ->assertUnprocessable();
    }

    public function test_timeline_pages_with_a_before_cursor_without_gaps(): void
    {
        $vehicle = $this->vehicle();
        $start = CarbonImmutable::now()->subDays(40);

        foreach (range(1, 35) as $day) {
            $this->reading($vehicle, $day * 100, $start->addDays($day));
        }

        $first = $this->actingAs($this->owner)
            ->getJson(route('vehicles.timeline', $vehicle))
            ->assertJsonCount(30, 'items')
            ->assertJsonPath('has_more', true)
            ->json();

        $second = $this->actingAs($this->owner)
            ->getJson(route('vehicles.timeline', ['vehicle' => $vehicle, 'before' => $first['next_before']]))
            ->assertJsonCount(5, 'items')
            ->assertJsonPath('has_more', false)
            ->json();

        $values = array_column([...$first['items'], ...$second['items']], 'value_km');
        $this->assertSame(range(3500, 100, -100), $values);
    }

    public function test_timeline_and_log_respect_branch_and_audit_permissions(): void
    {
        $balti = Branch::factory()->forOrganization($this->organization)->create();
        $chisinau = Branch::factory()->forOrganization($this->organization)->create();
        $own = $this->vehicle(VehicleCategory::Tractor, ['branch_id' => $balti->id]);
        $foreign = $this->vehicle(VehicleCategory::Tractor, ['branch_id' => $chisinau->id]);

        $employee = addOrganizationMember($this->organization, 'Branch Employee', $balti->id);

        $this->actingAs($employee)->getJson(route('vehicles.timeline', $own))->assertOk();
        $this->actingAs($employee)->getJson(route('vehicles.timeline', $foreign))->assertForbidden();
        // Branch employees have no audit.view permission.
        $this->actingAs($employee)->getJson(route('vehicles.activity', $own))->assertForbidden();
    }

    public function test_repeated_odometer_submit_does_not_create_a_duplicate(): void
    {
        $vehicle = $this->vehicle();

        $this->actingAs($this->owner)
            ->post(route('vehicles.odometer.store', $vehicle), ['value_km' => 12345])
            ->assertSessionHasNoErrors();
        $this->actingAs($this->owner)
            ->post(route('vehicles.odometer.store', $vehicle), ['value_km' => 12345])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, OdometerReading::query()->where('vehicle_id', $vehicle->id)->count());

        Date::setTestNow(now()->addMinutes(2));

        app(RecordOdometerReading::class)->execute(
            $vehicle, 12345, CarbonImmutable::now(), OdometerSource::Manual, $this->owner,
        );

        $this->assertSame(2, OdometerReading::query()->where('vehicle_id', $vehicle->id)->count());
    }

    public function test_upcoming_module_pages_are_reachable_for_fleet_users_only(): void
    {
        $this->actingAs($this->owner)
            ->get(route('documents.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('documents/index'));

        $this->actingAs($this->owner)
            ->get(route('waybills.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('placeholders/module')
                ->where('stage', 5));

        $employee = addOrganizationMember($this->organization, 'Employee');
        $this->actingAs($employee)->get(route('documents.index'))->assertForbidden();
    }

    public function test_pwa_manifest_and_service_worker_are_static_only(): void
    {
        $manifest = json_decode((string) file_get_contents(public_path('manifest.webmanifest')), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame('standalone', $manifest['display']);

        foreach ($manifest['icons'] as $icon) {
            $this->assertFileExists(public_path(ltrim($icon['src'], '/')));
        }

        $worker = (string) file_get_contents(public_path('sw.js'));
        $this->assertStringContainsString("startsWith('/build/assets/')", $worker);
        $this->assertStringNotContainsString('push', strtolower(preg_replace('/\/\*.*?\*\//s', '', $worker)));
    }
}
