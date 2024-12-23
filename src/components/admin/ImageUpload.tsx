import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { adminService } from '../../lib/firebase/admin-service';
import type { Image } from '../../lib/schemas';

type ImageUploadProps = {
  value?: Image[];
  onChange: (images: Image[]) => void;
  onRemove: (url: string) => void;
};

export function ImageUpload({
  value = [],
  onChange,
  onRemove,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      const uploadedImages: Image[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const practiceId = crypto.randomUUID(); // Temporary ID for new practice
        const image = await adminService.uploadImage(file, practiceId);
        uploadedImages.push(image);
      }

      onChange([...value, ...uploadedImages]);
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {value.map((image) => (
          <div key={image.url} className="relative group">
            <img
              src={image.url}
              alt={image.alt || "Practice"}
              className="w-full h-32 object-cover rounded-md"
            />
            <button
              type="button"
              onClick={() => onRemove(image.url)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-4 text-gray-500" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG or WEBP (MAX. 800x400px)</p>
          </div>
          <input
            type="file"
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>

      {isUploading && (
        <div className="text-center text-sm text-gray-500">
          Uploading images...
        </div>
      )}
    </div>
  );
}
