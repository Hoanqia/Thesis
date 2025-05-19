'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const categories = [
  {
    name: 'Laptop',
    image: '/Homepage/laptop.jpg',
    category: 'laptop',
  },
  {
    name: 'Điện thoại',
    image: '/Homepage/iphone.webp',
    category: 'phone',
  },
  {
    name: 'Tablet',
    image: '/Homepage/tablet.jpg',
    category: 'tablet',
  },
  {
    name: 'Phụ kiện',
    image: '/Homepage/headphone.jpg',
    category: 'accessory',
  },
];


export default function CategoryGrid() {
  const router = useRouter();

  return (
    <section className="py-10 px-4">
      <h2 className="text-2xl font-bold mb-6 text-center">Danh mục sản phẩm</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {categories.map((item) => (
          <div
            key={item.category}
            className="cursor-pointer hover:scale-105 transition transform duration-300"
            // onClick={() => router.push(`/products?category=${item.category}`)}
          >
            <div className="w-full h-56 relative">
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                className="object-cover rounded-lg"
              />
            </div>
            <h3 className="text-center mt-2 font-medium">{item.name}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}
