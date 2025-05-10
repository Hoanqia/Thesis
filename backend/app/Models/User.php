<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Database\Eloquent\Factories\HasFactory;
class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable. 
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'dob',
        'phone_number',
        'email',
        'email_verified_at',
        'password',
        'image',
        'role',
        'status',
        'created_at',
        'updated_at',
    ];
    
    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    // protected function casts(): array
    // {
    //     return [
    //         'email_verified_at' => 'datetime',
    //         'password' => 'hashed',
    //     ];
    // }
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Trả về mảng claims tùy chỉnh sẽ thêm vào payload của JWT.
     */
    public function getJWTCustomClaims(): array
    {
        return [];
    }

    public function addresses(){
        return $this->hasMany(UserAddress::class);
    }
}
