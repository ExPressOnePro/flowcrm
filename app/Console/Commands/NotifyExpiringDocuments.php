<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Services\DocumentExpiryNotifier;
use App\Support\CurrentOrganization;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Spatie\Permission\PermissionRegistrar;

#[Signature('documents:notify-expiring {--now : Ignore the local "after 7:00" window}')]
#[Description('Send document expiry reminders (30/14/7/1 days, expired). Each reminder is sent once.')]
class NotifyExpiringDocuments extends Command
{
    public function handle(DocumentExpiryNotifier $notifier): int
    {
        Organization::query()->orderBy('id')->each(function (Organization $organization) use ($notifier): void {
            $count = $notifier->run($organization, (bool) $this->option('now'));

            if ($count > 0) {
                $this->components->info("{$organization->name}: {$count}");
            }
        });

        app(CurrentOrganization::class)->clear();
        app(PermissionRegistrar::class)->setPermissionsTeamId(null);

        return self::SUCCESS;
    }
}
