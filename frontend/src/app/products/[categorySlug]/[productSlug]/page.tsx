'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { reviewApi , Review} from '@/features/reviews/api/reviewApi';
 import ReviewSection from '@/features/products/components/ReviewSection';
import RecommendationCarousel from '@/features/recommendations/components/RecommendationCarousel';

import {
  Product,
  fetchProductBySlug,
} from '@/features/products/api/productApi';
import { variantApi, Variant, SpecValue } from '@/features/variants/api/variantApi';

interface PageProps {
  params: {
    categorySlug: string;
    productSlug: string; // Đây chính là product slug
  };
}

export default function Page() {
   const { categorySlug, productSlug } = useParams() as {
    categorySlug: string;
    productSlug: string;
  };
    const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);


   const handleAdd = async () => {
    if (!selectedVariant) {
      console.warn('Chưa chọn biến thể nào');
      return;
    }
    await addItem(selectedVariant.id, 1);
    // TODO: show toast hoặc thông báo thành công
  };
  
  // Khi component mount, fetch thông tin product (theo slug), sau đó fetch variants theo product.id
  useEffect(() => {
    async function loadData() {
      try {
        // 1) Lấy product theo slug
        const fetchedProduct = await fetchProductBySlug(productSlug);
        setProduct(fetchedProduct);

        // 2) Tiếp tục fetch variants theo product.id (là số)
        const dataVariants = await variantApi.fetchByProduct(fetchedProduct.id);
        setVariants(dataVariants);

        // 3) Mặc định chọn variant đầu tiên (nếu có)
        if (dataVariants.length > 0) {
          setSelectedVariant(dataVariants[0]);
          setMainImage(dataVariants[0].image ?? null);
        }

         const data = await reviewApi.getReviews(fetchedProduct.id);
        setReviews(data);
      } catch (err) {
        console.error('Không thể load sản phẩm hoặc biến thể:', err);
      }
    }

    loadData();
  }, [productSlug]);

  if (!product) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="text-lg">Đang tải sản phẩm...</span>
      </div>
    );
  }
  const renderStars = (averageRate: number | undefined) => {
  const stars = [];
  const rate = averageRate || 0;
  const fullStars = Math.floor(rate);
  const hasHalfStar = rate - fullStars >= 0.25 && rate - fullStars <= 0.75;
  const totalStars = hasHalfStar ? fullStars + 1 : fullStars;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      // ⭐ Full star
      stars.push(
        <svg
          key={`star-full-${i}`}
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 inline text-yellow-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.176 0l-3.368 2.447c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.006 
            9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      );
    } else if (i === fullStars && hasHalfStar) {
      // 🌓 Half star
      stars.push(
        <svg
          key={`star-half-${i}`}
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 inline text-yellow-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <defs>
            <linearGradient id={`halfGrad-${i}`}>
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#halfGrad-${i})`}
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.176 0l-3.368 2.447c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.006 
              9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"
          />
        </svg>
      );
    } else {
      // ⚪ Empty star
      stars.push(
        <svg
          key={`star-empty-${i}`}
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 inline text-gray-300"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.176 0l-3.368 2.447c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.006 
            9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      );
    }
  }

  return stars;
};


  // Tạo mảng thumbnails từ các variant có image
 const thumbnails: string[] = variants
  .map((v) => getFullImageUrl(v.image))
  .filter((url) => url !== '/placeholder.jpg');

  // Thông tin stock của variant đang chọn
  const stockText =
    selectedVariant !== null
      ? `${selectedVariant.available_stock_for_sale} item(s) in stock`
      : 'Out of stock';

  // Hàm lấy chuỗi hiển thị cho mỗi specValue
  const formatSpecValue = (sv: SpecValue) => {
    if (sv.specification.data_type === 'option' && sv.spec_options) {
      return sv.spec_options.value;
    }
    if (sv.value_int !== null) {
      return `${sv.value_int} ${sv.specification.unit ?? ''}`.trim();
    }
    if (sv.value_decimal !== null) {
      return `${sv.value_decimal} ${sv.specification.unit ?? ''}`.trim();
    }
    if (sv.value_text) {
      return sv.value_text;
    }
    return '';
  };

  // Hàm xây label cho từng variant: "Màu – Ram <giá trị> – Dung lượng bộ nhớ"
  const getSpecValue = (variant: Variant, specName: string): string | null => {
      // console.log('Check specs:', variant.variant_spec_values.map(sv => sv.specification.name));
    const found = variant.variant_spec_values?.find(
      (sv) => sv.specification.name.toLowerCase() === specName.toLowerCase()
    );
    
    if (found) {
    const formatted = formatSpecValue(found);
    console.log(`Spec "${specName}":`, formatted);
    return formatted;
  } else {
    console.log(`Spec "${specName}" not found.`);
    return null;
  }
  };

  const buildVariantLabel = (variant: Variant) => {
    const colorValue = getSpecValue(variant, 'Màu sắc');
    const ramValue = getSpecValue(variant, 'RAM');
    const storageValue = getSpecValue(variant, 'Dung lượng bộ nhớ');

    const color = colorValue ?? 'N/A';
    const ram = ramValue ? `Ram ${ramValue}` : 'N/A';
    const storage = storageValue ?? 'N/A';

    return `${color} – ${ram} – ${storage}`;
  };


  function getFullImageUrl(path?: string) {
    if (!path) return "/placeholder.jpg";
    if (path.startsWith("http")) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}/storage/${path}`;
  }

   const addToCartButtonContent = (!selectedVariant || (selectedVariant.available_stock_for_sale ?? 0) <= 0)
        ? 'Mặt hàng này đã hết'
        : 'Thêm vào giỏ hàng';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ===== Phần Ảnh sản phẩm ===== */}
        <div className="flex">
          <div className="flex flex-col space-y-4 mr-4">
            {thumbnails.map((thumbUrl, idx) => (
              <div
                key={idx}
                className={`w-20 h-20 border rounded overflow-hidden cursor-pointer ${
                  thumbUrl === mainImage ? 'ring-2 ring-indigo-500' : ''
                }`}
                onClick={() => setMainImage(thumbUrl)}
              >
               <Image
                src={thumbUrl}
                alt={`Thumbnail ${idx + 1}`}
                width={80}
                height={80}
                className="object-cover"
              />

              </div>
            ))}
          </div>

          <div className="relative w-full h-[500px] overflow-hidden">
            {mainImage ? (
              <div
                className="w-full h-full cursor-zoom-in overflow-hidden"
                onClick={() => setIsZoomed(true)}
              >
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-contain transition-transform duration-200 ease-in-out hover:scale-110"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gray-100">
                <span>No Image</span>
              </div>
            )}

            {isZoomed && mainImage && (
              <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
                <div className="relative w-4/5 h-4/5">
                  <Image
                    src={mainImage}
                    alt={product.name + ' zoomed'}
                    fill
                    className="object-contain"
                  />
                  <button
                    className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2"
                    onClick={() => setIsZoomed(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

         {/* ===== Thông tin sản phẩm ===== */}
        <div className="flex flex-col space-y-6">
          {/* ==== Tên sản phẩm & 5 sao placeholder ==== */}
          <div>
            <h1 className="text-3xl font-semibold">{product.name}</h1>
            <div className="mt-2">
                {renderStars(parseFloat(product.reviews_avg_rate || '0'))}
                <span className="ml-2 text-gray-500">
                  ({product.reviews_count ?? 0} reviews)
                </span>
              </div>
            <div className="mt-4 text-gray-700 whitespace-pre-line">
              {product.description}
            </div>
          </div>

          {/* Giá (lấy từ selectedVariant) */}
          <div className="flex items-center space-x-4">
            <span className="text-2xl font-bold text-gray-900">
              {selectedVariant
                ? (selectedVariant.price).toLocaleString('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  })
                : 'Chưa có giá'}
            </span>
            {selectedVariant && selectedVariant.discount > 0 && (
              <span className="text-gray-500 line-through">
                {selectedVariant.price.toLocaleString('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                })}
              </span>
            )}
          </div>

          {/* Stock */}
          <div>
            <span className="font-medium">Stock: </span>
            <span className="text-gray-700">{stockText}</span>
          </div>

          {/* Phần chọn variant: hiển thị “Màu – Ram <giá trị> – Dung lượng bộ nhớ” */}
          <div>
            <h2 className="font-medium mb-2">Chọn Biến Thể:</h2>
            <div className="flex flex-wrap gap-2">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  className={`px-3 py-1 rounded-lg text-sm ${
                                        selectedVariant?.id === variant.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    } ${
                                        (variant.available_stock_for_sale ?? 0) <= 0
                                            ? 'opacity-50 cursor-not-allowed'
                                            : ''
                                    }`}
                  onClick={() => {
                   // Chỉ cho phép chọn nếu có hàng khả dụng
                                        if ((variant.available_stock_for_sale ?? 0) > 0) {
                                            setSelectedVariant(variant);
                                            // Sử dụng thuộc tính image_url đã có (nếu có) hoặc image
                                            setMainImage( variant.image ?? null);
                                        } else {
                                            alert(`Biến thể "${buildVariantLabel(variant)}" hiện đã hết hàng.`);
                                        }
                                    }}
                                    disabled={(variant.available_stock_for_sale ?? 0) <= 0} // Disable variant button if out of stock
                >
                  {buildVariantLabel(variant)}
                </button>
              ))}
            </div>
          </div>

          {/* Thông số chi tiết của variant đang chọn */}
          {selectedVariant && (
            <div className="space-y-2">
              <h2 className="font-medium">Thông số Biến Thể:</h2>
              <div className="text-gray-700">
                {selectedVariant.variant_spec_values?.map((sv) => (
                  <div key={sv.id} className="flex space-x-2">
                    <span className="font-semibold">{sv.specification.name}:</span>
                    <span>{formatSpecValue(sv)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Button Add to Cart */}
          <button onClick={handleAdd}  
           disabled={!selectedVariant || (selectedVariant.available_stock_for_sale ?? 0) <= 0} // Sửa lỗi ở đây
          className={`w-full py-3 rounded-lg transition ${
                            selectedVariant && (selectedVariant.available_stock_for_sale ?? 0) > 0
                                ? 'bg-black text-white hover:bg-gray-800'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}>
            {addToCartButtonContent}
          </button>
        </div>

       <div className="lg:col-span-2 mt-12">
    <RecommendationCarousel categorySlug={categorySlug} productSlug={productSlug}/>
  </div>
      </div>
        {/* === Phần đánh giá & bình luận === */}
        <ReviewSection reviews={reviews} review_counts={product.reviews_count ?? 0} review_avg_rate={parseFloat(product.reviews_avg_rate ?? '0')} />
    </div>
  );
}
