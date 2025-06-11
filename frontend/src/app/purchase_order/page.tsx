


// app/inventory/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

interface Supplier { id: number; name: string; }
interface Brand    { id: number; name: string; }
interface Category { id: number; name: string; }
interface Variant  { id: number; name: string; }
interface Product  { id: number; name: string; variants: Variant[]; }

interface Entry {
  id: number;
  productId: number;
  variantId: number;
  quantity: number;
  price: number;
}

export default function InventoryIn() {
  // mock states
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: 1, name: 'Nhà cung cấp A' },
    { id: 2, name: 'Nhà cung cấp B' },
  ]);
  const [brands, setBrands] = useState<Brand[]>([
    { id: 1, name: 'Thương hiệu X' },
    { id: 2, name: 'Thương hiệu Y' },
  ]);
  const [categories, setCategories] = useState<Category[]>([
    { id: 1, name: 'Danh mục 1' },
    { id: 2, name: 'Danh mục 2' },
  ]);
  const [products, setProducts] = useState<Product[]>([
    { id: 1, name: 'Sản phẩm 1', variants: [ { id: 11, name: 'Màu đỏ' }, { id: 12, name: 'Màu xanh' } ] },
    { id: 2, name: 'Sản phẩm 2', variants: [ { id: 21, name: 'Size S' }, { id: 22, name: 'Size M' } ] },
  ]);
  const [entries, setEntries] = useState<Entry[]>([]);

  // form states
  const [selectedSupplier, setSelectedSupplier] = useState<number>();
  const [selectedBrand, setSelectedBrand] = useState<number>();
  const [selectedCategory, setSelectedCategory] = useState<number>();
  const [selectedProduct, setSelectedProduct] = useState<number>();
  const [selectedVariant, setSelectedVariant] = useState<number>();
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);

  // search state
  const [search, setSearch] = useState<string>('');

  // helpers
  const findName = (list: any[], id?: number) => list.find(x => x.id === id)?.name || '';
  const filteredProducts = useMemo(
    () => products.filter(p =>
      selectedCategory ? categories.some(c => c.id === selectedCategory) : true
    ),
    [products, selectedCategory, categories]
  );
  const currentVariants = useMemo(
    () => products.find(p => p.id === selectedProduct)?.variants || [],
    [products, selectedProduct]
  );

  // filter entries by search
  const displayedEntries = useMemo(() => {
    if (!search) return entries;
    const term = search.toLowerCase();
    return entries.filter(e => {
      const prodName = findName(products, e.productId).toLowerCase();
      const varList = products.find(p => p.id === e.productId)?.variants || [];
      const varName = findName(varList, e.variantId).toLowerCase();
      return prodName.includes(term) || varName.includes(term);
    });
  }, [entries, search, products]);

  const todaysDate = new Date().toISOString().slice(0, 10);

  function addEntry() {
    if (!selectedProduct || !selectedVariant) return;
    setEntries(prev => [
      ...prev,
      {
        id: Date.now(),
        productId: selectedProduct,
        variantId: selectedVariant,
        quantity,
        price,
      },
    ]);
    // reset fields
    setSelectedProduct(undefined);
    setSelectedVariant(undefined);
    setQuantity(1);
    setPrice(0);
  }

  function removeEntry(id: number) {
    setEntries(entries.filter(e => e.id !== id));
  }

  return (
    <Card className="max-w-5xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-xl">Nhập Hàng</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Supplier */}
          <div>
            <Label>Nhà cung cấp</Label>
            <div className="flex gap-2">
              <Select onValueChange={val => setSelectedSupplier(Number(val))} value={selectedSupplier?.toString()}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn nhà cung cấp" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => {
                const name = prompt('Tên nhà cung cấp mới:');
                if (name) setSuppliers([...suppliers, { id: Date.now(), name }]);
              }}>+ Thêm</Button>
            </div>
          </div>
          {/* Brand */}
          <div>
            <Label>Hãng</Label>
            <div className="flex gap-2">
              <Select onValueChange={val => setSelectedBrand(Number(val))} value={selectedBrand?.toString()}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn hãng" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => {
                const name = prompt('Tên hãng mới:');
                if (name) setBrands([...brands, { id: Date.now(), name }]);
              }}>+ Thêm</Button>
            </div>
          </div>
          {/* Category */}
          <div>
            <Label>Danh mục</Label>
            <div className="flex gap-2">
              <Select onValueChange={val => setSelectedCategory(Number(val))} value={selectedCategory?.toString()}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => {
                const name = prompt('Tên danh mục mới:');
                if (name) setCategories([...categories, { id: Date.now(), name }]);
              }}>+ Thêm</Button>
            </div>
          </div>
          {/* Product */}
          <div>
            <Label>Sản phẩm</Label>
            <div className="flex gap-2">
              <Select onValueChange={val => setSelectedProduct(Number(val))} value={selectedProduct?.toString()}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn sản phẩm" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Variant */}
          <div>
            <Label>Biến thể</Label>
            <Select onValueChange={val => setSelectedVariant(Number(val))} value={selectedVariant?.toString()}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn biến thể" />
              </SelectTrigger>
              <SelectContent>
                {currentVariants.map(v => (
                  <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Quantity */}
          <div>
            <Label>Số lượng</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
            />
          </div>
          {/* Price */}
          <div>
            <Label>Giá nhập</Label>
            <Input
              type="number"
              min={0}
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="flex justify-end mb-4">
          <Button onClick={addEntry}>Thêm vào danh sách</Button>
        </div>

        {/* Search Bar */}
        {entries.length > 0 && (
          <div className="mb-4">
            <Input
              placeholder="Tìm kiếm sản phẩm hoặc biến thể..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Entries Table */}
        {entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table-auto w-full border">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Sản phẩm</th>
                  <th className="border px-2 py-1">Biến thể</th>
                  <th className="border px-2 py-1">SL</th>
                  <th className="border px-2 py-1">Giá</th>
                  <th className="border px-2 py-1">Thành tiền</th>
                  <th className="border px-2 py-1">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {displayedEntries.map(e => (
                  <tr key={e.id}>
                    <td className="border px-2 py-1">{findName(products, e.productId)}</td>
                    <td className="border px-2 py-1">{findName(products.find(p => p.id === e.productId)?.variants || [], e.variantId)}</td>
                    <td className="border px-2 py-1 text-center">{e.quantity}</td>
                    <td className="border px-2 py-1 text-right">{e.price.toLocaleString()}</td>
                    <td className="border px-2 py-1 text-right">{(e.quantity * e.price).toLocaleString()}</td>
                    <td className="border px-2 py-1 text-center">
                      <Button variant="destructive" size="sm" onClick={() => removeEntry(e.id)}>Xóa</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}