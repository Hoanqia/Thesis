<?php

// app/Services/SupplierService.php

namespace App\Services;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Collection;

class SupplierService
{
    /**
     * Get all suppliers.
     *
     * @return Collection
     */
    public function getAll(): Collection
    {
        return Supplier::all();
    }

    /**
     * Get a supplier by ID.
     *
     * @param  int  $id
     * @return Supplier
     */
    public function getById(int $id): Supplier
    {
        return Supplier::findOrFail($id);
    }

    /**
     * Create a new supplier.
     *
     * @param  array  $data
     * @return Supplier
     */
    public function create(array $data): Supplier
    {
        return Supplier::create($data);
    }

    /**
     * Update an existing supplier.
     *
     * @param  int    $id
     * @param  array  $data
     * @return Supplier
     */
    public function update(int $id, array $data): Supplier
    {
        $supplier = $this->getById($id);
        $supplier->update($data);
        return $supplier;
    }

    /**
     * Delete a supplier.
     *
     * @param  int  $id
     * @return bool|null
     */
    public function delete(int $id): ?bool
    {
        $supplier = $this->getById($id);
        return $supplier->delete();
    }
}