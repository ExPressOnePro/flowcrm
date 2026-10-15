<?php

namespace App\Enums;

enum VehicleCategory: string
{
    case Tractor = 'tractor';
    case Truck = 'truck';
    case Semitrailer = 'semitrailer';
    case Trailer = 'trailer';
    case Van = 'van';
    case Car = 'car';
    case Bus = 'bus';
    case Other = 'other';
}
