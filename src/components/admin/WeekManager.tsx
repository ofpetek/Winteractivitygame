import { useState, useEffect } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PracticeForm } from './PracticeForm';
import { adminService } from '../../lib/firebase/admin-service';
import type { Practice } from '../../lib/schemas';

export function WeekManager() {
  const { weekId } = useParams();
  const navigate = useNavigate();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [isAddingPractice, setIsAddingPractice] = useState(false);
  const [weekTitle, setWeekTitle] = useState('');

  useEffect(() => {
    if (weekId) {
      loadWeekData();
    }
  }, [weekId]);

  const loadWeekData = async () => {
    if (!weekId) return;
    
    try {
      const weekDoc = await adminService.getWeek(weekId);
      if (weekDoc) {
        setWeekTitle(weekDoc.title);
        setPractices(weekDoc.practices || []);
      }
    } catch (error) {
      console.error('Error loading week data:', error);
    }
  };

  const handlePracticeAdded = () => {
    setIsAddingPractice(false);
    loadWeekData();
  };

  const handleDeletePractice = async (practiceId: string) => {
    if (!weekId || !confirm('Are you sure you want to delete this practice?')) return;

    try {
      await adminService.deletePractice(practiceId);
      loadWeekData();
    } catch (error) {
      console.error('Error deleting practice:', error);
    }
  };

  if (!weekId) {
    return <div>Week not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin')}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Weeks
        </Button>
        <h1 className="text-3xl font-bold flex-1">{weekTitle}</h1>
        <Button onClick={() => setIsAddingPractice(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Practice
        </Button>
      </div>

      {isAddingPractice && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Practice</CardTitle>
          </CardHeader>
          <CardContent>
            <PracticeForm
              weekId={weekId}
              onComplete={handlePracticeAdded}
              onCancel={() => setIsAddingPractice(false)}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {practices.map((practice) => (
          <Card key={practice.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span>{practice.title}</span>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePractice(practice.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{practice.description}</p>
              <div className="grid grid-cols-2 gap-2">
                {practice.images.slice(0, 4).map((image, index) => (
                  <img
                    key={image.fileName}
                    src={image.url}
                    alt={`Practice ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                ))}
              </div>
              {practice.images.length > 4 && (
                <p className="text-sm text-gray-500 mt-2">
                  +{practice.images.length - 4} more images
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
