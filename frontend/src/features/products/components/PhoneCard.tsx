import Image from "next/image";

type PhoneCardProps = {
  id: number;
  name: string;
  image: string;
  variants: { id: number; label: string; price: number }[];
};
import { useState } from "react";

export default function PhoneCard({ id, name, image, variants }: PhoneCardProps) {
  const [selected, setSelected] = useState(variants[0]);
  return (
    <div className="border p-4 rounded shadow-sm">
      <img src={image} alt={name} className="w-full h-auto" />
      <h3>{name}</h3>
      <div className="flex gap-2 my-2">
        {variants.map(v => (
          <button
            key={v.id}
            onClick={() => setSelected(v)}
            className={`px-2 py-1 border rounded ${v.id === selected.id ? 'bg-blue-500 text-white' : ''}`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <p className="text-red-500 font-bold">{selected.price.toLocaleString()} ₫</p>
    </div>
  );
}
