'use client';

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { Product } from "@/features/products/api/productApi";
import { Variant } from "@/features/variants/api/variantApi";
import { axiosRequest } from "@/lib/axiosRequest";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    function getFullImageUrl(path?: string) {
        if (!path) return "/placeholder.png";
        if (path.startsWith("http")) return path;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
        return `${baseUrl}/storage/${path}`;
    }
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const res = await axiosRequest<{ data: Variant[] }>(`${product.id}/variants`, "GET");
        setVariants(res.data);
        if (res.data.length > 0) setSelectedVariant(res.data[0]);
      } catch (error) {
        console.error("Failed to fetch variants", error);
      }
    };

    fetchVariants();
  }, [product.id]);

  return (
    <Card className="w-full max-w-sm shadow-lg rounded-2xl p-4">
      <CardContent className="flex flex-col items-center">
        <Image
          src={getFullImageUrl(selectedVariant?.image) || "/placeholder.png"}
          alt={product.name}
          width={200}
          height={200}
          className="rounded-xl object-contain"
        />

        <h2 className="text-lg font-semibold mt-2">{product.name}</h2>

        <p className="text-primary font-bold mt-1">
          {selectedVariant
            ? (selectedVariant.price - selectedVariant.discount).toLocaleString("vi-VN", { style: "currency", currency: "VND" })
            : "Đang tải giá..."}
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          {variants.map((variant) => (
            <Button
              key={variant.id}
              size="sm"
              variant={selectedVariant?.id === variant.id ? "default" : "outline"}
              onClick={() => setSelectedVariant(variant)}
            >
              {variant.sku}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
