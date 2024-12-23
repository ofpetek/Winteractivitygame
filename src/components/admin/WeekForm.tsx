import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { weekCreateSchema } from '../../lib/schemas';
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
import { Switch } from '../ui/switch';

type WeekFormProps = {
  onComplete: () => void;
  onCancel: () => void;
  initialData?: any;
};

export function WeekForm({ onComplete, onCancel, initialData }: WeekFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(weekCreateSchema),
    defaultValues: {
      weekNumber: initialData?.weekNumber || 1,
      title: initialData?.title || '',
      description: initialData?.description || '',
      isActive: initialData?.isActive || false,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (initialData?.id) {
        await adminService.updateWeek(initialData.id, data);
      } else {
        await adminService.createWeek(data);
      }
      onComplete();
    } catch (error) {
      console.error('Error saving week:', error);
      if (error instanceof Error) {
        form.setError('root', { message: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="weekNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Week Number</FormLabel>
              <FormControl>
                <Input type="number" min={1} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Week</FormLabel>
                <FormMessage />
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'} Week
          </Button>
        </div>
      </form>
    </Form>
  );
}
