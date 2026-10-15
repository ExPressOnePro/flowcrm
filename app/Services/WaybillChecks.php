<?php

namespace App\Services;

use App\Enums\DriverStatus;
use App\Enums\VehicleStatus;
use App\Enums\WaybillStatus;
use App\Models\Driver;
use App\Models\Vehicle;
use App\Models\Waybill;
use Carbon\CarbonImmutable;

/**
 * Blocking rules are the ones a waybill can't physically or legally work without
 * (written-off vehicle, the same vehicle/driver/trailer already on another open
 * waybill, incompatible trailer). Expired documents, statuses and licence
 * categories are only warnings: the dispatcher decides.
 */
class WaybillChecks
{
    /**
     * Typical licence category for a vehicle category; vans depend on weight, so no hint.
     *
     * @var array<string, string>
     */
    private const LICENSE_FOR_CATEGORY = [
        'tractor' => 'CE',
        'truck' => 'C',
        'bus' => 'D',
        'car' => 'B',
    ];

    private const DEFAULT_TRIP_HOURS = 12;

    private const OVERLAP_LOOKAROUND_DAYS = 7;

    public function __construct(
        private SubjectDocuments $documents,
    ) {}

    /**
     * @return array<string, string> field => message
     */
    public function blockingErrors(Waybill $waybill): array
    {
        $errors = [];
        $vehicle = $waybill->vehicle()->with('type')->first();
        $trailer = $waybill->trailer_id ? $waybill->trailer()->with('type')->first() : null;
        $driver = $waybill->driver;

        if ($vehicle === null || $vehicle->trashed() || $vehicle->status === VehicleStatus::Decommissioned) {
            $errors['vehicle_id'] = __('The vehicle is decommissioned or archived.');
        } elseif ($vehicle->type->is_towable) {
            $errors['vehicle_id'] = __('A trailer cannot be the main vehicle of a waybill.');
        } elseif ($this->busy('vehicle_id', $vehicle->id, $waybill) || $this->busy('trailer_id', $vehicle->id, $waybill)) {
            $errors['vehicle_id'] = __('This vehicle is already on an open waybill.');
        }

        if ($trailer !== null) {
            if ($trailer->trashed() || $trailer->status === VehicleStatus::Decommissioned) {
                $errors['trailer_id'] = __('The trailer is decommissioned or archived.');
            } elseif (! $trailer->type->is_towable || ($vehicle !== null && ! $vehicle->type->can_tow)) {
                $errors['trailer_id'] = __('This vehicle cannot tow the selected trailer.');
            } elseif ($this->busy('trailer_id', $trailer->id, $waybill) || $this->busy('vehicle_id', $trailer->id, $waybill)) {
                $errors['trailer_id'] = __('This trailer is already on an open waybill.');
            }
        }

        if ($driver === null || $driver->status !== DriverStatus::Active) {
            $errors['driver_id'] = __('The driver is inactive.');
        } elseif ($this->busy('driver_id', $driver->id, $waybill)) {
            $errors['driver_id'] = __('This driver is already on an open waybill.');
        }

        return $errors;
    }

    /**
     * @return list<array{level: 'danger'|'warning', message: string}>
     */
    public function warnings(Waybill $waybill): array
    {
        $warnings = [];
        $vehicle = $waybill->vehicle;
        $trailer = $waybill->trailer;
        $driver = $waybill->driver;

        if ($vehicle !== null) {
            $status = match ($vehicle->status) {
                VehicleStatus::UnderRepair => __('The vehicle is marked as under repair.'),
                VehicleStatus::Idle => __('The vehicle is marked as idle.'),
                default => null,
            };

            if ($status !== null) {
                $warnings[] = ['level' => 'warning', 'message' => $status];
            }

            array_push($warnings, ...$this->documentWarnings($vehicle, $vehicle->plate_number));
        }

        if ($trailer !== null) {
            array_push($warnings, ...$this->documentWarnings($trailer, $trailer->plate_number));
        }

        if ($driver !== null) {
            array_push($warnings, ...$this->documentWarnings($driver, $driver->full_name));

            $required = $vehicle ? $this->requiredLicense($vehicle, $trailer) : null;

            if ($driver->license_number === null) {
                $warnings[] = ['level' => 'warning', 'message' => __('The driver has no licence number in the directory.')];
            }

            if ($required !== null && ! $driver->hasCategory($required)) {
                $warnings[] = ['level' => 'warning', 'message' => __('The driver\'s licence categories don\'t include :category, usually required for this vehicle.', ['category' => $required])];
            }
        }

        array_push($warnings, ...$this->overlapWarnings($waybill));

        return $warnings;
    }

    /**
     * Another non-cancelled waybill for the same vehicle, trailer or driver whose time
     * window intersects this one. Drafts can be planned ahead, so this only warns.
     *
     * @return list<array{level: 'warning', message: string}>
     */
    public function overlapWarnings(Waybill $waybill): array
    {
        [$start, $end] = $this->window($waybill);

        $others = Waybill::query()
            ->whereKeyNot($waybill->id)
            ->where('status', '!=', WaybillStatus::Cancelled->value)
            ->where(fn ($query) => $query
                ->where('vehicle_id', $waybill->vehicle_id)
                ->orWhere('driver_id', $waybill->driver_id)
                ->when($waybill->trailer_id, fn ($query) => $query->orWhere('trailer_id', $waybill->trailer_id)))
            ->where('planned_departure_at', '<', $end->addDays(self::OVERLAP_LOOKAROUND_DAYS))
            ->where('planned_departure_at', '>', $start->subDays(self::OVERLAP_LOOKAROUND_DAYS))
            ->orderBy('planned_departure_at')
            ->get()
            ->filter(function (Waybill $other) use ($start, $end): bool {
                [$otherStart, $otherEnd] = $this->window($other);

                return $otherStart->lt($end) && $otherEnd->gt($start);
            });

        if ($others->isEmpty()) {
            return [];
        }

        return [[
            'level' => 'warning',
            'message' => __('Overlaps in time with another waybill for the same vehicle or driver: :list', [
                'list' => $others->map(fn (Waybill $other) => $other->number ?? __('draft'))->implode(', '),
            ]),
        ]];
    }

    /**
     * Actual times when known, otherwise planned ones; an open-ended trip is assumed to last a shift.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function window(Waybill $waybill): array
    {
        $start = CarbonImmutable::make($waybill->departure_at ?? $waybill->planned_departure_at);
        $end = CarbonImmutable::make($waybill->return_at ?? $waybill->planned_return_at)
            ?? ($waybill->status === WaybillStatus::Issued ? CarbonImmutable::now()->max($start->addHours(self::DEFAULT_TRIP_HOURS)) : $start->addHours(self::DEFAULT_TRIP_HOURS));

        return [$start, $end->max($start->addMinute())];
    }

    public function requiredLicense(Vehicle $vehicle, ?Vehicle $trailer): ?string
    {
        $required = self::LICENSE_FOR_CATEGORY[$vehicle->loadMissing('type')->type->category->value] ?? null;

        return $required === 'C' && $trailer !== null ? 'CE' : $required;
    }

    /**
     * @return list<array{level: 'danger'|'warning', message: string}>
     */
    private function documentWarnings(Vehicle|Driver $subject, string $label): array
    {
        $summary = $this->documents->summary($subject);
        $warnings = [];

        if ($summary['expired'] !== []) {
            $warnings[] = ['level' => 'danger', 'message' => __(':subject: expired documents — :list', [
                'subject' => $label,
                'list' => implode(', ', array_column($summary['expired'], 'name')),
            ])];
        }

        if ($summary['missing'] !== []) {
            $warnings[] = ['level' => 'warning', 'message' => __(':subject: mandatory documents not added — :list', [
                'subject' => $label,
                'list' => implode(', ', $summary['missing']),
            ])];
        }

        return $warnings;
    }

    private function busy(string $column, int $id, Waybill $except): bool
    {
        return Waybill::query()
            ->where('status', WaybillStatus::Issued->value)
            ->where($column, $id)
            ->when($except->exists, fn ($query) => $query->whereKeyNot($except->id))
            ->exists();
    }
}
