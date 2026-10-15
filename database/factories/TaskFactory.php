<?php

namespace Database\Factories;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Organization;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement([
            TaskStatus::Open,
            TaskStatus::InProgress,
            TaskStatus::Completed,
        ]);

        return [
            'organization_id' => Organization::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->boolean(40) ? fake()->sentence() : null,
            'status' => $status,
            'priority' => fake()->randomElement(TaskPriority::cases()),
            'assigned_to' => null,
            'created_by' => User::factory(),
            'due_at' => fake()->optional()->dateTimeBetween('now', '+2 weeks'),
            'completed_at' => $status === TaskStatus::Completed ? now() : null,
            'taskable_type' => null,
            'taskable_id' => null,
        ];
    }

    public function forOrganization(Organization $organization): static
    {
        return $this->state(fn (): array => [
            'organization_id' => $organization->id,
        ]);
    }

    public function open(): static
    {
        return $this->state(fn (): array => [
            'status' => TaskStatus::Open,
            'completed_at' => null,
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (): array => [
            'status' => TaskStatus::Completed,
            'completed_at' => now(),
        ]);
    }
}
