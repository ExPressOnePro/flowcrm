<?php

namespace App\Services;

use App\Models\OdometerReading;
use App\Models\Vehicle;
use App\Models\VehicleCoupling;
use App\Models\VehicleStatusChange;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Merged, newest-first operations history of a vehicle: status changes,
 * coupling and uncoupling events, and odometer readings.
 */
class VehicleTimeline
{
    public const TYPES = ['all', 'status', 'coupling', 'odometer'];

    public const PERIODS = ['7d' => 7, '30d' => 30, '90d' => 90, '365d' => 365, 'all' => null];

    /**
     * @return array{items: list<array<string, mixed>>, has_more: bool, next_before: string|null}
     */
    public function page(Vehicle $vehicle, string $type, string $period, ?CarbonImmutable $before, int $limit = 30): array
    {
        $days = self::PERIODS[$period] ?? null;
        $from = $days !== null ? CarbonImmutable::now()->subDays($days) : null;

        $events = collect();

        if (in_array($type, ['all', 'status'], true)) {
            $events = $events->concat($this->statusChanges($vehicle, $from, $before, $limit + 1));
        }

        if (in_array($type, ['all', 'coupling'], true)) {
            $events = $events->concat($this->couplingEvents($vehicle, $from, $before, $limit + 1));
        }

        if (in_array($type, ['all', 'odometer'], true)) {
            $events = $events->concat($this->odometerReadings($vehicle, $from, $before, $limit + 1));
        }

        $sorted = $events->sortByDesc(fn (array $event) => $event['at']->getTimestamp())->values();

        if ($sorted->count() <= $limit) {
            return ['items' => $this->present($sorted), 'has_more' => false, 'next_before' => null];
        }

        // Keep events sharing the boundary timestamp together so the next page (strictly older) skips none.
        $boundary = $sorted[$limit - 1]['at']->getTimestamp();
        $page = $sorted->takeWhile(fn (array $event, int $index) => $index < $limit || $event['at']->getTimestamp() === $boundary);

        return [
            'items' => $this->present($page),
            'has_more' => true,
            'next_before' => $page->last()['at']->toIso8601String(),
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function statusChanges(Vehicle $vehicle, ?CarbonImmutable $from, ?CarbonImmutable $before, int $limit): Collection
    {
        return VehicleStatusChange::query()
            ->where('vehicle_id', $vehicle->id)
            ->tap(fn (Builder $query) => $this->window($query, 'changed_at', $from, $before))
            ->with('changedBy:id,first_name,last_name')
            ->orderByDesc('changed_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (VehicleStatusChange $change) => [
                'key' => "status-{$change->id}",
                'type' => 'status',
                'at' => $change->changed_at->toImmutable(),
                'actor' => $change->changedBy?->name,
                'from_status' => $change->from_status?->value,
                'to_status' => $change->to_status->value,
                'reason' => $change->reason,
            ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function couplingEvents(Vehicle $vehicle, ?CarbonImmutable $from, ?CarbonImmutable $before, int $limit): Collection
    {
        $base = fn () => VehicleCoupling::query()
            ->where(fn (Builder $query) => $query->where('tractor_id', $vehicle->id)->orWhere('trailer_id', $vehicle->id))
            ->with([
                'tractor' => fn ($query) => $query->withTrashed()->select('id', 'plate_number', 'make', 'model', 'deleted_at'),
                'trailer' => fn ($query) => $query->withTrashed()->select('id', 'plate_number', 'make', 'model', 'deleted_at'),
                'coupledBy:id,first_name,last_name',
                'uncoupledBy:id,first_name,last_name',
            ]);

        $coupled = $base()
            ->tap(fn (Builder $query) => $this->window($query, 'coupled_at', $from, $before))
            ->orderByDesc('coupled_at')
            ->limit($limit)
            ->get()
            ->map(fn (VehicleCoupling $coupling) => [
                ...$this->couplingData($vehicle, $coupling),
                'key' => "coupled-{$coupling->id}",
                'type' => 'coupled',
                'at' => $coupling->coupled_at->toImmutable(),
                'actor' => $coupling->coupledBy?->name,
            ]);

        $uncoupled = $base()
            ->whereNotNull('uncoupled_at')
            ->tap(fn (Builder $query) => $this->window($query, 'uncoupled_at', $from, $before))
            ->orderByDesc('uncoupled_at')
            ->limit($limit)
            ->get()
            ->map(fn (VehicleCoupling $coupling) => [
                ...$this->couplingData($vehicle, $coupling),
                'key' => "uncoupled-{$coupling->id}",
                'type' => 'uncoupled',
                'at' => $coupling->uncoupled_at->toImmutable(),
                'actor' => $coupling->uncoupledBy?->name,
            ]);

        return $coupled->concat($uncoupled);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function odometerReadings(Vehicle $vehicle, ?CarbonImmutable $from, ?CarbonImmutable $before, int $limit): Collection
    {
        return OdometerReading::query()
            ->where('vehicle_id', $vehicle->id)
            ->tap(fn (Builder $query) => $this->window($query, 'recorded_at', $from, $before))
            ->with('recordedBy:id,first_name,last_name')
            ->orderByDesc('recorded_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (OdometerReading $reading) => [
                'key' => "odometer-{$reading->id}",
                'type' => 'odometer',
                'at' => $reading->recorded_at->toImmutable(),
                'actor' => $reading->recordedBy?->name,
                'value_km' => $reading->value_km,
                'source' => $reading->source->value,
                'is_device' => $reading->source->isDeviceReported(),
                'note' => $reading->note,
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function couplingData(Vehicle $vehicle, VehicleCoupling $coupling): array
    {
        $isTractor = $coupling->tractor_id === $vehicle->id;
        $partner = $isTractor ? $coupling->trailer : $coupling->tractor;

        return [
            'role' => $isTractor ? 'tractor' : 'trailer',
            'position' => $coupling->position,
            'notes' => $coupling->notes,
            'partner' => $partner ? [
                'id' => $partner->id,
                'plate_number' => $partner->plate_number,
                'name' => trim($partner->make.' '.$partner->model),
                'archived' => $partner->trashed(),
            ] : null,
        ];
    }

    private function window(Builder $query, string $column, ?CarbonImmutable $from, ?CarbonImmutable $before): void
    {
        $query->when($from, fn (Builder $query) => $query->where($column, '>=', $from->utc()))
            ->when($before, fn (Builder $query) => $query->where($column, '<', $before->utc()));
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $events
     * @return list<array<string, mixed>>
     */
    private function present(Collection $events): array
    {
        return $events
            ->map(fn (array $event) => [...$event, 'at' => $event['at']->toIso8601String()])
            ->values()
            ->all();
    }
}
