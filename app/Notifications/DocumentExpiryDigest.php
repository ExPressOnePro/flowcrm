<?php

namespace App\Notifications;

use App\Models\Organization;
use Carbon\CarbonImmutable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * One e-mail per user per scheduler run listing the reminders created in that run.
 * Contains document type, plate and date only — no files or personal data.
 */
class DocumentExpiryDigest extends Notification
{
    /**
     * @param  list<array{document_type: string, plate_number: string|null, expires_on: string|null, days_left: int}>  $items
     */
    public function __construct(
        private Organization $organization,
        private array $items,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject(__('Document deadlines: :organization', ['organization' => $this->organization->name]))
            ->greeting(__('Hello!'))
            ->line(__('Documents needing attention: :count', ['count' => count($this->items)]));

        foreach ($this->items as $item) {
            $message->line('• '.self::describe($item));
        }

        return $message
            ->action(__('Open documents'), route('documents.index', ['state' => 'expiring']))
            ->line(__('You receive this because document reminders are enabled for your role.'));
    }

    /**
     * @param  array{document_type: string, plate_number: string|null, expires_on: string|null, days_left: int}  $item
     */
    public static function describe(array $item): string
    {
        $date = $item['expires_on'] ? CarbonImmutable::parse($item['expires_on'])->format('d.m.Y') : '';
        $subject = trim(($item['plate_number'] ?? '').' — '.$item['document_type'], ' —');

        return match (true) {
            $item['days_left'] < 0 => __(':subject: expired on :date', ['subject' => $subject, 'date' => $date]),
            $item['days_left'] === 0 => __(':subject: expires today', ['subject' => $subject]),
            default => __(':subject: expires on :date (:days d.)', ['subject' => $subject, 'date' => $date, 'days' => $item['days_left']]),
        };
    }
}
