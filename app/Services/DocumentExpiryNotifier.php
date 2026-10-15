<?php

namespace App\Services;

use App\Enums\OrganizationUserStatus;
use App\Enums\UserStatus;
use App\Models\Contracts\HasDocuments;
use App\Models\Document;
use App\Models\DocumentAlert;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\DocumentExpiring;
use App\Notifications\DocumentExpiryDigest;
use App\Support\BranchAccess;
use App\Support\CurrentOrganization;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Spatie\Permission\PermissionRegistrar;

/**
 * Sends each expiry reminder once: a threshold is recorded in `document_alerts`
 * before anyone is notified, so overlapping or repeated scheduler runs are no-ops.
 */
class DocumentExpiryNotifier
{
    /**
     * Reminders go out after this local hour so they arrive during the working day.
     */
    public const SEND_AFTER_HOUR = 7;

    public function __construct(
        private CurrentOrganization $currentOrganization,
        private BranchAccess $branchAccess,
        private PermissionRegistrar $permissions,
    ) {}

    /**
     * @return int number of new reminders (documents), not recipients
     */
    public function run(Organization $organization, bool $ignoreHour = false): int
    {
        $this->currentOrganization->set($organization);
        $this->permissions->setPermissionsTeamId($organization->id);
        $this->branchAccess->flush();

        try {
            if (! $ignoreHour && CarbonImmutable::now(OrganizationTime::timezone())->hour < self::SEND_AFTER_HOUR) {
                return 0;
            }

            $today = OrganizationTime::today();
            $recipients = $this->recipients($organization);
            $digest = [];
            $sent = 0;

            $documents = Document::query()
                ->active()
                ->forOperationalSubjects()
                ->whereNotNull('expires_on')
                ->where('expires_on', '<=', $today->addDays(max(DocumentAlert::THRESHOLDS))->toDateString())
                ->with(['type:id,name', 'documentable'])
                ->orderBy('expires_on')
                ->get();

            foreach ($documents as $document) {
                $daysLeft = (int) $document->daysLeft($today);
                $reached = DocumentAlert::reached($daysLeft);

                if ($reached === [] || ! $this->claim($document, $reached)) {
                    continue;
                }

                $sent++;
                $subject = $document->documentable;

                foreach ($recipients as $user) {
                    if (! $subject instanceof HasDocuments || ! $this->branchAccess->canSeeBranch($user, $subject->documentBranchId())) {
                        continue;
                    }

                    $user->notify(new DocumentExpiring($document, $daysLeft));
                    $digest[$user->id][] = DocumentExpiring::payload($document, $daysLeft);
                }
            }

            foreach ($digest as $userId => $items) {
                $recipients->firstWhere('id', $userId)?->notify(new DocumentExpiryDigest($organization, $items));
            }

            return $sent;
        } finally {
            $this->branchAccess->flush();
        }
    }

    /**
     * Records every reached threshold; returns true only if the most urgent one is new.
     *
     * @param  list<int>  $reached
     */
    private function claim(Document $document, array $reached): bool
    {
        $mostUrgent = min($reached);
        $row = fn (int $threshold) => [
            'organization_id' => $document->organization_id,
            'document_id' => $document->id,
            'threshold_days' => $threshold,
            'created_at' => now(),
        ];

        $claimed = DocumentAlert::query()->insertOrIgnore([$row($mostUrgent)]) === 1;

        DocumentAlert::query()->insertOrIgnore(array_map($row, array_values(array_diff($reached, [$mostUrgent]))));

        return $claimed;
    }

    /**
     * @return Collection<int, User>
     */
    private function recipients(Organization $organization): Collection
    {
        return $organization->users()
            ->wherePivot('status', OrganizationUserStatus::Active->value)
            ->where('users.status', UserStatus::Active->value)
            ->get()
            ->filter(fn (User $user) => $user->can('documents.notify'))
            ->values();
    }
}
