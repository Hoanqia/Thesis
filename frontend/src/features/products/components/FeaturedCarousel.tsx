"use client";

import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from 'swiper/react';
import SwiperCore from 'swiper';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';

// Activa los módulos de Swiper
SwiperCore.use([Navigation, Pagination, Autoplay]);
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import ProductCard, { Product } from "./ProductCard";

type ApiVariant = { price: string; discount: string };
type ApiProduct = {
  id: number;
  name: string;
  image: string | null;
  variants: ApiVariant[];
};

export default function FeaturedCarousel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/featured-products")
      .then((res) => {
        if (!res.ok) throw new Error("Lấy dữ liệu thất bại");
        return res.json();
      })
      .then((json) => {
        const mapped: Product[] = json.data.map((p: ApiProduct) => {
          const v = p.variants[0];
          const priceNum = parseFloat(v.price) - parseFloat(v.discount);
          return {
            id: p.id,
            name: p.name,
            image: p.image || "/placeholder.jpg",
            price: Math.round(priceNum),
          };
        });
        setProducts(mapped);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Đang tải carousel…</p>;
  if (error) return <p className="text-red-500">Lỗi: {error}</p>;

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Sản phẩm nổi bật</h2>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        slidesPerView={1}
        spaceBetween={16}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        breakpoints={{
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 4 },
        }}
      >
        {products.map((product) => (
          <SwiperSlide key={product.id}>
            <ProductCard product={product} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
