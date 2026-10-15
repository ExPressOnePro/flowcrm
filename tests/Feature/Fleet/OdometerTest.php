<?php

namespace Tests\Feature\Fleet;

use App\Enums\VehicleCategory;
use App\Models\Branch;
use App\Models\OdometerReading;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OdometerTest extends TestCase
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
        return Vehicle::factory()
            ->ofType(VehicleType::query()->where('category', $category)->firstOrFail())
            ->create($attributes);
    }

    private function localTime(\DateTimeInterface $moment): string
    {
        return $moment->setTimezone(new \DateTimeZone('Europe/Chisinau'))->format('Y-m-d\TH:i');
    }

    private function record(Vehicle $vehicle, int $value, ?\DateTimeInterface $at = null, ?User $as = null)
    {
        return $this->actingAs($as ?? $this->owner)->post(route('vehicles.odometer.store', $vehicle), [
            'value_km' => $value,
            'recorded_at' => $at ? $this->localTime($at) : null,
        ]);
    }

    public function test_reading_updates_current_odometer(): void
    {
        $vehicle = $this->vehicle();

        $this->record($vehicle, 100000, now()->subDays(5))->assertSessionHasNoErrors();
        $this->record($vehicle, 101500)->assertSessionHasNoErrors();

        $this->assertSame(101500, $vehicle->fresh()->current_odometer_km);
        $this->assertSame(['manual', 'manual'], OdometerReading::query()->pluck('source')->map->value->all());
    }

    public function test_reading_lower_than_previous_is_rejected(): void
    {
        $vehicle = $this->vehicle();

        $this->record($vehicle, 100000, now()->subDays(5));
        $this->record($vehicle, 99000)->assertSessionHasErrors('value_km');

        $this->assertSame(100000, $vehicle->fresh()->current_odometer_km);
    }

    public function test_backdated_reading_must_fit_between_neighbours(): void
    {
        $vehicle = $this->vehicle();

        $this->record($vehicle, 100000, now()->subDays(10));
        $this->record($vehicle, 120000, now()->subDays(2));

        $this->record($vehicle, 125000, now()->subDays(5))->assertSessionHasErrors('value_km');
        $this->record($vehicle, 110000, now()->subDays(5))->assertSessionHasNoErrors();

        $this->assertSame(120000, $vehicle->fresh()->current_odometer_km);
    }

    public function test_future_reading_is_rejected(): void
    {
        $vehicle = $this->vehicle();

        $this->record($vehicle, 1000, now()->addDay())->assertSessionHasErrors('recorded_at');
    }

    public function test_trailer_without_odometer_is_rejected(): void
    {
        $trailer = $this->vehicle(VehicleCategory::Semitrailer);

        $this->record($trailer, 1000)->assertSessionHasErrors('value_km');
        $this->assertSame(0, OdometerReading::query()->count());
    }

    public function test_branch_employee_records_for_own_branch_only(): void
    {
        $balti = Branch::factory()->forOrganization($this->organization)->create();
        $other = Branch::factory()->forOrganization($this->organization)->create();

        $own = $this->vehicle(VehicleCategory::Tractor, ['branch_id' => $balti->id]);
        $foreign = $this->vehicle(VehicleCategory::Tractor, ['branch_id' => $other->id]);

        $employee = addOrganizationMember($this->organization, 'Branch Employee', $balti->id);

        $this->record($own, 5000, null, $employee)->assertSessionHasNoErrors();
        $this->record($foreign, 5000, null, $employee)->assertForbidden();
    }

    public function test_viewer_cannot_record_readings(): void
    {
        $vehicle = $this->vehicle();
        $viewer = addOrganizationMember($this->organization, 'Viewer');

        $this->record($vehicle, 5000, null, $viewer)->assertForbidden();
    }
}
