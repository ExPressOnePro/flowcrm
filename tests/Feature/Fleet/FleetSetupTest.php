<?php

namespace Tests\Feature\Fleet;

use App\Actions\Fleet\EnsureDefaultFleetCatalog;
use App\Enums\VehicleCategory;
use App\Models\Branch;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FleetSetupTest extends TestCase
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

    public function test_new_organization_gets_default_fleet_catalog_and_roles(): void
    {
        $this->assertSame(1, Branch::query()->count());
        $this->assertSame(count(EnsureDefaultFleetCatalog::DEFAULT_TYPES), VehicleType::query()->count());

        foreach (['Fleet Manager', 'Dispatcher', 'Document Controller', 'Branch Employee', 'Viewer'] as $role) {
            $this->assertTrue(
                Role::query()->where('name', $role)->where('organization_id', $this->organization->id)->exists(),
                "Missing role {$role}",
            );
        }
    }

    public function test_roles_are_stored_with_morph_alias(): void
    {
        $this->assertSame(['user'], DB::table('model_has_roles')->distinct()->pluck('model_type')->all());
    }

    public function test_roles_sync_command_is_idempotent(): void
    {
        $this->artisan('roles:sync')->assertSuccessful();
        $counts = [Role::query()->count(), Branch::query()->count(), VehicleType::query()->count()];

        $this->artisan('roles:sync')->assertSuccessful();

        $this->assertSame($counts, [Role::query()->count(), Branch::query()->count(), VehicleType::query()->count()]);
    }

    public function test_fleet_manager_manages_catalogs_but_dispatcher_cannot(): void
    {
        $manager = addOrganizationMember($this->organization, 'Fleet Manager');
        $dispatcher = addOrganizationMember($this->organization, 'Dispatcher');

        $this->actingAs($manager)->get(route('branches.index'))->assertOk();
        $this->actingAs($manager)->get(route('vehicle-types.index'))->assertOk();

        $this->actingAs($manager)
            ->post(route('branches.store'), ['name' => 'Бельцы', 'city' => 'Бельцы'])
            ->assertSessionHasNoErrors();
        $this->assertDatabaseHas('branches', ['name' => 'Бельцы', 'organization_id' => $this->organization->id]);

        $this->actingAs($dispatcher)->get(route('branches.index'))->assertForbidden();
        $this->actingAs($dispatcher)->post(route('branches.store'), ['name' => 'X'])->assertForbidden();
    }

    public function test_vehicle_type_cannot_both_tow_and_be_towed(): void
    {
        $this->actingAs($this->owner)
            ->post(route('vehicle-types.store'), [
                'name' => 'Odd',
                'category' => 'other',
                'can_tow' => true,
                'is_towable' => true,
            ])
            ->assertSessionHasErrors('is_towable');
    }

    public function test_vehicle_type_behaviour_is_locked_while_in_use(): void
    {
        $type = VehicleType::query()->where('category', VehicleCategory::Tractor)->firstOrFail();
        Vehicle::factory()->ofType($type)->create();

        $this->actingAs($this->owner)->put(route('vehicle-types.update', $type), [
            'name' => $type->name,
            'category' => 'tractor',
            'can_tow' => false,
            'is_towable' => false,
            'has_odometer' => true,
        ]);

        $this->assertTrue($type->fresh()->can_tow);
    }

    public function test_locale_is_shared_with_the_frontend(): void
    {
        app()->setLocale('ru');

        $this->actingAs($this->owner)
            ->get(route('vehicles.index'))
            ->assertInertia(fn ($page) => $page->where('locale', 'ru'));

        $this->assertSame('Прицеп сцеплен.', __('Trailer coupled.'));
    }
}
