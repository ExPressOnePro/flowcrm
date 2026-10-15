<?php

namespace App\Notifications\Channels;

use App\Notifications\Contracts\BelongsToOrganization;
use Illuminate\Notifications\Channels\DatabaseChannel;
use Illuminate\Notifications\Notification;

/**
 * Stores the organization next to the notification so a user who belongs to
 * several organizations only sees the current one's notifications.
 */
class OrganizationDatabaseChannel extends DatabaseChannel
{
    /**
     * @return array<string, mixed>
     */
    protected function buildPayload($notifiable, Notification $notification): array
    {
        return [
            ...parent::buildPayload($notifiable, $notification),
            'organization_id' => $notification instanceof BelongsToOrganization
                ? $notification->organizationId()
                : null,
        ];
    }
}
