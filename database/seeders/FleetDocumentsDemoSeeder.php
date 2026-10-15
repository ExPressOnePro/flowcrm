<?php

namespace Database\Seeders;

use App\Actions\Documents\CreateDocument;
use App\Actions\Fleet\EnsureDefaultFleetCatalog;
use App\Enums\DocumentSubject;
use App\Enums\VehicleStatus;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Organization;
use App\Models\Vehicle;
use App\Support\CurrentOrganization;
use App\Support\OrganizationTime;
use Illuminate\Database\Seeder;

/**
 * Demo documents with a spread of expiry dates. Does nothing if documents exist.
 */
class FleetDocumentsDemoSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::query()->where('slug', 'flow-digital-agency')->first()
            ?? Organization::query()->orderBy('id')->first();

        if ($organization === null) {
            return;
        }

        app(CurrentOrganization::class)->set($organization);
        app(EnsureDefaultFleetCatalog::class)->execute($organization);

        if (Document::query()->exists()) {
            $this->command?->info('Demo documents already present, skipping.');

            return;
        }

        $owner = $organization->users()->orderBy('users.id')->firstOrFail();
        $types = DocumentType::query()->where('subject', DocumentSubject::Vehicle->value)->get()->keyBy('name');
        $today = OrganizationTime::today();
        $create = app(CreateDocument::class);

        // Days until expiry for insurance / inspection, cycled over vehicles.
        $insurance = [210, 12, -4, 160, 26, 300, 3, 95];
        $inspection = [120, 40, 75, -20, 180, 8, 240, 60];

        Vehicle::query()
            ->with('type')
            ->where('status', '!=', VehicleStatus::Decommissioned->value)
            ->orderBy('id')
            ->get()
            ->each(function (Vehicle $vehicle, int $index) use ($create, $owner, $types, $today, $insurance, $inspection): void {
                $add = function (string $type, ?int $days, string $number) use ($create, $owner, $types, $today, $vehicle): void {
                    $documentType = $types->get($type);

                    if ($documentType === null || ! $documentType->appliesToCategory($vehicle->type->category)) {
                        return;
                    }

                    $create->execute($owner, $vehicle, [
                        'document_type_id' => $documentType->id,
                        'number' => $number,
                        'issued_on' => $today->subYear()->toDateString(),
                        'expires_on' => $days === null ? null : $today->addDays($days)->toDateString(),
                    ]);
                };

                $add('Свидетельство о регистрации', null, sprintf('MD %07d', 1200000 + $vehicle->id));
                $add('Обязательное страхование', $insurance[$index % count($insurance)], sprintf('RCA/%06d', 500000 + $vehicle->id));

                if ($index % 5 !== 4) {
                    $add('Технический осмотр', $inspection[$index % count($inspection)], sprintf('TO-%05d', 30000 + $vehicle->id));
                }

                if ($index % 3 === 0) {
                    $add('Поверка тахографа', 45 + $index * 7, sprintf('TH-%04d', 7000 + $vehicle->id));
                }
            });
    }
}
