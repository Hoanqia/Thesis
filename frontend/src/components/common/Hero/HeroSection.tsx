


'use client';
import styles from '@/components/common/Hero/Hero.module.scss';

export default function HeroSection() {
  return (
    <section
      className="relative h-[600px] w-full flex items-center justify-center text-center px-6"
      style={{
        backgroundImage: "url('/HeroSection/hero-section-4.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Lớp phủ tối để tăng độ tương phản */}
      <div className="absolute inset-0 bg-black/20 z-0" />

      {/* Nội dung hero */}
      <div className="relative z-10 max-w-4xl text-white">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Technology for your convenience
        </h1>
        <p className="text-lg md:text-xl mb-6">
          For your job, study or housework, everything you need is here
        </p>
        <button className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition">
          Shop Now
        </button>
      </div>
    </section>
  );
}
