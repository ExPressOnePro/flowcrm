<?php

namespace Tests\Feature\Fleet;

use App\Actions\Organizations\CreateOrganization;
use App\Enums\VehicleCategory;
use App\Enums\VehicleStatus;
use App\Models\Branch;
use App\Models\Document;
use App\Models\DocumentAlert;
use App\Models\DocumentFile;
use App\Models\DocumentType;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleType;
use App\Notifications\DocumentExpiring;
use App\Notifications\DocumentExpiryDigest;
use App\Services\DocumentExpiryNotifier;
use App\Support\CurrentOrganization;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentTest extends TestCase
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

    private function vehicle(VehicleCategory $category = VehicleCategory::Tractor, array $attributes = []): Vehicle
    {
        return Vehicle::factory()
            ->ofType(VehicleType::query()->where('category', $category)->firstOrFail())
            ->create($attributes);
    }

    private function type(string $name): DocumentType
    {
        return DocumentType::query()->where('name', $name)->firstOrFail();
    }

    private function document(Vehicle $vehicle, string $type = 'Обязательное страхование', ?int $expiresInDays = 100): Document
    {
        return $vehicle->documents()->create([
            'document_type_id' => $this->type($type)->id,
            'number' => 'N-'.fake()->unique()->numberBetween(1000, 9999),
            'expires_on' => $expiresInDays === null ? null : OrganizationTime::today()->addDays($expiresInDays)->toDateString(),
        ]);
    }

    private function today(int $offset = 0): string
    {
        return OrganizationTime::today()->addDays($offset)->toDateString();
    }

    private function notifier(): DocumentExpiryNotifier
    {
        return app(DocumentExpiryNotifier::class);
    }

    public function test_document_with_files_is_stored_on_the_private_disk(): void
    {
        $vehicle = $this->vehicle();

        $this->actingAs($this->owner)
            ->post(route('vehicles.documents.store', $vehicle), [
                'document_type_id' => $this->type('Обязательное страхование')->id,
                'number' => 'RCA-001',
                'issued_on' => $this->today(-10),
                'expires_on' => $this->today(355),
                'files' => [
                    UploadedFile::fake()->create('policy.pdf', 200, 'application/pdf'),
                    UploadedFile::fake()->image('scan.jpg'),
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $document = Document::query()->sole();
        $this->assertSame('RCA-001', $document->number);
        $this->assertSame($this->owner->id, $document->created_by);
        $this->assertCount(2, $document->files);

        foreach ($document->files as $file) {
            Storage::disk(DocumentFile::DISK)->assertExists($file->path);
            $this->assertStringStartsWith("{$this->organization->id}/{$document->id}/", $file->path);
            $this->assertStringNotContainsString('policy', $file->path);
        }

        $this->assertSame('private', config('filesystems.disks.documents.visibility'));
    }

    public function test_disallowed_file_types_and_missing_expiry_are_rejected(): void
    {
        $vehicle = $this->vehicle();

        $this->actingAs($this->owner)
            ->post(route('vehicles.documents.store', $vehicle), [
                'document_type_id' => $this->type('Обязательное страхование')->id,
                'expires_on' => $this->today(100),
                'files' => [UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload')],
            ])
            ->assertSessionHasErrors('files.0');

        $this->actingAs($this->owner)
            ->post(route('vehicles.documents.store', $vehicle), [
                'document_type_id' => $this->type('Обязательное страхование')->id,
            ])
            ->assertSessionHasErrors('expires_on');

        $this->actingAs($this->owner)
            ->post(route('vehicles.documents.store', $vehicle), [
                'document_type_id' => $this->type('Обязательное страхование')->id,
                'issued_on' => $this->today(1),
                'expires_on' => $this->today(100),
            ])
            ->assertSessionHasErrors('issued_on');

        $this->actingAs($this->owner)
            ->post(route('vehicles.documents.store', $vehicle), [
                'document_type_id' => $this->type('Свидетельство о регистрации')->id,
                'number' => 'REG-1',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, Document::query()->count());
        $this->assertEmpty(Storage::disk(DocumentFile::DISK)->allFiles());
    }

    public function test_document_type_must_apply_to_the_vehicle_category(): void
    {
        $semitrailer = $this->vehicle(VehicleCategory::Semitrailer);

        $this->actingAs($this->owner)
            ->post(route('vehicles.documents.store', $semitrailer), [
                'document_type_id' => $this->type('Поверка тахографа')->id,
                'expires_on' => $this->today(100),
            ])
            ->assertSessionHasErrors('document_type_id');

        $this->actingAs($this->owner)
            ->post(route('vehicles.documents.store', $semitrailer), [
                'document_type_id' => $this->type('Водительское удостоверение')->id,
                'expires_on' => $this->today(100),
            ])
            ->assertSessionHasErrors('document_type_id');

        $this->assertSame(0, Document::query()->count());
    }

    public function test_repeated_submit_with_the_same_key_creates_one_document(): void
    {
        $vehicle = $this->vehicle();
        $payload = [
            'document_type_id' => $this->type('Технический осмотр')->id,
            'expires_on' => $this->today(200),
            'idempotency_key' => 'tap-once-123',
        ];

        $this->actingAs($this->owner)->post(route('vehicles.documents.store', $vehicle), $payload)->assertSessionHasNoErrors();
        $this->actingAs($this->owner)->post(route('vehicles.documents.store', $vehicle), $payload)->assertSessionHasNoErrors();

        $this->assertSame(1, Document::query()->count());
    }

    public function test_file_download_requires_access_to_the_vehicle_branch(): void
    {
        $north = Branch::factory()->forOrganization($this->organization)->create(['name' => 'North']);
        $south = Branch::factory()->forOrganization($this->organization)->create(['name' => 'South']);
        $vehicle = $this->vehicle(VehicleCategory::Tractor, ['branch_id' => $north->id]);

        $this->actingAs($this->owner)->post(route('vehicles.documents.store', $vehicle), [
            'document_type_id' => $this->type('Обязательное страхование')->id,
            'expires_on' => $this->today(100),
            'files' => [UploadedFile::fake()->create('policy.pdf', 50, 'application/pdf')],
        ])->assertSessionHasNoErrors();

        $document = Document::query()->sole();
        $file = $document->files()->sole();

        $response = $this->actingAs($this->owner)->get(route('documents.files.show', [$document, $file]));
        $response->assertOk();
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertStringStartsWith('inline', (string) $response->headers->get('Content-Disposition'));

        $download = $this->actingAs($this->owner)->get(route('documents.files.show', [$document, $file, 'download' => 1]));
        $this->assertStringStartsWith('attachment', (string) $download->headers->get('Content-Disposition'));

        $insider = addOrganizationMember($this->organization, 'Branch Employee', $north->id);
        $outsider = addOrganizationMember($this->organization, 'Branch Employee', $south->id);

        $this->actingAs($insider)->get(route('documents.files.show', [$document, $file]))->assertOk();
        $this->actingAs($outsider)->get(route('documents.files.show', [$document, $file]))->assertForbidden();
        $this->actingAs($outsider)->getJson(route('vehicles.documents.index', $vehicle))->assertForbidden();
        $this->actingAs($outsider)->post(route('vehicles.documents.store', $vehicle), [
            'document_type_id' => $this->type('КАСКО')->id,
            'expires_on' => $this->today(100),
        ])->assertForbidden();

        $other = $this->document($this->vehicle());
        $this->actingAs($this->owner)->get(route('documents.files.show', [$other, $file]))->assertNotFound();
    }

    public function test_documents_cannot_be_deleted_and_archived_ones_are_read_only(): void
    {
        $vehicle = $this->vehicle();
        $document = $this->document($vehicle);

        $this->actingAs($this->owner)->delete("/documents/{$document->id}")->assertMethodNotAllowed();

        $this->actingAs($this->owner)
            ->post(route('documents.archive', $document), [])
            ->assertSessionHasErrors('reason');

        $this->actingAs($this->owner)
            ->post(route('documents.archive', $document), ['reason' => 'Полис расторгнут'])
            ->assertSessionHasNoErrors();

        $document->refresh();
        $this->assertTrue($document->isArchived());
        $this->assertSame('Полис расторгнут', $document->archive_reason);
        $this->assertSame($this->owner->id, $document->archived_by);

        $this->actingAs($this->owner)
            ->put(route('documents.update', $document), ['number' => 'X', 'expires_on' => $this->today(10)])
            ->assertForbidden();
        $this->actingAs($this->owner)
            ->post(route('documents.files.store', $document), ['files' => [UploadedFile::fake()->image('a.jpg')]])
            ->assertForbidden();
        $this->actingAs($this->owner)
            ->post(route('documents.archive', $document), ['reason' => 'again'])
            ->assertForbidden();

        $this->assertDatabaseHas('documents', ['id' => $document->id]);

        $archived = $this->actingAs($this->owner)
            ->getJson(route('vehicles.documents.index', [$vehicle, 'archived' => 1]))
            ->assertOk()
            ->json('items');
        $this->assertSame([$document->id], array_column($archived, 'id'));
    }

    public function test_renewal_archives_the_previous_document_with_a_link(): void
    {
        $vehicle = $this->vehicle();
        $old = $this->document($vehicle, 'Технический осмотр', 5);

        $this->actingAs($this->owner)
            ->post(route('vehicles.documents.store', $vehicle), [
                'document_type_id' => $old->document_type_id,
                'expires_on' => $this->today(370),
                'replaces_id' => $old->id,
            ])
            ->assertSessionHasNoErrors();

        $new = Document::query()->latest('id')->firstOrFail();
        $old->refresh();

        $this->assertNotSame($old->id, $new->id);
        $this->assertTrue($old->isArchived());
        $this->assertSame($new->id, $old->replaced_by_id);
        $this->assertFalse($new->isArchived());
    }

    public function test_viewer_can_read_but_not_change_documents(): void
    {
        $vehicle = $this->vehicle();
        $document = $this->document($vehicle);
        $viewer = addOrganizationMember($this->organization, 'Viewer');

        $this->actingAs($viewer)->get(route('documents.index'))->assertOk();
        $this->actingAs($viewer)->getJson(route('vehicles.documents.index', $vehicle))->assertOk();
        $this->actingAs($viewer)->post(route('vehicles.documents.store', $vehicle), [
            'document_type_id' => $this->type('КАСКО')->id,
            'expires_on' => $this->today(100),
        ])->assertForbidden();
        $this->actingAs($viewer)
            ->post(route('documents.archive', $document), ['reason' => 'x'])
            ->assertForbidden();
        $this->actingAs($viewer)->get(route('document-types.index'))->assertForbidden();
    }

    public function test_vehicle_documents_report_missing_mandatory_types(): void
    {
        $vehicle = $this->vehicle();
        $this->document($vehicle, 'Обязательное страхование', 100);

        $payload = $this->actingAs($this->owner)
            ->getJson(route('vehicles.documents.index', $vehicle))
            ->assertOk()
            ->json();

        $this->assertCount(1, $payload['items']);
        $this->assertEqualsCanonicalizing(
            ['Свидетельство о регистрации', 'Технический осмотр'],
            array_column($payload['missing'], 'name'),
        );

        $this->actingAs($this->owner)
            ->get(route('vehicles.show', $vehicle))
            ->assertInertia(fn ($page) => $page
                ->has('documentSummary.missing', 2)
                ->where('can.view_documents', true));
    }

    public function test_registry_filters_by_expiry_state_and_skips_decommissioned_vehicles(): void
    {
        $vehicle = $this->vehicle(VehicleCategory::Tractor, ['plate_number' => 'ACT 001']);
        $this->document($vehicle, 'Обязательное страхование', -3);
        $this->document($vehicle, 'Технический осмотр', 10);
        $this->document($vehicle, 'КАСКО', 200);
        $this->document($vehicle, 'Свидетельство о регистрации', null);

        $retired = $this->vehicle(VehicleCategory::Tractor, [
            'plate_number' => 'OLD 001',
            'status' => VehicleStatus::Decommissioned,
        ]);
        $this->document($retired, 'Обязательное страхование', -30);

        $this->actingAs($this->owner)
            ->get(route('documents.index', ['state' => 'expired']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('documents/index')
                ->has('documents.data', 1)
                ->where('documents.data.0.vehicle.plate_number', 'ACT 001')
                ->where('counts.expired', 1)
                ->where('counts.expiring', 1));

        $this->actingAs($this->owner)
            ->get(route('documents.index', ['state' => 'expiring']))
            ->assertInertia(fn ($page) => $page->has('documents.data', 1));

        $this->actingAs($this->owner)
            ->get(route('documents.index', ['search' => 'OLD']))
            ->assertInertia(fn ($page) => $page->has('documents.data', 1));

        $this->actingAs($this->owner)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('documents.expired', 1)
                ->where('documents.expiring', 1)
                ->where('attention.0.reason', 'document_expired'));
    }

    public function test_reminders_are_sent_once_per_threshold(): void
    {
        Notification::fake();
        $vehicle = $this->vehicle();
        $this->document($vehicle, 'Технический осмотр', 20);
        $viewer = addOrganizationMember($this->organization, 'Viewer');

        $this->assertSame(1, $this->notifier()->run($this->organization, ignoreHour: true));
        $this->assertSame(0, $this->notifier()->run($this->organization, ignoreHour: true));

        Notification::assertSentToTimes($this->owner, DocumentExpiring::class, 1);
        Notification::assertSentToTimes($this->owner, DocumentExpiryDigest::class, 1);
        Notification::assertNothingSentTo($viewer);

        Date::setTestNow(now()->addDays(3));
        $this->assertSame(0, $this->notifier()->run($this->organization, ignoreHour: true));

        Date::setTestNow(now()->addDays(4));
        $this->assertSame(1, $this->notifier()->run($this->organization, ignoreHour: true));
        $this->assertSame(0, $this->notifier()->run($this->organization, ignoreHour: true));

        Date::setTestNow(now()->addDays(14));
        $this->assertSame(1, $this->notifier()->run($this->organization, ignoreHour: true));
        $this->assertSame(0, $this->notifier()->run($this->organization, ignoreHour: true));

        Notification::assertSentToTimes($this->owner, DocumentExpiring::class, 3);
        Notification::assertSentToTimes($this->owner, DocumentExpiryDigest::class, 3);
        $this->assertEqualsCanonicalizing(
            [30, 14, 7, 1, 0],
            DocumentAlert::query()->pluck('threshold_days')->all(),
        );
    }

    public function test_reminders_wait_for_working_hours(): void
    {
        Notification::fake();
        $this->document($this->vehicle(), 'Технический осмотр', 3);

        Date::setTestNow(CarbonImmutable::parse('2026-10-16 05:30', 'Europe/Chisinau'));
        $this->assertSame(0, $this->notifier()->run($this->organization));
        Notification::assertNothingSent();

        Date::setTestNow(CarbonImmutable::parse('2026-10-16 09:00', 'Europe/Chisinau'));
        $this->assertSame(1, $this->notifier()->run($this->organization));
    }

    public function test_changing_the_expiry_date_resets_reminders(): void
    {
        Notification::fake();
        $document = $this->document($this->vehicle(), 'Технический осмотр', 5);

        $this->assertSame(1, $this->notifier()->run($this->organization, ignoreHour: true));

        app(CurrentOrganization::class)->set($this->organization);
        $this->actingAs($this->owner)
            ->put(route('documents.update', $document), ['expires_on' => $this->today(6)])
            ->assertSessionHasNoErrors();

        $this->assertSame(0, DocumentAlert::query()->count());
        $this->assertSame(1, $this->notifier()->run($this->organization, ignoreHour: true));
    }

    public function test_command_stores_in_app_notifications_and_opening_marks_them_read(): void
    {
        $vehicle = $this->vehicle();
        $this->document($vehicle, 'Технический осмотр', 1);

        $this->artisan('documents:notify-expiring', ['--now' => true])->assertSuccessful();
        $this->artisan('documents:notify-expiring', ['--now' => true])->assertSuccessful();

        $notification = $this->owner->notifications()->sole();
        $this->assertSame($this->organization->id, $notification->organization_id);
        $this->assertSame(1, $notification->data['days_left']);

        app(CurrentOrganization::class)->set($this->organization);
        session(['current_organization_id' => $this->organization->id]);

        $this->actingAs($this->owner)
            ->get(route('notifications.index'))
            ->assertInertia(fn ($page) => $page
                ->component('notifications/index')
                ->has('notifications.data', 1)
                ->where('unreadNotifications', 1));

        $this->actingAs($this->owner)
            ->post(route('notifications.open', $notification->id))
            ->assertRedirect("/vehicles/{$vehicle->id}?tab=documents");

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_notifications_are_scoped_to_the_current_organization(): void
    {
        $this->document($this->vehicle(), 'Технический осмотр', 1);
        $this->notifier()->run($this->organization, ignoreHour: true);
        $notification = $this->owner->notifications()->sole();

        $second = app(CreateOrganization::class)
            ->execute($this->owner, ['name' => 'Second Logistics']);
        app(CurrentOrganization::class)->set($second);
        session(['current_organization_id' => $second->id]);

        $this->actingAs($this->owner)
            ->get(route('notifications.index'))
            ->assertInertia(fn ($page) => $page
                ->has('notifications.data', 0)
                ->where('unreadNotifications', 0));

        $this->actingAs($this->owner)->post(route('notifications.open', $notification->id))->assertNotFound();
        $this->actingAs($this->owner)->post(route('notifications.read-all'));

        $this->assertNull($notification->fresh()->read_at);
    }

    public function test_expiry_setting_of_a_used_type_cannot_change(): void
    {
        $type = $this->type('КАСКО');
        $this->document($this->vehicle(), 'КАСКО', 100);

        $this->actingAs($this->owner)
            ->put(route('document-types.update', $type), [
                'name' => 'КАСКО',
                'has_expiry' => false,
                'is_mandatory' => false,
                'is_active' => true,
            ]);
        $this->assertTrue($type->fresh()->has_expiry);

        $this->actingAs($this->owner)
            ->put(route('document-types.update', $type), [
                'subject' => 'driver',
                'name' => 'КАСКО',
                'has_expiry' => true,
                'is_mandatory' => false,
                'is_active' => true,
            ])
            ->assertSessionHasErrors('subject');

        $this->actingAs($this->owner)
            ->post(route('document-types.store'), [
                'subject' => 'vehicle',
                'name' => 'Разрешение ЕКМТ',
                'has_expiry' => true,
                'is_mandatory' => false,
                'vehicle_categories' => ['tractor'],
                'is_active' => true,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(['tractor'], $this->type('Разрешение ЕКМТ')->vehicle_categories);
    }
}
