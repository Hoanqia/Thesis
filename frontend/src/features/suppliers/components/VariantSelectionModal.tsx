import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Sử dụng alias @/ cho các import nội bộ của dự án
import { supplierApi, VariantFromSupplier } from '@/features/suppliers/api/supplierApi'; 
import { variantApi, Variant } from '@/features/variants/api/variantApi'; 
import { Input } from "@/components/ui/Input"; 
import { Checkbox } from "@/components/ui/checkbox"; 
import { Button } from "@/components/ui/Button"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; 
import { ScrollArea } from "@/components/ui/scroll-area"; 
import { XCircle } from 'lucide-react'; // Icon XCircle từ lucide-react (external, không cần thay đổi)

// Định nghĩa kiểu dữ liệu cho biến thể được chọn trong modal
interface SelectedVariantData {
  variant: Variant; // Thông tin variant gốc
  current_purchase_price: number;
  variant_supplier_sku: string; // Cho phép là string rỗng hoặc null, nhưng sẽ chuyển về null nếu không nhập
  is_active: boolean;
  // Thêm 'id' để xác định đây là một VariantFromSupplier hiện có (khi chỉnh sửa)
  // Hoặc dùng để biết là một bản ghi mới (khi tạo)
  id?: number; // ID của VariantFromSupplier nếu tồn tại
}

interface VariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: number;
  mode: 'create' | 'update';
  initialSelectedVariants: VariantFromSupplier[]; // Dữ liệu VariantFromSupplier hiện có (chỉ cho mode 'update')
  onConfirm: (selectedVariants: {
    variant_id: number;
    current_purchase_price: number;
    variant_supplier_sku?: string | null;
    is_active?: boolean;
  }[]) => Promise<void>;
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
  isOpen,
  onClose,
  supplierId,
  mode,
  initialSelectedVariants,
  onConfirm,
}) => {
  const [allVariants, setAllVariants] = useState<Variant[]>([]); // Danh sách tất cả biến thể sản phẩm
  const [selectedVariantsData, setSelectedVariantsData] = useState<SelectedVariantData[]>([]); // Danh sách biến thể đã chọn
  const [searchTerm, setSearchTerm] = useState(''); // Từ khóa tìm kiếm
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all product variants on mount
  useEffect(() => {
    const fetchAllVariants = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await variantApi.fetchAllVariants();
        setAllVariants(data);
      } catch (err) {
        console.error("Lỗi khi tải tất cả biến thể sản phẩm:", err);
        setError("Không thể tải danh sách biến thể sản phẩm. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    if (isOpen) {
      fetchAllVariants();
    }
  }, [isOpen]);

  // Initialize selectedVariantsData based on mode and initialSelectedVariants
  useEffect(() => {
    if (isOpen && mode === 'update' && allVariants.length > 0) {
      const initialData: SelectedVariantData[] = initialSelectedVariants
        .map(sf => {
          const variant = allVariants.find(av => av.id === sf.variant_id);
          if (variant) {
            return {
              id: sf.id, // ID của VariantFromSupplier hiện có
              variant: variant,
              current_purchase_price: sf.current_purchase_price,
              variant_supplier_sku: sf.variant_supplier_sku || '', // Nếu null thì để rỗng
              is_active: sf.is_active,
            };
          }
          return null;
        })
        .filter(Boolean) as SelectedVariantData[]; // Lọc bỏ các null

      setSelectedVariantsData(initialData);
    } else if (isOpen && mode === 'create') {
      setSelectedVariantsData([]); // Reset cho chế độ tạo mới
    }
  }, [isOpen, mode, initialSelectedVariants, allVariants]);

  // Filtered variants for the left pane based on search term
  const filteredVariants = useMemo(() => {
    if (!searchTerm) {
      return allVariants;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allVariants.filter(variant =>
      // Kiểm tra variant.full_name trước khi gọi toLowerCase()
      (variant.full_name?.toLowerCase()?.includes(lowerCaseSearchTerm) || false) ||
      String(variant.id).includes(searchTerm) ||
      variant.sku.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [allVariants, searchTerm]);

  // Check if a variant is already selected
  const isVariantSelected = useCallback((variantId: number) => {
    return selectedVariantsData.some(item => item.variant.id === variantId);
  }, [selectedVariantsData]);

  // Handle toggling variant selection
  const handleToggleVariant = useCallback((variant: Variant) => {
    setSelectedVariantsData(prev => {
      if (isVariantSelected(variant.id)) {
        // Remove variant
        return prev.filter(item => item.variant.id !== variant.id);
      } else {
        // Add variant with default values
        return [
          ...prev,
          {
            variant: variant,
            current_purchase_price: 0, // Default price
            variant_supplier_sku: '', // Default empty SKU
            is_active: true, // Default active
            // id sẽ không có cho các variant mới được chọn trong mode create
            // Trong mode update, id sẽ được thêm vào nếu nó đã tồn tại trong initialSelectedVariants
          }
        ];
      }
    });
  }, [isVariantSelected]);

  // Handle changes in price or SKU for selected variants
  const handleFieldChange = useCallback((variantId: number, field: keyof SelectedVariantData, value: any) => {
    setSelectedVariantsData(prev =>
      prev.map(item =>
        item.variant.id === variantId
          ? { ...item, [field]: value }
          : item
      )
    );
  }, []);

  // Handle removing a variant from the right pane
  const handleRemoveSelectedVariant = useCallback((variantId: number) => {
    setSelectedVariantsData(prev => prev.filter(item => item.variant.id !== variantId));
  }, []);

  // Handle confirmation
  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      // Chuẩn bị dữ liệu để gửi đi
      const payload = selectedVariantsData.map(item => ({
        variant_id: item.variant.id,
        current_purchase_price: item.current_purchase_price,
        variant_supplier_sku: item.variant_supplier_sku === '' ? null : item.variant_supplier_sku, // Chuyển empty string thành null
        is_active: item.is_active,
      }));
      
      await onConfirm(payload); // Gọi hàm onConfirm từ parent
    } catch (err) {
      console.error("Lỗi khi xác nhận lưu biến thể:", err);
      // Xử lý lỗi (hiển thị toast/alert trong modal)
      setError(`Lỗi: ${err instanceof Error ? err.message : 'Không thể lưu dữ liệu'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-6 rounded-lg shadow-lg bg-white overflow-hidden font-inter">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            {mode === 'create' ? 'Thêm biến thể sản phẩm cho nhà cung cấp' : 'Chỉnh sửa biến thể sản phẩm của nhà cung cấp'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-grow flex items-center justify-center text-lg text-gray-600">Đang tải danh sách biến thể...</div>
        ) : error ? (
          <div className="flex-grow flex items-center justify-center text-lg text-red-500">{error}</div>
        ) : (
          <div className="flex flex-grow gap-6 p-4">
            {/* Left Pane: All available variants */}
            <div className="flex flex-col w-1/2 border border-gray-200 rounded-md shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="text-xl font-semibold mb-2 text-gray-700">Tất cả biến thể sản phẩm</h3>
                <Input
                  placeholder="Tìm kiếm SKU hoặc tên biến thể..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-md border-gray-300 focus:ring-yellow-400 focus:border-yellow-400"
                />
              </div>
              <ScrollArea className="flex-grow p-4">
                <div className="space-y-3">
                  {filteredVariants.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Không tìm thấy biến thể nào.</p>
                  ) : (
                    filteredVariants.map(variant => (
                      <div
                        key={variant.id}
                        className={`flex items-center gap-4 p-3 rounded-md transition-all duration-200 ${
                          isVariantSelected(variant.id) ? 'bg-yellow-500 text-white shadow-md' : 'bg-gray-50 hover:bg-yellow-100'
                        } cursor-pointer`}
                        onClick={() => handleToggleVariant(variant)}
                      >
                        <Checkbox
                          checked={isVariantSelected(variant.id)}
                          onCheckedChange={() => handleToggleVariant(variant)}
                          className={`${isVariantSelected(variant.id) ? 'border-white data-[state=checked]:bg-white data-[state=checked]:text-yellow-500' : 'border-gray-300'}`}
                        />
                        <img
                          src={variant.image_url || "https://placehold.co/50x50/cccccc/ffffff?text=No+Image"} // Sử dụng image_url từ Variant
                          alt={variant.full_name || variant.sku} // Sử dụng full_name hoặc sku
                          className="w-14 h-14 object-cover rounded-md flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/50x50/cccccc/ffffff?text=No+Image";
                          }}
                        />
                        <span className="font-medium flex-grow text-gray-800">{variant.full_name || variant.sku}</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Pane: Selected variants and inputs */}
            <div className="flex flex-col w-1/2 border border-gray-200 rounded-md shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="text-xl font-semibold mb-2 text-gray-700">
                  Biến thể đã chọn ({selectedVariantsData.length})
                </h3>
              </div>
              <ScrollArea className="flex-grow p-4">
                <div className="space-y-4">
                  {selectedVariantsData.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Chưa có biến thể nào được chọn.</p>
                  ) : (
                    selectedVariantsData.map(item => (
                      <div
                        key={item.variant.id}
                        className="bg-yellow-50 border border-yellow-200 p-4 rounded-md shadow-sm relative"
                      >
                        <button
                          onClick={() => handleRemoveSelectedVariant(item.variant.id)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors"
                          aria-label="Loại bỏ biến thể"
                        >
                          <XCircle size={20} />
                        </button>
                        <div className="flex items-center gap-4 mb-3">
                          <img
                            src={item.variant.image_url || "https://placehold.co/50x50/cccccc/ffffff?text=No+Image"}
                            alt={item.variant.full_name || item.variant.sku}
                            className="w-16 h-16 object-cover rounded-md"
                            onError={(e) => {
                              e.currentTarget.src = "https://placehold.co/50x50/cccccc/ffffff?text=No+Image";
                            }}
                          />
                          <span className="font-semibold text-lg text-gray-900">{item.variant.full_name || item.variant.sku}</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label htmlFor={`price-${item.variant.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                              Giá mua hiện tại (VNĐ):
                            </label>
                            <Input
                              id={`price-${item.variant.id}`}
                              type="number"
                              value={item.current_purchase_price}
                              onChange={(e) => handleFieldChange(item.variant.id, 'current_purchase_price', parseFloat(e.target.value) || 0)}
                              className="rounded-md border-gray-300 focus:ring-yellow-400 focus:border-yellow-400"
                              min="0"
                            />
                          </div>
                          <div>
                            <label htmlFor={`sku-${item.variant.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                              SKU nhà cung cấp:
                            </label>
                            <Input
                              id={`sku-${item.variant.id}`}
                              type="text"
                              value={item.variant_supplier_sku}
                              onChange={(e) => handleFieldChange(item.variant.id, 'variant_supplier_sku', e.target.value)}
                              className="rounded-md border-gray-300 focus:ring-yellow-400 focus:border-yellow-400"
                              placeholder="Nhập SKU NCC (nếu có)"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`is-active-${item.variant.id}`}
                              checked={item.is_active}
                              onCheckedChange={(checked: boolean) => handleFieldChange(item.variant.id, 'is_active', checked)}
                              className="border-gray-300 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-white"
                            />
                            <label htmlFor={`is-active-${item.variant.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                              Hoạt động
                            </label>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-end gap-3 p-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-6 py-2 rounded-md border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || selectedVariantsData.length === 0}
            className="px-6 py-2 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VariantSelectionModal;
