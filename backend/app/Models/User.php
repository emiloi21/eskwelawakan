<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\HasPublicId;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasPublicId;

    protected $fillable = [
        'username', 'password',
        'fname', 'mname', 'lname', 'suffix',
        'email', 'contact_number',
        'access', 'department', 'sub_department',
        'selected_sy', 'selected_sem',
        'status', 'profile_image',
        'personnel_id', 'reg_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    protected $appends = ['name'];

    public function getNameAttribute(): string
    {
        $name = trim("{$this->fname} {$this->lname}");
        return $this->suffix ? "{$name} {$this->suffix}" : $name;
    }

    public function getFullNameAttribute(): string
    {
        return $this->getNameAttribute();
    }

    public function isAdmin(): bool
    {
        return $this->access === 'Administrator';
    }

    public function isEncoder(): bool
    {
        return $this->access === 'Encoder';
    }

    public function isTeacher(): bool
    {
        return $this->access === 'Teacher';
    }

    public function isStudent(): bool
    {
        return $this->access === 'Student';
    }

    public function isParent(): bool
    {
        return $this->access === 'Parent';
    }

    public function hrmsPersonnel(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(HrmsPersonnel::class, 'user_id');
    }

    public function facultyStaff(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(FacultyStaff::class, 'personnel_id', 'personnel_id');
    }

    public function student(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function children(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'parent_students', 'user_id', 'reg_id', 'id', 'reg_id');
    }

    public function designations(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(UserDesignation::class);
    }

    /**
     * Returns all roles this user has access to (primary access + extra designations).
     */
    public function allRoles(): array
    {
        $extras = $this->designations()->pluck('designation')->toArray();
        return array_unique(array_merge([$this->access], $extras));
    }

    /**
     * Check whether the user has a given role among their designations.
     */
    public function hasRole(string ...$roles): bool
    {
        return !empty(array_intersect($roles, $this->allRoles()));
    }
}
