<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdcodeGen extends Model
{
    protected $table = 'idcode_gen';

    protected $fillable = ['dept', 'prefix', 'last_idNum'];
}
