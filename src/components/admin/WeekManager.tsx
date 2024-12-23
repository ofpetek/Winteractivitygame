import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Edit2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PracticeForm } from './PracticeForm';
import { adminService } from '../../lib/firebase/admin-service';
import { Badge } from '../ui/badge';
import type { Week, Practice } from '../../lib/schemas';

export function WeekManager() {
  const { weekId } = useParams();
  const navigate = useNavigate();
  const [week, setWeek] = useState<Week | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [isAddingPractice, setIsAddingPractice] = useState(false);
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (weekId) {
      loadWeekAndPractices();
    }
  }, [weekId]);

  const loadWeekAndPractices = async () => {
    if (!weekId) return;
    
    try {
      setIsLoading(true);
      const weekData = await adminService.getWeek(weekId);
      setWeek(weekData);

      const practicesData = await adminService.getPracticesByWeekId(weekId);
      setPractices(practicesData);
    } catch (error) {
      console.error('Error loading week and practices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePracticeAdded = () => {
    setIsAddingPractice(false);
    loadWeekAndPractices();
  };

  const handlePracticeUpdated = () => {
    setEditingPractice(null);
    loadWeekAndPractices();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!week) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Week not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Weeks
        </Button>
        <h1 className="text-2xl font-bold">
          Week {week.weekNumber}: {week.title}
        </h1>
      </div>

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">{week.description}</p>
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

      {editingPractice && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Edit Practice</CardTitle>
          </CardHeader>
          <CardContent>
            <PracticeForm
              weekId={weekId}
              onComplete={handlePracticeUpdated}
              onCancel={() => setEditingPractice(null)}
              initialData={editingPractice}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {practices.map((practice) => (
          <Card key={practice.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle>{practice.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getDifficultyColor(practice.difficulty)}>
                      {practice.difficulty}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => setEditingPractice(practice)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{practice.description}</p>
              {practice.images && practice.images.length > 0 && (
                <div className="aspect-video overflow-hidden rounded-md">
                  <img
                    src={practice.images[0].url}
                    alt={practice.images[0].alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && practices.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No Practices Created</h3>
          <p className="text-gray-500">Click the "Add Practice" button to create your first practice!</p>
        </div>
      )}
    </div>
  );
}
