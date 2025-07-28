<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany; // <-- THÊM DÒNG NÀY ĐỂ IMPORT ĐÚNG HASMANY

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
        'password',
        'image',
        'role',
        'status',
        'created_at',
        'updated_at',
        'google_id',
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
    public function orders(){
        return $this->hasMany(Order::class);
    }
    public function cart(){
        return $this->hasOne(Cart::class);
    }
     public function notifications(): HasMany // <-- SỬA KIỂU TRẢ VỀ Ở ĐÂY
    {
        return $this->hasMany(Notification::class, 'user_id')->latest();
    }

    public function unreadNotifications(): HasMany // <-- CŨNG SỬA KIỂU TRẢ VỀ Ở ĐÂY
    {
        return $this->hasMany(Notification::class, 'user_id')->where('is_read', false)->latest();
       
    }

    /**
     * Kiểm tra xem người dùng có phải là quản trị viên không.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Kiểm tra xem người dùng có phải là khách hàng không.
     */
    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }
    
}
