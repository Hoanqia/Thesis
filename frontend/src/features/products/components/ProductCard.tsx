import Image from "next/image";

export type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
};

type ProductCardProps = {
  product: Product;
};
export default function ProductCard({ product }: ProductCardProps) {
    console.log("ProductCard nhận được:", product); // 👈 Thêm dòng này để debug
    if (!product) {
    console.warn("ProductCard nhận undefined product");
    return <div className="border p-4 rounded text-red-500">Không có dữ liệu sản phẩm</div>;
  }
  return (
    <div className="border p-4 rounded shadow-sm">
      <Image
        src={product.image || "/placeholder.jpg"} // fallback an toàn
        alt={product.name}
        width={300}
        height={300}
        className="object-cover w-full h-auto rounded"
      />
      <h3 className="mt-2 font-semibold">{product.name}</h3>
      <p className="text-red-500">
        {product.price.toLocaleString("vi-VN")} đ
      </p>
    </div>
  );
}
