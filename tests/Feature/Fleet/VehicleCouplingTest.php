<?php

namespace Tests\Feature\Fleet;

use App\Enums\VehicleCategory;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleCoupling;
use App\Models\VehicleType;
use App\Support\CurrentOrganization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleCouplingTest extends TestCase
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

    private function vehicle(VehicleCategory $category): Vehicle
    {
        return Vehicle::factory()
            ->ofType(VehicleType::query()->where('category', $category)->firstOrFail())
            ->create();
    }

    private function localTime(\DateTimeInterface $moment): string
    {
        return $moment->setTimezone(new \DateTimeZone('Europe/Chisinau'))->format('Y-m-d\TH:i');
    }

    public function test_tractor_can_couple_and_uncouple_a_semitrailer(): void
    {
        $tractor = $this->vehicle(VehicleCategory::Tractor);
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.store', $tractor), ['trailer_id' => $trailer->id])
            ->assertSessionHasNoErrors();

        $coupling = VehicleCoupling::query()->firstOrFail();
        $this->assertSame($tractor->id, $coupling->tractor_id);
        $this->assertNull($coupling->uncoupled_at);
        $this->assertSame($this->owner->id, $coupling->coupled_by);

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.uncouple', [$tractor, $coupling]))
            ->assertSessionHasNoErrors();

        $this->assertNotNull($coupling->fresh()->uncoupled_at);
        $this->assertSame($this->owner->id, $coupling->fresh()->uncoupled_by);
    }

    public function test_coupled_at_is_interpreted_in_organization_timezone(): void
    {
        $tractor = $this->vehicle(VehicleCategory::Tractor);
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);
        $moment = now()->subDays(2)->startOfMinute();

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.store', $tractor), [
                'trailer_id' => $trailer->id,
                'coupled_at' => $this->localTime($moment),
            ])
            ->assertSessionHasNoErrors();

        $this->assertTrue(VehicleCoupling::query()->firstOrFail()->coupled_at->equalTo($moment));
    }

    public function test_trailer_cannot_be_coupled_to_two_tractors_at_once(): void
    {
        $first = $this->vehicle(VehicleCategory::Tractor);
        $second = $this->vehicle(VehicleCategory::Tractor);
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);

        $this->actingAs($this->owner)->post(route('vehicles.couplings.store', $first), ['trailer_id' => $trailer->id]);

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.store', $second), ['trailer_id' => $trailer->id])
            ->assertSessionHasErrors('trailer_id');

        $this->assertSame(1, VehicleCoupling::query()->count());
    }

    public function test_position_cannot_be_occupied_twice(): void
    {
        $tractor = $this->vehicle(VehicleCategory::Truck);
        $first = $this->vehicle(VehicleCategory::Trailer);
        $second = $this->vehicle(VehicleCategory::Trailer);

        $this->actingAs($this->owner)->post(route('vehicles.couplings.store', $tractor), ['trailer_id' => $first->id, 'position' => 1]);

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.store', $tractor), ['trailer_id' => $second->id, 'position' => 1])
            ->assertSessionHasErrors('position');

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.store', $tractor), ['trailer_id' => $second->id, 'position' => 2])
            ->assertSessionHasNoErrors();
    }

    public function test_incompatible_types_cannot_be_coupled(): void
    {
        $tractor = $this->vehicle(VehicleCategory::Tractor);
        $otherTractor = $this->vehicle(VehicleCategory::Tractor);
        $van = $this->vehicle(VehicleCategory::Van);
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.store', $tractor), ['trailer_id' => $otherTractor->id])
            ->assertSessionHasErrors('trailer_id');

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.store', $van), ['trailer_id' => $trailer->id])
            ->assertSessionHasErrors('trailer_id');

        $this->assertSame(0, VehicleCoupling::query()->count());
    }

    public function test_uncoupling_cannot_be_earlier_than_coupling(): void
    {
        $tractor = $this->vehicle(VehicleCategory::Tractor);
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);

        $this->actingAs($this->owner)->post(route('vehicles.couplings.store', $tractor), [
            'trailer_id' => $trailer->id,
            'coupled_at' => $this->localTime(now()->subDays(2)),
        ]);

        $coupling = VehicleCoupling::query()->firstOrFail();

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.uncouple', [$tractor, $coupling]), [
                'uncoupled_at' => $this->localTime(now()->subDays(3)),
            ])
            ->assertSessionHasErrors('uncoupled_at');

        $this->assertNull($coupling->fresh()->uncoupled_at);
    }

    public function test_backdated_coupling_cannot_overlap_an_existing_period(): void
    {
        $first = $this->vehicle(VehicleCategory::Tractor);
        $second = $this->vehicle(VehicleCategory::Tractor);
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);

        VehicleCoupling::query()->create([
            'tractor_id' => $first->id,
            'trailer_id' => $trailer->id,
            'position' => 1,
            'coupled_at' => now()->subDays(10),
            'uncoupled_at' => now()->subDays(2),
        ]);

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.store', $second), [
                'trailer_id' => $trailer->id,
                'coupled_at' => $this->localTime(now()->subDays(5)),
            ])
            ->assertSessionHasErrors('trailer_id');
    }

    public function test_trailer_of_another_organization_is_rejected(): void
    {
        $tractor = $this->vehicle(VehicleCategory::Tractor);

        createUserWithOrganization([], ['name' => 'Other Org']);
        $foreignTrailer = $this->vehicle(VehicleCategory::Semitrailer);

        app(CurrentOrganization::class)->set($this->organization);
        session(['current_organization_id' => $this->organization->id]);

        $this->actingAs($this->owner)
            ->post(route('vehicles.couplings.store', $tractor), ['trailer_id' => $foreignTrailer->id])
            ->assertSessionHasErrors('trailer_id');
    }

    public function test_viewer_cannot_couple(): void
    {
        $tractor = $this->vehicle(VehicleCategory::Tractor);
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);
        $viewer = addOrganizationMember($this->organization, 'Viewer');

        $this->actingAs($viewer)
            ->post(route('vehicles.couplings.store', $tractor), ['trailer_id' => $trailer->id])
            ->assertForbidden();
    }
}
