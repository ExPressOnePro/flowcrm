<?php

namespace Tests\Feature\Fleet;

use App\Models\Branch;
use App\Models\DocumentFile;
use App\Models\DocumentType;
use App\Models\Driver;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\DocumentExpiring;
use App\Services\DocumentExpiryNotifier;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DriverTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();

        Date::setTestNow(CarbonImmutable::parse('2026-10-16 10:00', 'Europe/Chisinau'));
        Storage::fake(DocumentFile::DISK);

        $this->owner = createUserWithOrganization();
        $this->organization = $this->owner->organizations()->firstOrFail();
    }

    private function type(string $name): DocumentType
    {
        return DocumentType::query()->where('name', $name)->firstOrFail();
    }

    public function test_driver_is_created_with_normalized_licence_and_categories(): void
    {
        $this->actingAs($this->owner)
            ->post(route('drivers.store'), [
                'last_name' => 'Попеску',
                'first_name' => 'Ион',
                'license_number' => ' md 12 345 ',
                'license_categories' => ['CE', 'B', 'CE', 'C'],
                'personnel_number' => 'T-1',
                'status' => 'inactive',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $driver = Driver::query()->firstOrFail();
        $this->assertSame('MD12345', $driver->license_number);
        $this->assertEqualsCanonicalizing(['B', 'C', 'CE'], $driver->license_categories);
        $this->assertSame('active', $driver->status->value);
        $this->assertSame($this->owner->id, $driver->created_by);

        $this->actingAs($this->owner)
            ->post(route('drivers.store'), ['last_name' => 'Другой', 'first_name' => 'Водитель', 'personnel_number' => 'T-1'])
            ->assertSessionHasErrors('personnel_number');

        $this->actingAs($this->owner)
            ->post(route('drivers.store'), ['last_name' => 'X', 'first_name' => 'Y', 'license_categories' => ['Z']])
            ->assertSessionHasErrors('license_categories.0');
    }

    public function test_driver_can_be_linked_to_a_member_of_the_organization_only_once(): void
    {
        $member = addOrganizationMember($this->organization, 'Viewer');
        $stranger = User::factory()->create();

        $this->actingAs($this->owner)
            ->post(route('drivers.store'), ['last_name' => 'A', 'first_name' => 'B', 'user_id' => $stranger->id])
            ->assertSessionHasErrors('user_id');

        $this->actingAs($this->owner)
            ->post(route('drivers.store'), ['last_name' => 'A', 'first_name' => 'B', 'user_id' => $member->id])
            ->assertSessionHasNoErrors();

        $this->actingAs($this->owner)
            ->post(route('drivers.store'), ['last_name' => 'C', 'first_name' => 'D', 'user_id' => $member->id])
            ->assertSessionHasErrors('user_id');
    }

    public function test_drivers_are_deactivated_not_deleted(): void
    {
        $driver = Driver::factory()->create();

        $this->actingAs($this->owner)
            ->put(route('drivers.update', $driver), [
                'last_name' => $driver->last_name,
                'first_name' => $driver->first_name,
                'status' => 'inactive',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('inactive', $driver->fresh()->status->value);
        $this->actingAs($this->owner)->delete('/drivers/'.$driver->id)->assertStatus(405);

        $this->actingAs($this->owner)->get(route('drivers.index'))
            ->assertInertia(fn ($page) => $page->component('drivers/index')->has('drivers.data', 0));
        $this->actingAs($this->owner)->get(route('drivers.index', ['status' => '']))
            ->assertInertia(fn ($page) => $page->has('drivers.data', 1));
    }

    public function test_branch_staff_see_drivers_of_their_branch_and_viewers_cannot_edit(): void
    {
        $north = Branch::factory()->forOrganization($this->organization)->create(['name' => 'North']);
        $south = Branch::factory()->forOrganization($this->organization)->create(['name' => 'South']);
        $northDriver = Driver::factory()->create(['branch_id' => $north->id]);
        $southDriver = Driver::factory()->create(['branch_id' => $south->id]);

        $employee = addOrganizationMember($this->organization, 'Branch Employee', $north->id);
        $this->actingAs($employee)->get(route('drivers.index'))
            ->assertInertia(fn ($page) => $page
                ->has('drivers.data', 1)
                ->where('drivers.data.0.id', $northDriver->id)
                ->where('can.create', false));
        $this->actingAs($employee)->get(route('drivers.show', $southDriver))->assertForbidden();

        $viewer = addOrganizationMember($this->organization, 'Viewer');
        $this->actingAs($viewer)->get(route('drivers.show', $northDriver))
            ->assertInertia(fn ($page) => $page->where('can.update', false)->where('users', []));
        $this->actingAs($viewer)
            ->put(route('drivers.update', $northDriver), ['last_name' => 'X', 'first_name' => 'Y', 'status' => 'active'])
            ->assertForbidden();
    }

    public function test_driver_documents_use_driver_types_only_and_show_on_the_card(): void
    {
        $driver = Driver::factory()->create();

        $this->actingAs($this->owner)
            ->post(route('drivers.documents.store', $driver), [
                'document_type_id' => $this->type('Обязательное страхование')->id,
                'expires_on' => '2027-01-01',
            ])
            ->assertSessionHasErrors('document_type_id');

        $this->actingAs($this->owner)
            ->post(route('drivers.documents.store', $driver), [
                'document_type_id' => $this->type('Водительское удостоверение')->id,
                'number' => 'MD 123',
                'expires_on' => OrganizationTime::today()->subDay()->toDateString(),
                'files' => [UploadedFile::fake()->create('licence.pdf', 100, 'application/pdf')],
            ])
            ->assertSessionHasNoErrors();

        $document = $driver->documents()->firstOrFail();
        Storage::disk(DocumentFile::DISK)->assertExists($document->files()->firstOrFail()->path);

        $this->actingAs($this->owner)->getJson(route('drivers.documents.index', $driver))
            ->assertOk()
            ->assertJsonPath('items.0.id', $document->id)
            ->assertJsonPath('missing', []);

        $this->actingAs($this->owner)->get(route('drivers.show', $driver))
            ->assertInertia(fn ($page) => $page
                ->component('drivers/show')
                ->has('documentSummary.expired', 1));

        $this->actingAs($this->owner)->get(route('drivers.index'))
            ->assertInertia(fn ($page) => $page->where('drivers.data.0.expired_documents', 1));

        $this->actingAs($this->owner)->get(route('documents.index', ['subject' => 'driver']))
            ->assertInertia(fn ($page) => $page
                ->has('documents.data', 1)
                ->where('documents.data.0.driver.id', $driver->id)
                ->where('documents.data.0.vehicle', null));
    }

    public function test_expiry_reminder_for_a_driver_links_to_the_driver_card(): void
    {
        Notification::fake();
        $driver = Driver::factory()->create();
        $driver->documents()->create([
            'document_type_id' => $this->type('Медицинская справка')->id,
            'expires_on' => OrganizationTime::today()->addDays(7)->toDateString(),
        ]);

        app(DocumentExpiryNotifier::class)->run($this->organization, ignoreHour: true);

        Notification::assertSentTo($this->owner, DocumentExpiring::class, function (DocumentExpiring $notification) use ($driver): bool {
            $payload = $notification->toDatabase($this->owner);

            return $payload['subject'] === 'driver'
                && $payload['subject_label'] === $driver->full_name
                && $payload['url'] === route('drivers.show', ['driver' => $driver->id, 'tab' => 'documents'], false);
        });
    }

    public function test_inactive_driver_documents_do_not_count_as_needing_attention(): void
    {
        $driver = Driver::factory()->inactive()->create();
        $driver->documents()->create([
            'document_type_id' => $this->type('Медицинская справка')->id,
            'expires_on' => OrganizationTime::today()->subDays(3)->toDateString(),
        ]);

        $this->actingAs($this->owner)->get(route('documents.index'))
            ->assertInertia(fn ($page) => $page->where('counts.expired', 0));
    }
}
