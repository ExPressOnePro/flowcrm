<?php

namespace App\Actions\Waybills;

use Closure;
use Illuminate\Validation\ValidationException;

/**
 * RecordOdometerReading reports errors as `value_km` / `recorded_at`;
 * waybill forms name these fields differently.
 */
class OdometerErrors
{
    /**
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    public static function remap(Closure $callback, string $valueField, string $dateField): mixed
    {
        try {
            return $callback();
        } catch (ValidationException $exception) {
            $messages = [];

            foreach ($exception->errors() as $field => $fieldMessages) {
                $target = match ($field) {
                    'value_km' => $valueField,
                    'recorded_at' => $dateField,
                    default => $field,
                };
                $messages[$target] = $fieldMessages;
            }

            throw ValidationException::withMessages($messages);
        }
    }
}
