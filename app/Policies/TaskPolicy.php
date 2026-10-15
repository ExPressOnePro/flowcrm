<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tasks.view') || $user->can('tasks.view_all');
    }

    public function view(User $user, Task $task): bool
    {
        if ($user->can('tasks.view_all')) {
            return true;
        }

        return $user->can('tasks.view')
            && ($task->assigned_to === $user->id || $task->created_by === $user->id);
    }

    public function create(User $user): bool
    {
        return $user->can('tasks.create');
    }

    public function update(User $user, Task $task): bool
    {
        if ($user->can('tasks.update') && $user->can('tasks.view_all')) {
            return true;
        }

        return $user->can('tasks.update')
            && ($task->assigned_to === $user->id || $task->created_by === $user->id);
    }

    public function delete(User $user, Task $task): bool
    {
        if ($user->can('tasks.delete') && $user->can('tasks.view_all')) {
            return true;
        }

        return $user->can('tasks.delete')
            && ($task->assigned_to === $user->id || $task->created_by === $user->id);
    }

    public function assign(User $user, Task $task): bool
    {
        return $user->can('tasks.assign');
    }

    public function complete(User $user, Task $task): bool
    {
        return $this->update($user, $task) && ! $task->isCompleted();
    }
}
