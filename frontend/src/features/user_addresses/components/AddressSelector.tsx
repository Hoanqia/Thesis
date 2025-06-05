import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/checkbox';
import { addressApi, UserAdresss, createAddressPayload } from '@/features/user_addresses/api/addressApi';
import { Button } from '@/components/ui/Button';

// Schema validation không thay đổi
const addressSchema = z.object({
  province: z.string().nonempty({ message: 'Chọn tỉnh/thành phố' }),
  district: z.string().nonempty({ message: 'Chọn quận/huyện' }),
  ward: z.string().nonempty({ message: 'Chọn phường/xã' }),
  street_address: z.string().nonempty({ message: 'Nhập số nhà, tên đường' }),
  phone: z.string().min(10, { message: 'Số điện thoại phải có ít nhất 10 số' }),
  is_default: z.boolean().optional(),
});
type AddressForm = z.infer<typeof addressSchema>;

interface AddressSelectorProps {
  onSuccess?: (addr: UserAdresss) => void;
  onCancel?: () => void;
}

export default function AddressSelector({ onSuccess, onCancel }: AddressSelectorProps) {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const form = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      province: '',
      district: '',
      ward: '',
      street_address: '',
      phone: '',
      is_default: false,
    },
  });

  // Load list
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(r => r.json())
      .then(setProvinces)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const code = form.getValues('province');
    if (!code) return;
    fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`)
      .then(r => r.json())
      .then(data => setDistricts(data.districts || []))
      .catch(console.error);

    form.setValue('district', '');
    form.setValue('ward', '');
    setWards([]);
  }, [form.watch('province')]);

  useEffect(() => {
    const code = form.getValues('district');
    if (!code) return;
    fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`)
      .then(r => r.json())
      .then(data => setWards(data.wards || []))
      .catch(console.error);

    form.setValue('ward', '');
  }, [form.watch('district')]);

  const onSubmit = async (data: AddressForm) => {
    // Tính tên từ code
    const prov = provinces.find(p => String(p.code) === data.province);
    const dist = districts.find(d => String(d.code) === data.district);
    const wrd  = wards.find(w => String(w.code) === data.ward);

    const payload: createAddressPayload = {
      province: data.province,
      province_name: prov?.name || '',
      district: data.district,
      district_name: dist?.name || '',
      ward: data.ward,
      ward_name: wrd?.name || '',
      street_address: data.street_address,
      phone: data.phone,
      is_default: data.is_default ? 1 : 0,
    };

    try {
      const result = await addressApi.create(payload);
      onSuccess?.(result);
      form.reset();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Tỉnh/TP */}
        <FormField control={form.control} name="province" render={({ field }) => (
          <FormItem>
            <FormLabel>Tỉnh/Thành phố</FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Chọn tỉnh/TP" /></SelectTrigger>
                <SelectContent>
                  {provinces.map(p => (
                    <SelectItem key={p.code} value={String(p.code)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>
        )}/>

        {/* Quận/Huyện */}
        <FormField control={form.control} name="district" render={({ field }) => (
          <FormItem>
            <FormLabel>Quận/Huyện</FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Chọn quận/huyện" /></SelectTrigger>
                <SelectContent>
                  {districts.map(d => (
                    <SelectItem key={d.code} value={String(d.code)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>
        )}/>

        {/* Phường/Xã */}
        <FormField control={form.control} name="ward" render={({ field }) => (
          <FormItem>
            <FormLabel>Phường/Xã</FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Chọn phường/xã" /></SelectTrigger>
                <SelectContent>
                  {wards.map(w => (
                    <SelectItem key={w.code} value={String(w.code)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>
        )}/>

        {/* Số nhà, tên đường */}
        <FormField control={form.control} name="street_address" render={({ field }) => (
          <FormItem>
            <FormLabel>Số nhà, Tên đường</FormLabel>
            <FormControl>
              <Input placeholder="Nhập số nhà, tên đường" {...field} />
            </FormControl>
          </FormItem>
        )}/>

        {/* Số điện thoại */}
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Số điện thoại</FormLabel>
            <FormControl>
              <Input placeholder="Nhập số điện thoại" {...field} />
            </FormControl>
          </FormItem>
        )}/>

        {/* Đặt làm mặc định */}
        <FormField control={form.control} name="is_default" render={({ field }) => (
          <FormItem className="flex items-center space-x-2">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="m-0">Đặt làm địa chỉ mặc định</FormLabel>
          </FormItem>
        )}/>

        {/* Nút Lưu/Hủy */}
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button variant="secondary" type="button" onClick={onCancel}>
              Hủy
            </Button>
          )}
          <Button type="submit">Lưu</Button>
        </div>
      </form>
    </Form>
  );
}

// import React, { useEffect, useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { z } from 'zod';
// import { zodResolver } from '@hookform/resolvers/zod';
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
// } from '@/components/ui/form';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { Input } from '@/components/ui/Input';
// import { Checkbox } from '@/components/ui/checkbox';
// import { addressApi, UserAdresss } from '@/features/user_addresses/api/addressApi';
// import { Button } from '@/components/ui/Button';

// // ✅ Schema validation cập nhật:
// const addressSchema = z.object({
//   province: z.string().nonempty({ message: 'Chọn tỉnh/thành phố' }),
//   district: z.string().nonempty({ message: 'Chọn quận/huyện' }),
//   ward: z.string().nonempty({ message: 'Chọn phường/xã' }),
//   street_address: z.string().nonempty({ message: 'Nhập số nhà, tên đường' }),
//   phone: z.string().min(10, { message: 'Số điện thoại phải có ít nhất 10 số' }),
//   is_default: z.boolean().optional(),
// });

// type AddressForm = z.infer<typeof addressSchema>;

// interface AddressSelectorProps {
//   onSuccess?: (addr: UserAdresss) => void;
//   onCancel?: () => void;
// }

// export default function AddressSelector({ onSuccess, onCancel }: AddressSelectorProps) {
//   const [provinces, setProvinces] = useState<any[]>([]);
//   const [districts, setDistricts] = useState<any[]>([]);
//   const [wards, setWards] = useState<any[]>([]);
  
//   const form = useForm<AddressForm>({
//     resolver: zodResolver(addressSchema),
//     defaultValues: {
//       province: '',
//       district: '',
//       ward: '',
//       street_address: '',
//       phone: '',
//       is_default: false,
//     },
//   });

//   useEffect(() => {
//     fetch('https://provinces.open-api.vn/api/p/')
//       .then((res) => res.json())
//       .then(setProvinces)
//       .catch(console.error);
//   }, []);

//   useEffect(() => {
//     const code = form.getValues('province');
//     if (!code) return;
//     fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`)
//       .then((res) => res.json())
//       .then((data) => setDistricts(data.districts || []))
//       .catch(console.error);
//     form.setValue('district', '');
//     form.setValue('ward', '');
//     setWards([]);
//   }, [form.watch('province')]);

//   useEffect(() => {
//     const code = form.getValues('district');
//     if (!code) return;
//     fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`)
//       .then((res) => res.json())
//       .then((data) => setWards(data.wards || []))
//       .catch(console.error);
//     form.setValue('ward', '');
//   }, [form.watch('district')]);

//   const onSubmit = async (data: AddressForm) => {
//     try {
//       const result = await addressApi.create(data as any);
//       onSuccess?.(result);
//       form.reset();
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   return (
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//         {/* Tỉnh/TP */}
//         <FormField
//           control={form.control}
//           name="province"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Tỉnh/Thành phố</FormLabel>
//               <FormControl>
//                 <Select onValueChange={field.onChange} value={field.value}>
//                   <SelectTrigger>
//                     <SelectValue placeholder="Chọn tỉnh/TP" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {provinces.map((p) => (
//                       <SelectItem key={p.code} value={String(p.code)}>
//                         {p.name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </FormControl>
//             </FormItem>
//           )}
//         />

//         {/* Quận/Huyện */}
//         <FormField
//           control={form.control}
//           name="district"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Quận/Huyện</FormLabel>
//               <FormControl>
//                 <Select onValueChange={field.onChange} value={field.value}>
//                   <SelectTrigger>
//                     <SelectValue placeholder="Chọn quận/huyện" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {districts.map((d) => (
//                       <SelectItem key={d.code} value={String(d.code)}>
//                         {d.name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </FormControl>
//             </FormItem>
//           )}
//         />

//         {/* Phường/Xã */}
//         <FormField
//           control={form.control}
//           name="ward"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Phường/Xã</FormLabel>
//               <FormControl>
//                 <Select onValueChange={field.onChange} value={field.value}>
//                   <SelectTrigger>
//                     <SelectValue placeholder="Chọn phường/xã" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {wards.map((w) => (
//                       <SelectItem key={w.code} value={String(w.code)}>
//                         {w.name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </FormControl>
//             </FormItem>
//           )}
//         />

//         {/* Số nhà, tên đường */}
//         <FormField
//           control={form.control}
//           name="street_address"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Số nhà, Tên đường</FormLabel>
//               <FormControl>
//                 <Input placeholder="Nhập số nhà, tên đường" {...field} />
//               </FormControl>
//             </FormItem>
//           )}
//         />

//         {/* Số điện thoại */}
//         <FormField
//           control={form.control}
//           name="phone"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Số điện thoại</FormLabel>
//               <FormControl>
//                 <Input placeholder="Nhập số điện thoại" {...field} />
//               </FormControl>
//             </FormItem>
//           )}
//         />

//         {/* Đặt làm mặc định */}
//         <FormField
//           control={form.control}
//           name="is_default"
//           render={({ field }) => (
//             <FormItem className="flex items-center space-x-2">
//               <FormControl>
//                 <Checkbox
//                   checked={field.value}
//                   onCheckedChange={field.onChange}
//                 />
//               </FormControl>
//               <FormLabel className="m-0">Đặt làm địa chỉ mặc định</FormLabel>
//             </FormItem>
//           )}
//         />

//         {/* Nút */}
//         <div className="flex justify-end space-x-2">
//           {onCancel && (
//             <Button variant="secondary" type="button" onClick={onCancel}>
//               Hủy
//             </Button>
//           )}
//           <Button type="submit">Lưu</Button>
//         </div>
//       </form>
//     </Form>
//   );
// }
