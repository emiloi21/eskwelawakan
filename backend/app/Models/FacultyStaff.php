<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacultyStaff extends Model
{
    protected $table = 'faculty_staff';
    protected $primaryKey = 'personnel_id';

    protected $fillable = [
        'img', 'fullname', 'description', 'classification',
    ];
}
