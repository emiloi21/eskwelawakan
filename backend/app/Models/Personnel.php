<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Personnel extends Model
{
    protected $table = 'personnel';
    protected $primaryKey = 'personnel_id';

    protected $fillable = [
        'fname', 'mname', 'lname', 'suffix',
        'classification', 'position', 'dept',
    ];
}
