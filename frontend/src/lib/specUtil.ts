// frontend\src\lib\specUtil.ts
import { Variant, SpecValue } from "@/features/variants/api/variantApi";

/**
 * Trả về chuỗi hiển thị cho một SpecValue
 */
export const formatSpecValue = (sv: SpecValue): string => {
  if (sv.specification.data_type === "option" && sv.spec_options) {
    return sv.spec_options.value;
  }
  if (sv.value_int !== null) {
    return `${sv.value_int} ${sv.specification.unit ?? ""}`.trim();
  }
  if (sv.value_decimal !== null) {
    return `${sv.value_decimal} ${sv.specification.unit ?? ""}`.trim();
  }
  if (sv.value_text) {
    return sv.value_text;
  }
  return "";
};

/**
 * Lấy giá trị của một spec (ví dụ "Màu sắc", "RAM", "Dung lượng bộ nhớ") từ một Variant
 */
export const getSpecValue = (
  variant: Variant,
  specName: string
): string | null => {
  const key = specName.trim().toLowerCase();
  const found = variant.variant_spec_values.find((sv) =>
    sv.specification.name.trim().toLowerCase().includes(key)
  );
  return found ? formatSpecValue(found) : null;
};

/**
 * Ghép thành chuỗi "Màu – Ram <...> – Dung lượng bộ nhớ"
 */
export const buildVariantLabel = (variant: Variant): string => {
  const colorValue = getSpecValue(variant, "Màu sắc");
  const ramValue = getSpecValue(variant, "RAM");
  const storageValue = getSpecValue(variant, "Dung lượng bộ nhớ");

  const color = colorValue ?? "N/A";
  const ram = ramValue ? `Ram ${ramValue}` : "N/A";
  const storage = storageValue ?? "N/A";

  return `${color} – ${ram} – ${storage}`;
};
