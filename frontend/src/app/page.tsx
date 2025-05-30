// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import HeroSection from "@/components/common/Hero/HeroSection";
import toast from 'react-hot-toast';

import CategoryGrid from '@/components/common/CategoryGrid';

export default function HomePage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (errorParam === 'account_locked') {
      toast.error('Tài khoản của bạn đã bị khóa, không thể đăng nhập.');
    }
  }, [errorParam]);

  return (
    <div className="space-y-16">
      <HeroSection />
          <CategoryGrid />   
    </div>
  );
}
