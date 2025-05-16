import Image from "next/image";


type LaptopCardProps = {
  id: number;
  name: string;
  image: string;
  ram: string;
  storage: string;
  price: number;
};
export default function LaptopCard({ name, image, ram, storage, price }: LaptopCardProps) {
  return (
    <div className="border p-4 rounded shadow-sm">
      <img src={image} alt={name} className="w-full h-auto" />
      <h3 className="mt-2">{name}</h3>
      <div className="flex gap-2 my-2">
        <span className="px-2 py-1 border rounded">{`RAM ${ram}`}</span>
        <span className="px-2 py-1 border rounded">{storage}</span>
      </div>
      <p className="text-red-500 font-bold">{price.toLocaleString()} ₫</p>
    </div>
  );
}
