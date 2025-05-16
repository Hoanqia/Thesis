<?php

namespace App\Services;

use App\Models\Product;
use App\Services\SlugService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ProductService
{
    public function create(array $data)
    {
        $validated = Validator::make($data, [
            'name' => 'required|string',
            'description' => 'nullable|string',
            'cat_id' => 'required|exists:categories,id',
            'brand_id' => 'required|exists:brands,id',
            'image' => 'nullable|file|image',
            'is_featured' => 'nullable|boolean',
            'status' => 'nullable|boolean',
        ])->validate();

        $validated['slug'] = SlugService::createSlug($validated['name'], Product::class);
        $validated['is_featured'] = $data['is_featured'] ?? false;
        $validated['status'] = $data['status'] ?? true;
         if (isset($data['image']) && $data['image'] instanceof UploadedFile) {
            $image = $data['image'];
            $imageName = time() . '_' . $image->getClientOriginalName();
            $image->storeAs('uploads/products', $imageName, 'public');
            $validated['image'] = 'uploads/products/' . $imageName;
        }
        return Product::create($validated);
    }

    public function getAll()
    {
        return Product::with(['brand', 'category'])->get();
    }
    public function getFeaturedProducts()
    {
        return Product::with(['brand','variants'])->where('is_featured',1)->get();
    }
    public function getBySlug(string $slug)
    {
        return Product::with(['brand', 'category', 'variants'])->where('slug', $slug)->first();
    }

   
  

    public function update(string $slug, array $data)
    {
        $product = Product::where('slug', $slug)->firstOrFail();

        $validated = Validator::make($data, [
            'name' => 'string',
            'description' => 'nullable|string',
            'cat_id' => 'exists:categories,id',
            'brand_id' => 'exists:brands,id',
            'image' => 'nullable|string',
            'is_featured' => 'boolean',
            'status' => 'boolean',
        ])->validate();

        if (isset($validated['name']) && $validated['name'] !== $product->name) {
            $validated['slug'] = SlugService::createSlug($validated['name'], Product::class);
        }

        $product->update($validated);
        return $product;
    }

    public function delete(string $slug)
    {
        $product = Product::where('slug', $slug)->firstOrFail();
        return $product->delete();
    }
}
