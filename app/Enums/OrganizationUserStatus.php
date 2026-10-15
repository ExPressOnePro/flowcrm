<?php

namespace App\Enums;

enum OrganizationUserStatus: string
{
    case Active = 'active';
    case Invited = 'invited';
    case Disabled = 'disabled';
}
