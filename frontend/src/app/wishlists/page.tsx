'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { wishlistApi, WishlistItem, VariantSpecValue } from '@/features/wishlists/api/wishlistApi';

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await wishlistApi.fetchWishlist();
      setWishlistItems(items);
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách yêu thích. Vui lòng thử lại.');
      toast.error('Có lỗi xảy ra khi tải wishlist!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleDelete = useCallback(async (id: number) => {
    await toast.promise(
      wishlistApi.deleteWishlistItem(id),
      {
        loading: 'Đang xóa sản phẩm...',
        success: () => {
          setWishlistItems(prev => prev.filter(i => i.id !== id));
          return 'Xóa thành công!';
        },
        error: () => 'Xóa thất bại!',
      }
    );
  }, []);

  const handleAddToCart = useCallback(async (id: number) => {
    await toast.promise(
      wishlistApi.addWishlistItemToCart(id),
      {
        loading: 'Đang thêm vào giỏ...',
        success: () => 'Đã thêm vào giỏ!',
        error: () => 'Thêm vào giỏ thất bại!',
      }
    );
    setWishlistItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleAddAllToCart = useCallback(async () => {
    if (!wishlistItems.length) return;
    await toast.promise(
      wishlistApi.addAllWishlistToCart(),
      {
        loading: 'Đang thêm toàn bộ...',
        success: () => {
          setWishlistItems([]);
          return 'Đã thêm toàn bộ!';
        },
        error: () => 'Thất bại khi thêm tất cả!',
      }
    );
  }, [wishlistItems.length]);

  const renderSpecs = (specs?: VariantSpecValue[]) => {
    if (!specs?.length) return null;
    return (
      <div className="text-sm text-gray-600 mt-1 break-words">
        {specs.map((s, idx) => (
          <span key={s.id} className="mr-2">
            {s.specification?.name ?? 'Thông số'}:{' '}
            <span className="font-medium">
              {s.spec_options?.value ?? s.value_text ?? s.value_int ?? 'N/A'}
            </span>
            {idx < specs.length - 1 && ','}
          </span>
        ))}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p>Đang tải...</p></div>;
  if (error) return <div className="flex items-center justify-center h-64"><p className="text-red-600">{error}</p></div>;

  const formatVND = (value?: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value ?? 0);

  return (
    <>
      <Toaster position="top-right" />
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Wishlist của bạn</h1>

        {wishlistItems.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleAddAllToCart}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Thêm tất cả vào giỏ
            </button>
          </div>
        )}

        {wishlistItems.length === 0 ? (
          <div className="text-center py-20">
            <p>Danh sách yêu thích trống.</p>
            <Link href="/products" className="text-blue-600 hover:underline">
              Duyệt sản phẩm
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded">
            <table className="table-fixed w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-2/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wishlistItems.map(item => {
                  const priceValue = Number(item.variant?.price ?? 0);
                  return (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-normal flex items-start">
                        <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={item.variant?.image_url ?? '/fallback-image.png'}
                            alt={item.variant?.full_name ?? 'No Image'}
                            fill
                            unoptimized
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{item.variant?.full_name}</div>
                          {/* {renderSpecs(item.variant?.variant_spec_values)} */}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {formatVND(priceValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.variant?.stock && item.variant.stock > 0 ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">In Stock</span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Out of Stock</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                        <button
                          onClick={() => handleAddToCart(item.id)}
                          className="flex items-center justify-center bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded"
                        >
                          Add to Cart <ShoppingCart size={16} className="ml-2" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                        >
                          Remove <Trash2 size={16} className="ml-2" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
// // frontend/src/app/wishlists/WishlistClient.tsx
// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import toast, { Toaster } from 'react-hot-toast';
// import Image from 'next/image';
// import Link from 'next/link';
// import {
//   wishlistApi,
//   WishlistItem,
//   VariantSpecValue,
// } from '@/features/wishlists/api/wishlistApi';

// const PAGE_SIZE = 9;

// export default function WishlistPage() {
//   const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const fetchWishlist = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const items = await wishlistApi.fetchWishlist();
//       setWishlistItems(items);
//     } catch (err) {
//       console.error(err);
//       setError('Không thể tải danh sách yêu thích. Vui lòng thử lại.');
//       toast.error('Có lỗi xảy ra khi tải wishlist!');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchWishlist();
//   }, [fetchWishlist]);

//   const handleDelete = useCallback(async (id: number) => {
//     await toast.promise(
//       wishlistApi.deleteWishlistItem(id),
//       {
//         loading: 'Đang xóa sản phẩm...',
//         success: () => {
//           setWishlistItems((prev) => prev.filter((i) => i.id !== id));
//           return 'Xóa thành công!';
//         },
//         error: () => 'Xóa thất bại!',
//       }
//     );
//   }, []);

//   const handleAddToCart = useCallback(async (id: number) => {
//     await toast.promise(
//       wishlistApi.addWishlistItemToCart(id),
//       {
//         loading: 'Đang thêm vào giỏ...',
//         success: () => 'Đã thêm vào giỏ!',
//         error: () => 'Thêm vào giỏ thất bại!',
//       }
//     );
//     setWishlistItems((prev) => prev.filter((i) => i.id !== id));
//   }, []);

//   const handleAddAllToCart = useCallback(async () => {
//     if (!wishlistItems.length) return;
//     await toast.promise(
//       wishlistApi.addAllWishlistToCart(),
//       {
//         loading: 'Đang thêm toàn bộ...',
//         success: () => {
//           setWishlistItems([]);
//           return 'Đã thêm toàn bộ!';
//         },
//         error: () => 'Thất bại khi thêm tất cả!',
//       }
//     );
//   }, [wishlistItems.length]);

//   // Render specs from snake_case prop variant_spec_values
//   const renderSpecs = (specs?: VariantSpecValue[]) => {
//     if (!specs?.length) return null;
//     return (
//       <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
//         {specs.map((s, idx) => (
//           <span key={s.id} className="mr-2">
//             {s.specification?.name ?? 'Thông số'}:{' '}
//             <span className="font-medium">
//               {s.spec_options?.value ?? s.value_text ?? s.value_int ?? 'N/A'}
//             </span>
//             {idx < specs.length - 1 && ','}
//           </span>
//         ))}
//       </div>
//     );
//   };

//   if (loading)
//     return (
//       <div className="flex items-center justify-center h-64">
//         <p>Đang tải...</p>
//       </div>
//     );

//   if (error)
//     return (
//       <div className="flex items-center justify-center h-64">
//         <p className="text-red-600">{error}</p>
//       </div>
//     );

//   return (
//     <>
//       <Toaster position="top-right" />
//       <div className="container mx-auto p-6 space-y-6">
//         <h1 className="text-2xl font-bold">Wishlist của bạn</h1>

//         {wishlistItems.length > 0 && (
//           <div className="flex justify-end">
//             <button
//               onClick={handleAddAllToCart}
//               className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
//             >
//               Thêm tất cả vào giỏ
//             </button>
//           </div>
//         )}

//         {wishlistItems.length === 0 ? (
//           <div className="text-center py-20">
//             <p>Danh sách yêu thích trống.</p>
//             <Link href="/products" className="text-blue-600 hover:underline">
//               Duyệt sản phẩm
//             </Link>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//             {wishlistItems.map((item) => (
//               <div
//                 key={item.id}
//                 className="border rounded p-4 flex flex-col"
//               >
//                 <div className="relative w-full h-40 mb-4">
//                   <Image
//                     src={item.variant?.image_url ?? '/fallback-image.png'}
//                     alt={item.variant?.full_name ?? 'No Image'}
//                     fill
//                     unoptimized
//                     style={{ objectFit: 'cover', borderRadius: '0.5rem' }}
//                   />
//                 </div>
//                 <h2 className="font-semibold">
//                   {item.variant?.full_name}
//                 </h2>
//                 {/* pass snake-case prop */}
//                 {renderSpecs(item.variant?.variant_spec_values)}
//                 <div className="mt-auto flex space-x-2 pt-4">
//                   <button
//                     onClick={() => handleAddToCart(item.id)}
//                     className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1 rounded"
//                   >
//                     Giỏ hàng
//                   </button>
//                   <button
//                     onClick={() => handleDelete(item.id)}
//                     className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1 rounded"
//                   >
//                     Xóa
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </>
//   );
// }
