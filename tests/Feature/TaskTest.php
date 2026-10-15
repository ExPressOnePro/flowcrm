<?php

namespace Tests\Feature;

use App\Enums\TaskStatus;
use App\Models\Customer;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_view_tasks_index(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        Task::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
            'assigned_to' => $user->id,
            'title' => 'Call ACME',
        ]);

        $this->actingAs($user)
            ->get(route('tasks.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('tasks/index')
                ->has('tasks.data', 1)
                ->where('tasks.data.0.title', 'Call ACME')
            );
    }

    public function test_users_can_create_a_task_linked_to_a_customer(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $customer = Customer::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(route('tasks.store'), [
            'title' => 'Prepare proposal',
            'priority' => 'high',
            'status' => 'open',
            'assigned_to' => $user->id,
            'taskable_type' => 'customer',
            'taskable_id' => $customer->id,
        ]);

        $task = Task::query()->firstOrFail();

        $response->assertRedirect(route('tasks.show', $task));
        $this->assertDatabaseHas('tasks', [
            'title' => 'Prepare proposal',
            'taskable_type' => 'customer',
            'taskable_id' => $customer->id,
        ]);
        $this->assertTrue($customer->tasks()->whereKey($task->id)->exists());

        $this->actingAs($user)
            ->get(route('tasks.edit', $task))
            ->assertInertia(fn ($page) => $page->where('task.taskable_type', 'customer'));
    }

    public function test_users_can_mark_a_task_completed(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $task = Task::factory()->open()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
            'assigned_to' => $user->id,
        ]);

        $this->actingAs($user)
            ->post(route('tasks.complete', $task))
            ->assertRedirect();

        $this->assertSame(TaskStatus::Completed, $task->fresh()->status);
        $this->assertNotNull($task->fresh()->completed_at);
    }

    public function test_tasks_without_view_all_are_scoped_to_user(): void
    {
        $owner = createUserWithOrganization();
        $organization = $owner->organizations()->firstOrFail();

        $employee = User::factory()->create([
            'email' => 'task-employee@example.com',
        ]);

        $organization->users()->attach($employee->id, [
            'status' => 'active',
            'joined_at' => now(),
        ]);

        setPermissionsTeamId($organization->id);
        $employee->assignRole('Employee');

        Task::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $owner->id,
            'assigned_to' => $owner->id,
            'title' => 'Owner task',
        ]);

        Task::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $employee->id,
            'assigned_to' => $employee->id,
            'title' => 'Employee task',
        ]);

        $this->actingAs($employee)
            ->get(route('tasks.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('tasks.data', 1)
                ->where('tasks.data.0.title', 'Employee task')
            );
    }
}
