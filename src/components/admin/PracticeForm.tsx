import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { practiceCreateSchema } from '../../lib/schemas';
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
import type { Image, Practice } from '../../lib/schemas';

type PracticeFormProps = {
  weekId: string;
  onComplete: () => void;
  onCancel: () => void;
  initialData?: Practice;
};

export function PracticeForm({ weekId, onComplete, onCancel, initialData }: PracticeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(practiceCreateSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      difficulty: initialData?.difficulty || 'medium',
      weekId: weekId,
      images: initialData?.images || [],
    },
  });

  console.log('Form state:', form.getValues());

  return (
    <Form {...form}>
      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          console.log('Form submit event triggered');
          
          const values = form.getValues();
          console.log('Form values:', values);
          
          try {
            setIsSubmitting(true);
            setError(null);

            if (initialData?.id) {
              console.log('Updating practice:', initialData.id, values);
              await adminService.updatePractice(initialData.id, {
                title: values.title,
                description: values.description,
                difficulty: values.difficulty,
                images: values.images,
              });
            } else {
              console.log('Creating new practice with data:', values);
              await adminService.createPractice({
                ...values,
                weekId: weekId,
              });
            }
            
            onComplete();
          } catch (err) {
            console.error('Error saving practice:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while saving');
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="space-y-6">
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              value={form.watch('images')}
              onChange={(urls) => form.setValue('images', urls)}
              onRemove={(url) => {
                const current = form.watch('images');
                form.setValue(
                  'images',
                  current.filter((i) => i.url !== url)
                );
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialData ? 'Update Practice' : 'Create Practice'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
