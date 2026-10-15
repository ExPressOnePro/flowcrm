<?php

namespace App\Services;

use App\Enums\DocumentState;
use App\Enums\DocumentSubject;
use App\Enums\TaskStatus;
use App\Enums\VehicleStatus;
use App\Enums\WaybillStatus;
use App\Models\Document;
use App\Models\Task;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleCoupling;
use App\Models\VehicleStatusChange;
use App\Models\Waybill;
use App\Support\OrganizationTime;
use Illuminate\Support\Carbon;

class FleetDashboardService
{
    private const ATTENTION_LIMIT = 6;

    /**
     * @return array{total: int, by_status: array<string, int>, road_trains: int, stale_odometer: int}
     */
    public function fleet(User $user): array
    {
        $byStatus = Vehicle::query()
            ->visibleTo($user)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn ($count) => (int) $count);

        $roadTrains = VehicleCoupling::query()
            ->whereNull('uncoupled_at')
            ->whereHas('tractor', fn ($query) => $query->visibleTo($user))
            ->distinct()
            ->count('tractor_id');

        return [
            'total' => (int) $byStatus->sum(),
            'by_status' => collect(VehicleStatus::cases())
                ->mapWithKeys(fn (VehicleStatus $status) => [$status->value => $byStatus->get($status->value, 0)])
                ->all(),
            'road_trains' => $roadTrains,
            'stale_odometer' => Vehicle::query()->visibleTo($user)->odometerStale()->count(),
        ];
    }

    /**
     * @return array{expired: int, expiring: int}
     */
    public function documents(User $user): array
    {
        $today = OrganizationTime::today();
        $count = fn (DocumentState $state) => Document::query()
            ->visibleTo($user)
            ->forOperationalSubjects()
            ->inState($state, $today)
            ->count();

        return [
            'expired' => $count(DocumentState::Expired),
            'expiring' => $count(DocumentState::Expiring),
        ];
    }

    /**
     * Open trips first, then the most recently planned ones.
     *
     * @return list<array<string, mixed>>
     */
    public function recentWaybills(User $user, int $limit = 5): array
    {
        return Waybill::query()
            ->visibleTo($user)
            ->where('status', '!=', WaybillStatus::Cancelled->value)
            ->with(['vehicle:id,plate_number,deleted_at', 'trailer:id,plate_number,deleted_at', 'driver:id,last_name,first_name,middle_name', 'branch:id,name'])
            ->orderByRaw('CASE status WHEN ? THEN 0 ELSE 1 END', [WaybillStatus::Issued->value])
            ->orderByDesc('planned_departure_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (Waybill $waybill) => WaybillPresenter::item($waybill))
            ->values()
            ->all();
    }

    /**
     * @return array{open: int, overdue: int, closed_today: int}
     */
    public function waybills(User $user): array
    {
        $startOfDay = OrganizationTime::today()->utc();

        return [
            'open' => Waybill::query()->visibleTo($user)->open()->count(),
            'overdue' => Waybill::query()->visibleTo($user)->returnOverdue()->count(),
            'closed_today' => Waybill::query()->visibleTo($user)
                ->where('status', WaybillStatus::Closed->value)
                ->where('closed_at', '>=', $startOfDay)
                ->count(),
        ];
    }

    /**
     * Vehicles that need a decision: expired documents, under repair, or without a recent odometer reading.
     *
     * @return list<array<string, mixed>>
     */
    public function attention(User $user, bool $withDocuments = false): array
    {
        $expiredDocuments = $withDocuments
            ? Document::query()
                ->visibleTo($user)
                ->forSubject(DocumentSubject::Vehicle)
                ->forOperationalSubjects()
                ->inState(DocumentState::Expired, OrganizationTime::today())
                ->with(['type:id,name', 'documentable' => fn ($query) => $query->select('id', 'plate_number', 'make', 'model', 'status')])
                ->orderBy('expires_on')
                ->limit(self::ATTENTION_LIMIT)
                ->get()
                ->filter(fn (Document $document) => $document->documentable instanceof Vehicle)
                ->map(fn (Document $document) => [
                    ...$this->vehicle($document->documentable),
                    'reason' => 'document_expired',
                    'document' => $document->type->name,
                    'since' => $document->expires_on?->toDateString(),
                ])
                ->values()
            : collect();

        $underRepair = Vehicle::query()
            ->visibleTo($user)
            ->where('status', VehicleStatus::UnderRepair->value)
            ->addSelect(['status_since' => VehicleStatusChange::query()
                ->select('changed_at')
                ->whereColumn('vehicle_id', 'vehicles.id')
                ->orderByDesc('changed_at')
                ->limit(1),
            ])
            ->orderBy('status_since')
            ->limit(self::ATTENTION_LIMIT)
            ->get()
            ->map(fn (Vehicle $vehicle) => [
                ...$this->vehicle($vehicle),
                'reason' => 'under_repair',
                'since' => $vehicle->getAttribute('status_since')
                    ? Carbon::parse($vehicle->getAttribute('status_since'), 'UTC')->toIso8601String()
                    : null,
            ]);

        $stale = Vehicle::query()
            ->visibleTo($user)
            ->odometerStale()
            ->withMax('odometerReadings as last_reading_at', 'recorded_at')
            ->orderBy('last_reading_at')
            ->orderBy('plate_number')
            ->limit(self::ATTENTION_LIMIT)
            ->get()
            ->map(fn (Vehicle $vehicle) => [
                ...$this->vehicle($vehicle),
                'reason' => 'stale_odometer',
                'since' => $vehicle->getAttribute('last_reading_at')
                    ? Carbon::parse($vehicle->getAttribute('last_reading_at'), 'UTC')->toIso8601String()
                    : null,
            ]);

        return $expiredDocuments->concat($underRepair)->concat($stale)->values()->all();
    }

    /**
     * Open tasks assigned to the user that are overdue or due today.
     *
     * @return list<array<string, mixed>>
     */
    public function myTasks(User $user): array
    {
        return Task::query()
            ->where('assigned_to', $user->id)
            ->whereNotIn('status', [TaskStatus::Completed, TaskStatus::Cancelled])
            ->whereNotNull('due_at')
            ->where('due_at', '<=', now()->endOfDay())
            ->orderBy('due_at')
            ->limit(8)
            ->get(['id', 'title', 'due_at', 'priority', 'status'])
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'due_at' => $task->due_at?->toIso8601String(),
                'overdue' => $task->due_at?->isPast() ?? false,
                'priority' => $task->priority->value,
                'status' => $task->status->value,
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function vehicle(Vehicle $vehicle): array
    {
        return [
            'id' => $vehicle->id,
            'plate_number' => $vehicle->plate_number,
            'name' => trim($vehicle->make.' '.$vehicle->model),
            'status' => $vehicle->status->value,
        ];
    }
}
