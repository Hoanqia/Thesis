// frontend\src\components\ui\FileInputWithPreview.tsx
import { useRef, useState, useEffect } from "react";

interface FileInputWithPreviewProps {
  value?: string | null; // URL string (ảnh cũ) hoặc null
  onChange: (file: File | null) => void;
  accept?: string;  // Thêm dòng này

}

export function FileInputWithPreview({ value, onChange }: FileInputWithPreviewProps) {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false); // fix hydration mismatch

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else if (value && typeof value === "string") {
      setPreview(`${process.env.NEXT_PUBLIC_API_URL}/storage/uploads/variants/${value}`);
    } else {
      setPreview(null);
    }
  }, [file, value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
    onChange(selectedFile);
  };

  return (
    <div>
      {isClient && preview ? (
        <img
          src={preview}
          alt="preview"
          className="h-24 w-24 object-cover rounded mb-2 border border-gray-300"
        />
      ) : (
        <div className="h-24 w-24 flex items-center justify-center mb-2 border border-gray-300 rounded text-gray-400">
          Chưa có ảnh
        </div>
      )}

      <button
        type="button"
        onClick={() => inputFileRef.current?.click()}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
      >
        Chọn ảnh
      </button>

      <input
        type="file"
        accept="image/*"
        ref={inputFileRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}
