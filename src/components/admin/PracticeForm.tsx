import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { practiceSchema } from '../../lib/schemas';
import { adminService } from '../../lib/firebase/admin-service';
import { Button } from '../ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ImageUpload } from './ImageUpload';
import type { Image } from '../../lib/schemas';

type PracticeFormProps = {
  weekId: string;
  onComplete: () => void;
  onCancel: () => void;
  initialData?: Partial<typeof practiceSchema._type>;
};

export function PracticeForm({ weekId, onComplete, onCancel, initialData }: PracticeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Image[]>(initialData?.images || []);

  const form = useForm({
    resolver: zodResolver(practiceSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      difficulty: initialData?.difficulty || 'medium',
      images: initialData?.images || [],
    },
  });

  const onSubmit = async (data: typeof practiceSchema._type) => {
    try {
      setIsSubmitting(true);
      const practiceData = {
        ...data,
        images: uploadedImages,
      };

      if (initialData?.id) {
        await adminService.updatePractice(initialData.id, practiceData);
      } else {
        await adminService.createPractice(weekId, practiceData);
      }
      onComplete();
    } catch (error) {
      console.error('Error saving practice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImagesUploaded = (newImages: Image[]) => {
    setUploadedImages((prev) => [...prev, ...newImages]);
  };

  const handleImageRemove = (fileName: string) => {
    setUploadedImages((prev) => prev.filter(img => img.fileName !== fileName));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="difficulty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormLabel>Images</FormLabel>
          <ImageUpload
            weekId={weekId}
            onImagesUploaded={handleImagesUploaded}
            existingImages={uploadedImages}
            onImageRemove={handleImageRemove}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'} Practice
          </Button>
        </div>
      </form>
    </Form>
  );
}
