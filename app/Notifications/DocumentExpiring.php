<?php

namespace App\Notifications;

use App\Models\Document;
use App\Models\Vehicle;
use App\Notifications\Channels\OrganizationDatabaseChannel;
use App\Notifications\Contracts\BelongsToOrganization;
use Illuminate\Notifications\Notification;

/**
 * In-app reminder (bell). E-mail goes out separately as one daily digest.
 */
class DocumentExpiring extends Notification implements BelongsToOrganization
{
    public function __construct(
        private Document $document,
        private int $daysLeft,
    ) {}

    /**
     * @return list<class-string>
     */
    public function via(object $notifiable): array
    {
        return [OrganizationDatabaseChannel::class];
    }

    public function organizationId(): int
    {
        return $this->document->organization_id;
    }

    public function databaseType(object $notifiable): string
    {
        return 'document_expiring';
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return self::payload($this->document, $this->daysLeft);
    }

    /**
     * @return array{document_id: int, document_type: string, vehicle_id: int|null, plate_number: string|null, expires_on: string|null, days_left: int, url: string}
     */
    public static function payload(Document $document, int $daysLeft): array
    {
        $vehicle = $document->documentable;

        return [
            'document_id' => $document->id,
            'document_type' => $document->type->name,
            'vehicle_id' => $vehicle instanceof Vehicle ? $vehicle->id : null,
            'plate_number' => $vehicle instanceof Vehicle ? $vehicle->plate_number : null,
            'expires_on' => $document->expires_on?->toDateString(),
            'days_left' => $daysLeft,
            'url' => $vehicle instanceof Vehicle
                ? route('vehicles.show', ['vehicle' => $vehicle->id, 'tab' => 'documents'], false)
                : route('documents.index', [], false),
        ];
    }
}
