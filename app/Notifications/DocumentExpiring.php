<?php

namespace App\Notifications;

use App\Models\Contracts\HasDocuments;
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
     * `plate_number` is kept for reminders stored before drivers had documents.
     *
     * @return array{document_id: int, document_type: string, subject: string|null, subject_label: string|null, plate_number: string|null, expires_on: string|null, days_left: int, url: string}
     */
    public static function payload(Document $document, int $daysLeft): array
    {
        $subject = $document->documentable;

        return [
            'document_id' => $document->id,
            'document_type' => $document->type->name,
            'subject' => $subject instanceof HasDocuments ? $subject->documentSubject()->value : null,
            'subject_label' => $subject instanceof HasDocuments ? $subject->documentLabel() : null,
            'plate_number' => $subject instanceof Vehicle ? $subject->plate_number : null,
            'expires_on' => $document->expires_on?->toDateString(),
            'days_left' => $daysLeft,
            'url' => $subject instanceof HasDocuments ? $subject->documentsUrl() : route('documents.index', [], false),
        ];
    }
}
